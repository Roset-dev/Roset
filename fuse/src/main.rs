//! Roset FUSE — Main entry point

mod cache;
mod client;
mod config;
mod fs;
mod inode;
mod staging;

use config::Config;
use fs::RosetFs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

fn main() {
    // Parse CLI args
    let config = Config::parse_args();

    // Initialize logging
    let filter = if config.debug {
        EnvFilter::new("debug")
    } else {
        EnvFilter::new("info")
    };

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .init();

    info!("Roset FUSE client v{}", env!("CARGO_PKG_VERSION"));
    info!("API URL: {}", config.api_url);
    info!("Mount point: {:?}", config.mountpoint);

    // Set up graceful shutdown
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    
    ctrlc::set_handler(move || {
        warn!("Received shutdown signal, unmounting...");
        r.store(false, Ordering::SeqCst);
    }).expect("Error setting signal handler");

    // Create filesystem
    let roset_fs = match RosetFs::new(&config) {
        Ok(fs) => fs,
        Err(e) => {
            error!("Failed to create filesystem: {}", e);
            std::process::exit(1);
        }
    };

    // Initialize root
    if let Err(e) = roset_fs.init_root() {
        error!("Failed to initialize root: {}", e);
        std::process::exit(1);
    }

    info!("Filesystem initialized, mounting...");

    // Mount (this blocks until unmount)
    if let Err(e) = roset_fs.mount(&config.mountpoint, &config) {
        error!("Mount error: {}", e);
        std::process::exit(1);
    }

    info!("Filesystem unmounted cleanly");
}
