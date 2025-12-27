use crate::csi::{
    node_server::Node, node_service_capability, NodeExpandVolumeRequest, NodeExpandVolumeResponse,
    NodeGetCapabilitiesRequest, NodeGetCapabilitiesResponse, NodeGetInfoRequest,
    NodeGetInfoResponse, NodeGetVolumeStatsRequest, NodeGetVolumeStatsResponse,
    NodePublishVolumeRequest, NodePublishVolumeResponse, NodeStageVolumeRequest,
    NodeStageVolumeResponse, NodeUnpublishVolumeRequest, NodeUnpublishVolumeResponse,
    NodeUnstageVolumeRequest, NodeUnstageVolumeResponse,
};
use std::collections::HashMap;
use std::os::unix::fs::PermissionsExt;
use std::process::Command;
use tonic::{Request, Response, Status};
use tracing::{error, info, warn};

/// Directory for temporary API key files (secure)
const SECRETS_DIR: &str = "/var/run/secrets/roset";

pub struct NodeService {
    node_id: String,
    /// Track active staging mounts: volume_id -> staging_path
    staging_mounts: std::sync::Mutex<HashMap<String, String>>,
}

impl NodeService {
    pub fn new(node_id: String) -> Self {
        Self {
            node_id,
            staging_mounts: std::sync::Mutex::new(HashMap::new()),
        }
    }

    /// Write API key to a temp file instead of passing via CLI args
    /// Returns the path to the key file
    #[allow(clippy::result_large_err)]
    fn write_temp_api_key(volume_id: &str, api_key: &str) -> Result<String, Status> {
        std::fs::create_dir_all(SECRETS_DIR)
            .map_err(|e| Status::internal(format!("Failed to create secrets dir: {}", e)))?;

        // Use volume_id hash for unique filename
        let key_file = format!("{}/{}.key", SECRETS_DIR, volume_id.replace(':', "_"));

        std::fs::write(&key_file, api_key)
            .map_err(|e| Status::internal(format!("Failed to write API key: {}", e)))?;

        // Set restrictive permissions (0600)
        std::fs::set_permissions(&key_file, std::fs::Permissions::from_mode(0o600))
            .map_err(|e| Status::internal(format!("Failed to set permissions: {}", e)))?;

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
}

#[tonic::async_trait]
impl Node for NodeService {
    async fn node_get_capabilities(
        &self,
        _request: Request<NodeGetCapabilitiesRequest>,
    ) -> Result<Response<NodeGetCapabilitiesResponse>, Status> {
        let caps = vec![node_service_capability::rpc::Type::StageUnstageVolume];

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
        Ok(Response::new(NodeGetInfoResponse {
            node_id: self.node_id.clone(),
            max_volumes_per_node: 0,
            accessible_topology: None,
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

        // Idempotency: check if already mounted
        if Self::is_mounted(&staging_path) {
            info!("Volume {} already staged at {}", volume_id, staging_path);
            return Ok(Response::new(NodeStageVolumeResponse {}));
        }

        // Extract mount parameters from volume_context (NOT volume_id!)
        let mount_id = volume_context
            .get("mountId")
            .ok_or_else(|| Status::invalid_argument("Missing 'mountId' in volume_context"))?;

        let api_url = volume_context
            .get("apiUrl")
            .cloned()
            .unwrap_or_else(|| "https://api.roset.dev".to_string());

        // Optional: ref for mounting a specific commit/ref
        let ref_name = volume_context.get("ref");

        // Read-only mount (from snapshot restore or explicit)
        let read_only = volume_context
            .get("readOnly")
            .map(|v| v == "true")
            .unwrap_or(false);

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
        let key_file = Self::write_temp_api_key(&volume_id, &api_key)?;

        // Build roset-fuse command
        let mut cmd = Command::new("roset-fuse");
        cmd.arg("--mountpoint")
            .arg(&staging_path)
            .arg("--api-url")
            .arg(&api_url)
            .arg("--api-key-file")
            .arg(&key_file)
            .arg("--mount-id")
            .arg(mount_id)
            .arg("--allow-other"); // Required for containers

        // Optional ref (for snapshot/commit mounts)
        if let Some(r) = ref_name {
            cmd.arg("--ref").arg(r);
        }

        // Read-only mount
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
        match cmd.spawn() {
            Ok(_) => {
                info!(
                    "Successfully spawned roset-fuse for {} at staging",
                    volume_id
                );

                // Track the staging mount
                if let Ok(mut mounts) = self.staging_mounts.lock() {
                    mounts.insert(volume_id.clone(), staging_path.clone());
                }

                Ok(Response::new(NodeStageVolumeResponse {}))
            }
            Err(e) => {
                error!("Failed to spawn roset-fuse: {}", e);
                // Cleanup key file on failure
                Self::cleanup_temp_api_key(&volume_id);
                Err(Status::internal(format!(
                    "Failed to spawn fuse mount: {}",
                    e
                )))
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

        if target_path.is_empty() {
            return Err(Status::invalid_argument("Target path missing"));
        }
        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID missing"));
        }
        if staging_path.is_empty() {
            return Err(Status::invalid_argument("Staging target path missing"));
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

        info!(
            "Publishing volume {} from {} to {}",
            volume_id, staging_path, target_path
        );

        // Ensure target directory exists
        if let Err(e) = std::fs::create_dir_all(&target_path) {
            error!("Failed to create target path {}: {}", target_path, e);
            return Err(Status::internal(format!(
                "Failed to create target path: {}",
                e
            )));
        }

        // Bind mount from staging to target
        let mut cmd = Command::new("mount");
        cmd.arg("--bind").arg(&staging_path).arg(&target_path);

        match cmd.output() {
            Ok(o) => {
                if o.status.success() {
                    info!(
                        "Successfully bind mounted {} to {}",
                        staging_path, target_path
                    );

                    // Apply read-only if requested
                    if readonly {
                        let remount = Command::new("mount")
                            .arg("-o")
                            .arg("remount,ro,bind")
                            .arg(&target_path)
                            .output();

                        if let Err(e) = remount {
                            warn!("Failed to remount as read-only: {}", e);
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

    async fn node_get_volume_stats(
        &self,
        _request: Request<NodeGetVolumeStatsRequest>,
    ) -> Result<Response<NodeGetVolumeStatsResponse>, Status> {
        Ok(Response::new(NodeGetVolumeStatsResponse {
            usage: vec![],
            volume_condition: None,
        }))
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
