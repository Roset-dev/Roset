use clap::Parser;
use tokio::net::UnixListener;
use tokio_stream::wrappers::UnixListenerStream;
use tonic::transport::Server;
use tracing::info;

// Include generated proto code
pub mod csi {
    #![allow(clippy::all)]
    tonic::include_proto!("csi.v1");
}

mod controller;
mod identity;
mod node;

use controller::ControllerService;
use csi::controller_server::ControllerServer;
use csi::identity_server::IdentityServer;
use csi::node_server::NodeServer;
use identity::IdentityService;
use node::NodeService;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(long, default_value = "/var/lib/kubelet/plugins/roset-csi/csi.sock")]
    endpoint: String,

    #[arg(long, default_value = "node01")]
    node_id: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();
    info!("Starting Roset CSI Driver");
    info!("Endpoint: {}", args.endpoint);
    info!("Node ID: {}", args.node_id);

    let socket_path = args.endpoint.trim_start_matches("unix://");

    // Ensure directory exists
    if let Some(parent) = std::path::Path::new(socket_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    // Remove old socket if exists
    if std::path::Path::new(socket_path).exists() {
        std::fs::remove_file(socket_path)
            .map_err(|e| format!("Failed to remove old socket: {}", e))?;
    }

    let listener =
        UnixListener::bind(socket_path).map_err(|e| format!("Failed to bind socket: {}", e))?;
    let stream = UnixListenerStream::new(listener);

    let identity = IdentityService::new("io.roset.csi".to_string(), "0.1.0".to_string());
    let node = NodeService::new(args.node_id);
    let controller = ControllerService::new();

    info!("Listening on {}", socket_path);

    Server::builder()
        .add_service(IdentityServer::new(identity))
        .add_service(NodeServer::new(node))
        .add_service(ControllerServer::new(controller))
        .serve_with_incoming(stream)
        .await?;

    Ok(())
}
