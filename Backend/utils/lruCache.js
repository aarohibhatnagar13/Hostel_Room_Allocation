// utils/lruCache.js

// Node class for the Doubly Linked List
class Node {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class LRUCache {
    constructor(limit = 10) {
        this.limit = limit;
        this.size = 0;
        this.cache = new Map(); // HashMap for O(1) lookup
        this.head = null;       // Pointer to the most recent item
        this.tail = null;       // Pointer to the least recent item (for eviction)
    }

    // Helper: Add a node to the very front (Most Recently Used)
    addFirst(node) {
        node.next = this.head;
        node.prev = null;
        if (this.head) this.head.prev = node;
        this.head = node;
        if (!this.tail) this.tail = node;
    }

    // Helper: Remove a node from its current position in the list
    remove(node) {
        if (node.prev) node.prev.next = node.next;
        else this.head = node.next;
        
        if (node.next) node.next.prev = node.prev;
        else this.tail = node.prev;
    }

    // Add/Update a run result in the cache
    put(key, value) {
        if (this.cache.has(key)) {
            // If key exists, update value and move to front
            const existingNode = this.cache.get(key);
            existingNode.value = value;
            this.remove(existingNode);
            this.addFirst(existingNode);
        } else {
            // If cache is full, evict the tail (Least Recently Used)
            if (this.size >= this.limit) {
                this.cache.delete(this.tail.key);
                this.remove(this.tail);
                this.size--;
            }
            // Create new node and add to front
            const newNode = new Node(key, value);
            this.addFirst(newNode);
            this.cache.set(key, newNode);
            this.size++;
        }
    }

    // Retrieve a specific run and mark it as recently used
    get(key) {
        if (!this.cache.has(key)) return null;
        const node = this.cache.get(key);
        this.remove(node);
        this.addFirst(node);
        return node.value;
    }

    // Get all items in the cache (for the history endpoint)
    getAll() {
        const results = [];
        let current = this.head;
        while (current) {
            results.push({ runId: current.key, ...current.value });
            current = current.next;
        }
        return results;
    }
}

// Export a single instance to be used across the app (Singleton)
export default new LRUCache(10);