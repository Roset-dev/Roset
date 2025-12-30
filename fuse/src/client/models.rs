use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    #[allow(dead_code)]
    pub tenant_id: String,
    #[serde(rename = "mountId")]
    #[allow(dead_code)]
    pub mount_id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub size: Option<u64>,
    #[serde(rename = "contentType")]
    #[allow(dead_code)]
    pub content_type: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
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
    #[allow(dead_code)]
    pub total: u64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}

#[derive(Debug, Deserialize)]
pub struct DownloadResponse {
    pub url: String,
    #[serde(rename = "contentType")]
    #[allow(dead_code)]
    pub content_type: Option<String>,
    pub size: u64,
    #[serde(rename = "expiresIn")]
    #[allow(dead_code)]
    pub expires_in: u64,
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

#[derive(Debug, Deserialize)]
pub struct InitUploadResponse {
    #[serde(rename = "uploadToken")]
    pub upload_token: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    #[serde(rename = "expiresIn")]
    #[allow(dead_code)]
    pub expires_in: u64,
}

#[derive(Debug, Deserialize)]
pub struct CommitUploadResponse {
    #[allow(dead_code)]
    pub node: Node,
}

#[derive(Debug, serde::Serialize, Deserialize, Clone)]
pub struct Part {
    #[serde(rename = "PartNumber")]
    pub part_number: u32,
    #[serde(rename = "ETag")]
    pub etag: String,
}
