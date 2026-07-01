package onnx

import (
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"

	ort "github.com/yalue/onnxruntime_go"
)

// newSession creates an ONNX session for a model, preferring the CUDA GPU
// execution provider and falling back to CPU with a capped thread count so
// embedding never pegs every core. GPU requires a CUDA-enabled onnxruntime build
// (libonnxruntime_providers_cuda.so) plus the CUDA/cuDNN runtime; when those are
// absent the CUDA session fails to build and we transparently use the CPU.
func newSession(model string, inputs, outputs []string) (*ort.DynamicAdvancedSession, error) {
	if useGPU() {
		options, err := gpuOptions()
		if err == nil {
			session, sessErr := ort.NewDynamicAdvancedSession(model, inputs, outputs, options)
			options.Destroy()
			if sessErr == nil {
				log.Printf("onnx: %s on CUDA GPU", model)
				return session, nil
			}
			log.Printf("onnx: CUDA session for %s failed (%v) — using CPU", model, sessErr)
		} else {
			log.Printf("onnx: CUDA options failed (%v) — using CPU", err)
		}
	}
	options, err := cpuOptions()
	if err != nil {
		return nil, err
	}
	defer options.Destroy()
	return ort.NewDynamicAdvancedSession(model, inputs, outputs, options)
}

// gpuOptions builds session options with the CUDA execution provider on device 0.
func gpuOptions() (*ort.SessionOptions, error) {
	options, err := ort.NewSessionOptions()
	if err != nil {
		return nil, err
	}
	// Cap the CPU ops CUDA leaves behind so they do not spill across every core.
	options.SetIntraOpNumThreads(cpuThreads())
	options.SetInterOpNumThreads(1)

	cuda, err := ort.NewCUDAProviderOptions()
	if err != nil {
		options.Destroy()
		return nil, err
	}
	defer cuda.Destroy()
	if err := cuda.Update(map[string]string{"device_id": "0"}); err != nil {
		options.Destroy()
		return nil, err
	}
	if err := options.AppendExecutionProviderCUDA(cuda); err != nil {
		options.Destroy()
		return nil, err
	}
	return options, nil
}

// cpuOptions builds CPU session options with a capped intra-op thread count.
func cpuOptions() (*ort.SessionOptions, error) {
	options, err := ort.NewSessionOptions()
	if err != nil {
		return nil, err
	}
	options.SetIntraOpNumThreads(cpuThreads())
	options.SetInterOpNumThreads(1)
	return options, nil
}

// useGPU reports whether to try the CUDA provider. Default yes; set
// NEOSHELL_ONNX_EP=cpu to force CPU-only.
func useGPU() bool {
	return !strings.EqualFold(os.Getenv("NEOSHELL_ONNX_EP"), "cpu")
}

// cpuThreads caps ONNX intra-op threads so CPU-side embedding never hogs the
// machine. Defaults to a quarter of the CPUs; override with NEOSHELL_ONNX_THREADS.
func cpuThreads() int {
	if raw := os.Getenv("NEOSHELL_ONNX_THREADS"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	threads := runtime.NumCPU() / 4
	if threads < 1 {
		threads = 1
	}
	return threads
}
