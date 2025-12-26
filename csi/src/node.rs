
use tonic::{Request, Response, Status};
use crate::csi::{
    node_server::Node,
    NodePublishVolumeRequest, NodePublishVolumeResponse,
    NodeUnpublishVolumeRequest, NodeUnpublishVolumeResponse,
    NodeGetCapabilitiesRequest, NodeGetCapabilitiesResponse,
    NodeGetInfoRequest, NodeGetInfoResponse,
    NodeStageVolumeRequest, NodeStageVolumeResponse,
    NodeUnstageVolumeRequest, NodeUnstageVolumeResponse,
    NodeGetVolumeStatsRequest, NodeGetVolumeStatsResponse,
    NodeExpandVolumeRequest, NodeExpandVolumeResponse,
    node_service_capability,
};
use std::process::Command;
use tracing::{info, error};

pub struct NodeService {
    node_id: String,
}

impl NodeService {
    pub fn new(node_id: String) -> Self {
        Self { node_id }
    }
}

#[tonic::async_trait]
impl Node for NodeService {
    async fn node_get_capabilities(
        &self,
        _request: Request<NodeGetCapabilitiesRequest>,
    ) -> Result<Response<NodeGetCapabilitiesResponse>, Status> {
        let caps = vec![
            node_service_capability::Rpc::StageUnstageVolume,
        ];

        let capabilities = caps.into_iter().map(|c| crate::csi::NodeServiceCapability {
            type_: Some(crate::csi::node_service_capability::Type::Rpc(
                crate::csi::node_service_capability::Rpc {
                    type_: c as i32,
                },
            )),
        }).collect();

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

    async fn node_stage_volume(
        &self,
        _request: Request<NodeStageVolumeRequest>,
    ) -> Result<Response<NodeStageVolumeResponse>, Status> {
        // Here we would mount the bucket to a staging path if needed
        Ok(Response::new(NodeStageVolumeResponse {}))
    }

    async fn node_unstage_volume(
        &self,
        _request: Request<NodeUnstageVolumeRequest>,
    ) -> Result<Response<NodeUnstageVolumeResponse>, Status> {
        Ok(Response::new(NodeUnstageVolumeResponse {}))
    }

    async fn node_publish_volume(
        &self,
        request: Request<NodePublishVolumeRequest>,
    ) -> Result<Response<NodePublishVolumeResponse>, Status> {
        let req = request.into_inner();
        let target_path = req.target_path;
        let volume_id = req.volume_id;
        let secrets = req.secrets;
        let volume_context = req.volume_context;

        if target_path.is_empty() {
             return Err(Status::invalid_argument("Target path missing"));
        }
        if volume_id.is_empty() {
             return Err(Status::invalid_argument("Volume ID missing"));
        }

        // Extract API Key from secrets
        let api_key = secrets.get("apiKey").cloned().unwrap_or_default();
        if api_key.is_empty() {
             return Err(Status::invalid_argument("Missing apiKey in secrets"));
        }

        // Get API URL from context or default
        let api_url = volume_context.get("apiUrl").cloned().unwrap_or_else(|| "https://api.roset.io".to_string());

        info!("Publishing volume {} to {}", volume_id, target_path);

        // Ensure target directory exists
        if let Err(e) = std::fs::create_dir_all(&target_path) {
            error!("Failed to create target path {}: {}", target_path, e);
            return Err(Status::internal(format!("Failed to create target path: {}", e)));
        }

        // Spawn roset-fuse
        // We run it as a detached process. 
        // In a real K8s CSI DaemonSet, this binary needs to be present in the container image.
        let child = Command::new("roset-fuse")
            .arg("--mountpoint")
            .arg(&target_path)
            .arg("--api-url")
            .arg(&api_url)
            .arg("--api-key")
            .arg(&api_key)
            .arg("--mount-id")
            .arg(&volume_id) // Assuming volume_id corresponds to Roset mount_id
            .arg("--allow-other") // Usually needed for containers
            .spawn();

        match child {
            Ok(_) => {
                info!("Successfully spawned roset-fuse for {}", volume_id);
                Ok(Response::new(NodePublishVolumeResponse {}))
            }
            Err(e) => {
                error!("Failed to spawn roset-fuse: {}", e);
                Err(Status::internal(format!("Failed to spawn fuse mount: {}", e)))
            }
        }
    }

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
        
        // Attempt 1: Standard Unmount (fusermount -u)
        let output = Command::new("fusermount")
            .arg("-u")
            .arg(&target_path)
            .output();

        match output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully unmounted {}", target_path);
                    return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                } 
                
                let stderr = String::from_utf8_lossy(&o.stderr);
                // If it's not mounted (entry not found), that's success (idempotency)
                if stderr.contains("not found") || stderr.contains("Invalid argument") {
                     info!("Volume already unmounted or path not found: {}", target_path);
                     return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                }
                
                // Log the failure reasoning
                warn!("Standard unmount failed for {}: {}", target_path, stderr);
            }
            Err(e) => {
                 warn!("Failed to execute standard unmount command: {}", e);
            }
        }

        // Attempt 2: Lazy Unmount (fusermount -uz)
        // This is crucial for avoiding "zombie" mount points when the pod is dead but file handles are held
        info!("Attempting lazy unmount (fusermount -uz) for {}", target_path);
        
        let lazy_output = Command::new("fusermount")
            .arg("-u")
            .arg("-z") // Lazy unmount
            .arg(&target_path)
            .output();

        match lazy_output {
            Ok(o) => {
                if o.status.success() {
                    info!("Successfully lazy unmounted {}", target_path);
                    Ok(Response::new(NodeUnpublishVolumeResponse {}));
                } else {
                    let stderr = String::from_utf8_lossy(&o.stderr);
                    // Check for idempotency again just in case
                    if stderr.contains("not found") || stderr.contains("Invalid argument") {
                        return Ok(Response::new(NodeUnpublishVolumeResponse {}));
                    }
                    
                    error!("Lazy unmount failed for {}: {}", target_path, stderr);
                    Err(Status::internal(format!("Failed to unmount volume {}: {}", target_path, stderr)))
                }
            }
            Err(e) => {
                 error!("Failed to execute lazy unmount command: {}", e);
                 Err(Status::internal(format!("Failed to execute lazy unmount command: {}", e)))
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
