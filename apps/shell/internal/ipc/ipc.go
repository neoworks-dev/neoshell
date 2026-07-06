package ipc

type Rect struct {
    X int `json:"x"`
    Y int `json:"y"`
    W int `json:"w"`
    H int `json:"h"`
}

type WindowCommand struct {
    Action string
    Name   string
    Rects  []Rect

    // Exclusive zone reservation (Action == "exclusive").
    // Edge is one of "top", "bottom", "left", "right".
    Edge string
    Size int

    // Keyboard interactivity (Action == "keyboard"): "none" | "ondemand" | "exclusive".
    Mode string

    // Local file paths for a shell-initiated drag (Action == "dragstart").
    Paths []string
}