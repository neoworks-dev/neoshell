package shell

import (
	"bufio"
	"os/exec"
	"strings"
)

// Run executes a shell command and returns its combined output.
func Run(cmd string) (string, error) {
	out, err := exec.Command("sh", "-c", cmd).Output()
	return strings.TrimSpace(string(out)), err
}

// Watch runs a command and calls fn for each line of stdout.
// Blocks until the command exits — run in a goroutine.
// For streaming commands like `playerctl -F status` or `pactl subscribe`.
func Watch(cmd string, fn func(line string)) error {
	c := exec.Command("sh", "-c", cmd)
	stdout, err := c.StdoutPipe()
	if err != nil {
		return err
	}
	if err := c.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		fn(scanner.Text())
	}

	return c.Wait()
}