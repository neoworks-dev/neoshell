package onnx

import (
	"context"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"testing"
)

func TestEmbedImage(t *testing.T) {
	dir := ModelsDir()
	if _, err := os.Stat(filepath.Join(dir, "nomic-embed-vision.onnx")); err != nil {
		t.Skip("vision model not present")
	}
	embedder, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}
	// A simple gradient image written to a temp file.
	img := image.NewRGBA(image.Rect(0, 0, 64, 64))
	for y := 0; y < 64; y++ {
		for x := 0; x < 64; x++ {
			img.Set(x, y, color.RGBA{uint8(x * 4), uint8(y * 4), 128, 255})
		}
	}
	path := filepath.Join(t.TempDir(), "g.png")
	f, _ := os.Create(path)
	png.Encode(f, img)
	f.Close()

	vec, err := embedder.EmbedImage(context.Background(), path)
	if err != nil {
		t.Fatal(err)
	}
	if len(vec) != embeddingDim {
		t.Fatalf("dim=%d want %d", len(vec), embeddingDim)
	}
	var norm float64
	for _, x := range vec {
		norm += float64(x) * float64(x)
	}
	if math.Abs(math.Sqrt(norm)-1) > 1e-3 {
		t.Fatalf("not normalized: |v|=%.4f", math.Sqrt(norm))
	}
	t.Logf("image vector ok, dim=%d", len(vec))
}
