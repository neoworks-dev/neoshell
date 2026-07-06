package searchd

import (
	"os"
	"syscall"
	"unsafe"
)

// vecStore keeps chunk embeddings in a memory-mapped flat file instead of the Go
// heap, so the OS pages them in on demand and evicts them under memory pressure.
// The in-RAM index holds only a small slot index per chunk. The row dimension is
// learned from the first vector written and persisted alongside the snapshot.
//
// Not safe for concurrent use — callers hold the localStore lock. Reads happen
// under the shared read lock and never grow/remap; growth happens only under the
// exclusive write lock, so a read never observes a remap mid-flight.
type vecStore struct {
	file  *os.File
	data  []byte // MAP_SHARED mmap over the whole file, or nil when empty
	dim   int    // floats per row; 0 until the first vector is written
	count int    // high-water slot count
	free  []int  // reclaimed slots, reused before growing
}

func openVecStore(path string) (*vecStore, error) {
	file, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE, 0o644)
	if err != nil {
		return nil, err
	}
	store := &vecStore{file: file}
	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, err
	}
	if info.Size() > 0 {
		if err := store.remap(info.Size()); err != nil {
			file.Close()
			return nil, err
		}
	}
	return store, nil
}

func (v *vecStore) rowBytes() int { return v.dim * 4 }

// setMeta restores the allocation state persisted alongside the snapshot.
func (v *vecStore) setMeta(dim, count int, free []int) {
	v.dim = dim
	v.count = count
	v.free = free
}

func (v *vecStore) meta() (dim, count int, free []int) { return v.dim, v.count, v.free }

// alloc returns a slot index, reusing a freed slot before extending.
func (v *vecStore) alloc() int {
	if n := len(v.free); n > 0 {
		slot := v.free[n-1]
		v.free = v.free[:n-1]
		return slot
	}
	slot := v.count
	v.count++
	return slot
}

func (v *vecStore) release(slot int) {
	if slot >= 0 {
		v.free = append(v.free, slot)
	}
}

// write stores an embedding at slot, growing the file if needed. The dimension is
// fixed by the first vector; later vectors of a different length are skipped
// rather than corrupting the fixed-stride file.
func (v *vecStore) write(slot int, embedding []float32) error {
	if len(embedding) == 0 {
		return nil
	}
	if v.dim == 0 {
		v.dim = len(embedding)
	}
	if len(embedding) != v.dim {
		return nil
	}
	end := int64(slot+1) * int64(v.rowBytes())
	if end > int64(len(v.data)) {
		if err := v.grow(end); err != nil {
			return err
		}
	}
	copy(v.row(slot), embedding)
	return nil
}

// read returns the embedding at slot as a view into the mmap. The slice is valid
// only while the caller holds the lock (a later grow may remap). Returns nil for
// an unmapped slot.
func (v *vecStore) read(slot int) []float32 {
	if v.dim == 0 || slot < 0 || int64(slot+1)*int64(v.rowBytes()) > int64(len(v.data)) {
		return nil
	}
	return v.row(slot)
}

func (v *vecStore) row(slot int) []float32 {
	offset := slot * v.rowBytes()
	return unsafe.Slice((*float32)(unsafe.Pointer(&v.data[offset])), v.dim)
}

// grow extends the file (over-allocating to amortize remaps) and remaps it.
func (v *vecStore) grow(minBytes int64) error {
	headroom := int64(1024 * v.rowBytes())
	newSize := int64(len(v.data)) * 2
	if newSize < minBytes+headroom {
		newSize = minBytes + headroom
	}
	stride := int64(v.rowBytes())
	newSize = (newSize + stride - 1) / stride * stride
	if err := v.file.Truncate(newSize); err != nil {
		return err
	}
	return v.remap(newSize)
}

func (v *vecStore) remap(size int64) error {
	if v.data != nil {
		if err := syscall.Munmap(v.data); err != nil {
			return err
		}
		v.data = nil
	}
	data, err := syscall.Mmap(int(v.file.Fd()), 0, int(size),
		syscall.PROT_READ|syscall.PROT_WRITE, syscall.MAP_SHARED)
	if err != nil {
		return err
	}
	v.data = data
	return nil
}

func (v *vecStore) close() error {
	if v.data != nil {
		_ = syscall.Munmap(v.data)
		v.data = nil
	}
	return v.file.Close()
}
