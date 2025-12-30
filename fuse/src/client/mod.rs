mod error;
mod models;

pub use error::ApiError;
pub use models::*;

use anyhow::Result;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use std::sync::Arc;
use std::time::Duration;
use tracing::{warn, instrument};
use serde::Deserialize;

/// Client configuration
#[derive(Clone, Debug)]
pub struct ClientConfig {
    pub api_url: String,
    pub api_key: String,
    pub mount_id: Option<String>,
    pub timeout: Duration,
    pub max_retries: u32,
    pub initial_backoff_ms: u64,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            api_url: "https://api.roset.dev".to_string(),
            api_key: "".to_string(),
            mount_id: None,
            timeout: Duration::from_secs(30),
            max_retries: 5,
            initial_backoff_ms: 100,
        }
    }
}

/// Roset API client
pub struct RosetClient {
    http: reqwest::Client,
    config: ClientConfig,
}

// Wrapper struct for Node responses
#[derive(Deserialize)]
struct NodeWrapper {
    node: Node,
}

#[derive(Deserialize)]
struct PartResponse {
    url: String,
}

impl RosetClient {
    pub fn new(config: ClientConfig) -> Result<Arc<Self>> {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", config.api_key))?,
        );

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(config.timeout)
            .build()?;

        Ok(Arc::new(Self {
            http,
            config,
        }))
    }

    /// Execute a request with centralized retry logic
    #[instrument(skip(self, request_builder), level = "debug")]
    async fn execute_request<T, F>(&self, request_builder: F) -> Result<T, ApiError>
    where
        T: serde::de::DeserializeOwned,
        F: Fn() -> reqwest::RequestBuilder + Send + Sync,
    {
        let mut attempt = 0;
        let mut delay_ms = self.config.initial_backoff_ms;

        loop {
            attempt += 1;
            
            // Build and send the request
            let req = request_builder();
            let result = req.send().await;

            match result {
                Ok(resp) => {
                    if resp.status().is_success() {
                        // Success!
                        let data = resp.json::<T>().await?;
                        return Ok(data);
                    }
                    
                    let status = resp.status();
                    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                        warn!("Rate limited (attempt {}/{})", attempt, self.config.max_retries);
                        if attempt >= self.config.max_retries {
                            return Err(ApiError::RateLimited);
                        }
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        delay_ms = std::cmp::min(delay_ms * 2, 10000); // Max 10s wait
                        continue;
                    }

                    // Handle server errors (5xx) with retry
                    if status.is_server_error() {
                        warn!("Server error {} (attempt {}/{})", status, attempt, self.config.max_retries);
                        if attempt >= self.config.max_retries {
                            let text = resp.text().await.unwrap_or_default();
                            return Err(ApiError::from_status(status, &text));
                        }
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        delay_ms = std::cmp::min(delay_ms * 2, 10000);
                        continue;
                    }

                    // Client errors (4xx) - return immediately
                    let text = resp.text().await.unwrap_or_default();
                    return Err(ApiError::from_status(status, &text));
                }
                Err(e) => {
                    // Network errors - retry
                    warn!("Network error: {} (attempt {}/{})", e, attempt, self.config.max_retries);
                    if attempt >= self.config.max_retries {
                        return Err(ApiError::NetworkError(e));
                    }
                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    delay_ms = std::cmp::min(delay_ms * 2, 10000);
                }
            }
        }
    }

    /// Resolve a path to a node
    pub async fn resolve(
        &self,
        path: &str,
        base_id: Option<&str>,
    ) -> Result<Option<Node>, ApiError> {
        let url = format!("{}/v1/resolve", self.config.api_url);

        let mut body = serde_json::json!({ "paths": [path] });
        if let Some(bid) = base_id {
            body["baseId"] = serde_json::json!(bid);
        }
        if let Some(ref mount_id) = self.config.mount_id {
            body["mountId"] = serde_json::json!(mount_id);
        }
        
        // Need to clone body for retry closure
        let client = &self.http;
        let body = body.clone();
        let url = url.clone();

        let resp: ResolveResponse = self.execute_request(|| {
            client.post(&url).json(&body)
        }).await?;

        Ok(resp.nodes.into_values().next().flatten())
    }

    /// Get a node by ID
    pub async fn get_node(&self, node_id: &str) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes/{}", self.config.api_url, node_id);
        let client = &self.http;
        let url = url.clone();

        let wrapper: NodeWrapper = self.execute_request(|| {
            client.get(&url)
        }).await?;
        
        Ok(wrapper.node)
    }

    /// List children of a folder with pagination
    pub async fn list_children(
        &self,
        node_id: &str,
        page: u32,
        page_size: u32,
    ) -> Result<ChildrenResponse, ApiError> {
        let url = format!(
            "{}/v1/nodes/{}/children?page={}&pageSize={}",
            self.config.api_url, node_id, page, page_size
        );
        let client = &self.http;
        let url = url.clone();

        self.execute_request(|| {
            client.get(&url)
        }).await
    }

    /// List all children (handles pagination)
    pub async fn list_all_children(
        &self,
        node_id: &str,
        max_items: u32,
    ) -> Result<Vec<Node>, ApiError> {
        let mut all_children = Vec::new();
        let mut page = 1;
        let page_size = 500;

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
        let url = format!("{}/v1/nodes/{}/download", self.config.api_url, node_id);
        let client = &self.http;
        let url = url.clone();

        self.execute_request(|| {
            client.get(&url)
        }).await
    }

    /// Get manifest for a node (dataset/commit)
    pub async fn get_manifest(&self, node_id: &str) -> Result<Vec<Node>, ApiError> {
        let url = format!("{}/v1/nodes/{}/manifest", self.config.api_url, node_id);
        let client = &self.http;
        let url = url.clone();

        self.execute_request(|| {
            client.get(&url)
        }).await
    }

    /// Download file content via signed URL with range (custom retry logic needed for raw bytes)
    pub async fn download_range(
        &self,
        url: &str,
        offset: u64,
        size: u32,
    ) -> Result<Vec<u8>, ApiError> {
        let range = format!("bytes={}-{}", offset, offset + size as u64 - 1);

        let mut attempt = 0;
        let mut delay_ms = self.config.initial_backoff_ms;

        // Custom loop because generic `execute_request` assumes JSON response
        loop {
            attempt += 1;

            // Use a fresh client for the signed URL to avoid auth headers if they conflict 
            // (Signed URLs usually don't need the Bearer token, but sometimes it doesn't hurt. 
            // Ideally we use a plain client to avoid sending Roset auth to S3/GCS if that's where the URL points)
            // But here we use a simple default client
            let resp = reqwest::Client::new()
                .get(url)
                .header("Range", &range)
                .send()
                .await;

            match resp {
                Ok(r) => {
                    if r.status().is_success() || r.status() == 206 {
                        return Ok(r.bytes().await?.to_vec());
                    }

                    if r.status().as_u16() == 404 || r.status().as_u16() == 403 {
                        return Err(ApiError::ServerError(format!("Download error: {}", r.status())));
                    }

                    if attempt >= self.config.max_retries {
                         return Err(ApiError::ServerError(format!("Download error after {} retries: {}", self.config.max_retries, r.status())));
                    }
                }
                Err(e) => {
                    if attempt >= self.config.max_retries {
                        return Err(ApiError::NetworkError(e));
                    }
                    warn!("Download network error: {} (attempt {})", e, attempt);
                }
            }

            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            delay_ms = std::cmp::min(delay_ms * 2, 10000);
        }
    }

    /// Create a new node
    pub async fn create_node(&self, mut input: CreateNodeInput) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes", self.config.api_url);

        if input.mount_id.is_none() {
            input.mount_id = self.config.mount_id.clone();
        }
        if input.parent_id.is_none() && input.parent_path.is_none() {
            input.parent_path = Some("/".to_string());
        }

        let client = &self.http;
        let url = url.clone();
        // Clone input for retry
        let input_clone = input; // Input needs to be Clone-able or we reconstruct. 
        // NOTE: CreateNodeInput needs Clone derive. Added it in models.rs (implied, let's check) specific update might be needed if Input structs aren't Clone.
        // Wait, models.rs has `derive(Debug, Serialize)` only for input structs.
        // We need to implement Clone for inputs or construct body inside closure. 
        // Serde structs usually can be cloned if fields are cloneable.
        // Let's rely on serde_json::Value for body to be safe or ensure inputs are Clone.
        // For now, let's serialize to Value to clone cheap(er) reference or just make inputs Clone.
        // The models.rs generated previously has `derive(Debug, Serialize)` but maybe not Clone.
        // Let's assume we can clone the input if we update models.rs or just serialize here.
        
        let body_value = serde_json::to_value(&input_clone).map_err(|e| ApiError::Other(e.to_string()))?;

        let wrapper: NodeWrapper = self.execute_request(|| {
            client.post(&url).json(&body_value)
        }).await?;

        Ok(wrapper.node)
    }

    /// Delete a node
    pub async fn delete_node(&self, node_id: &str) -> Result<(), ApiError> {
        let url = format!("{}/v1/nodes/{}", self.config.api_url, node_id);
        let client = &self.http;
        let url = url.clone();

        // Generic execute_request expects T return.
        // We can define a helper for empty response or just match status manually.
        // Actually, execute_request parses JSON. Delete usually returns 200 OK with maybe empty body or data.
        // If body is empty, execute_request might fail to parse T.
        // Let's use customized logic for Delete to avoid parsing error on empty body.
        
        let mut attempt = 0;
        let mut delay_ms = self.config.initial_backoff_ms;
        
        loop {
            attempt += 1;
            let resp = client.delete(&url).send().await;
             match resp {
                Ok(r) => {
                    let status = r.status();
                    if status.is_success() {
                        return Ok(());
                    }
                    if attempt >= self.config.max_retries {
                         let text = r.text().await.unwrap_or_default();
                         return Err(ApiError::from_status(status, &text));
                    }
                    if status.is_server_error() || status == reqwest::StatusCode::TOO_MANY_REQUESTS {
                        // retry
                    } else {
                        // 4xx fatal
                         let text = r.text().await.unwrap_or_default();
                         return Err(ApiError::from_status(status, &text));
                    }
                }
                Err(e) => {
                    if attempt >= self.config.max_retries { return Err(ApiError::NetworkError(e)); }
                }
             }
             tokio::time::sleep(Duration::from_millis(delay_ms)).await;
             delay_ms = std::cmp::min(delay_ms * 2, 10000);
        }
    }

    /// Initialize upload
    pub async fn init_upload(
        &self,
        mut input: InitUploadInput,
    ) -> Result<InitUploadResponse, ApiError> {
        let url = format!("{}/v1/uploads/init", self.config.api_url);
        if input.mount_id.is_none() {
            input.mount_id = self.config.mount_id.clone();
        }

        let client = &self.http;
        let url = url.clone();
        let body_value = serde_json::to_value(&input).map_err(|e| ApiError::Other(e.to_string()))?;

        self.execute_request(|| {
            client.post(&url).json(&body_value)
        }).await
    }

    /// Update node metadata
    pub async fn update_node_metadata(
        &self,
        node_id: &str,
        metadata: serde_json::Value,
    ) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes/{}", self.config.api_url, node_id);
        let body = serde_json::json!({
            "metadata": metadata
        });
        
        let client = &self.http;
        let url = url.clone();
        let body = body.clone();

        let wrapper: NodeWrapper = self.execute_request(|| {
           client.patch(&url).json(&body)
        }).await?;

        Ok(wrapper.node)
    }

    /// Move node
    pub async fn move_node(
        &self,
        node_id: &str,
        new_parent_id: Option<&str>,
        new_name: Option<&str>,
    ) -> Result<Node, ApiError> {
        let url = format!("{}/v1/nodes/{}", self.config.api_url, node_id);
        let mut body_map = serde_json::Map::new();
        if let Some(parent_id) = new_parent_id {
            body_map.insert("parentId".to_string(), serde_json::Value::String(parent_id.to_string()));
        }
        if let Some(name) = new_name {
            body_map.insert("name".to_string(), serde_json::Value::String(name.to_string()));
        }
        let body = serde_json::Value::Object(body_map);

        let client = &self.http;
        let url = url.clone();
        let body = body.clone();

        let wrapper: NodeWrapper = self.execute_request(|| {
            client.patch(&url).json(&body)
        }).await?;
        Ok(wrapper.node)
    }

    /// Get signed URL for upload part
    pub async fn get_upload_part_url(
        &self,
        upload_token: &str,
        part_number: u32,
    ) -> Result<String, ApiError> {
        let url = format!(
            "{}/v1/uploads/{}/part?partNumber={}",
            self.config.api_url, upload_token, part_number
        );
        let client = &self.http;
        let url = url.clone();

        let data: PartResponse = self.execute_request(|| {
            client.post(&url)
        }).await?;
        
        Ok(data.url)
    }

    /// Complete multipart upload
    pub async fn complete_multipart_upload(
        &self,
        upload_token: &str,
        parts: Vec<Part>,
    ) -> Result<CommitUploadResponse, ApiError> {
        let url = format!("{}/v1/uploads/{}/complete", self.config.api_url, upload_token);
        let body = serde_json::json!({ "parts": parts });

        let client = &self.http;
        let url = url.clone();
        let body = body.clone();

        self.execute_request(|| {
            client.post(&url).json(&body)
        }).await
    }
}
