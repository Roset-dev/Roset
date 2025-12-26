//! Roset API Client

use anyhow::Result;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::Deserialize;
use std::sync::Arc;
use thiserror::Error;

/// API-specific errors
#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Node not found")]
    NotFound,
    #[error("Unauthorized: invalid or expired API key")]
    Unauthorized,
    #[error("Forbidden: insufficient permissions")]
    Forbidden,
    #[error("Lease conflict: file is locked by another process")]
    LeaseConflict,
    #[error("Rate limited: too many requests")]
    RateLimited,
    #[error("Server error: {0}")]
    ServerError(String),
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
}

/// Roset API client
pub struct RosetClient {
    http: reqwest::Client,
    base_url: String,
    mount_id: Option<String>,
}

// API Response Types

#[derive(Debug, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    #[serde(rename = "tenantId")]
    pub tenant_id: String,
    #[serde(rename = "mountId")]
    pub mount_id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub size: Option<u64>,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    File,
    Folder,
}

#[derive(Debug, Deserialize)]
pub struct ResolveResponse {
    pub nodes: std::collections::HashMap<String, Option<Node>>,
}

#[derive(Debug, Deserialize)]
pub struct ChildrenResponse {
    pub children: Vec<Node>,
    pub total: u64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}

#[derive(Debug, Deserialize)]
pub struct DownloadResponse {
    pub url: String,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
    pub size: u64,
    #[serde(rename = "expiresIn")]
    pub expires_in: u64,
}

#[derive(Debug, Deserialize)]
pub struct LeaseResponse {
    pub lease: Lease,
}

#[derive(Debug, Deserialize)]
pub struct Lease {
    pub id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    pub mode: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InitUploadInput {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_path: Option<String>,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    pub multipart: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mount_id: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNodeInput {
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mount_id: Option<String>,
}

impl RosetClient {
    pub fn new(base_url: &str, api_key: &str, mount_id: Option<String>) -> Result<Arc<Self>> {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key))?,
        );

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        Ok(Arc::new(Self {
            http,
            base_url: base_url.trim_end_matches('/').to_string(),
            mount_id,
        }))
    }

    /// Handle API response status codes
    fn handle_status(&self, status: reqwest::StatusCode, body: &str) -> ApiError {
        match status.as_u16() {
            401 => ApiError::Unauthorized,
            403 => ApiError::Forbidden,
            404 => ApiError::NotFound,
            409 => ApiError::LeaseConflict,
            429 => ApiError::RateLimited,
            _ => ApiError::ServerError(format!("{}: {}", status, body)),
        }
    }

    /// Resolve a path to a node, optionally relative to a base_id
    pub async fn resolve(&self, path: &str, base_id: Option<&str>) -> Result<Option<Node>, ApiError> {
        let url = format!("{}/v1/resolve", self.base_url);
        
        let mut body = serde_json::json!({ "paths": [path] });
        if let Some(bid) = base_id {
            body["baseId"] = serde_json::json!(bid);
        }
        if let Some(ref mount_id) = self.mount_id {
            body["mountId"] = serde_json::json!(mount_id);
        }

        let resp = self.http.post(&url).json(&body).send().await?;
        
        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        let data: ResolveResponse = resp.json().await?;
        Ok(data.nodes.into_values().next().flatten())
    }

    /// Get a node by ID
    pub async fn get_node(&self, node_id: &str) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes/{}", self.base_url, node_id);
        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        #[derive(Deserialize)]
        struct Wrapper { node: Node }
        let data: Wrapper = resp.json().await?;
        Ok(data.node)
    }

    /// List children of a folder with pagination
    pub async fn list_children(&self, node_id: &str, page: u32, page_size: u32) -> Result<ChildrenResponse, ApiError> {
        let url = format!(
            "{}/v1/nodes/{}/children?page={}&pageSize={}",
            self.base_url, node_id, page, page_size
        );
        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }

    /// List all children (handles pagination)
    pub async fn list_all_children(&self, node_id: &str, max_items: u32) -> Result<Vec<Node>, ApiError> {
        let mut all_children = Vec::new();
        let mut page = 1;
        let page_size = 500; // Reasonable page size

        loop {
            let resp = self.list_children(node_id, page, page_size).await?;
            all_children.extend(resp.children);

            if !resp.has_more || all_children.len() >= max_items as usize {
                break;
            }
            page += 1;
        }

        Ok(all_children)
    }

    /// Get a signed download URL
    pub async fn get_download_url(&self, node_id: &str) -> Result<DownloadResponse, ApiError> {
        let url = format!("{}/v1/nodes/{}/download", self.base_url, node_id);
        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }

    /// Get manifest for a node (dataset/commit)
    pub async fn get_manifest(&self, node_id: &str) -> Result<Vec<Node>, ApiError> {
        let url = format!("{}/v1/nodes/{}/manifest", self.base_url, node_id);
        let resp = self.http.get(&url).send().await?;

        if !resp.status().is_success() {
             let status = resp.status();
             let text = resp.text().await.unwrap_or_default();
             return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }

    /// Acquire a lease on a node
    pub async fn acquire_lease(&self, node_id: &str, mode: &str, duration_secs: u32) -> Result<Lease, ApiError> {
        let url = format!("{}/v1/nodes/{}/lease", self.base_url, node_id);
        let body = serde_json::json!({
            "mode": mode,
            "durationSeconds": duration_secs
        });

        let resp = self.http.post(&url).json(&body).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        let data: LeaseResponse = resp.json().await?;
        Ok(data.lease)
    }

    /// Release a lease
    pub async fn release_lease(&self, node_id: &str) -> Result<(), ApiError> {
        let url = format!("{}/v1/nodes/{}/lease", self.base_url, node_id);
        let resp = self.http.delete(&url).send().await?;

        // 404 is OK (lease already expired)
        if !resp.status().is_success() && resp.status() != 404 {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(())
    }

    /// Download file content via signed URL with range (with retry)
    pub async fn download_range(&self, url: &str, offset: u64, size: u32) -> Result<Vec<u8>, ApiError> {
        let range = format!("bytes={}-{}", offset, offset + size as u64 - 1);
        
        // Retry with exponential backoff
        let max_retries = 3;
        let mut attempt = 0;
        let mut delay_ms = 100;

        loop {
            attempt += 1;
            
            let resp = reqwest::Client::new()
                .get(url)
                .header("Range", &range)
                .send()
                .await;

            match resp {
                Ok(r) => {
                    // 200 (full) or 206 (partial) are both OK
                    if r.status().is_success() || r.status() == 206 {
                        return Ok(r.bytes().await?.to_vec());
                    }
                    
                    // Non-retryable error
                    if r.status().as_u16() == 404 || r.status().as_u16() == 403 {
                        return Err(ApiError::ServerError(format!("Download error: {}", r.status())));
                    }
                    
                    // Retryable server error
                    if attempt >= max_retries {
                        return Err(ApiError::ServerError(format!("Download error after {} retries: {}", max_retries, r.status())));
                    }
                }
                Err(e) => {
                    // Network error - retry
                    if attempt >= max_retries {
                        return Err(ApiError::NetworkError(e));
                    }
                }
            }

            // Exponential backoff
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
            delay_ms *= 2;
        }
    }

    /// Create a new node (file or folder)
    pub async fn create_node(&self, mut input: CreateNodeInput) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes", self.base_url);
        
        // Use client's mount_id if not specified in input
        if input.mount_id.is_none() {
            input.mount_id = self.mount_id.clone();
        }

        // If neither parentId nor parentPath is set, default to root
        if input.parent_id.is_none() && input.parent_path.is_none() {
            input.parent_path = Some("/".to_string());
        }

        let resp = self.http.post(&url).json(&input).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        #[derive(Deserialize)]
        struct Wrapper { node: Node }
        let data: Wrapper = resp.json().await?;
        Ok(data.node)
    }

    /// Delete a node and move to trash
    pub async fn delete_node(&self, node_id: &str) -> Result<(), ApiError> {
        let url = format!("{}/v1/nodes/{}", self.base_url, node_id);
        let resp = self.http.delete(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(())
    }

    /// Initialize an upload session
    /// Initialize an upload session
    pub async fn init_upload(&self, mut input: InitUploadInput) -> Result<InitUploadResponse, ApiError> {
        let url = format!("{}/v1/uploads/init", self.base_url);
        
        // Use client's mount_id if not specified in input
        if input.mount_id.is_none() {
            input.mount_id = self.mount_id.clone();
        }

        let resp = self.http.post(&url).json(&input).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }

    /// Commit an upload session
    pub async fn commit_upload(&self, upload_token: &str, etag: Option<String>, size: u64) -> Result<CommitUploadResponse, ApiError> {
        let url = format!("{}/v1/uploads/commit", self.base_url);
        
        let body = serde_json::json!({
            "uploadToken": upload_token,
            "etag": etag,
            "size": size
        });

        let resp = self.http.post(&url).json(&body).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }

    /// Update node metadata (for xattr support)
    pub async fn update_node_metadata(&self, node_id: &str, metadata: serde_json::Value) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes/{}", self.base_url, node_id);
        let body = serde_json::json!({
            "metadata": metadata
        });

        let resp = self.http.patch(&url).json(&body).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        #[derive(Deserialize)]
        struct Wrapper { node: Node }
        let data: Wrapper = resp.json().await?;
        Ok(data.node)
    }
}

#[derive(Debug, Deserialize)]
pub struct InitUploadResponse {
    #[serde(rename = "uploadUrl")]
    pub upload_url: String,
    #[serde(rename = "uploadToken")]
    pub upload_token: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: u64,
}

#[derive(Debug, Deserialize)]
pub struct CommitUploadResponse {
    pub node: Node,
}

#[derive(Debug, serde::Serialize)]
pub struct Part {
    #[serde(rename = "PartNumber")]
    pub part_number: u32,
    #[serde(rename = "ETag")]
    pub etag: String,
}

impl RosetClient {
    // ... existing methods ...

    /// Get signed URL for an upload part
    pub async fn get_upload_part_url(&self, upload_token: &str, part_number: u32) -> Result<String, ApiError> {
        let url = format!("{}/v1/uploads/{}/part?partNumber={}", self.base_url, upload_token, part_number);
        let resp = self.http.post(&url).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        #[derive(Deserialize)]
        struct PartResponse { url: String }
        let data: PartResponse = resp.json().await?;
        Ok(data.url)
    }

    /// Complete multipart upload
    pub async fn complete_multipart_upload(&self, upload_token: &str, parts: Vec<Part>) -> Result<CommitUploadResponse, ApiError> {
        let url = format!("{}/v1/uploads/{}/complete", self.base_url, upload_token);
        let body = serde_json::json!({ "parts": parts });
        
        let resp = self.http.post(&url).json(&body).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(self.handle_status(status, &text));
        }

        Ok(resp.json().await?)
    }
}
