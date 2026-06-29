package hyprland

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
)

type Client struct {
	socketPath  string
	socket2Path string
}

func NewClient() (*Client, error) {
    sig := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE")
    if sig == "" {
        return nil, fmt.Errorf("HYPRLAND_INSTANCE_SIGNATURE not set")
    }

    xdgRuntime := os.Getenv("XDG_RUNTIME_DIR")
    if xdgRuntime == "" {
        xdgRuntime = fmt.Sprintf("/run/user/%d", os.Getuid())
    }

    base := fmt.Sprintf("%s/hypr/%s", xdgRuntime, sig)
    return &Client{
        socketPath:  base + "/.socket.sock",
        socket2Path: base + "/.socket2.sock",
    }, nil
}

func (c *Client) Windows() ([]Window, error) {
    var out []Window
    return out, c.RequestJSON("clients", &out)
}

func (c *Client) Request(cmd string) ([]byte, error) {
	conn, err := net.Dial("unix", c.socketPath)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	conn.Write([]byte(cmd))
	buf := make([]byte, 65536)
	n, _ := conn.Read(buf)
	return buf[:n], nil
}

func (c *Client) RequestJSON(cmd string, out any) error {
	data, err := c.Request("j/" + cmd)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, out)
}

func (c *Client) Dispatch(dispatcher, arg string) error {
	_, err := c.Request(fmt.Sprintf("dispatch %s %s", dispatcher, arg))
	return err
}

// Keyword sets a config keyword at runtime (e.g. `layerrule blur,neoshell.bar`),
// the IPC equivalent of `hyprctl keyword`.
func (c *Client) Keyword(name, value string) error {
	_, err := c.Request(fmt.Sprintf("keyword %s %s", name, value))
	return err
}

// Typed queries

func (c *Client) Workspaces() ([]Workspace, error) {
	var out []Workspace
	return out, c.RequestJSON("workspaces", &out)
}

func (c *Client) ActiveWorkspace() (Workspace, error) {
	var out Workspace
	return out, c.RequestJSON("activeworkspace", &out)
}

func (c *Client) ActiveWindow() (Window, error) {
	var out Window
	return out, c.RequestJSON("activewindow", &out)
}

func (c *Client) Monitors() ([]Monitor, error) {
	var out []Monitor
	return out, c.RequestJSON("monitors", &out)
}