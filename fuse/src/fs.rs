//! FUSE Filesystem Implementation

use crate::cache::Cache;
use crate::client::{ApiError, Node, NodeType, Part, RosetClient};
use crate::config::Config;
use crate::inode::InodeMap;
use crate::staging::StagingManager;
use futures::{StreamExt, TryStreamExt};
use std::path::PathBuf;

use anyhow::Result;
use fuser::{
    FileAttr, FileType, Filesystem, MountOption, ReplyAttr, ReplyData, ReplyDirectory, ReplyEntry,
    ReplyOpen, Request,
};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::runtime::Runtime;
use tracing::{debug, error, info};

/// FUSE filesystem for Roset
pub struct RosetFs {
    /// Roset API client
    client: Arc<RosetClient>,
    /// Inode mapper  
    inodes: InodeMap,
    /// Metadata cache
    cache: Cache,
    /// Tokio runtime for async operations
    rt: Runtime,
    /// Open file handles: fh → (node_id, download_url)
    handles: parking_lot::Mutex<HashMap<u64, OpenFile>>,
    /// Next file handle
    next_fh: std::sync::atomic::AtomicU64,
    /// Read-only mode
    read_only: bool,
    /// Cached UID/GID (avoid repeated unsafe calls)
    uid: u32,
    gid: u32,
    /// Max directory entries per listing
    max_dir_entries: u32,
    /// Staging manager for background uploads
    staging_manager: Option<StagingManager>,
    /// Durability mode for writes
    durability_mode: crate::config::DurabilityMode,
    /// URL refresh buffer in seconds
    url_refresh_buffer: Duration,
}

// Add imports
use std::io::{Seek, SeekFrom, Write};
use tempfile::NamedTempFile;
use tokio::io::{AsyncReadExt, AsyncSeekExt};

struct OpenFile {
    node_id: String,
    // Read fields
    download_url: Option<String>,
    expires_at: Option<SystemTime>, // URL expiry timestamp
    size: u64,
    // Write fields
    write_mode: bool,
    upload_token: Option<String>,
    temp_file: Option<NamedTempFile>, // Replaces buffer
    dirty: bool,
}

/// TTL for FUSE responses
const TTL: Duration = Duration::from_secs(60);

impl RosetFs {
    pub fn new(config: &Config) -> Result<Self> {
        use crate::config::DurabilityMode;
        
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()?;

        let client = RosetClient::new(&config.api_url, &config.api_key, config.mount_id.clone())?;
        let cache = Cache::new(config.cache_ttl);
        let inodes = InodeMap::new();

        // Cache UID/GID at startup (avoid repeated unsafe calls)
        let uid = unsafe { libc::getuid() };
        let gid = unsafe { libc::getgid() };

        // Determine effective durability mode (--write-back-cache is deprecated alias for async)
        let durability_mode = if config.write_back_cache && config.durability == DurabilityMode::Sync {
            DurabilityMode::Async // Legacy flag overrides default
        } else {
            config.durability
        };

        // Create staging manager for async or sync-on-fsync modes
        let needs_staging = matches!(durability_mode, DurabilityMode::Async | DurabilityMode::SyncOnFsync);
        let staging_manager = if needs_staging {
            let staging_dir = config
                .staging_dir
                .clone()
                .unwrap_or_else(|| PathBuf::from(".roset/staging"));
            Some(StagingManager::new(
                RosetClient::new(&config.api_url, &config.api_key, config.mount_id.clone())?,
                staging_dir,
            ))
        } else {
            None
        };

        Ok(Self {
            client,
            inodes,
            cache,
            rt,
            handles: parking_lot::Mutex::new(HashMap::new()),
            next_fh: std::sync::atomic::AtomicU64::new(1),
            read_only: config.read_only,
            uid,
            gid,
            max_dir_entries: 10000,
            staging_manager,
            durability_mode,
            url_refresh_buffer: Duration::from_secs(config.url_refresh_buffer),
        })
    }

    /// Initialize the filesystem (resolve root)
    pub fn init_root(&self) -> Result<()> {
        let client = self.client.clone();
        let node = self
            .rt
            .block_on(async move { client.resolve("/", None).await })
            .map_err(|e| anyhow::anyhow!("Failed to resolve root: {}", e))?;

        if let Some(root) = node {
            self.inodes.set_root(&root.id);
            self.cache.put_node(root);
            info!("Root inode initialized");
            Ok(())
        } else {
            Err(anyhow::anyhow!("Root path not found"))
        }
    }

    /// Mount the filesystem
    pub fn mount(self, mountpoint: &std::path::Path, config: &Config) -> Result<()> {
        let mut options = vec![
            MountOption::FSName("roset".to_string()),
            MountOption::AutoUnmount,
            MountOption::DefaultPermissions,
        ];

        if config.allow_other {
            options.push(MountOption::AllowOther);
        }

        if config.read_only {
            options.push(MountOption::RO);
        }

        info!("Mounting Roset filesystem at {:?}", mountpoint);
        fuser::mount2(self, mountpoint, &options)?;
        Ok(())
    }

    fn node_to_attr(&self, node: &Node, ino: u64) -> FileAttr {
        let kind = match node.node_type {
            NodeType::File => FileType::RegularFile,
            NodeType::Folder => FileType::Directory,
        };

        let size = node.size.unwrap_or(0);
        let mtime = parse_time(&node.updated_at);
        let ctime = parse_time(&node.created_at);

        FileAttr {
            ino,
            size,
            blocks: size.div_ceil(512),
            atime: mtime,
            mtime,
            ctime,
            crtime: ctime,
            kind,
            perm: if kind == FileType::Directory {
                0o755
            } else {
                0o644
            },
            nlink: 1,
            uid: self.uid,
            gid: self.gid,
            rdev: 0,
            blksize: 4096,
            flags: 0,
        }
    }

    /// Map API errors to errno
    fn api_error_to_errno(err: &ApiError) -> i32 {
        match err {
            ApiError::NotFound => libc::ENOENT,
            ApiError::Unauthorized | ApiError::Forbidden => libc::EACCES,
            ApiError::LeaseConflict => libc::EBUSY,
            ApiError::RateLimited => libc::EAGAIN,
            _ => libc::EIO,
        }
    }

    /// Resolve a child by name in a parent directory, with API fallback
    fn resolve_child(&self, parent_id: &str, name: &str) -> Result<Option<Node>, ApiError> {
        // 1. Check negative cache first (avoid repeated API calls for non-existent files)
        if self.cache.is_negative(parent_id, name) {
            return Ok(None);
        }

        // 2. Try positive cache
        if let Some(children) = self.cache.get_children(parent_id) {
            if let Some(child) = children.iter().find(|c| c.name == name) {
                return Ok(Some(child.clone()));
            }
        }

        // 3. Resolve via API (targeted lookup relative to parent_id)
        let client = self.client.clone();
        let pid = parent_id.to_string();
        let n = name.to_string();
        let parent_id_for_cache = parent_id.to_string();
        let name_for_cache = name.to_string();

        match self
            .rt
            .block_on(async move { client.resolve(&n, Some(&pid)).await })?
        {
            Some(node) => {
                // Node found, cache it
                self.cache.put_node(node.clone());
                Ok(Some(node))
            }
            None => {
                // Not found - cache negative result to avoid repeated API calls
                self.cache.put_negative(&parent_id_for_cache, &name_for_cache);
                Ok(None)
            }
        }
    }
}

fn parse_time(s: &str) -> SystemTime {
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|dt| UNIX_EPOCH + Duration::from_secs(dt.timestamp() as u64))
        .unwrap_or(UNIX_EPOCH)
}

impl Filesystem for RosetFs {
    fn lookup(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: ReplyEntry) {
        let name_str = name.to_string_lossy();
        debug!("lookup: parent={}, name={}", parent, name_str);

        let parent_id = match self.inodes.get_node_id(parent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        match self.resolve_child(&parent_id, &name_str) {
            Ok(Some(node)) => {
                let ino = self.inodes.get_or_create(&node.id);
                let attr = self.node_to_attr(&node, ino);
                reply.entry(&TTL, &attr, 0);
            }
            Ok(None) => {
                reply.error(libc::ENOENT);
            }
            Err(e) => {
                error!("API error in lookup: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn getattr(&mut self, _req: &Request, ino: u64, reply: ReplyAttr) {
        debug!("getattr: ino={}", ino);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Check cache
        if let Some(node) = self.cache.get_node(&node_id) {
            let attr = self.node_to_attr(&node, ino);
            reply.attr(&TTL, &attr);
            return;
        }

        // Fetch from API
        let client = self.client.clone();
        let id = node_id.clone();
        match self.rt.block_on(async move { client.get_node(&id).await }) {
            Ok(node) => {
                self.cache.put_node(node.clone());
                let attr = self.node_to_attr(&node, ino);
                reply.attr(&TTL, &attr);
            }
            Err(e) => {
                error!("API error in getattr: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn setattr(
        &mut self,
        _req: &Request,
        ino: u64,
        _mode: Option<u32>,
        _uid: Option<u32>,
        _gid: Option<u32>,
        size: Option<u64>,
        _atime: Option<fuser::TimeOrNow>,
        mtime: Option<fuser::TimeOrNow>,
        _ctime: Option<std::time::SystemTime>,
        fh: Option<u64>,
        _crtime: Option<std::time::SystemTime>,
        _chgtime: Option<std::time::SystemTime>,
        _bkuptime: Option<std::time::SystemTime>,
        _flags: Option<u32>,
        reply: ReplyAttr,
    ) {
        debug!("setattr: ino={}, size={:?}, fh={:?}", ino, size, fh);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Handle truncate (size change)
        if let Some(new_size) = size {
            if let Some(file_handle) = fh {
                let mut handles = self.handles.lock();
                if let Some(handle) = handles.get_mut(&file_handle) {
                    if handle.write_mode {
                        // Truncate the local temp file
                        if let Some(ref mut temp_file) = handle.temp_file {
                            if let Err(e) = temp_file.as_file().set_len(new_size) {
                                error!("Failed to truncate temp file: {}", e);
                                reply.error(libc::EIO);
                                return;
                            }
                            handle.size = new_size;
                            handle.dirty = true;
                        }
                    }
                }
            }
        }

        // Handle mtime update via metadata API
        if let Some(time) = mtime {
            debug!("Request to update mtime to {:?}, but backend metadata update is not yet mapped", time);
        }

        // Return current attributes
        let node = match self.cache.get_node(&node_id) {
            Some(n) => n,
            None => {
                let client = self.client.clone();
                let id = node_id.clone();
                match self.rt.block_on(async move { client.get_node(&id).await }) {
                    Ok(n) => {
                        self.cache.put_node(n.clone());
                        std::sync::Arc::new(n)
                    }
                    Err(e) => {
                        error!("API error in setattr: {}", e);
                        reply.error(Self::api_error_to_errno(&e));
                        return;
                    }
                }
            }
        };

        let mut attr = self.node_to_attr(&node, ino);
        // If we truncated, update the size in the reply
        if let Some(new_size) = size {
            attr.size = new_size;
            attr.blocks = new_size.div_ceil(512);
        }

        reply.attr(&TTL, &attr);
    }

    fn readdir(
        &mut self,
        _req: &Request,
        ino: u64,
        _fh: u64,
        offset: i64,
        mut reply: ReplyDirectory,
    ) {
        debug!("readdir: ino={}, offset={}", ino, offset);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Get children
        let children = match self.cache.get_children(&node_id) {
            Some(c) => c,
            None => {
                let client = self.client.clone();
                let id = node_id.clone();
                let max_entries = self.max_dir_entries;

                // Accessing cache inside async block would be tricky due to lifetime,
                // so we fetch the node from cache here if possible to check metadata
                let is_committed = if let Some(node) = self.cache.get_node(&id) {
                    node.metadata
                        .as_ref()
                        .and_then(|m| m.get("committed"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                } else {
                    false
                };

                let fut = async move {
                    if is_committed {
                        // Use manifest for committed/immutable directories
                        match client.get_manifest(&id).await {
                            Ok(children) => Ok(children),
                            Err(e) => {
                                // Fallback to list_all_children if manifest fails (or not actually committed)
                                error!("Manifest fetch failed, falling back to list: {}", e);
                                client.list_all_children(&id, max_entries).await
                            }
                        }
                    } else {
                        client.list_all_children(&id, max_entries).await
                    }
                };

                match self.rt.block_on(fut) {
                    Ok(children) => {
                        if is_committed {
                            self.cache.bulk_load(&node_id, children.clone());
                        } else {
                            self.cache.put_children(&node_id, children.clone());
                        }
                        Arc::new(children)
                    }
                    Err(e) => {
                        error!("API error in readdir: {}", e);
                        reply.error(Self::api_error_to_errno(&e));
                        return;
                    }
                }
            }
        };

        // Build entries (. and .. plus children)
        let mut entries: Vec<(u64, FileType, String)> = vec![
            (ino, FileType::Directory, ".".to_string()),
            (ino, FileType::Directory, "..".to_string()),
        ];

        for child in children.iter() {
            let child_ino = self.inodes.get_or_create(&child.id);
            let kind = match child.node_type {
                NodeType::File => FileType::RegularFile,
                NodeType::Folder => FileType::Directory,
            };
            entries.push((child_ino, kind, child.name.clone()));
        }

        // Reply with entries starting from offset
        for (i, (ino, kind, name)) in entries.into_iter().enumerate().skip(offset as usize) {
            if reply.add(ino, (i + 1) as i64, kind, &name) {
                break;
            }
        }

        reply.ok();
    }

    fn open(&mut self, _req: &Request, ino: u64, _flags: i32, reply: ReplyOpen) {
        debug!("open: ino={}", ino);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Get download URL
        let client = self.client.clone();
        let id = node_id.clone();
        match self
            .rt
            .block_on(async move { client.get_download_url(&id).await })
        {
            Ok(resp) => {
                let fh = self
                    .next_fh
                    .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                // Calculate expiry time from expiresIn
                let expires_at = Some(SystemTime::now() + Duration::from_secs(resp.expires_in));
                self.handles.lock().insert(
                    fh,
                    OpenFile {
                        node_id,
                        download_url: Some(resp.url),
                        expires_at,
                        size: resp.size,
                        write_mode: false,
                        upload_token: None,
                        temp_file: None,
                        dirty: false,
                    },
                );
                reply.opened(fh, 0);
            }
            Err(e) => {
                error!("API error in open: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn mkdir(
        &mut self,
        _req: &Request,
        parent: u64,
        name: &OsStr,
        _mode: u32,
        _umask: u32,
        reply: ReplyEntry,
    ) {
        let name_str = name.to_string_lossy();
        debug!("mkdir: parent={}, name={}", parent, name_str);

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        let parent_id = match self.inodes.get_node_id(parent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        let client = self.client.clone();
        let pid = parent_id.clone();
        let n = name_str.to_string();

        let create_input = crate::client::CreateNodeInput {
            name: n,
            node_type: crate::client::NodeType::Folder,
            parent_id: Some(pid),
            parent_path: None,
            metadata: None,
            mount_id: None, // Will use default from client
        };

        match self
            .rt
            .block_on(async move { client.create_node(create_input).await })
        {
            Ok(node) => {
                self.cache.invalidate_children(&parent_id);
                self.cache.invalidate_negative(&parent_id, &name_str); // Clear negative cache
                let ino = self.inodes.get_or_create(&node.id);
                self.cache.put_node(node.clone());
                let attr = self.node_to_attr(&node, ino);
                reply.entry(&TTL, &attr, 0);
            }
            Err(e) => {
                error!("API error in mkdir: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn rmdir(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: fuser::ReplyEmpty) {
        let name_str = name.to_string_lossy();
        debug!("rmdir: parent={}, name={}", parent, name_str);

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        let parent_id = match self.inodes.get_node_id(parent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Resolve name to ID
        let target_node = match self.resolve_child(&parent_id, &name_str) {
            Ok(Some(node)) => node,
            Ok(None) => {
                reply.error(libc::ENOENT);
                return;
            }
            Err(e) => {
                error!("API error in rmdir resolution: {}", e);
                reply.error(Self::api_error_to_errno(&e));
                return;
            }
        };

        let target_id = target_node.id;
        let client = self.client.clone();
        let target_id_clone = target_id.clone();
        match self
            .rt
            .block_on(async move { client.delete_node(&target_id_clone).await })
        {
            Ok(_) => {
                self.cache.invalidate_children(&parent_id);
                self.cache.invalidate_node(&target_id);
                reply.ok();
            }
            Err(e) => {
                error!("API error in rmdir: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn unlink(&mut self, _req: &Request, parent: u64, name: &OsStr, reply: fuser::ReplyEmpty) {
        // Unlink is same as rmdir for us (delete_node)
        self.rmdir(_req, parent, name, reply);
    }

    fn rename(
        &mut self,
        _req: &Request,
        parent: u64,
        name: &OsStr,
        newparent: u64,
        newname: &OsStr,
        _flags: u32,
        reply: fuser::ReplyEmpty,
    ) {
        let name_str = name.to_string_lossy();
        let newname_str = newname.to_string_lossy();
        debug!(
            "rename: parent={}, name={}, newparent={}, newname={}",
            parent, name_str, newparent, newname_str
        );

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        // Resolve parent IDs
        let parent_id = match self.inodes.get_node_id(parent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        let newparent_id = match self.inodes.get_node_id(newparent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Resolve source node
        let source_node = match self.resolve_child(&parent_id, &name_str) {
            Ok(Some(node)) => node,
            Ok(None) => {
                reply.error(libc::ENOENT);
                return;
            }
            Err(e) => {
                error!("API error in rename resolution: {}", e);
                reply.error(Self::api_error_to_errno(&e));
                return;
            }
        };

        let source_id = source_node.id.clone();
        let client = self.client.clone();

        // Determine what changed
        let new_parent = if parent_id != newparent_id {
            Some(newparent_id.as_str())
        } else {
            None
        };
        let new_name = if name_str != newname_str {
            Some(newname_str.as_ref())
        } else {
            None
        };

        // Call API
        match self
            .rt
            .block_on(async move { client.move_node(&source_id, new_parent, new_name).await })
        {
            Ok(updated_node) => {
                // Invalidate caches
                self.cache.invalidate_children(&parent_id);
                if parent_id != newparent_id {
                    self.cache.invalidate_children(&newparent_id);
                }
                self.cache.put_node(updated_node);
                reply.ok();
            }
            Err(e) => {
                error!("API error in rename: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn create(
        &mut self,
        _req: &Request,
        parent: u64,
        name: &OsStr,
        _mode: u32,
        _umask: u32,
        _flags: i32,
        reply: fuser::ReplyCreate,
    ) {
        let name_str = name.to_string_lossy();
        debug!("create: parent={}, name={}", parent, name_str);

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        let parent_id = match self.inodes.get_node_id(parent) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        let client = self.client.clone();
        let pid = parent_id.clone();
        let n = name_str.to_string();

        let init_input = crate::client::InitUploadInput {
            node_id: None,
            parent_id: Some(pid),
            parent_path: None,
            name: n.clone(),
            content_type: None,
            size: Some(0),
            multipart: true,
            metadata: None,
            mount_id: None,
        };

        // Initialize upload (force multipart for robustness)
        match self
            .rt
            .block_on(async move { client.init_upload(init_input).await })
        {
            Ok(resp) => {
                // Create a placeholder Node struct for the reply
                let node = Node {
                    id: resp.node_id.clone(),
                    tenant_id: "".to_string(), // Unknown context here but not needed for attr
                    mount_id: "".to_string(),
                    parent_id: Some(parent_id.clone()),
                    name: n,
                    node_type: NodeType::File,
                    size: Some(0),
                    content_type: None,
                    created_at: chrono::Utc::now().to_rfc3339(),
                    updated_at: chrono::Utc::now().to_rfc3339(),
                    metadata: None,
                };

                let ino = self.inodes.get_or_create(&resp.node_id);
                self.cache.invalidate_negative(&parent_id, &name_str); // Clear negative cache
                let fh = self
                    .next_fh
                    .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

                // Create temp file
                let temp_file = match NamedTempFile::new() {
                    Ok(f) => f,
                    Err(e) => {
                        error!("Failed to create temp file: {}", e);
                        reply.error(libc::EIO);
                        return;
                    }
                };

                self.handles.lock().insert(
                    fh,
                    OpenFile {
                        node_id: resp.node_id,
                        download_url: None,
                        expires_at: None, // Write-only handles don't need URL expiry
                        size: 0,
                        write_mode: true,
                        upload_token: Some(resp.upload_token),
                        temp_file: Some(temp_file),
                        dirty: false,
                    },
                );

                let attr = self.node_to_attr(&node, ino);
                reply.created(&TTL, &attr, 0, fh, 0);
            }
            Err(e) => {
                error!("API error in create: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn write(
        &mut self,
        _req: &Request,
        _ino: u64,
        fh: u64,
        offset: i64,
        data: &[u8],
        _write_flags: u32,
        _flags: i32,
        _lock_owner: Option<u64>,
        reply: fuser::ReplyWrite,
    ) {
        debug!("write: fh={}, offset={}, len={}", fh, offset, data.len());

        let mut handles = self.handles.lock();
        if let Some(handle) = handles.get_mut(&fh) {
            if !handle.write_mode {
                reply.error(libc::EBADF);
                return;
            }

            let file = match handle.temp_file.as_mut() {
                Some(f) => f,
                None => {
                    reply.error(libc::EBADF);
                    return;
                }
            };

            // Seek to offset
            if let Err(e) = file.seek(SeekFrom::Start(offset as u64)) {
                error!("Seek error: {}", e);
                reply.error(libc::EIO);
                return;
            }

            // Write data
            if let Err(e) = file.write_all(data) {
                error!("Write error: {}", e);
                reply.error(libc::EIO);
                return;
            }

            handle.dirty = true;

            // Update size if we extended the file
            let end_pos = offset as u64 + data.len() as u64;
            if end_pos > handle.size {
                handle.size = end_pos;
            }

            reply.written(data.len() as u32);
        } else {
            reply.error(libc::EBADF);
        }
    }

    fn read(
        &mut self,
        _req: &Request,
        ino: u64,
        fh: u64,
        offset: i64,
        size: u32,
        _flags: i32,
        _lock_owner: Option<u64>,
        reply: ReplyData,
    ) {
        debug!(
            "read: ino={}, fh={}, offset={}, size={}",
            ino, fh, offset, size
        );

        // Get handle info including expires_at
        let (node_id, mut download_url, expires_at, file_size) = {
            let handles = self.handles.lock();
            match handles.get(&fh) {
                Some(h) => (
                    h.node_id.clone(),
                    h.download_url.clone(),
                    h.expires_at,
                    h.size,
                ),
                None => {
                    reply.error(libc::EBADF);
                    return;
                }
            }
        };

        // Check bounds
        if offset as u64 >= file_size {
            reply.data(&[]);
            return;
        }

        let actual_size = std::cmp::min(size as u64, file_size - offset as u64) as u32;

        // Check if URL needs refresh (near expiry)
        let needs_refresh = match expires_at {
            Some(exp) => {
                let refresh_threshold = SystemTime::now() + self.url_refresh_buffer;
                refresh_threshold > exp
            }
            None => false,
        };

        // Refresh URL if near expiry
        if needs_refresh {
            debug!("URL near expiry for node {}, refreshing", node_id);
            let client = self.client.clone();
            let id = node_id.clone();
            match self.rt.block_on(async move { client.get_download_url(&id).await }) {
                Ok(resp) => {
                    let new_expires = Some(SystemTime::now() + Duration::from_secs(resp.expires_in));
                    download_url = Some(resp.url.clone());
                    // Update handle with new URL and expiry
                    let mut handles = self.handles.lock();
                    if let Some(h) = handles.get_mut(&fh) {
                        h.download_url = Some(resp.url);
                        h.expires_at = new_expires;
                    }
                }
                Err(e) => {
                    error!("Failed to refresh URL: {}", e);
                    // Continue with old URL, will fail if truly expired
                }
            }
        }

        let url = match download_url {
            Some(u) => u,
            None => {
                reply.error(libc::EIO);
                return;
            }
        };

        // Download the range with retry-on-403
        let client = self.client.clone();
        let url_clone = url.clone();
        
        match self.rt.block_on(async move {
            client.download_range(&url_clone, offset as u64, actual_size).await
        }) {
            Ok(data) => {
                reply.data(&data);
            }
            Err(ApiError::ServerError(msg)) if msg.contains("403") => {
                // URL expired, try refresh and retry once
                debug!("Got 403, refreshing URL for node {}", node_id);
                let client = self.client.clone();
                let id = node_id.clone();
                match self.rt.block_on(async move { 
                    let resp = client.get_download_url(&id).await?;
                    client.download_range(&resp.url, offset as u64, actual_size).await
                }) {
                    Ok(data) => {
                        reply.data(&data);
                    }
                    Err(e) => {
                        error!("Retry after 403 failed: {}", e);
                        reply.error(Self::api_error_to_errno(&e));
                    }
                }
            }
            Err(e) => {
                error!("Download error in read: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn flush(
        &mut self,
        _req: &Request,
        ino: u64,
        fh: u64,
        _lock_owner: u64,
        reply: fuser::ReplyEmpty,
    ) {
        debug!("flush: ino={}, fh={}", ino, fh);
        // Flush is called before close - we don't need to do anything special
        // since we handle everything in release/fsync
        reply.ok();
    }

    fn fsync(
        &mut self,
        _req: &Request,
        ino: u64,
        fh: u64,
        datasync: bool,
        reply: fuser::ReplyEmpty,
    ) {
        debug!("fsync: ino={}, fh={}, datasync={}", ino, fh, datasync);

        // Get handle info without holding the lock during async operations
        let handle_info = {
            let handles = self.handles.lock();
            handles.get(&fh).map(|h| {
                (
                    h.node_id.clone(),
                    h.write_mode,
                    h.dirty,
                    h.upload_token.clone(),
                    h.size,
                )
            })
        };

        let Some((node_id, write_mode, dirty, upload_token, total_size)) = handle_info else {
            reply.error(libc::EBADF);
            return;
        };

        if !write_mode || !dirty {
            // Nothing to sync
            reply.ok();
            return;
        }

        let Some(token) = upload_token else {
            reply.ok();
            return;
        };

        // Get temp file path from handle
        let temp_path = {
            let handles = self.handles.lock();
            handles
                .get(&fh)
                .and_then(|h| h.temp_file.as_ref())
                .map(|f| f.path().to_path_buf())
        };

        let Some(path) = temp_path else {
            reply.ok();
            return;
        };

        info!(
            "fsync: uploading {} bytes for node {} (blocking until complete)",
            total_size, node_id
        );

        let client = self.client.clone();

        // Perform synchronous multipart upload - blocks until complete
        let res: anyhow::Result<()> = self.rt.block_on(async move {
            const CONCURRENCY: usize = 5;
            const PART_SIZE: u64 = 20 * 1024 * 1024;

            let iterations = if total_size > 0 {
                total_size.div_ceil(PART_SIZE)
            } else {
                1
            };

            let mut pending_parts = Vec::new();
            let mut offset = 0;
            for part_number in 1..=iterations {
                let current_part_size = if total_size > 0 {
                    std::cmp::min(PART_SIZE, total_size - offset)
                } else {
                    0
                };
                pending_parts.push((part_number as u32, offset, current_part_size));
                offset += current_part_size;
            }

            let client_ref = &client;
            let path_ref = &path;
            let token_ref = &token;

            let bodies = futures::stream::iter(pending_parts)
                .map(|(part_number, off, size)| async move {
                    let url = client_ref
                        .get_upload_part_url(token_ref, part_number)
                        .await?;

                    let mut file = tokio::fs::File::open(path_ref).await?;
                    file.seek(SeekFrom::Start(off)).await?;
                    let chunk = file.take(size);

                    let stream = tokio_util::io::ReaderStream::new(chunk);
                    let body = reqwest::Body::wrap_stream(stream);

                    let put_client = reqwest::Client::new();
                    let resp = put_client
                        .put(&url)
                        .body(body)
                        .send()
                        .await
                        .map_err(|e| anyhow::anyhow!("Part Upload failed: {}", e))?;

                    if !resp.status().is_success() {
                        return Err(anyhow::anyhow!("Part Upload returned {}", resp.status()));
                    }

                    let etag = resp
                        .headers()
                        .get("ETag")
                        .and_then(|h| h.to_str().ok())
                        .map(|s| s.trim_matches('"').to_string())
                        .ok_or_else(|| anyhow::anyhow!("No ETag in response"))?;

                    Ok::<Part, anyhow::Error>(Part { part_number, etag })
                })
                .buffer_unordered(CONCURRENCY);

            let mut parts_vec = bodies.try_collect::<Vec<Part>>().await?;
            parts_vec.sort_by_key(|p| p.part_number);

            // Complete multipart upload
            client.complete_multipart_upload(&token, parts_vec).await?;

            Ok(())
        });

        match res {
            Ok(()) => {
                // Mark as not dirty after successful sync
                let mut handles = self.handles.lock();
                if let Some(handle) = handles.get_mut(&fh) {
                    handle.dirty = false;
                }
                self.cache.invalidate_node(&node_id);
                info!("fsync: upload complete for node {}", node_id);
                reply.ok();
            }
            Err(e) => {
                error!("fsync failed: {}", e);
                reply.error(libc::EIO);
            }
        }
    }

    fn release(
        &mut self,
        _req: &Request,
        ino: u64,
        fh: u64,
        _flags: i32,
        _lock_owner: Option<u64>,
        _flush: bool,
        reply: fuser::ReplyEmpty,
    ) {
        debug!("release: ino={}, fh={}", ino, fh);

        let handle = {
            let mut map = self.handles.lock();
            map.remove(&fh)
        };

        if let Some(handle) = handle {
            if handle.write_mode && handle.dirty {
                if let (Some(token), Some(temp_file)) = (handle.upload_token, handle.temp_file) {
                    info!(
                        "Flushing temp file ({} bytes) for node {}",
                        handle.size, handle.node_id
                    );

                    let client = self.client.clone();
                    let nid = handle.node_id.clone();
                    let total_size = handle.size;

                    // Persist temp file
                    let (_file, path) = match temp_file.keep() {
                        Ok(p) => p,
                        Err(e) => {
                            error!("Failed to persist temp file: {}", e);
                            reply.ok();
                            return;
                        }
                    };

                    // 1. Try Write-Back Staging
                    let mut staged = false;
                    if let Some(staging) = &self.staging_manager {
                        info!(
                            "Staging background upload for node {} (mode: {:?})",
                            nid, self.durability_mode
                        );
                        match self.rt.block_on(async {
                            staging
                                .stage_file(&path, nid.clone(), token.clone(), total_size)
                                .await
                        }) {
                            Ok(_) => {
                                staged = true;
                                self.cache.invalidate_node(&nid);
                            }
                            Err(e) => {
                                error!("Staging failed (falling back to sync): {}", e);
                            }
                        }
                    }

                    // 2. Fallback to Synchronous Upload if not staged
                    if !staged {
                        // Run multipart upload in background (blocking FUSE thread)
                        let path_clone = path.clone();
                        let res: anyhow::Result<()> = self.rt.block_on(async move {
                            // Define Part Size (e.g., 20MB)
                            const CONCURRENCY: usize = 5;
                            const PART_SIZE: u64 = 20 * 1024 * 1024;

                            let iterations = if total_size > 0 {
                                total_size.div_ceil(PART_SIZE)
                            } else {
                                1
                            };

                            let mut pending_parts = Vec::new();
                            let mut offset = 0;
                            for part_number in 1..=iterations {
                                let current_part_size = if total_size > 0 {
                                    std::cmp::min(PART_SIZE, total_size - offset)
                                } else {
                                    0
                                };
                                pending_parts.push((part_number as u32, offset, current_part_size));
                                offset += current_part_size;
                            }

                            let client_ref = &client;
                            let path_ref = &path_clone;
                            let token_ref = &token;

                            let bodies = futures::stream::iter(pending_parts)
                                .map(|(part_number, off, size)| async move {
                                    // 1. Get Signed URL
                                    let url = client_ref
                                        .get_upload_part_url(token_ref, part_number)
                                        .await?;

                                    // 2. Read Chunk
                                    let mut file = tokio::fs::File::open(path_ref).await?;
                                    file.seek(SeekFrom::Start(off)).await?;
                                    let chunk = file.take(size);

                                    // 3. Upload Chunk
                                    let stream = tokio_util::io::ReaderStream::new(chunk);
                                    let body = reqwest::Body::wrap_stream(stream);

                                    let put_client = reqwest::Client::new();
                                    let resp =
                                        put_client.put(&url).body(body).send().await.map_err(
                                            |e| anyhow::anyhow!("Part Upload failed: {}", e),
                                        )?;

                                    if !resp.status().is_success() {
                                        return Err(anyhow::anyhow!(
                                            "Part Upload returned {}",
                                            resp.status()
                                        ));
                                    }

                                    let etag = resp
                                        .headers()
                                        .get("ETag")
                                        .and_then(|h| h.to_str().ok())
                                        .map(|s| s.trim_matches('"').to_string())
                                        .ok_or_else(|| anyhow::anyhow!("No ETag in response"))?;

                                    Ok::<Part, anyhow::Error>(Part { part_number, etag })
                                })
                                .buffer_unordered(CONCURRENCY);

                            // Collect results
                            let mut parts_vec = bodies.try_collect::<Vec<Part>>().await?;
                            parts_vec.sort_by_key(|p| p.part_number);

                            // 2. Complete Multipart
                            client.complete_multipart_upload(&token, parts_vec).await?;

                            // Cleanup temp file
                            let _ = tokio::fs::remove_file(&path_clone).await;

                            Ok(())
                        });

                        if let Err(e) = res {
                            error!("Failed to flush file {}: {}", nid, e);
                            let _ = std::fs::remove_file(&path);
                        } else {
                            self.cache.invalidate_node(&nid);
                        }
                    }
                }
            }
        }

        reply.ok();
    }

    // ============================================================================
    // EXTENDED ATTRIBUTES (xattr)
    // ============================================================================

    fn setxattr(
        &mut self,
        _req: &Request,
        ino: u64,
        name: &OsStr,
        value: &[u8],
        _flags: i32,
        _position: u32,
        reply: fuser::ReplyEmpty,
    ) {
        let name_str = name.to_string_lossy();
        debug!("setxattr: ino={}, name={}", ino, name_str);

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Get current node metadata
        let client = self.client.clone();
        let id = node_id.clone();
        let xattr_name = format!("xattr.{}", name_str);
        let xattr_value = String::from_utf8_lossy(value).to_string();

        match self.rt.block_on(async move {
            // Fetch current metadata
            let node = client.get_node(&id).await?;
            let mut metadata = node.metadata.unwrap_or_else(|| serde_json::json!({}));

            // Set xattr
            metadata[&xattr_name] = serde_json::json!(xattr_value);

            // Update via API
            client.update_node_metadata(&id, metadata).await
        }) {
            Ok(updated_node) => {
                self.cache.put_node(updated_node);
                reply.ok();
            }
            Err(e) => {
                error!("API error in setxattr: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn getxattr(
        &mut self,
        _req: &Request,
        ino: u64,
        name: &OsStr,
        size: u32,
        reply: fuser::ReplyXattr,
    ) {
        let name_str = name.to_string_lossy();
        debug!("getxattr: ino={}, name={}", ino, name_str);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Check cache first
        let node = match self.cache.get_node(&node_id) {
            Some(n) => n,
            None => {
                // Fetch from API
                let client = self.client.clone();
                let id = node_id.clone();
                match self.rt.block_on(async move { client.get_node(&id).await }) {
                    Ok(n) => {
                        self.cache.put_node(n.clone());
                        Arc::new(n)
                    }
                    Err(e) => {
                        error!("API error in getxattr: {}", e);
                        reply.error(Self::api_error_to_errno(&e));
                        return;
                    }
                }
            }
        };

        let xattr_name = format!("xattr.{}", name_str);
        let value = node
            .metadata
            .as_ref()
            .and_then(|m| m.get(&xattr_name))
            .and_then(|v| v.as_str())
            .map(|s| s.as_bytes().to_vec());

        match value {
            Some(data) => {
                if size == 0 {
                    reply.size(data.len() as u32);
                } else if size >= data.len() as u32 {
                    reply.data(&data);
                } else {
                    reply.error(libc::ERANGE);
                }
            }
            None => {
                reply.error(libc::ENODATA);
            }
        }
    }

    fn listxattr(&mut self, _req: &Request, ino: u64, size: u32, reply: fuser::ReplyXattr) {
        debug!("listxattr: ino={}", ino);

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        // Get node (from cache or API)
        let node = match self.cache.get_node(&node_id) {
            Some(n) => n,
            None => {
                let client = self.client.clone();
                let id = node_id.clone();
                match self.rt.block_on(async move { client.get_node(&id).await }) {
                    Ok(n) => {
                        self.cache.put_node(n.clone());
                        Arc::new(n)
                    }
                    Err(e) => {
                        reply.error(Self::api_error_to_errno(&e));
                        return;
                    }
                }
            }
        };

        // Collect xattr names
        let mut names: Vec<u8> = Vec::new();
        if let Some(metadata) = &node.metadata {
            if let Some(obj) = metadata.as_object() {
                for key in obj.keys() {
                    if let Some(xattr_name) = key.strip_prefix("xattr.") {
                        names.extend_from_slice(xattr_name.as_bytes());
                        names.push(0); // Null separator
                    }
                }
            }
        }

        if size == 0 {
            reply.size(names.len() as u32);
        } else if size >= names.len() as u32 {
            reply.data(&names);
        } else {
            reply.error(libc::ERANGE);
        }
    }

    fn removexattr(&mut self, _req: &Request, ino: u64, name: &OsStr, reply: fuser::ReplyEmpty) {
        let name_str = name.to_string_lossy();
        debug!("removexattr: ino={}, name={}", ino, name_str);

        if self.read_only {
            reply.error(libc::EROFS);
            return;
        }

        let node_id = match self.inodes.get_node_id(ino) {
            Some(id) => id,
            None => {
                reply.error(libc::ENOENT);
                return;
            }
        };

        let client = self.client.clone();
        let id = node_id.clone();
        let xattr_name = format!("xattr.{}", name_str);

        match self.rt.block_on(async move {
            let node = client.get_node(&id).await?;
            let mut metadata = node.metadata.unwrap_or_else(|| serde_json::json!({}));

            if let Some(obj) = metadata.as_object_mut() {
                obj.remove(&xattr_name);
            }

            client.update_node_metadata(&id, metadata).await
        }) {
            Ok(updated_node) => {
                self.cache.put_node(updated_node);
                reply.ok();
            }
            Err(e) => {
                error!("API error in removexattr: {}", e);
                reply.error(Self::api_error_to_errno(&e));
            }
        }
    }

    fn forget(&mut self, _req: &Request, ino: u64, nlookup: u64) {
        // debug!("forget: ino={}, nlookup={}", ino, nlookup); // noisy
        self.inodes.forget(ino, nlookup);
    }
}
