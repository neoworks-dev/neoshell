package server

// Typed reads against the config store. Values arrive from JSON, so a number is
// a float64 until proven otherwise, and every accessor falls back rather than
// erroring — a missing or malformed key must never take a handler down.

func (s *Server) cfgString(key, fallback string) string {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	str, ok := value.(string)
	if !ok || str == "" {
		return fallback
	}
	return str
}

func (s *Server) cfgBool(key string, fallback bool) bool {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	b, ok := value.(bool)
	if !ok {
		return fallback
	}
	return b
}

func (s *Server) cfgInt(key string, fallback int) int {
	value, ok := s.cfg.Get(key)
	if !ok {
		return fallback
	}
	switch n := value.(type) {
	case float64:
		return int(n)
	case int:
		return n
	}
	return fallback
}
