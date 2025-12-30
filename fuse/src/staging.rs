use crate::client::{Part, RosetClient};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use futures::StreamExt;

/// Message sent to the staging worker
#[derive(Debug, Serialize, Deserialize)]
struct UploadJob {
    file_path: PathBuf,
    node_id: String,
    upload_token: String,
    total_size: u64,
    #[serde(default)]
    completed_parts: Vec<Part>,
}

/// Manages background uploads for write-back caching
#[derive(Clone)]
pub struct StagingManager {
    sender: mpsc::Sender<UploadJob>,
    staging_root: PathBuf,
}

impl StagingManager {
    pub fn new(client: Arc<RosetClient>, staging_root: PathBuf) -> Self {
        let (tx, mut rx) = mpsc::channel::<UploadJob>(100);
        let root = staging_root.clone();

        // Ensure staging and failed directories exist
        let failed_dir = root.join("failed");
        if !root.exists() {
            std::fs::create_dir_all(&root).expect("Failed to create staging directory");
        }
        if !failed_dir.exists() {
            std::fs::create_dir_all(&failed_dir)
                .expect("Failed to create staging failed directory");
        }

        // Hydrate pending jobs from disk (crash recovery)
        let rt = tokio::runtime::Handle::current();
        let tx_clone = tx.clone();
        let root_clone = root.clone();

        rt.spawn(async move {
            info!("Hydrating pending uploads from {:?}", root_clone);
            match fs::read_dir(&root_clone).await {
                Ok(mut entries) => {
                    while let Ok(Some(entry)) = entries.next_entry().await {
                        let path = entry.path();
                        if path.extension().and_then(|s| s.to_str()) == Some("json") {
                            // Found a job file
                            match fs::read(&path).await {
                                Ok(content) => {
                                    match serde_json::from_slice::<UploadJob>(&content) {
                                        Ok(job) => {
                                            if job.file_path.exists() {
                                                info!("Recovered job for node {}", job.node_id);
                                                if let Err(e) = tx_clone.send(job).await {
                                                    error!("Failed to re-queue job: {}", e);
                                                }
                                            } else {
                                                warn!(
                                                    "Orphaned job file (data missing): {:?}",
                                                    path
                                                );
                                                let _ = fs::remove_file(path).await;
                                            }
                                        }
                                        Err(e) => {
                                            error!("Failed to parse job file {:?}: {}", path, e);
                                            // Move to failed
                                            let dest = root_clone
                                                .join("failed")
                                                .join(path.file_name().unwrap());
                                            let _ = fs::rename(path, dest).await;
                                        }
                                    }
                                }
                                Err(e) => error!("Failed to read job file {:?}: {}", path, e),
                            }
                        }
                    }
                }
                Err(e) => error!("Failed to read staging directory: {}", e),
            }
        });

        // Spawn background worker
        tokio::spawn(async move {
            info!("Staging worker started. Watching {:?}", root);

            while let Some(mut job) = rx.recv().await {
                let client = client.clone();
                let job_info = format!("{} ({})", job.node_id, job.file_path.display());
                info!("Processing background upload for {}", job_info);

                // Retry loop
                let mut attempts = 0;
                let max_attempts = 5;
                let mut success = false;

                while attempts < max_attempts {
                    match process_upload(&client, &mut job).await {
                        Ok(_) => {
                            info!("Successfully uploaded {}", job_info);
                            // Cleanup data file
                            if let Err(e) = fs::remove_file(&job.file_path).await {
                                error!(
                                    "Failed to remove staged file {}: {}",
                                    job.file_path.display(),
                                    e
                                );
                            }
                            // Cleanup job file
                            let job_file_path = job.file_path.with_extension("job.json");
                            if let Err(e) = fs::remove_file(&job_file_path).await {
                                // It's okay if it doesn't exist (legacy), but log error otherwise
                                if e.kind() != std::io::ErrorKind::NotFound {
                                    error!(
                                        "Failed to remove job file {}: {}",
                                        job_file_path.display(),
                                        e
                                    );
                                }
                            }
                            success = true;
                            break;
                        }
                        Err(e) => {
                            attempts += 1;
                            error!(
                                "Upload attempt {}/{} failed for {}: {}",
                                attempts, max_attempts, job_info, e
                            );
                            tokio::time::sleep(Duration::from_secs(2u64.pow(attempts))).await;
                        }
                    }
                }

                if !success {
                    error!(
                        "FATAL: Failed to upload {} after {} attempts. Moving to DLQ.",
                        job_info, max_attempts
                    );

                    // Move data to failed/
                    let file_name = job.file_path.file_name().unwrap();
                    let failed_dest = root.join("failed").join(file_name);
                    if let Err(e) = fs::rename(&job.file_path, &failed_dest).await {
                        error!("Failed to move data to DLQ: {}", e);
                    }

                    // Move job to failed/
                    let job_file_path = job.file_path.with_extension("job.json");
                    let job_failed_dest =
                        root.join("failed").join(job_file_path.file_name().unwrap());
                    if let Err(e) = fs::rename(&job_file_path, &job_failed_dest).await {
                        error!("Failed to move job file to DLQ: {}", e);
                    }
                }
            }
        });

        Self {
            sender: tx,
            staging_root,
        }
    }

    /// Stage a file for background upload
    pub async fn stage_file(
        &self,
        source_path: &Path,
        node_id: String,
        upload_token: String,
        size: u64,
    ) -> Result<()> {
        let file_name = format!("{}_{}", node_id, uuid::Uuid::new_v4());
        let dest_path = self.staging_root.join(&file_name);

        debug!("Moving {:?} to staging area {:?}", source_path, dest_path);
        if fs::rename(source_path, &dest_path).await.is_err() {
            // If rename fails (cross-device), copy and delete
            fs::copy(source_path, &dest_path).await?;
            fs::remove_file(source_path).await?;
        }

        let job = UploadJob {
            file_path: dest_path.clone(),
            node_id,
            upload_token,
            total_size: size,
            completed_parts: Vec::new(),
        };

        // Persist job metadata
        let job_file_path = dest_path.with_extension("job.json");
        let job_json = serde_json::to_vec(&job)?;
        fs::write(&job_file_path, job_json).await?;

        self.sender
            .send(job)
            .await
            .map_err(|e| anyhow::anyhow!("Failed into enqueue upload job: {}", e))?;

        Ok(())
    }
}

const CONCURRENCY: usize = 5;
const PART_SIZE: u64 = 20 * 1024 * 1024; // 20MB

async fn process_upload(client: &RosetClient, job: &mut UploadJob) -> Result<()> {
    if !job.file_path.exists() {
        return Err(anyhow::anyhow!(
            "Staged file not found: {:?}",
            job.file_path
        ));
    }

    let iterations = if job.total_size > 0 {
        job.total_size.div_ceil(PART_SIZE)
    } else {
        1
    };

    let existing_parts: std::collections::HashSet<u32> =
        job.completed_parts.iter().map(|p| p.part_number).collect();

    // Create a vector of pending parts
    let mut pending_parts = Vec::new();
    let mut offset = 0;

    for part_number in 1..=iterations {
        let current_part_size = if job.total_size > 0 {
            std::cmp::min(PART_SIZE, job.total_size - offset)
        } else {
            0
        };

        if !existing_parts.contains(&(part_number as u32)) {
            pending_parts.push((part_number as u32, offset, current_part_size));
        }

        offset += current_part_size;
    }

    if pending_parts.is_empty() {
        // Already done?
        if !job.completed_parts.is_empty() {
            client
                .complete_multipart_upload(&job.upload_token, job.completed_parts.clone())
                .await?;
            return Ok(());
        }
    }

    // Process in parallel
    // Clone fields to separate variables to avoid borrowing `job` while mutating it later
    let job_path = job.file_path.clone();
    let token = job.upload_token.clone();

    let bodies = futures::stream::iter(pending_parts)
        .map(move |(part_number, off, size)| {
            let path = job_path.clone();
            let tok = token.clone();
            async move {
                // ... (keep existing logic) ...
                // 1. Get Signed URL
                let url = client.get_upload_part_url(&tok, part_number).await?;

                // 2. Read Chunk
                let mut file = fs::File::open(&path).await?;
                file.seek(std::io::SeekFrom::Start(off)).await?;
                let chunk = file.take(size);

                // 3. Upload Chunk
                let stream = tokio_util::io::ReaderStream::new(chunk);
                let body = reqwest::Body::wrap_stream(stream);
                let put_client = reqwest::Client::new();

                let resp = put_client
                    .put(&url)
                    .body(body)
                    .send()
                    .await
                    .map_err(|e| anyhow::anyhow!("Part Upload request failed: {}", e))?;

                if !resp.status().is_success() {
                    return Err(anyhow::anyhow!(
                        "Part Upload {} returned {}",
                        part_number,
                        resp.status()
                    ));
                }

                let etag = resp
                    .headers()
                    .get("ETag")
                    .and_then(|h| h.to_str().ok())
                    .map(|s| s.trim_matches('"').to_string())
                    .ok_or_else(|| anyhow::anyhow!("No ETag in response"))?;

                Ok::<Part, anyhow::Error>(Part { part_number, etag })
            }
        })
        .buffer_unordered(CONCURRENCY);

    // Collect results incrementally to persist state
    let mut params_stream = bodies;
    let job_file_path = job.file_path.with_extension("job.json");

    while let Some(res) = params_stream.next().await {
        let part = res?;
        job.completed_parts.push(part);

        // Persist every part using atomic write (write to temp + rename)
        let job_json = serde_json::to_vec(&job)?;
        let temp_file_path = job_file_path.with_extension("tmp");

        fs::write(&temp_file_path, job_json).await?;
        fs::rename(&temp_file_path, &job_file_path).await?;
    }

    job.completed_parts.sort_by_key(|p| p.part_number);

    // Complete Multipart
    client
        .complete_multipart_upload(&job.upload_token, job.completed_parts.clone())
        .await?;

    Ok(())
}
