package searchd

import "context"

// OpenStore returns the index backend: a persistent SurrealDB (spawned as a child
// process) when the `surreal` binary is available, otherwise the in-memory store
// so the daemon still runs (filename/text search, no persistence).
func OpenStore(ctx context.Context) (Store, error) {
	surreal, err := openSurreal(ctx)
	if err == nil {
		return surreal, nil
	}
	logSurrealUnavailable(err)
	return newMemStore(), nil
}
