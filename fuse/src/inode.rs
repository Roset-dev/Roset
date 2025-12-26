//! Inode ↔ Node ID mapping
//!
//! FUSE uses 64-bit inodes. We map Roset UUIDs to inodes.

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

/// Inode mapper for FUSE
pub struct InodeMap {
    /// Next inode to allocate
    next_ino: AtomicU64,
    /// Node ID → Inode
    node_to_ino: RwLock<HashMap<String, u64>>,
    /// Inode → Node ID
    ino_to_node: RwLock<HashMap<u64, String>>,
    /// Inode reference counts
    refcounts: RwLock<HashMap<u64, u64>>,
}

/// Root inode is always 1 in FUSE
pub const ROOT_INO: u64 = 1;

impl InodeMap {
    pub fn new() -> Self {
        Self {
            next_ino: AtomicU64::new(2), // Start at 2, root is 1
            node_to_ino: RwLock::new(HashMap::new()),
            ino_to_node: RwLock::new(HashMap::new()),
            refcounts: RwLock::new(HashMap::new()),
        }
    }

    /// Create a virtual root inode
    pub fn set_root(&self, node_id: &str) {
        let mut n2i = self.node_to_ino.write();
        let mut i2n = self.ino_to_node.write();
        let mut refs = self.refcounts.write();
        n2i.insert(node_id.to_string(), ROOT_INO);
        i2n.insert(ROOT_INO, node_id.to_string());
        refs.insert(ROOT_INO, 1); // Root is always referenced
    }

    /// Get or create an inode for a node ID
    pub fn get_or_create(&self, node_id: &str) -> u64 {
        // Check if exists
        {
            let n2i = self.node_to_ino.read();
            if let Some(&ino) = n2i.get(node_id) {
                // Increment refcount
                let mut refs = self.refcounts.write();
                if let Some(r) = refs.get_mut(&ino) {
                    *r += 1;
                } else {
                    // Should not happen, but recover
                    refs.insert(ino, 1);
                }
                return ino;
            }
        }

        // Allocate new
        let ino = self.next_ino.fetch_add(1, Ordering::SeqCst);
        
        let mut n2i = self.node_to_ino.write();
        let mut i2n = self.ino_to_node.write();
        let mut refs = self.refcounts.write();
        
        // Double-check after acquiring write lock
        if let Some(&existing) = n2i.get(node_id) {
            if let Some(r) = refs.get_mut(&existing) {
                *r += 1;
            } else {
                refs.insert(existing, 1);
            }
            return existing;
        }

        n2i.insert(node_id.to_string(), ino);
        i2n.insert(ino, node_id.to_string());
        refs.insert(ino, 1);
        ino
    }

    /// Get node ID for an inode
    pub fn get_node_id(&self, ino: u64) -> Option<String> {
        let i2n = self.ino_to_node.read();
        i2n.get(&ino).cloned()
    }

    /// Get inode for a node ID (if it exists)
    pub fn get_ino(&self, node_id: &str) -> Option<u64> {
        let n2i = self.node_to_ino.read();
        n2i.get(node_id).copied()
    }

    /// Forget an inode (decrement refcount)
    pub fn forget(&self, ino: u64, nlookup: u64) {
        if ino == ROOT_INO {
            return;
        }

        // 1. Decrement refcount
        let should_remove = {
            let mut refs = self.refcounts.write();
            let count = refs.get(&ino).copied().unwrap_or(0);
            
            if count > nlookup {
                refs.insert(ino, count - nlookup);
                false
            } else {
                refs.remove(&ino);
                true
            }
        };

        // 2. If refcount reached 0, try to clean up mappings
        if should_remove {
            // Acquire locks in global order: n2i -> i2n -> refs
            let mut n2i = self.node_to_ino.write();
            let mut i2n = self.ino_to_node.write();
            let refs = self.refcounts.read();

            // Double check: did someone resurrect it while we were locking?
            if !refs.contains_key(&ino) {
                if let Some(node_id) = i2n.remove(&ino) {
                    n2i.remove(&node_id);
                }
            }
        }
    }
}

impl Default for InodeMap {
    fn default() -> Self {
        Self::new()
    }
}
