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
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Other error: {0}")]
    Other(String),
}

impl ApiError {
    /// Convert status code to ApiError
    pub fn from_status(status: reqwest::StatusCode, body: &str) -> Self {
        match status.as_u16() {
            401 => ApiError::Unauthorized,
            403 => ApiError::Forbidden,
            404 => ApiError::NotFound,
            409 => ApiError::LeaseConflict,
            429 => ApiError::RateLimited,
            _ => ApiError::ServerError(format!("{}: {}", status, body)),
        }
    }
}
