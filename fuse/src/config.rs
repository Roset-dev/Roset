//! Roset FUSE — Configuration and CLI

use clap::Parser;
use std::path::PathBuf;

/// Roset FUSE filesystem client
#[derive(Parser, Debug, Clone)]
#[command(name = "roset-fuse")]
#[command(about = "Mount Roset-managed storage as a local filesystem")]
pub struct Config {
    /// Roset API base URL
    #[arg(long, env = "ROSET_API_URL", default_value = "https://api.roset.dev")]
    pub api_url: String,

    /// Roset API key
    #[arg(long, env = "ROSET_API_KEY")]
    pub api_key: String,

    /// Mount ID (optional, uses default mount if not specified)
    #[arg(long, env = "ROSET_MOUNT_ID")]
    pub mount_id: Option<String>,

    /// Local mount point
    #[arg(value_name = "MOUNTPOINT")]
    pub mountpoint: PathBuf,

    /// Run in foreground (don't daemonize)
    #[arg(short, long)]
    pub foreground: bool,

    /// Enable debug logging
    #[arg(short, long)]
    pub debug: bool,

    /// Metadata cache TTL in seconds
    #[arg(long, default_value = "300")]
    pub cache_ttl: u64,

    /// Read cache size in MB
    #[arg(long, default_value = "256")]
    pub cache_size_mb: u64,

    /// Allow other users to access the mount
    #[arg(long)]
    pub allow_other: bool,

    /// Read-only mount
    #[arg(long)]
    pub read_only: bool,

    /// Directory for write-back staging (default: .roset/staging)
    #[arg(long, env = "ROSET_STAGING_DIR")]
    pub staging_dir: Option<PathBuf>,

    /// Enable write-back caching (faster writes, lower durability on close)
    #[arg(long)]
    pub write_back_cache: bool,
}

impl Config {
    pub fn parse_args() -> Self {
        Config::parse()
    }
}
