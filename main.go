package main

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"

	"agent-cockpit/internal/config"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:dist
var assets embed.FS

func main() {
	// Parse console options and interactive prompts
	cfg := config.ParseConfig()

	// Create an instance of the app structure
	app := NewApp(cfg)

	// Distinct WebView2 user data directory per process to prevent concurrency lock
	dataRoot := filepath.Join(os.Getenv("LOCALAPPDATA"), "AgentCockpit")
	_ = os.MkdirAll(dataRoot, 0755)
	wvDataDir := filepath.Join(dataRoot, fmt.Sprintf("wv2_%d", os.Getpid()))

	winOpts := &options.App{
		Title:  "AGENT COCKPIT - Cyberdeck HUD",
		Width:  1280,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 3, G: 6, B: 5, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewUserDataPath: wvDataDir,
		},
	}

	// Configure initial window presentation based on mode (Default: Windowed mode)
	if cfg.Mode == "wallpaper" {
		winOpts.Frameless = true
		winOpts.AlwaysOnTop = false
		winOpts.WindowStartState = options.Normal
	} else if cfg.Mode == "lock" {
		winOpts.Frameless = true
		winOpts.AlwaysOnTop = true
		winOpts.WindowStartState = options.Fullscreen
	} else {
		// Default: Windowed mode (1280x800, centered)
		winOpts.Frameless = false
		winOpts.AlwaysOnTop = false
		winOpts.WindowStartState = options.Normal
	}

	// Create application with options
	err := wails.Run(winOpts)

	if err != nil {
		fmt.Printf("[!] Wails Run Error: %v\n", err)
	}
}
