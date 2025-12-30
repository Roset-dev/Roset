use crate::csi::{
    node_server::Node, node_service_capability, volume_usage, NodeExpandVolumeRequest,
    NodeExpandVolumeResponse, NodeGetCapabilitiesRequest, NodeGetCapabilitiesResponse,
    NodeGetInfoRequest, NodeGetInfoResponse, NodeGetVolumeStatsRequest, NodeGetVolumeStatsResponse,
    NodePublishVolumeRequest, NodePublishVolumeResponse, NodeStageVolumeRequest,
    NodeStageVolumeResponse, NodeUnpublishVolumeRequest, NodeUnpublishVolumeResponse,
    NodeUnstageVolumeRequest, NodeUnstageVolumeResponse, VolumeUsage,
};
use crate::supervisor::{Supervisor, SupervisorConfig};
use std::collections::HashMap;
use std::os::unix::fs::PermissionsExt;
use std::process::Command;
use std::sync::Arc;
use tonic::{Request, Response, Status};
use tracing::{error, info, warn};

/// Directory for temporary API key files (secure)
const SECRETS_DIR: &str = "/var/run/secrets/roset";

pub struct NodeService {
    node_id: String,
    /// Track active staging mounts: volume_id -> staging_path
    staging_mounts: std::sync::Mutex<HashMap<String, String>>,
    /// Supervisor for FUSE process health monitoring
    supervisor: Arc<Supervisor>,
}

impl NodeService {
    pub fn new(node_id: String) -> Self {
        Self {
            node_id,
            staging_mounts: std::sync::Mutex::new(HashMap::new()),
            supervisor: Arc::new(Supervisor::new(SupervisorConfig::default())),
        }
    }

    /// Write API key to a temp file instead of passing via CLI args
    /// Returns the path to the key file
    fn write_temp_api_key(volume_id: &str, api_key: &str) -> Result<String, Box<Status>> {
        std::fs::create_dir_all(SECRETS_DIR).map_err(|e| {
            Box::new(Status::internal(format!(
                "Failed to create secrets dir: {}",
                e
            )))
        })?;

        // Use volume_id hash for unique filename
        let key_file = format!("{}/{}.key", SECRETS_DIR, volume_id.replace(':', "_"));

        std::fs::write(&key_file, api_key)
            .map_err(|e| Box::new(Status::internal(format!("Failed to write API key: {}", e))))?;

        // Set restrictive permissions (0600)
        std::fs::set_permissions(&key_file, std::fs::Permissions::from_mode(0o600)).map_err(
            |e| {
                Box::new(Status::internal(format!(
                    "Failed to set permissions: {}",
                    e
                )))
            },
        )?;

        Ok(key_file)
    }

    /// Clean up temp API key file
    fn cleanup_temp_api_key(volume_id: &str) {
        let key_file = format!("{}/{}.key", SECRETS_DIR, volume_id.replace(':', "_"));
        if let Err(e) = std::fs::remove_file(&key_file) {
            warn!("Failed to cleanup API key file: {}", e);
        }
    }

    /// Check if a path is already mounted
    fn is_mounted(path: &str) -> bool {
        Command::new("mountpoint")
            .arg("-q")
            .arg(path)
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Spawn the roset-fuse process and return its PID
    fn spawn_fuse_process(
        staging_path: &str,
        key_file: &str,
        mount_id: &str,
        volume_context: &HashMap<String, String>,
    ) -> Result<u32, Box<Status>> {
        let mut cmd = Command::new("roset-fuse");
        cmd.arg("--mountpoint")
            .arg(staging_path)
            .arg("--api-key-file")
            .arg(key_file)
            .arg("--mount-id")
            .arg(mount_id)
            .arg("--allow-other"); // Required for containers

        // Optional ref (for snapshot/commit mounts)
        if let Some(r) = volume_context.get("ref") {
            cmd.arg("--ref").arg(r);
        }

        // Read-only mount
        let read_only = volume_context
            .get("readOnly")
            .map(|v| v == "true")
            .unwrap_or(false);
        if read_only {
            cmd.arg("--read-only");
        }

        // ML Performance tuning from StorageClass
        if let Some(cache_dir) = volume_context.get("cacheDir") {
            cmd.arg("--cache-dir").arg(cache_dir);
        }
        if let Some(cache_size) = volume_context.get("cacheSizeGi") {
            cmd.arg("--cache-size-gb").arg(cache_size);
        }
        if let Some(read_ahead) = volume_context.get("readAhead") {
            cmd.arg("--read-ahead").arg(read_ahead);
        }

        // Spawn FUSE process (detached)
        let child = cmd.spawn().map_err(|e| {
            Box::new(Status::internal(format!(
                "Failed to spawn fuse mount: {}",
                e
            )))
        })?;

        Ok(child.id())
    }

    /// Start the background supervisor monitor loop
    pub fn start_monitor(&self) {
        let supervisor = self.supervisor.clone();

        tokio::spawn(async move {
            info!("Starting supervisor monitor loop");
            loop {
                tokio::time::sleep(supervisor.config.health_check_interval).await;

                let issues = supervisor.health_check();
                for (volume_id, needs_restart) in issues {
                    if needs_restart {
                        // Check active state
                        if let Some(state) = supervisor.get_state(&volume_id) {
                            // Apply backoff
                            let backoff = supervisor.get_backoff(&volume_id);
                            info!(
                                "Volume {} needs restart. Backing off for {:?}",
                                volume_id, backoff
                            );

                            // We spawn a recovery task to avoid blocking the main loop
                            let sup_clone = supervisor.clone();
                            let vol_id_clone = volume_id.clone();
                            let state_clone = state.clone();

                            tokio::spawn(async move {
                                tokio::time::sleep(backoff).await;

                                info!("Restarting mount for volume {}", vol_id_clone);
                                match Self::spawn_fuse_process(
                                    &state_clone.staging_path,
                                    &state_clone.key_file,
                                    &state_clone.mount_id,
                                    &state_clone.volume_context,
                                ) {
                                    Ok(pid) => {
                                        info!(
                                            "Successfully restarted roset-fuse (PID {}) for {}",
                                            pid, vol_id_clone
                                        );
                                        sup_clone.update_pid(&vol_id_clone, pid);
                                        sup_clone.record_restart(&vol_id_clone);
                                    }
                                    Err(e) => {
                                        error!(
                                            "Failed to restart mount for {}: {}",
                                            vol_id_clone, e
                                        );
                                        // Record restart simply to increase backoff/count towards crash loop
                                        sup_clone.record_restart(&vol_id_clone);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });
    }
}

#[tonic::async_trait]
impl Node for NodeService {
    async fn node_get_capabilities(
        &self,
        _request: Request<NodeGetCapabilitiesRequest>,
    ) -> Result<Response<NodeGetCapabilitiesResponse>, Status> {
        let caps = vec![
            node_service_capability::rpc::Type::StageUnstageVolume,
            node_service_capability::rpc::Type::GetVolumeStats,
        ];

        let capabilities = caps
            .into_iter()
            .map(|c| crate::csi::NodeServiceCapability {
                r#type: Some(crate::csi::node_service_capability::Type::Rpc(
                    crate::csi::node_service_capability::Rpc { r#type: c as i32 },
                )),
            })
            .collect();

        Ok(Response::new(NodeGetCapabilitiesResponse { capabilities }))
    }

    async fn node_get_info(
        &self,
        _request: Request<NodeGetInfoRequest>,
    ) -> Result<Response<NodeGetInfoResponse>, Status> {
        // Read cloud provider metadata from environment if available
        let zone = std::env::var("NODE_ZONE").unwrap_or_default();
        let region = std::env::var("NODE_REGION").unwrap_or_default();

        let accessible_topology = if !zone.is_empty() || !region.is_empty() {
            let mut segments = std::collections::HashMap::new();
            if !zone.is_empty() {
                segments.insert("topology.kubernetes.io/zone".to_string(), zone);
            }
            if !region.is_empty() {
                segments.insert("topology.kubernetes.io/region".to_string(), region);
            }
            Some(crate::csi::Topology { segments })
        } else {
            None
        };

        Ok(Response::new(NodeGetInfoResponse {
            node_id: self.node_id.clone(),
            max_volumes_per_node: 0,
            accessible_topology,
        }))
    }

    /// Stage the volume: Mount FUSE at a global staging path
    /// This is called ONCE per volume per node (shared by all pods)
    async fn node_stage_volume(
        &self,
        request: Request<NodeStageVolumeRequest>,
    ) -> Result<Response<NodeStageVolumeResponse>, Status> {
        let req = request.into_inner();
        let staging_path = req.staging_target_path;
        let volume_id = req.volume_id;
        let volume_context = req.volume_context;
        let secrets = req.secrets;

        if staging_path.is_empty() {
            return Err(Status::invalid_argument("Staging target path missing"));
        }
        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID missing"));
        }

        // Check if in crash loop
        if self.supervisor.is_in_crash_loop(&volume_id) {
            return Err(Status::internal(format!(
                "Volume {} is in crash loop, refusing to stage",
                volume_id
            )));
        }

        // Idempotency: check if already mounted
        if Self::is_mounted(&staging_path) {
            info!("Volume {} already staged at {}", volume_id, staging_path);
            return Ok(Response::new(NodeStageVolumeResponse {}));
        }

        // Extract mount parameters from volume_context (NOT volume_id!)
        let mount_id = volume_context
            .get("mountId")
            .ok_or_else(|| Status::invalid_argument("Missing 'mountId' in volume_context"))?;

        // Extract API Key from secrets
        let api_key = secrets.get("apiKey").cloned().unwrap_or_default();
        if api_key.is_empty() {
            return Err(Status::invalid_argument("Missing apiKey in secrets"));
        }

        info!(
            "Staging volume {} (mount_id={}) at {}",
            volume_id, mount_id, staging_path
        );

        // Ensure staging directory exists
        if let Err(e) = std::fs::create_dir_all(&staging_path) {
            error!("Failed to create staging path {}: {}", staging_path, e);
            return Err(Status::internal(format!(
                "Failed to create staging path: {}",
                e
            )));
        }

        // Write API key to temp file (security: not in CLI args)
        let key_file = Self::write_temp_api_key(&volume_id, &api_key).map_err(|e| *e)?;

        // Spawn roset-fuse
        match Self::spawn_fuse_process(&staging_path, &key_file, mount_id, &volume_context) {
            Ok(pid) => {
                info!(
                    "Successfully spawned roset-fuse (PID {}) for {} at staging",
                    pid, volume_id
                );

                // Track the staging mount
                if let Ok(mut mounts) = self.staging_mounts.lock() {
                    mounts.insert(volume_id.clone(), staging_path.clone());
                }

                // Register with supervisor for health monitoring
                self.supervisor.register(
                    volume_id.clone(),
                    pid,
                    staging_path.clone(),
                    mount_id.clone(),
                    key_file,
                    volume_context,
                );

                Ok(Response::new(NodeStageVolumeResponse {}))
            }
            Err(e) => {
                error!("Failed to spawn roset-fuse: {}", e);
                // Cleanup key file on failure
                Self::cleanup_temp_api_key(&volume_id);
                Err(*e)
            }
        }
    }

    /// Unstage the volume: Unmount FUSE from staging path
    /// Called when NO pods are using the volume on this node
    async fn node_unstage_volume(
        &self,
        request: Request<NodeUnstageVolumeRequest>,
    ) -> Result<Response<NodeUnstageVolumeResponse>, Status> {
        let req = request.into_inner();
        let staging_path = req.staging_target_path;
        let volume_id = req.volume_id;

        if staging_path.is_empty() {
            return Err(Status::invalid_argument("Staging target path missing"));
        }

        info!("Unstaging volume {} from {}", volume_id, staging_path);

        // Unregister from supervisor
        self.supervisor.unregister(&volume_id);

        // Idempotency: if not mounted, return success
        if !Self::is_mounted(&staging_path) {
            info!(
                "Volume {} already unstaged from {}",
                volume_id, staging_path
            );
            // Clean up tracking
            if let Ok(mut mounts) = self.staging_mounts.lock() {
                mounts.remove(&volume_id);
            }
            Self::cleanup_temp_api_key(&volume_id);
            return Ok(Response::new(NodeUnstageVolumeResponse {}));
        }

        // Attempt standard FUSE unmount
        let output = Command::new("fusermount")
            .arg("-u")
            .arg(&staging_path)
            .output();

        match output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully unmounted FUSE at {}", staging_path);
                    if let Ok(mut mounts) = self.staging_mounts.lock() {
                        mounts.remove(&volume_id);
                    }
                    Self::cleanup_temp_api_key(&volume_id);
                    return Ok(Response::new(NodeUnstageVolumeResponse {}));
                }

                let stderr = String::from_utf8_lossy(&o.stderr);
                if stderr.contains("not found") || stderr.contains("Invalid argument") {
                    info!("Volume already unmounted: {}", staging_path);
                    if let Ok(mut mounts) = self.staging_mounts.lock() {
                        mounts.remove(&volume_id);
                    }
                    Self::cleanup_temp_api_key(&volume_id);
                    return Ok(Response::new(NodeUnstageVolumeResponse {}));
                }

                warn!("Standard unmount failed for {}: {}", staging_path, stderr);
            }
            Err(e) => {
                warn!("Failed to execute fusermount: {}", e);
            }
        }

        // Fallback: lazy unmount
        info!("Attempting lazy unmount for {}", staging_path);
        let lazy_output = Command::new("fusermount")
            .arg("-u")
            .arg("-z")
            .arg(&staging_path)
            .output();

        match lazy_output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully lazy unmounted {}", staging_path);
                    if let Ok(mut mounts) = self.staging_mounts.lock() {
                        mounts.remove(&volume_id);
                    }
                    Self::cleanup_temp_api_key(&volume_id);
                    Ok(Response::new(NodeUnstageVolumeResponse {}))
                } else {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    if stderr.contains("not found") || stderr.contains("Invalid argument") {
                        if let Ok(mut mounts) = self.staging_mounts.lock() {
                            mounts.remove(&volume_id);
                        }
                        Self::cleanup_temp_api_key(&volume_id);
                        return Ok(Response::new(NodeUnstageVolumeResponse {}));
                    }
                    error!("Lazy unmount failed for {}: {}", staging_path, stderr);
                    Err(Status::internal(format!("Failed to unmount: {}", stderr)))
                }
            }
            Err(e) => {
                error!("Failed to execute lazy unmount: {}", e);
                Err(Status::internal(format!(
                    "Failed to execute unmount: {}",
                    e
                )))
            }
        }
    }

    /// Publish the volume: Bind mount from staging to pod target path
    /// This is called for EACH pod that uses the volume
    async fn node_publish_volume(
        &self,
        request: Request<NodePublishVolumeRequest>,
    ) -> Result<Response<NodePublishVolumeResponse>, Status> {
        let req = request.into_inner();
        let target_path = req.target_path;
        let volume_id = req.volume_id;
        let staging_path = req.staging_target_path;
        let readonly = req.readonly;
        let volume_context = req.volume_context;

        if target_path.is_empty() {
            return Err(Status::invalid_argument("Target path missing"));
        }
        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID missing"));
        }
        if staging_path.is_empty() {
            return Err(Status::invalid_argument("Staging target path missing"));
        }

        // Check if in crash loop
        if self.supervisor.is_in_crash_loop(&volume_id) {
            return Err(Status::internal(format!(
                "Volume {} is in crash loop",
                volume_id
            )));
        }

        // Idempotency: check if already mounted
        if Self::is_mounted(&target_path) {
            info!("Volume {} already published at {}", volume_id, target_path);
            return Ok(Response::new(NodePublishVolumeResponse {}));
        }

        // Verify staging mount exists
        if !Self::is_mounted(&staging_path) {
            return Err(Status::failed_precondition(format!(
                "Staging path {} is not mounted. NodeStageVolume must be called first.",
                staging_path
            )));
        }

        // Support subdirectory mounting via volumeContext["subdir"]
        let subdir = volume_context
            .get("subdir")
            .map(|s| s.as_str())
            .unwrap_or("");
        let source_path = if subdir.is_empty() {
            staging_path.clone()
        } else {
            format!(
                "{}/{}",
                staging_path.trim_end_matches('/'),
                subdir.trim_start_matches('/')
            )
        };

        info!(
            "Publishing volume {} from {} to {}",
            volume_id, source_path, target_path
        );

        // Ensure target directory exists
        if let Err(e) = std::fs::create_dir_all(&target_path) {
            error!("Failed to create target path {}: {}", target_path, e);
            return Err(Status::internal(format!(
                "Failed to create target path: {}",
                e
            )));
        }

        // Ensure subdir exists if specified
        if !subdir.is_empty() {
            if let Err(e) = std::fs::create_dir_all(&source_path) {
                error!("Failed to create subdir path {}: {}", source_path, e);
                return Err(Status::internal(format!(
                    "Failed to create subdir path: {}",
                    e
                )));
            }
        }

        // Bind mount from source (staging or staging/subdir) to target
        let mut cmd = Command::new("mount");
        cmd.arg("--bind").arg(&source_path).arg(&target_path);

        match cmd.output() {
            Ok(o) => {
                if o.status.success() {
                    info!(
                        "Successfully bind mounted {} to {}",
                        source_path, target_path
                    );

                    // Apply read-only if requested (remount with ro flag)
                    if readonly {
                        let remount = Command::new("mount")
                            .arg("-o")
                            .arg("remount,ro,bind")
                            .arg(&target_path)
                            .output();

                        match remount {
                            Ok(r) if !r.status.success() => {
                                let stderr = String::from_utf8_lossy(&r.stderr);
                                warn!("Failed to remount as read-only: {}", stderr);
                            }
                            Err(e) => {
                                warn!("Failed to remount as read-only: {}", e);
                            }
                            _ => {
                                info!("Remounted {} as read-only", target_path);
                            }
                        }
                    }

                    Ok(Response::new(NodePublishVolumeResponse {}))
                } else {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    error!("Bind mount failed: {}", stderr);
                    Err(Status::internal(format!("Bind mount failed: {}", stderr)))
                }
            }
            Err(e) => {
                error!("Failed to execute bind mount: {}", e);
                Err(Status::internal(format!("Failed to execute mount: {}", e)))
            }
        }
    }

    /// Unpublish the volume: Unbind from pod target path
    async fn node_unpublish_volume(
        &self,
        request: Request<NodeUnpublishVolumeRequest>,
    ) -> Result<Response<NodeUnpublishVolumeResponse>, Status> {
        let req = request.into_inner();
        let target_path = req.target_path;

        if target_path.is_empty() {
            return Err(Status::invalid_argument("Target path missing"));
        }

        info!("Unpublishing volume from {}", target_path);

        // Idempotency: if not mounted, return success
        if !Self::is_mounted(&target_path) {
            info!("Target path {} already unmounted", target_path);
            return Ok(Response::new(NodeUnpublishVolumeResponse {}));
        }

        // Standard umount (not fusermount - this is a bind mount)
        let output = Command::new("umount").arg(&target_path).output();

        match output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully unmounted bind mount at {}", target_path);
                    return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                }

                let stderr = String::from_utf8_lossy(&o.stderr);
                if stderr.contains("not mounted") || stderr.contains("Invalid argument") {
                    return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                }

                warn!("Standard umount failed for {}: {}", target_path, stderr);
            }
            Err(e) => {
                warn!("Failed to execute umount: {}", e);
            }
        }

        // Fallback: lazy umount
        let lazy_output = Command::new("umount").arg("-l").arg(&target_path).output();

        match lazy_output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully lazy unmounted {}", target_path);
                    Ok(Response::new(NodeUnpublishVolumeResponse {}))
                } else {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    if stderr.contains("not mounted") {
                        return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                    }
                    error!("Lazy umount failed for {}: {}", target_path, stderr);
                    Err(Status::internal(format!("Failed to unmount: {}", stderr)))
                }
            }
            Err(e) => {
                error!("Failed to execute lazy umount: {}", e);
                Err(Status::internal(format!("Failed to execute umount: {}", e)))
            }
        }
    }

    /// Return volume stats for kubelet metrics and eviction signals
    async fn node_get_volume_stats(
        &self,
        request: Request<NodeGetVolumeStatsRequest>,
    ) -> Result<Response<NodeGetVolumeStatsResponse>, Status> {
        let req = request.into_inner();
        let volume_path = req.volume_path;

        if volume_path.is_empty() {
            return Err(Status::invalid_argument("Volume path is required"));
        }

        // Use nix::sys::statvfs to get filesystem statistics
        match nix::sys::statvfs::statvfs(volume_path.as_str()) {
            Ok(stats) => {
                let block_size = stats.block_size() as i64;
                let total_bytes = (stats.blocks() as i64) * block_size;
                let available_bytes = (stats.blocks_available() as i64) * block_size;
                let used_bytes = total_bytes - available_bytes;

                let total_inodes = stats.files() as i64;
                let free_inodes = stats.files_free() as i64;
                let used_inodes = total_inodes - free_inodes;

                Ok(Response::new(NodeGetVolumeStatsResponse {
                    usage: vec![
                        VolumeUsage {
                            available: available_bytes,
                            total: total_bytes,
                            used: used_bytes,
                            unit: volume_usage::Unit::Bytes as i32,
                        },
                        VolumeUsage {
                            available: free_inodes,
                            total: total_inodes,
                            used: used_inodes,
                            unit: volume_usage::Unit::Inodes as i32,
                        },
                    ],
                    volume_condition: None,
                }))
            }
            Err(e) => {
                warn!("Failed to stat volume {}: {}", volume_path, e);
                // Return empty stats rather than error (more graceful for FUSE)
                Ok(Response::new(NodeGetVolumeStatsResponse {
                    usage: vec![],
                    volume_condition: None,
                }))
            }
        }
    }

    async fn node_expand_volume(
        &self,
        _request: Request<NodeExpandVolumeRequest>,
    ) -> Result<Response<NodeExpandVolumeResponse>, Status> {
        Ok(Response::new(NodeExpandVolumeResponse {
            capacity_bytes: 0,
        }))
    }
}
