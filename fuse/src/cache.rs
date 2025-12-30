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
    /// Parents cache (node_id → parent_id) for reverse lookups
    parents: Mutex<LruCache<String, String>>,
    /// Negative lookup cache ("not found" results: (parent_id, name) → expiry)
    negative: Mutex<LruCache<(String, String), Instant>>,
    /// Cache TTL
    ttl: Duration,
    /// Negative cache TTL (60 seconds)
    negative_ttl: Duration,
}

impl Cache {
    pub fn new(ttl_secs: u64) -> Self {
        let size = NonZeroUsize::new(10000).unwrap();
        Self {
            nodes: Mutex::new(LruCache::new(size)),
            children: Mutex::new(LruCache::new(NonZeroUsize::new(1000).unwrap())),
            parents: Mutex::new(LruCache::new(size)),
            negative: Mutex::new(LruCache::new(NonZeroUsize::new(5000).unwrap())),
            ttl: Duration::from_secs(ttl_secs),
            negative_ttl: Duration::from_secs(60),
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
        if let Some(ref parent_id) = node.parent_id {
            self.parents.lock().put(id.clone(), parent_id.clone());
        }

        self.nodes.lock().put(
            id,
            CachedNode {
                node: Arc::new(node),
                expires_at,
            },
        );
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
    pub fn put_children_with_policy(
        &self,
        parent_id: &str,
        children: Vec<Node>,
        policy: CachePolicy,
    ) {
        let expires_at = match policy {
            CachePolicy::Mutable(ttl) => Some(Instant::now() + ttl),
            CachePolicy::Immutable => None,
        };

        // Also cache each child node with the same policy
        for child in &children {
            self.parents
                .lock()
                .put(child.id.clone(), parent_id.to_string());
            self.put_node_with_policy(child.clone(), policy);
        }

        self.children.lock().put(
            parent_id.to_string(),
            CachedChildren {
                children: Arc::new(children),
                expires_at,
            },
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

    /// Invalidate cache for a node and its parent listing
    pub fn invalidate_node(&self, node_id: &str) {
        // 1. Invalidate parent's children cache if we know the parent
        let parent_id = self.parents.lock().pop(node_id);
        if let Some(pid) = parent_id {
            self.children.lock().pop(&pid);
        }

        // 2. Invalidate node itself
        self.nodes.lock().pop(node_id);

        // 3. Invalidate node's own children (it might be a folder)
        self.children.lock().pop(node_id);
    }

    /// Invalidate children cache for a parent ID
    pub fn invalidate_children(&self, parent_id: &str) {
        self.children.lock().pop(parent_id);
    }

    /// Bulk load nodes into cache as immutable
    pub fn bulk_load(&self, parent_id: &str, children: Vec<Node>) {
        self.put_children_with_policy(parent_id, children, CachePolicy::Immutable);
    }

    /// Cache a "not found" result for a name in a parent directory
    pub fn put_negative(&self, parent_id: &str, name: &str) {
        let key = (parent_id.to_string(), name.to_string());
        let expires_at = Instant::now() + self.negative_ttl;
        self.negative.lock().put(key, expires_at);
    }

    /// Check if a name was previously not found in a parent directory
    /// Returns true if the entry is in the negative cache (and not expired)
    pub fn is_negative(&self, parent_id: &str, name: &str) -> bool {
        let key = (parent_id.to_string(), name.to_string());
        let mut cache = self.negative.lock();
        if let Some(&expires_at) = cache.get(&key) {
            if expires_at > Instant::now() {
                return true;
            }
            cache.pop(&key);
        }
        false
    }

    /// Invalidate negative cache entries for a parent (e.g., after create)
    pub fn invalidate_negative(&self, parent_id: &str, name: &str) {
        let key = (parent_id.to_string(), name.to_string());
        self.negative.lock().pop(&key);
    }
}
