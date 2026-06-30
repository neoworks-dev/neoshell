package onnx

import (
	"container/list"
	"sync"
)

// queryCacheSize bounds how many recent query embeddings are kept. Queries repeat
// constantly (every keystroke re-runs the same growing prefix), so even a small
// cache skips most of the embedding work on the lookup path.
const queryCacheSize = 256

// queryCache is a bounded LRU from query text to its embedding.
type embeddingCache struct {
	mu    sync.Mutex
	max   int
	items map[string]*list.Element
	order *list.List // front = most recently used
}

type cacheEntry struct {
	query  string
	vector []float32
}

func newEmbeddingCache(max int) *embeddingCache {
	return &embeddingCache{
		max:   max,
		items: map[string]*list.Element{},
		order: list.New(),
	}
}

func (c *embeddingCache) get(query string) ([]float32, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	element, ok := c.items[query]
	if !ok {
		return nil, false
	}
	c.order.MoveToFront(element)
	return element.Value.(*cacheEntry).vector, true
}

func (c *embeddingCache) put(query string, vector []float32) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if element, ok := c.items[query]; ok {
		c.order.MoveToFront(element)
		element.Value.(*cacheEntry).vector = vector
		return
	}
	element := c.order.PushFront(&cacheEntry{query: query, vector: vector})
	c.items[query] = element
	if c.order.Len() > c.max {
		oldest := c.order.Back()
		if oldest != nil {
			c.order.Remove(oldest)
			delete(c.items, oldest.Value.(*cacheEntry).query)
		}
	}
}
