//! Roset FUSE — Configuration and CLI

use clap::{Parser, ValueEnum};
use std::path::PathBuf;

/// Durability mode for write operations
#[derive(Clone, Copy, Debug, Default, ValueEnum, PartialEq, Eq)]
pub enum DurabilityMode {
    /// Block on close() until upload completes (default, safest)
    #[default]
    Sync,
    /// Return immediately from close(), upload in background (fastest, data at risk until upload)
    Async,
    /// Return immediately from close(), but fsync() blocks until upload completes
    SyncOnFsync,
}

/// Roset FUSE filesystem client
#[derive(Parser, Debug, Clone)]
#[command(name = "roset-fuse")]
#[command(about = "Mount Roset-managed storage as a local filesystem")]
pub struct Config {
    /// Roset API key
    #[arg(long, env = "ROSET_API_KEY")]
    pub api_key: String,

    /// Roset API URL (default: https://api.roset.dev)
    #[arg(long, env = "ROSET_API_URL", default_value = "https://api.roset.dev")]
    pub api_url: String,

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
    /// Deprecated: Use --durability=async instead
    #[arg(long)]
    pub write_back_cache: bool,

    /// Durability mode for write operations
    #[arg(long, value_enum, default_value = "sync")]
    pub durability: DurabilityMode,

    /// Refresh signed URLs this many seconds before expiry (default: 300)
    #[arg(long, default_value = "300")]
    pub url_refresh_buffer: u64,
}

impl Config {
    pub fn parse_args() -> Self {
        Config::parse()
    }
}
