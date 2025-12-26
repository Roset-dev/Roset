use crate::csi::{
    identity_server::Identity, plugin_capability, GetPluginCapabilitiesRequest,
    GetPluginCapabilitiesResponse, GetPluginInfoRequest, GetPluginInfoResponse, ProbeRequest,
    ProbeResponse,
};
use tonic::{Request, Response, Status};

pub struct IdentityService {
    name: String,
    version: String,
}

impl IdentityService {
    pub fn new(name: String, version: String) -> Self {
        Self { name, version }
    }
}

#[tonic::async_trait]
impl Identity for IdentityService {
    async fn get_plugin_info(
        &self,
        _request: Request<GetPluginInfoRequest>,
    ) -> Result<Response<GetPluginInfoResponse>, Status> {
        Ok(Response::new(GetPluginInfoResponse {
            name: self.name.clone(),
            vendor_version: self.version.clone(),
            manifest: std::collections::HashMap::new(),
        }))
    }

    async fn get_plugin_capabilities(
        &self,
        _request: Request<GetPluginCapabilitiesRequest>,
    ) -> Result<Response<GetPluginCapabilitiesResponse>, Status> {
        Ok(Response::new(GetPluginCapabilitiesResponse {
            capabilities: vec![crate::csi::PluginCapability {
                type_: Some(plugin_capability::Type::Service(
                    plugin_capability::Service {
                        type_: plugin_capability::service::Type::ControllerService as i32,
                    },
                )),
            }],
        }))
    }

    async fn probe(
        &self,
        _request: Request<ProbeRequest>,
    ) -> Result<Response<ProbeResponse>, Status> {
        Ok(Response::new(ProbeResponse { ready: Some(true) }))
    }
}
