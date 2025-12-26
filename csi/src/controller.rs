use crate::csi::{
    controller_server::Controller, controller_service_capability, ControllerGetCapabilitiesRequest,
    ControllerGetCapabilitiesResponse, ControllerGetVolumeRequest, ControllerGetVolumeResponse,
    ControllerPublishVolumeRequest, ControllerPublishVolumeResponse, ControllerUnpublishVolumeRequest,
    ControllerUnpublishVolumeResponse, CreateVolumeRequest, CreateVolumeResponse, DeleteVolumeRequest,
    DeleteVolumeResponse, GetCapacityRequest, GetCapacityResponse, ListVolumesRequest,
    ListVolumesResponse, ValidateVolumeCapabilitiesRequest, ValidateVolumeCapabilitiesResponse,
    GetSnapshotRequest, GetSnapshotResponse, ControllerModifyVolumeRequest, ControllerModifyVolumeResponse,
    ListSnapshotsRequest, ListSnapshotsResponse, ControllerExpandVolumeRequest, ControllerExpandVolumeResponse,
    CreateSnapshotRequest, CreateSnapshotResponse, DeleteSnapshotRequest, DeleteSnapshotResponse,
};
use tonic::{Request, Response, Status};

pub struct ControllerService {}

impl ControllerService {
    pub fn new() -> Self {
        Self {}
    }
}

#[tonic::async_trait]
impl Controller for ControllerService {
    async fn controller_get_capabilities(
        &self,
        _request: Request<ControllerGetCapabilitiesRequest>,
    ) -> Result<Response<ControllerGetCapabilitiesResponse>, Status> {
        let caps = vec![
            controller_service_capability::rpc::Type::CreateDeleteVolume,
            controller_service_capability::rpc::Type::PublishUnpublishVolume,
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

        // 2. Get parameters (API URL and Base Path)
        let params = req.parameters;
        let api_url = params.get("apiUrl").ok_or_else(|| {
            Status::invalid_argument("Missing 'apiUrl' in StorageClass parameters")
        })?;

        // Default to "/volumes" to avoid root pollution
        let base_path = params
            .get("basePath")
            .map(|s| s.as_str())
            .unwrap_or("/volumes");

        // 3. Setup Client
        let client = reqwest::Client::new();
        let create_node_url = format!("{}/v1/nodes", api_url.trim_end_matches('/'));

        // 4. Ensure Base Path exists
        // We attempt to create it at the root. If it works or conflicts (already exists), we proceed.
        if base_path != "/" {
            let base_name = base_path.trim_start_matches('/');
            // Note: This naive check only supports top-level folders as base_path for now
            // e.g. "/volumes" works, "/my/deep/path" would fail if "/my" doesn't exist
            let base_body = serde_json::json!({
                "name": base_name,
                "type": "folder",
                "parentPath": "/"
            });

            let _ = client
                .post(&create_node_url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&base_body)
                .send()
                .await;
        }

        // 5. Create the Volume Folder
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
            // 6. Handle Conflict: Verify it is a folder
            // Resolve path: base_path + "/" + name
            let full_path = if base_path == "/" {
                format!("/{}", name)
            } else {
                format!("{}/{}", base_path.trim_end_matches('/'), name)
            };

            let resolve_url = format!("{}/v1/resolve", api_url.trim_end_matches('/'));
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

        Ok(Response::new(CreateVolumeResponse {
            volume: Some(crate::csi::Volume {
                volume_id: node_id,
                capacity_bytes: 0,
                volume_context: params,
                content_source: None,
                accessible_topology: vec![],
            }),
        }))
    }

    async fn delete_volume(
        &self,
        _request: Request<DeleteVolumeRequest>,
    ) -> Result<Response<DeleteVolumeResponse>, Status> {
        Err(Status::unimplemented("delete_volume not implemented"))
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
        _request: Request<CreateSnapshotRequest>,
    ) -> Result<Response<CreateSnapshotResponse>, Status> {
        Err(Status::unimplemented("Snapshot not implemented"))
    }

    async fn delete_snapshot(
        &self,
        _request: Request<DeleteSnapshotRequest>,
    ) -> Result<Response<DeleteSnapshotResponse>, Status> {
        Err(Status::unimplemented("Snapshot not implemented"))
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
        _request: Request<ControllerGetVolumeRequest>,
    ) -> Result<Response<ControllerGetVolumeResponse>, Status> {
        Err(Status::unimplemented("Get volume not implemented"))
    }
    async fn get_snapshot(
        &self,
        _request: Request<GetSnapshotRequest>,
    ) -> Result<Response<GetSnapshotResponse>, Status> {
        Err(Status::unimplemented("get_snapshot not implemented"))
    }

    async fn controller_modify_volume(
        &self,
        _request: Request<ControllerModifyVolumeRequest>,
    ) -> Result<Response<ControllerModifyVolumeResponse>, Status> {
        Err(Status::unimplemented("controller_modify_volume not implemented"))
    }
}
