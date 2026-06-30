package onnx

import (
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	ort "github.com/yalue/onnxruntime_go"
)

// nomic-embed-vision is a CLIP-style ViT: 224x224 RGB input, CLIP normalization,
// and the CLS token of the last hidden state (aligned with the text space) is the
// image embedding.
const visionSize = 224

var (
	clipMean = [3]float32{0.48145466, 0.4578275, 0.40821073}
	clipStd  = [3]float32{0.26862954, 0.26130258, 0.27577711}
)

type visionSession struct {
	session *ort.DynamicAdvancedSession
}

// loadVision loads the optional vision model; returns nil (not an error) when the
// file is absent so images simply stay filename-only.
func loadVision(dir string) *visionSession {
	path := filepath.Join(dir, "nomic-embed-vision.onnx")
	if _, err := os.Stat(path); err != nil {
		return nil
	}
	session, err := ort.NewDynamicAdvancedSession(path,
		[]string{"pixel_values"}, []string{"last_hidden_state"}, nil)
	if err != nil {
		return nil
	}
	return &visionSession{session: session}
}

// EmbedImage embeds an image into the shared text space via nomic-embed-vision.
func (e *Embedder) EmbedImage(_ context.Context, path string) ([]float32, error) {
	if e.vision == nil {
		return nil, fmt.Errorf("vision model not loaded")
	}
	pixels, err := preprocessImage(path)
	if err != nil {
		return nil, err
	}

	input, err := ort.NewTensor(ort.NewShape(1, 3, visionSize, visionSize), pixels)
	if err != nil {
		return nil, err
	}
	defer input.Destroy()
	out, err := ort.NewEmptyTensor[float32](ort.NewShape(1, 197, embeddingDim))
	if err != nil {
		return nil, err
	}
	defer out.Destroy()

	e.mu.Lock()
	err = e.vision.session.Run([]ort.ArbitraryTensor{input}, []ort.ArbitraryTensor{out})
	e.mu.Unlock()
	if err != nil {
		return nil, err
	}
	// CLS token = first of the 197 positions.
	cls := make([]float32, embeddingDim)
	copy(cls, out.GetData()[:embeddingDim])
	return normalize(cls), nil
}

// preprocessImage decodes, resizes to 224x224, and produces a CLIP-normalized CHW
// float tensor.
func preprocessImage(path string) ([]float32, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	src, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}

	resized := image.NewRGBA(image.Rect(0, 0, visionSize, visionSize))
	draw.CatmullRom.Scale(resized, resized.Bounds(), src, src.Bounds(), draw.Over, nil)

	plane := visionSize * visionSize
	pixels := make([]float32, 3*plane)
	for y := 0; y < visionSize; y++ {
		for x := 0; x < visionSize; x++ {
			r, g, b, _ := resized.At(x, y).RGBA() // 16-bit; >>8 to 0..255
			offset := y*visionSize + x
			pixels[offset] = normChannel(float32(r>>8), 0)
			pixels[plane+offset] = normChannel(float32(g>>8), 1)
			pixels[2*plane+offset] = normChannel(float32(b>>8), 2)
		}
	}
	return pixels, nil
}

func normChannel(value float32, channel int) float32 {
	return (value/255.0 - clipMean[channel]) / clipStd[channel]
}
