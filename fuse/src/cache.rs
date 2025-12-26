//! Caching layer for metadata and read data

use crate::client::Node;
use lru::LruCache;
use parking_lot::Mutex;
use std::num::NonZeroUsize;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// Cache expiration policy
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CachePolicy {
    /// Expires after a duration
    Mutable(Duration),
    /// Never expires (for committed snapshots)
    Immutable,
}

/// Cached node with expiry
struct CachedNode {
    node: Arc<Node>,
    expires_at: Option<Instant>,
}

/// Cached children with expiry
struct CachedChildren {
    children: Arc<Vec<Node>>,
    expires_at: Option<Instant>,
}

/// Cache for metadata and directory listings
pub struct Cache {
    /// Metadata cache (node_id → Node)
    nodes: Mutex<LruCache<String, CachedNode>>,
    /// Directory listing cache (parent_id → Vec<Node>)
    children: Mutex<LruCache<String, CachedChildren>>,
    /// Path resolution cache (path → node_id)
    paths: Mutex<LruCache<String, (String, Instant)>>,
    /// Cache TTL
    ttl: Duration,
}

impl Cache {
    pub fn new(ttl_secs: u64) -> Self {
        let size = NonZeroUsize::new(10000).unwrap();
        Self {
            nodes: Mutex::new(LruCache::new(size)),
            children: Mutex::new(LruCache::new(NonZeroUsize::new(1000).unwrap())),
            paths: Mutex::new(LruCache::new(size)),
            ttl: Duration::from_secs(ttl_secs),
        }
    }

    /// Cache a node with default TIL
    pub fn put_node(&self, node: Node) {
        self.put_node_with_policy(node, CachePolicy::Mutable(self.ttl));
    }

    /// Cache a node with specific policy
    pub fn put_node_with_policy(&self, node: Node, policy: CachePolicy) {
        let expires_at = match policy {
            CachePolicy::Mutable(ttl) => Some(Instant::now() + ttl),
            CachePolicy::Immutable => None,
        };
        
        let id = node.id.clone();
        self.nodes.lock().put(id, CachedNode { 
            node: Arc::new(node), 
            expires_at 
        });
    }

    /// Get a cached node (returns Arc to avoid clone)
    pub fn get_node(&self, node_id: &str) -> Option<Arc<Node>> {
        let mut cache = self.nodes.lock();
        if let Some(entry) = cache.get(node_id) {
            if let Some(expires) = entry.expires_at {
                if expires > Instant::now() {
                    return Some(Arc::clone(&entry.node));
                }
            } else {
                // Immutable
                return Some(Arc::clone(&entry.node));
            }
            cache.pop(node_id);
        }
        None
    }

    /// Cache directory children
    pub fn put_children(&self, parent_id: &str, children: Vec<Node>) {
        self.put_children_with_policy(parent_id, children, CachePolicy::Mutable(self.ttl));
    }

    /// Cache directory children with policy
    pub fn put_children_with_policy(&self, parent_id: &str, children: Vec<Node>, policy: CachePolicy) {
        let expires_at = match policy {
            CachePolicy::Mutable(ttl) => Some(Instant::now() + ttl),
            CachePolicy::Immutable => None,
        };

        // Also cache each child node with the same policy
        for child in &children {
            self.put_node_with_policy(child.clone(), policy);
        }
        
        self.children.lock().put(
            parent_id.to_string(), 
            CachedChildren {
                children: Arc::new(children),
                expires_at,
            }
        );
    }

    /// Get cached children (returns Arc to avoid clone)
    pub fn get_children(&self, parent_id: &str) -> Option<Arc<Vec<Node>>> {
        let mut cache = self.children.lock();
        if let Some(entry) = cache.get(parent_id) {
            if let Some(expires) = entry.expires_at {
                if expires > Instant::now() {
                    return Some(Arc::clone(&entry.children));
                }
            } else {
                // Immutable
                return Some(Arc::clone(&entry.children));
            }
            cache.pop(parent_id);
        }
        None
    }

    /// Cache a path resolution
    pub fn put_path(&self, path: &str, node_id: &str) {
        let expires_at = Instant::now() + self.ttl;
        self.paths.lock().put(path.to_string(), (node_id.to_string(), expires_at));
    }

    /// Get cached path resolution
    pub fn get_path(&self, path: &str) -> Option<String> {
        let mut cache = self.paths.lock();
        if let Some((node_id, expires_at)) = cache.get(path) {
            if *expires_at > Instant::now() {
                return Some(node_id.clone());
            }
            cache.pop(path);
        }
        None
    }

    /// Invalidate cache for a node
    pub fn invalidate(&self, node_id: &str) {
        self.nodes.lock().pop(node_id);
        // We might want to invalidate children caches too if we had reverse mapping
        // For now, simpler invalidation is acceptable as this is mainly for mutable paths
    }

    /// Bulk load nodes into cache as immutable
    pub fn bulk_load(&self, parent_id: &str, children: Vec<Node>) {
        self.put_children_with_policy(parent_id, children, CachePolicy::Immutable);
    }
}
