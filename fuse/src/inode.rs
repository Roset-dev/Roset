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
}

/// Root inode is always 1 in FUSE
pub const ROOT_INO: u64 = 1;

impl InodeMap {
    pub fn new() -> Self {
        Self {
            next_ino: AtomicU64::new(2), // Start at 2, root is 1
            node_to_ino: RwLock::new(HashMap::new()),
            ino_to_node: RwLock::new(HashMap::new()),
        }
    }

    /// Create a virtual root inode
    pub fn set_root(&self, node_id: &str) {
        let mut n2i = self.node_to_ino.write();
        let mut i2n = self.ino_to_node.write();
        n2i.insert(node_id.to_string(), ROOT_INO);
        i2n.insert(ROOT_INO, node_id.to_string());
    }

    /// Get or create an inode for a node ID
    pub fn get_or_create(&self, node_id: &str) -> u64 {
        // Check if exists
        {
            let n2i = self.node_to_ino.read();
            if let Some(&ino) = n2i.get(node_id) {
                return ino;
            }
        }

        // Allocate new
        let ino = self.next_ino.fetch_add(1, Ordering::SeqCst);
        
        let mut n2i = self.node_to_ino.write();
        let mut i2n = self.ino_to_node.write();
        
        // Double-check after acquiring write lock
        if let Some(&existing) = n2i.get(node_id) {
            return existing;
        }

        n2i.insert(node_id.to_string(), ino);
        i2n.insert(ino, node_id.to_string());
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
}

impl Default for InodeMap {
    fn default() -> Self {
        Self::new()
    }
}
