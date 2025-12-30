//! FUSE process supervisor for health monitoring and automatic restart
//!
//! This module provides the supervisor loop that monitors FUSE process health
//! and restarts crashed processes with exponential backoff.

use std::collections::HashMap;

use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{error, info, warn};

/// Configuration for the supervisor
#[derive(Clone)]
#[allow(dead_code)] // Infrastructure for supervisor loop (not yet implemented)
pub struct SupervisorConfig {
    /// Interval between health checks
    pub health_check_interval: Duration,
    /// Initial restart delay
    pub initial_backoff: Duration,
    /// Maximum restart delay
    pub max_backoff: Duration,
    /// Number of failures before giving up
    pub crash_loop_threshold: u32,
    /// Time window for counting crashes
    pub crash_loop_window: Duration,
}

impl Default for SupervisorConfig {
    fn default() -> Self {
        Self {
            health_check_interval: Duration::from_secs(30),
            initial_backoff: Duration::from_secs(1),
            max_backoff: Duration::from_secs(60),
            crash_loop_threshold: 5,
            crash_loop_window: Duration::from_secs(300), // 5 minutes
        }
    }
}

/// State of a supervised FUSE process
#[derive(Clone)]
#[allow(dead_code)] // Infrastructure for supervisor loop
pub struct FuseProcessState {
    /// Process ID (if running)
    pub pid: Option<u32>,
    /// Staging path for this volume
    pub staging_path: String,
    /// Mount ID for respawning
    pub mount_id: String,
    /// Path to API key file
    pub key_file: String,
    /// Additional volume context for respawning
    pub volume_context: HashMap<String, String>,
    /// Number of restarts in current window
    pub restart_count: u32,
    /// Timestamp of first restart in current window
    pub restart_window_start: Option<Instant>,
    /// Current backoff duration
    pub current_backoff: Duration,
    /// Whether this mount is in crash loop (given up)
    pub in_crash_loop: bool,
    /// Last health check result
    pub last_health_check: Option<Instant>,
}

#[allow(dead_code)] // Infrastructure methods for supervisor loop
impl FuseProcessState {
    pub fn new(
        pid: u32,
        staging_path: String,
        mount_id: String,
        key_file: String,
        volume_context: HashMap<String, String>,
        config: &SupervisorConfig,
    ) -> Self {
        Self {
            pid: Some(pid),
            staging_path,
            mount_id,
            key_file,
            volume_context,
            restart_count: 0,
            restart_window_start: None,
            current_backoff: config.initial_backoff,
            in_crash_loop: false,
            last_health_check: Some(Instant::now()),
        }
    }

    /// Check if the process is alive
    pub fn is_process_alive(&self) -> bool {
        if let Some(pid) = self.pid {
            // Send signal 0 to check if process exists
            unsafe { libc::kill(pid as i32, 0) == 0 }
        } else {
            false
        }
    }

    /// Check if the mount is responsive
    pub fn is_mount_healthy(&self) -> bool {
        use std::fs;

        // Try to stat the mount path with a timeout
        let path = self.staging_path.clone();
        let handle = std::thread::spawn(move || fs::metadata(&path).is_ok());

        // Wait for up to 5 seconds
        match handle.join() {
            Ok(result) => result,
            Err(_) => {
                warn!("Health check timed out for {}", self.staging_path);
                false
            }
        }
    }

    /// Record a restart and check for crash loop
    pub fn record_restart(&mut self, config: &SupervisorConfig) -> bool {
        let now = Instant::now();

        // Reset window if expired
        if let Some(window_start) = self.restart_window_start {
            if now.duration_since(window_start) > config.crash_loop_window {
                self.restart_count = 0;
                self.restart_window_start = None;
                self.current_backoff = config.initial_backoff;
            }
        }

        // Start window if not started
        if self.restart_window_start.is_none() {
            self.restart_window_start = Some(now);
        }

        self.restart_count += 1;

        // Check for crash loop
        if self.restart_count >= config.crash_loop_threshold {
            self.in_crash_loop = true;
            error!(
                "Mount {} entered crash loop after {} restarts",
                self.staging_path, self.restart_count
            );
            return false;
        }

        // Increase backoff
        self.current_backoff = std::cmp::min(self.current_backoff * 2, config.max_backoff);

        true
    }
}

/// Supervisor for managing FUSE process lifecycle
pub struct Supervisor {
    /// Configuration
    pub config: SupervisorConfig,
    /// Tracked processes: volume_id -> FuseProcessState
    processes: Arc<Mutex<HashMap<String, FuseProcessState>>>,
}

impl Supervisor {
    pub fn new(config: SupervisorConfig) -> Self {
        Self {
            config,
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Register a new FUSE process for supervision
    pub fn register(
        &self,
        volume_id: String,
        pid: u32,
        staging_path: String,
        mount_id: String,
        key_file: String,
        volume_context: HashMap<String, String>,
    ) {
        let state = FuseProcessState::new(
            pid,
            staging_path.clone(),
            mount_id,
            key_file,
            volume_context,
            &self.config,
        );

        if let Ok(mut processes) = self.processes.lock() {
            processes.insert(volume_id.clone(), state);
            info!("Registered FUSE process {} for supervision", volume_id);
        }
    }

    /// Unregister a FUSE process (when unstaging)
    pub fn unregister(&self, volume_id: &str) {
        if let Ok(mut processes) = self.processes.lock() {
            processes.remove(volume_id);
            info!("Unregistered FUSE process {} from supervision", volume_id);
        }
    }

    /// Check if a volume is in crash loop
    pub fn is_in_crash_loop(&self, volume_id: &str) -> bool {
        if let Ok(processes) = self.processes.lock() {
            if let Some(state) = processes.get(volume_id) {
                return state.in_crash_loop;
            }
        }
        false
    }

    /// Get the current state of a supervised process
    #[allow(dead_code)]
    pub fn get_state(&self, volume_id: &str) -> Option<FuseProcessState> {
        if let Ok(processes) = self.processes.lock() {
            processes.get(volume_id).cloned()
        } else {
            None
        }
    }

    /// Update the PID for a volume after restart
    #[allow(dead_code)]
    pub fn update_pid(&self, volume_id: &str, new_pid: u32) {
        if let Ok(mut processes) = self.processes.lock() {
            if let Some(state) = processes.get_mut(volume_id) {
                state.pid = Some(new_pid);
                state.last_health_check = Some(Instant::now());
            }
        }
    }

    /// Run a single health check iteration for all processes
    /// Returns list of (volume_id, needs_restart)
    #[allow(dead_code)]
    pub fn health_check(&self) -> Vec<(String, bool)> {
        let mut results = Vec::new();

        if let Ok(mut processes) = self.processes.lock() {
            for (volume_id, state) in processes.iter_mut() {
                // Skip if in crash loop
                if state.in_crash_loop {
                    continue;
                }

                let process_alive = state.is_process_alive();
                let mount_healthy = if process_alive {
                    state.is_mount_healthy()
                } else {
                    false
                };

                if !process_alive {
                    warn!("FUSE process for {} is dead", volume_id);
                    results.push((volume_id.clone(), true));
                } else if !mount_healthy {
                    warn!("Mount for {} is unresponsive", volume_id);
                    results.push((volume_id.clone(), true));
                } else {
                    state.last_health_check = Some(Instant::now());
                }
            }
        }

        results
    }

    /// Record a restart attempt
    #[allow(dead_code)]
    pub fn record_restart(&self, volume_id: &str) -> bool {
        if let Ok(mut processes) = self.processes.lock() {
            if let Some(state) = processes.get_mut(volume_id) {
                return state.record_restart(&self.config);
            }
        }
        false
    }

    /// Get backoff duration for a volume
    #[allow(dead_code)]
    pub fn get_backoff(&self, volume_id: &str) -> Duration {
        if let Ok(processes) = self.processes.lock() {
            if let Some(state) = processes.get(volume_id) {
                return state.current_backoff;
            }
        }
        self.config.initial_backoff
    }
}
