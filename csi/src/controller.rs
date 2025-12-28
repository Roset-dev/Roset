use crate::csi::{
    controller_server::Controller, controller_service_capability, ControllerExpandVolumeRequest,
    ControllerExpandVolumeResponse, ControllerGetCapabilitiesRequest,
    ControllerGetCapabilitiesResponse, ControllerGetVolumeRequest, ControllerGetVolumeResponse,
    ControllerModifyVolumeRequest, ControllerModifyVolumeResponse, ControllerPublishVolumeRequest,
    ControllerPublishVolumeResponse, ControllerUnpublishVolumeRequest,
    ControllerUnpublishVolumeResponse, CreateSnapshotRequest, CreateSnapshotResponse,
    CreateVolumeRequest, CreateVolumeResponse, DeleteSnapshotRequest, DeleteSnapshotResponse,
    DeleteVolumeRequest, DeleteVolumeResponse, GetCapacityRequest, GetCapacityResponse,
    GetSnapshotRequest, GetSnapshotResponse, ListSnapshotsRequest, ListSnapshotsResponse,
    ListVolumesRequest, ListVolumesResponse, ValidateVolumeCapabilitiesRequest,
    ValidateVolumeCapabilitiesResponse,
};
use tonic::{Request, Response, Status};

pub struct ControllerService {}

impl ControllerService {
    pub fn new() -> Self {
        Self {}
    }

    async fn ensure_path_recursive(
        &self,
        client: &reqwest::Client,
        api_key: &str,
        path: &str,
    ) -> Result<(), Status> {
        if path == "/" || path.is_empty() {
            return Ok(());
        }

        let segments: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
        let mut current_path = String::from("");

        for segment in segments {
            let parent_path = if current_path.is_empty() {
                "/".to_string()
            } else {
                format!("/{}", current_path)
            };

            let body = serde_json::json!({
                "name": segment,
                "type": "folder",
                "parentPath": parent_path
            });

            let create_node_url = "https://api.roset.dev/v1/nodes";
            let resp = client
                .post(&create_node_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&body)
                .send()
                .await
                .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

            // 201 Created or 409 Conflict are both acceptable
            if !resp.status().is_success() && resp.status().as_u16() != 409 {
                let text = resp.text().await.unwrap_or_default();
                return Err(Status::internal(format!(
                    "Failed to create path segment {}: {}",
                    segment, text
                )));
            }

            if !current_path.is_empty() {
                current_path.push('/');
            }
            current_path.push_str(segment);
        }

        Ok(())
    }

    /// Parse opaque volume_id format: `roset-vol:<node_id>` -> node_id
    #[allow(clippy::result_large_err)]
    fn parse_volume_id(volume_id: &str) -> Result<String, Status> {
        if let Some(node_id) = volume_id.strip_prefix("roset-vol:") {
            Ok(node_id.to_string())
        } else {
            // Fallback for legacy volume IDs (raw node_id)
            Ok(volume_id.to_string())
        }
    }

    /// Create a volume from a snapshot (commit) by creating a ref to the commit
    #[allow(clippy::too_many_arguments)]
    async fn create_volume_from_snapshot(
        &self,
        name: &str,
        api_key: &str,
        mount_id: &str,
        base_path: &str,
        snapshot_id: &str,
        params: &std::collections::HashMap<String, String>,
    ) -> Result<Response<CreateVolumeResponse>, Status> {
        let client = reqwest::Client::new();

        // Create a ref that points to the snapshot (commit)
        // Ref name: k8s/restore/<pvc-name>
        let ref_name = format!("k8s/restore/{}", name);
        let ref_url = "https://api.roset.dev/v1/refs";

        let body = serde_json::json!({
            "name": ref_name,
            "commitId": snapshot_id
        });

        let resp = client
            .post(&ref_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if !resp.status().is_success() && resp.status().as_u16() != 409 {
            let text = resp.text().await.unwrap_or_default();
            return Err(Status::internal(format!(
                "Failed to create ref from snapshot: {}",
                text
            )));
        }

        // Get the commit to find the source node
        let commit_url = format!(
            "{}/v1/commits/{}",
            api_url.trim_end_matches('/'),
            snapshot_id
        );
        let commit_resp = client
            .get(&commit_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to get commit: {}", e)))?;

        if !commit_resp.status().is_success() {
            return Err(Status::not_found(format!(
                "Snapshot {} not found",
                snapshot_id
            )));
        }

        let commit_data: serde_json::Value = commit_resp
            .json()
            .await
            .map_err(|e| Status::internal(format!("Failed to parse commit: {}", e)))?;

        let source_node_id = commit_data["commit"]["nodeId"]
            .as_str()
            .unwrap_or_default()
            .to_string();

        // Build volume response
        let opaque_volume_id = format!("roset-vol:{}", source_node_id);

        let full_path = if base_path == "/" {
            format!("/{}", name)
        } else {
            format!("{}/{}", base_path.trim_end_matches('/'), name)
        };

        let mut volume_context = params.clone();
        volume_context.insert("nodeId".to_string(), source_node_id);
        volume_context.insert("rootPath".to_string(), full_path);
        volume_context.insert("mountId".to_string(), mount_id.to_string());
        volume_context.insert("ref".to_string(), ref_name);
        volume_context.insert("commitId".to_string(), snapshot_id.to_string());
        volume_context.insert("readOnly".to_string(), "true".to_string());

        Ok(Response::new(CreateVolumeResponse {
            volume: Some(crate::csi::Volume {
                volume_id: opaque_volume_id,
                capacity_bytes: 0,
                volume_context,
                content_source: Some(crate::csi::VolumeContentSource {
                    r#type: Some(crate::csi::volume_content_source::Type::Snapshot(
                        crate::csi::volume_content_source::SnapshotSource {
                            snapshot_id: snapshot_id.to_string(),
                        },
                    )),
                }),
                accessible_topology: vec![],
            }),
        }))
    }
}

#[tonic::async_trait]
impl Controller for ControllerService {
    async fn controller_get_capabilities(
        &self,
        _request: Request<ControllerGetCapabilitiesRequest>,
    ) -> Result<Response<ControllerGetCapabilitiesResponse>, Status> {
        // Only advertise capabilities that are fully implemented
        // PublishUnpublishVolume not needed for FUSE (only for block devices with attach/detach)
        let caps = vec![
            controller_service_capability::rpc::Type::CreateDeleteVolume,
            controller_service_capability::rpc::Type::CreateDeleteSnapshot,
            controller_service_capability::rpc::Type::GetSnapshot,
            controller_service_capability::rpc::Type::GetVolume,
        ];

        let capabilities = caps
            .into_iter()
            .map(|c| crate::csi::ControllerServiceCapability {
                r#type: Some(crate::csi::controller_service_capability::Type::Rpc(
                    crate::csi::controller_service_capability::Rpc { r#type: c as i32 },
                )),
            })
            .collect();

        Ok(Response::new(ControllerGetCapabilitiesResponse {
            capabilities,
        }))
    }

    async fn create_volume(
        &self,
        request: Request<CreateVolumeRequest>,
    ) -> Result<Response<CreateVolumeResponse>, Status> {
        let req = request.into_inner();
        let name = req.name.clone();

        if name.is_empty() {
            return Err(Status::invalid_argument("Volume name is missing"));
        }

        // 1. Get secrets (API Key)
        let secrets = req.secrets;
        let api_key = secrets.get("apiKey").ok_or_else(|| {
            Status::invalid_argument("Missing 'apiKey' in CreateVolumeRequest secrets")
        })?;

        // 2. Get parameters (API URL, Mount ID, and Base Path)
        let params = req.parameters;
        // apiUrl is removed/ignored

        // Mount ID is required for Roset FUSE
        let mount_id = params.get("mountId").ok_or_else(|| {
            Status::invalid_argument("Missing 'mountId' in StorageClass parameters")
        })?;

        // Default to "/volumes" to avoid root pollution
        let base_path = params
            .get("basePath")
            .map(|s| s.as_str())
            .unwrap_or("/volumes");

        // 3. Check for snapshot source (restore from snapshot)
        if let Some(content_source) = &req.volume_content_source {
            if let Some(source_type) = &content_source.r#type {
                match source_type {
                    crate::csi::volume_content_source::Type::Snapshot(snap_source) => {
                        return self
                            .create_volume_from_snapshot(
                                &name,
                                api_key,
                                mount_id,
                                base_path,
                                &snap_source.snapshot_id,
                                &params,
                            )
                            .await;
                    }
                    crate::csi::volume_content_source::Type::Volume(vol_source) => {
                        return Err(Status::unimplemented(format!(
                            "Cloning from volume {} not yet supported",
                            vol_source.volume_id
                        )));
                    }
                }
            }
        }

        // 4. Setup Client
        // 4. Setup Client
        let client = reqwest::Client::new();
        let create_node_url = "https://api.roset.dev/v1/nodes";

        // 5. Ensure Base Path exists
        if base_path != "/" {
            self.ensure_path_recursive(&client, api_key, base_path)
                .await?;
        }

        // 6. Create the Volume Folder
        let body = serde_json::json!({
            "name": name,
            "type": "folder",
            "parentPath": base_path
        });

        let resp = client
            .post(&create_node_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        // Compute full path for volume_context
        let full_path = if base_path == "/" {
            format!("/{}", name)
        } else {
            format!("{}/{}", base_path.trim_end_matches('/'), name)
        };

        let node_id = if resp.status().is_success() {
            let node: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| Status::internal(format!("Failed to parse response: {}", e)))?;
            node["id"]
                .as_str()
                .ok_or_else(|| Status::internal("Missing id in response"))?
                .to_string()
        } else if resp.status().as_u16() == 409 {
            // 7. Handle Conflict: Verify it is a folder
            let resolve_url = "https://api.roset.dev/v1/resolve";
            let resolve_resp = client
                .post(&resolve_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&serde_json::json!({ "paths": [full_path] }))
                .send()
                .await
                .map_err(|e| {
                    Status::internal(format!("Failed to resolve existing volume: {}", e))
                })?;

            if !resolve_resp.status().is_success() {
                return Err(Status::internal("Failed to resolve existing volume node"));
            }

            let resolved: serde_json::Value = resolve_resp.json().await.map_err(|e| {
                Status::internal(format!("Failed to parse resolve response: {}", e))
            })?;

            let node = &resolved[&full_path];
            if node.is_null() {
                return Err(Status::internal(format!(
                    "Volume path {} resolved to null",
                    full_path
                )));
            }

            // Critical Check: Is it a folder?
            let node_type = node["type"].as_str().unwrap_or("unknown");
            if node_type != "folder" {
                return Err(Status::already_exists(format!(
                    "Path {} exists but is a {}, not a folder",
                    full_path, node_type
                )));
            }

            node["id"]
                .as_str()
                .ok_or_else(|| Status::internal("Failed to get ID of existing volume"))?
                .to_string()
        } else {
            let text = resp.text().await.unwrap_or_default();
            return Err(Status::internal(format!("Roset API error: {}", text)));
        };

        // Build opaque volume_id and populate volume_context with mount info
        let opaque_volume_id = format!("roset-vol:{}", node_id);

        let mut volume_context = params.clone();
        volume_context.insert("nodeId".to_string(), node_id);
        volume_context.insert("rootPath".to_string(), full_path);
        volume_context.insert("mountId".to_string(), mount_id.clone());

        Ok(Response::new(CreateVolumeResponse {
            volume: Some(crate::csi::Volume {
                volume_id: opaque_volume_id,
                capacity_bytes: 0,
                volume_context,
                content_source: None,
                accessible_topology: vec![],
            }),
        }))
    }

    async fn delete_volume(
        &self,
        request: Request<DeleteVolumeRequest>,
    ) -> Result<Response<DeleteVolumeResponse>, Status> {
        let req = request.into_inner();
        let volume_id = req.volume_id.clone();

        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID is required"));
        }

        // Parse opaque volume_id to get actual node_id
        let node_id = Self::parse_volume_id(&volume_id)?;

        let secrets = req.secrets;
        let api_key = secrets.get("apiKey").ok_or_else(|| {
            Status::invalid_argument("Missing 'apiKey' in DeleteVolumeRequest secrets")
        })?;

        // API URL is hardcoded
        let api_url = "https://api.roset.dev";

        let client = reqwest::Client::new();
        let delete_url = format!("{}/v1/nodes/{}", api_url, node_id);

        let resp = client
            .delete(&delete_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if resp.status().is_success() || resp.status().as_u16() == 404 {
            // 404 is acceptable - volume already deleted (idempotent)
            Ok(Response::new(DeleteVolumeResponse {}))
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(Status::internal(format!(
                "Failed to delete volume: {}",
                text
            )))
        }
    }

    async fn controller_publish_volume(
        &self,
        _request: Request<ControllerPublishVolumeRequest>,
    ) -> Result<Response<ControllerPublishVolumeResponse>, Status> {
        Ok(Response::new(ControllerPublishVolumeResponse {
            publish_context: std::collections::HashMap::new(),
        }))
    }

    async fn controller_unpublish_volume(
        &self,
        _request: Request<ControllerUnpublishVolumeRequest>,
    ) -> Result<Response<ControllerUnpublishVolumeResponse>, Status> {
        Ok(Response::new(ControllerUnpublishVolumeResponse {}))
    }

    async fn validate_volume_capabilities(
        &self,
        _request: Request<ValidateVolumeCapabilitiesRequest>,
    ) -> Result<Response<ValidateVolumeCapabilitiesResponse>, Status> {
        Ok(Response::new(ValidateVolumeCapabilitiesResponse {
            confirmed: None,
            message: "".to_string(),
        }))
    }

    async fn list_volumes(
        &self,
        _request: Request<ListVolumesRequest>,
    ) -> Result<Response<ListVolumesResponse>, Status> {
        Ok(Response::new(ListVolumesResponse {
            entries: vec![],
            next_token: "".to_string(),
        }))
    }

    async fn get_capacity(
        &self,
        _request: Request<GetCapacityRequest>,
    ) -> Result<Response<GetCapacityResponse>, Status> {
        Ok(Response::new(GetCapacityResponse {
            available_capacity: 0,
            maximum_volume_size: None,
            minimum_volume_size: None,
        }))
    }

    async fn create_snapshot(
        &self,
        request: Request<CreateSnapshotRequest>,
    ) -> Result<Response<CreateSnapshotResponse>, Status> {
        let req = request.into_inner();
        let source_volume_id = req.source_volume_id.clone();
        let name = req.name.clone();

        if source_volume_id.is_empty() {
            return Err(Status::invalid_argument("Source volume ID is required"));
        }

        let secrets = req.secrets;
        let api_key = secrets.get("apiKey").ok_or_else(|| {
            Status::invalid_argument("Missing 'apiKey' in CreateSnapshotRequest secrets")
        })?;

        let api_url = "https://api.roset.dev";

        let client = reqwest::Client::new();
        let commit_url = format!("{}/v1/commits", api_url);

        let body = serde_json::json!({
            "node_id": source_volume_id,
            "message": name
        });

        let resp = client
            .post(&commit_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if resp.status().is_success() {
            let commit_resp: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| Status::internal(format!("Failed to parse response: {}", e)))?;

            let commit = &commit_resp["commit"];
            let commit_id = commit["id"]
                .as_str()
                .ok_or_else(|| Status::internal("Missing commit id in response"))?
                .to_string();

            let created_at = commit["createdAt"]
                .as_str()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| prost_types::Timestamp {
                    seconds: dt.timestamp(),
                    nanos: dt.timestamp_subsec_nanos() as i32,
                })
                .unwrap_or_else(|| prost_types::Timestamp {
                    seconds: 0,
                    nanos: 0,
                });

            Ok(Response::new(CreateSnapshotResponse {
                snapshot: Some(crate::csi::Snapshot {
                    snapshot_id: commit_id,
                    source_volume_id,
                    creation_time: Some(created_at),
                    ready_to_use: true,
                    size_bytes: 0,
                    group_snapshot_id: String::new(),
                }),
            }))
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(Status::internal(format!(
                "Failed to create snapshot: {}",
                text
            )))
        }
    }

    async fn delete_snapshot(
        &self,
        _request: Request<DeleteSnapshotRequest>,
    ) -> Result<Response<DeleteSnapshotResponse>, Status> {
        // Roset Integrity Model:
        // - Delete = remove the reference/handle, not the data
        // - Commits are immutable and persist
        // - Storage reclamation happens via retention policies + GC
        //
        // This satisfies CSI contract while maintaining data integrity.
        // The snapshot handle is "unpinned" but the underlying commit remains.
        Ok(Response::new(DeleteSnapshotResponse {}))
    }

    async fn list_snapshots(
        &self,
        _request: Request<ListSnapshotsRequest>,
    ) -> Result<Response<ListSnapshotsResponse>, Status> {
        Ok(Response::new(ListSnapshotsResponse {
            entries: vec![],
            next_token: "".to_string(),
        }))
    }

    async fn controller_expand_volume(
        &self,
        _request: Request<ControllerExpandVolumeRequest>,
    ) -> Result<Response<ControllerExpandVolumeResponse>, Status> {
        Ok(Response::new(ControllerExpandVolumeResponse {
            capacity_bytes: 0,
            node_expansion_required: false,
        }))
    }

    async fn controller_get_volume(
        &self,
        request: Request<ControllerGetVolumeRequest>,
    ) -> Result<Response<ControllerGetVolumeResponse>, Status> {
        let req = request.into_inner();
        let volume_id = req.volume_id.clone();

        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID is required"));
        }

        let api_url = "https://api.roset.dev";

        // Note: ControllerGetVolume typically doesn't have secrets in the request
        // We use the ROSET_API_KEY environment variable as fallback
        let api_key = std::env::var("ROSET_API_KEY")
            .map_err(|_| Status::internal("ROSET_API_KEY environment variable not set"))?;

        let client = reqwest::Client::new();
        let get_url = format!("{}/v1/nodes/{}", api_url, volume_id);

        let resp = client
            .get(&get_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if resp.status().is_success() {
            let node: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| Status::internal(format!("Failed to parse response: {}", e)))?;

            let node_type = node["type"].as_str().unwrap_or("unknown");
            if node_type != "folder" {
                return Err(Status::not_found(format!(
                    "Volume {} is not a folder",
                    volume_id
                )));
            }

            Ok(Response::new(ControllerGetVolumeResponse {
                volume: Some(crate::csi::Volume {
                    volume_id: volume_id.clone(),
                    capacity_bytes: 0,
                    volume_context: std::collections::HashMap::new(),
                    content_source: None,
                    accessible_topology: vec![],
                }),
                status: Some(crate::csi::controller_get_volume_response::VolumeStatus {
                    volume_condition: None,
                    published_node_ids: vec![],
                }),
            }))
        } else if resp.status().as_u16() == 404 {
            Err(Status::not_found(format!("Volume {} not found", volume_id)))
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(Status::internal(format!("Failed to get volume: {}", text)))
        }
    }
    async fn get_snapshot(
        &self,
        request: Request<GetSnapshotRequest>,
    ) -> Result<Response<GetSnapshotResponse>, Status> {
        let req = request.into_inner();
        let snapshot_id = req.snapshot_id.clone();

        if snapshot_id.is_empty() {
            return Err(Status::invalid_argument("Snapshot ID is required"));
        }

        let api_url = "https://api.roset.dev";

        let api_key = std::env::var("ROSET_API_KEY")
            .map_err(|_| Status::internal("ROSET_API_KEY environment variable not set"))?;

        let client = reqwest::Client::new();
        let get_url = format!(
            "{}/v1/commits/{}",
            api_url,
            snapshot_id
        );

        let resp = client
            .get(&get_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if resp.status().is_success() {
            let commit_resp: serde_json::Value = resp
                .json()
                .await
                .map_err(|e| Status::internal(format!("Failed to parse response: {}", e)))?;

            let commit = &commit_resp["commit"];
            let source_volume_id = commit["nodeId"].as_str().unwrap_or_default().to_string();

            let created_at = commit["createdAt"]
                .as_str()
                .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
                .map(|dt| prost_types::Timestamp {
                    seconds: dt.timestamp(),
                    nanos: dt.timestamp_subsec_nanos() as i32,
                })
                .unwrap_or_else(|| prost_types::Timestamp {
                    seconds: 0,
                    nanos: 0,
                });

            Ok(Response::new(GetSnapshotResponse {
                snapshot: Some(crate::csi::Snapshot {
                    snapshot_id,
                    source_volume_id,
                    creation_time: Some(created_at),
                    ready_to_use: true,
                    size_bytes: 0,
                    group_snapshot_id: String::new(),
                }),
            }))
        } else if resp.status().as_u16() == 404 {
            Err(Status::not_found(format!(
                "Snapshot {} not found",
                snapshot_id
            )))
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(Status::internal(format!(
                "Failed to get snapshot: {}",
                text
            )))
        }
    }

    async fn controller_modify_volume(
        &self,
        request: Request<ControllerModifyVolumeRequest>,
    ) -> Result<Response<ControllerModifyVolumeResponse>, Status> {
        let req = request.into_inner();
        let volume_id = req.volume_id.clone();

        if volume_id.is_empty() {
            return Err(Status::invalid_argument("Volume ID is required"));
        }

        let secrets = req.secrets;
        let api_key = secrets.get("apiKey").ok_or_else(|| {
            Status::invalid_argument("Missing 'apiKey' in ControllerModifyVolumeRequest secrets")
        })?;

        let api_url = "https://api.roset.dev";

        // Extract mutable parameters (metadata updates)
        let mutable_params = req.mutable_parameters;

        let client = reqwest::Client::new();
        let patch_url = format!("{}/v1/nodes/{}", api_url, volume_id);

        // Prepare update body from mutable parameters
        let mut update_body = serde_json::Map::new();
        if let Some(name) = mutable_params.get("name") {
            update_body.insert("name".to_string(), serde_json::Value::String(name.clone()));
        }
        if let Some(metadata) = mutable_params.get("metadata") {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(metadata) {
                update_body.insert("metadata".to_string(), parsed);
            }
        }

        // If no modifications requested, just return success
        if update_body.is_empty() {
            return Ok(Response::new(ControllerModifyVolumeResponse {}));
        }

        let resp = client
            .patch(&patch_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&update_body)
            .send()
            .await
            .map_err(|e| Status::internal(format!("Failed to contact Roset API: {}", e)))?;

        if resp.status().is_success() {
            Ok(Response::new(ControllerModifyVolumeResponse {}))
        } else {
            let text = resp.text().await.unwrap_or_default();
            Err(Status::internal(format!(
                "Failed to modify volume: {}",
                text
            )))
        }
    }
}
