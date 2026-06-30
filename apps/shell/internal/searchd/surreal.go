package searchd

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"

	surrealdb "github.com/surrealdb/surrealdb.go"
	"github.com/surrealdb/surrealdb.go/pkg/models"
)

// Surreal connection defaults. The daemon spawns its own `surreal` child bound to
// a loopback port and a persistent surrealkv store, mirroring how it depends on a
// local Ollama. Override via env for tests / shared instances.
const (
	surrealNamespace = "neoshell"
	surrealDatabase  = "search"
	surrealUser      = "root"
	surrealPass      = "root"
	embeddingDim     = 768
)

func surrealAddr() string {
	if addr := os.Getenv("NEOSHELL_SURREAL_ADDR"); addr != "" {
		return addr
	}
	return "127.0.0.1:18000"
}

func surrealDataDir() string {
	if dir := os.Getenv("NEOSHELL_SEARCH_DATA"); dir != "" {
		return dir
	}
	base := os.Getenv("XDG_DATA_HOME")
	if base == "" {
		base = filepath.Join(os.Getenv("HOME"), ".local", "share")
	}
	return filepath.Join(base, "neoshell", "search-db")
}

// surrealStore is the persistent index backend.
type surrealStore struct {
	db    *surrealdb.DB
	child *exec.Cmd // the surreal server process we spawned (nil if external)
}

// openSurreal spawns a surreal child (unless one is already reachable), connects,
// authenticates, and selects the namespace/database. Returns an error if the
// `surreal` binary is missing or the server never comes up, so the caller can
// fall back to the in-memory store.
func openSurreal(ctx context.Context) (*surrealStore, error) {
	child, err := spawnSurreal()
	if err != nil {
		return nil, err
	}

	db, err := connectSurreal(ctx)
	if err != nil {
		if child != nil {
			_ = stopProcessGroup(child)
		}
		return nil, err
	}
	return &surrealStore{db: db, child: child}, nil
}

func spawnSurreal() (*exec.Cmd, error) {
	binary, err := exec.LookPath("surreal")
	if err != nil {
		return nil, fmt.Errorf("surreal binary not found: %w", err)
	}
	if err := os.MkdirAll(surrealDataDir(), 0o755); err != nil {
		return nil, err
	}
	cmd := exec.Command(binary, "start",
		"--bind", surrealAddr(),
		"--user", surrealUser,
		"--pass", surrealPass,
		"surrealkv://"+surrealDataDir(),
	)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return cmd, nil
}

func connectSurreal(ctx context.Context) (*surrealdb.DB, error) {
	url := "ws://" + surrealAddr() + "/rpc"
	deadline := time.Now().Add(10 * time.Second)
	for {
		db, err := surrealdb.New(url)
		if err == nil {
			if authErr := authenticate(ctx, db); authErr == nil {
				return db, nil
			}
			_ = db.Close(ctx)
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("connect surreal at %s: %w", url, err)
		}
		time.Sleep(150 * time.Millisecond)
	}
}

func authenticate(ctx context.Context, db *surrealdb.DB) error {
	if _, err := db.SignIn(ctx, surrealdb.Auth{Username: surrealUser, Password: surrealPass}); err != nil {
		return err
	}
	return db.Use(ctx, surrealNamespace, surrealDatabase)
}

func recordID(table, key string) models.RecordID {
	sum := sha1.Sum([]byte(key))
	return models.NewRecordID(table, hex.EncodeToString(sum[:]))
}

func (s *surrealStore) Close() error {
	if s.db != nil {
		_ = s.db.Close(context.Background())
	}
	if s.child != nil {
		return stopProcessGroup(s.child)
	}
	return nil
}

func stopProcessGroup(cmd *exec.Cmd) error {
	if cmd.Process == nil {
		return nil
	}
	if pgid, err := syscall.Getpgid(cmd.Process.Pid); err == nil {
		_ = syscall.Kill(-pgid, syscall.SIGTERM)
	} else {
		_ = cmd.Process.Kill()
	}
	_, _ = cmd.Process.Wait()
	return nil
}

const schemaDDL = `
DEFINE ANALYZER IF NOT EXISTS doc TOKENIZERS blank,class,punct FILTERS lowercase,ascii,snowball(english);
DEFINE TABLE IF NOT EXISTS file SCHEMALESS;
DEFINE FIELD IF NOT EXISTS path  ON file TYPE string;
DEFINE FIELD IF NOT EXISTS name  ON file TYPE string;
DEFINE FIELD IF NOT EXISTS mtime ON file TYPE int;
DEFINE FIELD IF NOT EXISTS hash  ON file TYPE string;
DEFINE FIELD IF NOT EXISTS isDir ON file TYPE bool;
DEFINE TABLE IF NOT EXISTS chunk SCHEMALESS;
DEFINE FIELD IF NOT EXISTS file     ON chunk TYPE record<file>;
DEFINE FIELD IF NOT EXISTS path     ON chunk TYPE string;
DEFINE FIELD IF NOT EXISTS name     ON chunk TYPE string;
DEFINE FIELD IF NOT EXISTS isDir    ON chunk TYPE bool;
DEFINE FIELD IF NOT EXISTS ord      ON chunk TYPE int;
DEFINE FIELD IF NOT EXISTS text     ON chunk TYPE string;
DEFINE FIELD IF NOT EXISTS modality ON chunk TYPE string;
DEFINE FIELD IF NOT EXISTS embedding ON chunk TYPE option<array<float>>;
DEFINE INDEX IF NOT EXISTS chunk_bm25 ON chunk FIELDS text FULLTEXT ANALYZER doc BM25 HIGHLIGHTS;
DEFINE INDEX IF NOT EXISTS chunk_vec ON chunk FIELDS embedding HNSW DIMENSION 768 DIST COSINE;
`

func (s *surrealStore) EnsureSchema(ctx context.Context) error {
	_, err := surrealdb.Query[any](ctx, s.db, schemaDDL, nil)
	return err
}

type fileRow struct {
	Path  string `json:"path"`
	Name  string `json:"name"`
	Mtime int64  `json:"mtime"`
	Hash  string `json:"hash"`
	IsDir bool   `json:"isDir"`
}

func (s *surrealStore) GetFile(ctx context.Context, path string) (FileRecord, bool, error) {
	result, err := surrealdb.Query[[]fileRow](ctx, s.db,
		"SELECT path,name,mtime,hash,isDir FROM $id",
		map[string]any{"id": recordID("file", path)})
	if err != nil {
		return FileRecord{}, false, err
	}
	rows := firstResult(result)
	if len(rows) == 0 {
		return FileRecord{}, false, nil
	}
	row := rows[0]
	return FileRecord{Path: row.Path, Name: row.Name, Mtime: row.Mtime, Hash: row.Hash, IsDir: row.IsDir}, true, nil
}

func (s *surrealStore) AllPaths(ctx context.Context) ([]string, error) {
	result, err := surrealdb.Query[[]struct {
		Path string `json:"path"`
	}](ctx, s.db, "SELECT path FROM file", nil)
	if err != nil {
		return nil, err
	}
	rows := firstResult(result)
	paths := make([]string, len(rows))
	for i, row := range rows {
		paths[i] = row.Path
	}
	return paths, nil
}

func (s *surrealStore) PutFile(ctx context.Context, file FileRecord, chunks []ChunkRecord) error {
	fileID := recordID("file", file.Path)
	statements := map[string]any{
		"id":    fileID,
		"path":  file.Path,
		"name":  file.Name,
		"mtime": file.Mtime,
		"hash":  file.Hash,
		"isDir": file.IsDir,
	}
	// Replace the file row and all its chunks in one round trip.
	query := "DELETE chunk WHERE file = $id; UPSERT $id CONTENT {path:$path,name:$name,mtime:$mtime,hash:$hash,isDir:$isDir};"
	if _, err := surrealdb.Query[any](ctx, s.db, query, statements); err != nil {
		return err
	}
	for _, chunk := range chunks {
		if err := s.insertChunk(ctx, file, fileID, chunk); err != nil {
			return err
		}
	}
	return nil
}

func (s *surrealStore) insertChunk(ctx context.Context, file FileRecord, fileID models.RecordID, chunk ChunkRecord) error {
	// Build the content in Go and omit `embedding` when there is none: the field is
	// option<array<float>>, which wants the key absent (NONE) — an explicit NULL is
	// rejected.
	content := map[string]any{
		"file":     fileID,
		"path":     file.Path,
		"name":     file.Name,
		"isDir":    file.IsDir,
		"ord":      chunk.Ord,
		"text":     chunk.Text,
		"modality": chunk.Modality,
	}
	if len(chunk.Embedding) > 0 {
		content["embedding"] = chunk.Embedding
	}
	vars := map[string]any{
		"id":      recordID("chunk", fmt.Sprintf("%s#%d", file.Path, chunk.Ord)),
		"content": content,
	}
	_, err := surrealdb.Query[any](ctx, s.db, "CREATE $id CONTENT $content;", vars)
	return err
}

func (s *surrealStore) DeleteFile(ctx context.Context, path string) error {
	fileID := recordID("file", path)
	_, err := surrealdb.Query[any](ctx, s.db,
		"DELETE chunk WHERE file = $id; DELETE $id;",
		map[string]any{"id": fileID})
	return err
}

type scoredRow struct {
	Path     string  `json:"path"`
	Name     string  `json:"name"`
	IsDir    bool    `json:"isDir"`
	Text     string  `json:"text"`
	Modality string  `json:"modality"`
	Score    float64 `json:"score"`
}

func (s *surrealStore) SearchBM25(ctx context.Context, terms []string, limit int) ([]Scored, error) {
	if len(terms) == 0 {
		return nil, nil
	}
	query := fmt.Sprintf(
		"SELECT path,name,isDir,text,modality,search::score(0) AS score FROM chunk WHERE text @0@ $terms ORDER BY score DESC LIMIT %d",
		limit)
	result, err := surrealdb.Query[[]scoredRow](ctx, s.db, query,
		map[string]any{"terms": joinTerms(terms)})
	if err != nil {
		return nil, err
	}
	return toScoredList(firstResult(result)), nil
}

func (s *surrealStore) SearchVector(ctx context.Context, embedding []float32, limit int) ([]Scored, error) {
	if len(embedding) == 0 {
		return nil, nil
	}
	// SurrealDB 3 KNN: `<|k, EF|>` against the HNSW index. k = neighbor count,
	// EF = search breadth (higher = more accurate, slower). Both are ints we set.
	query := fmt.Sprintf(
		"SELECT path,name,isDir,text,modality,vector::similarity::cosine(embedding,$q) AS score FROM chunk WHERE embedding <|%d,64|> $q ORDER BY score DESC",
		limit)
	result, err := surrealdb.Query[[]scoredRow](ctx, s.db, query,
		map[string]any{"q": embedding})
	if err != nil {
		return nil, err
	}
	return toScoredList(firstResult(result)), nil
}

func toScoredList(rows []scoredRow) []Scored {
	scored := make([]Scored, len(rows))
	for i, row := range rows {
		scored[i] = Scored{
			Path:     row.Path,
			Name:     row.Name,
			IsDir:    row.IsDir,
			Snippet:  snippet(row.Text),
			Modality: row.Modality,
			Score:    row.Score,
		}
	}
	return scored
}

func joinTerms(terms []string) string {
	out := ""
	for i, term := range terms {
		if i > 0 {
			out += " "
		}
		out += term
	}
	return out
}

// firstResult returns the rows of the first statement in a multi-statement
// result, or nil if there were none.
func firstResult[T any](result *[]surrealdb.QueryResult[T]) T {
	var zero T
	if result == nil || len(*result) == 0 {
		return zero
	}
	return (*result)[0].Result
}

// logSurrealUnavailable is a tiny helper so callers can note the fallback once.
func logSurrealUnavailable(err error) {
	log.Printf("surreal unavailable, using in-memory index fallback: %v", err)
}
