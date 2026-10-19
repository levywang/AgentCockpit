package config

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Config holds the runtime configuration for the lock screen, wallpaper, and agent watcher
type Config struct {
	Passcode         string  `json:"passcode" yaml:"passcode"`
	Speed            float64 `json:"speed" yaml:"speed"`
	Theme            string  `json:"theme" yaml:"theme"`
	Mode             string  `json:"mode" yaml:"mode"`                         // "lock" | "wallpaper" | "windowed"
	AutoLockMinutes  int     `json:"autoLockMinutes" yaml:"autoLockMinutes"`   // 0 (disabled), 1, 5, 10, 30
	LockOnStartup    bool    `json:"lockOnStartup" yaml:"lockOnStartup"`       // 启动时是否自动进入锁屏
	Windowed         bool    `json:"windowed" yaml:"windowed"`                 // 窗口模式
	IsChild          bool    `json:"isChild" yaml:"-"`
	MonitorIndex     int     `json:"monitorIndex" yaml:"-"`
	HubPort          int     `json:"hubPort" yaml:"-"`
	MonitorCount     int     `json:"monitorCount" yaml:"-"`
	AiWatcherEnabled bool    `json:"aiWatcherEnabled" yaml:"aiWatcherEnabled"` // 是否开启 AI 编程行为监听
	TvNoiseEffect    bool    `json:"tvNoiseEffect" yaml:"tvNoiseEffect"`       // 全局老电视雪花特效
	MosaicEffect     bool    `json:"mosaicEffect" yaml:"mosaicEffect"`         // 全局马赛克特效
	ScanlineEffect   bool    `json:"scanlineEffect" yaml:"scanlineEffect"`     // 全局CRT扫描线特效
	WorkspaceDir     string  `json:"workspaceDir" yaml:"workspaceDir"`         // 监听的工作空间真实目录
}

// UnmarshalYAML implements custom unmarshaling to support both camelCase and snake_case YAML properties
func (c *Config) UnmarshalYAML(value *yaml.Node) error {
	type rawConfig Config
	raw := rawConfig(*c)
	if err := value.Decode(&raw); err != nil {
		return err
	}
	*c = Config(raw)

	// Process snake_case or alias overrides
	var m map[string]interface{}
	if err := value.Decode(&m); err == nil {
		for k, v := range m {
			switch strings.ToLower(k) {
			case "auto_lock_minutes", "autolock":
				if val, ok := v.(int); ok {
					c.AutoLockMinutes = val
				}
			case "lock_on_startup", "autolockonstartup":
				if val, ok := v.(bool); ok {
					c.LockOnStartup = val
				}
			case "ai_watcher_enabled", "aiwatcher", "watcher_enabled":
				if val, ok := v.(bool); ok {
					c.AiWatcherEnabled = val
				}
			case "tv_noise_effect", "tv_noise", "snow_effect", "tvnoise":
				if val, ok := v.(bool); ok {
					c.TvNoiseEffect = val
				}
			case "mosaic_effect", "mosaic":
				if val, ok := v.(bool); ok {
					c.MosaicEffect = val
				}
			case "scanline_effect", "scanlines", "scanline":
				if val, ok := v.(bool); ok {
					c.ScanlineEffect = val
				}
			case "workspace_dir", "workspacedir", "workspace", "dir":
				if val, ok := v.(string); ok && val != "" {
					c.WorkspaceDir = val
				}
			}
		}
	}
	return nil
}

// DefaultConfig provides default parameters used if config.yaml or specific keys are missing
func DefaultConfig() Config {
	cwd, _ := os.Getwd()
	if cwd == "" {
		cwd = "."
	}
	return Config{
		Passcode:         "1234",
		Speed:            1.0,
		Theme:            "dark",
		Mode:             "windowed",
		AutoLockMinutes:  0,
		LockOnStartup:    false,
		Windowed:         true,
		AiWatcherEnabled: true,
		TvNoiseEffect:    false,
		MosaicEffect:     false,
		ScanlineEffect:   false,
		WorkspaceDir:     cwd,
	}
}

// GetConfigYamlPath determines the path to config.yaml in the program's runtime directory
func GetConfigYamlPath() string {
	// 1. Check current working directory and parent directories (supports test runners in subdirs)
	if cwd, err := os.Getwd(); err == nil {
		dir := cwd
		for i := 0; i < 4; i++ {
			target := filepath.Join(dir, "config.yaml")
			if _, err := os.Stat(target); err == nil {
				return target
			}
			parent := filepath.Dir(dir)
			if parent == dir {
				break
			}
			dir = parent
		}
	}

	// 2. Check program executable directory (in case launched from desktop shortcut)
	if exe, err := os.Executable(); err == nil {
		exePath := filepath.Join(filepath.Dir(exe), "config.yaml")
		if _, err := os.Stat(exePath); err == nil {
			return exePath
		}
	}

	// 3. Fallback: prioritize current working directory
	if cwd, err := os.Getwd(); err == nil {
		return filepath.Join(cwd, "config.yaml")
	}
	if exe, err := os.Executable(); err == nil {
		return filepath.Join(filepath.Dir(exe), "config.yaml")
	}
	return "config.yaml"
}

// LoadConfigFile loads configuration from config.yaml, falling back to DefaultConfig for any missing keys
func LoadConfigFile() (Config, bool) {
	cfg := DefaultConfig()
	filePath := GetConfigYamlPath()
	data, err := os.ReadFile(filePath)
	if err != nil {
		// File does not exist yet; save default config.yaml for user convenience
		_ = SaveConfigFile(cfg)
		return cfg, false
	}
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		fmt.Printf("[!] Warning: failed to parse config.yaml: %v. Using defaults.\n", err)
		return cfg, false
	}
	if cfg.WorkspaceDir == "" {
		if cwd, err := os.Getwd(); err == nil {
			cfg.WorkspaceDir = cwd
		}
	}
	return cfg, true
}

// SaveConfigFile writes the configuration to config.yaml in the runtime directory
func SaveConfigFile(cfg Config) error {
	filePath := GetConfigYamlPath()
	data, err := yaml.Marshal(&cfg)
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

// ParseConfig loads saved user configuration from config.yaml and applies optional command line flags.
func ParseConfig() Config {
	var (
		passcodeFlag  string
		speedFlag     float64
		themeFlag     string
		modeFlag      string
		windowedFlag  bool
		childFlag     bool
		monitorFlag   int
		hubPortFlag   int
		workspaceFlag string
	)

	fs := flag.NewFlagSet("agent-cockpit", flag.ContinueOnError)
	fs.StringVar(&passcodeFlag, "p", "", "Unlock passcode (default: 1234)")
	fs.StringVar(&passcodeFlag, "passcode", "", "Unlock passcode (default: 1234)")
	fs.Float64Var(&speedFlag, "s", 0, "Playback speed: 0.5, 1, 2, 4 (default: 1.0)")
	fs.Float64Var(&speedFlag, "speed", 0, "Playback speed: 0.5, 1, 2, 4 (default: 1.0)")
	fs.StringVar(&themeFlag, "t", "", "Theme: dark / light (default: dark)")
	fs.StringVar(&themeFlag, "theme", "", "Theme: dark / light (default: dark)")
	fs.StringVar(&modeFlag, "m", "", "Mode: lock / wallpaper / windowed")
	fs.StringVar(&modeFlag, "mode", "", "Mode: lock / wallpaper / windowed")
	fs.BoolVar(&windowedFlag, "w", false, "Run in windowed mode")
	fs.BoolVar(&windowedFlag, "windowed", false, "Run in windowed mode")
	fs.BoolVar(&childFlag, "child", false, "Internal flag: run as secondary monitor screen")
	fs.IntVar(&monitorFlag, "monitor", 0, "Internal flag: target monitor index")
	fs.IntVar(&hubPortFlag, "hub-port", 0, "Internal flag: inter-screen sync port")
	fs.StringVar(&workspaceFlag, "dir", "", "Workspace directory to monitor")
	fs.StringVar(&workspaceFlag, "workspace", "", "Workspace directory to monitor")

	_ = fs.Parse(os.Args[1:])

	// 1. Prioritize parameters from runtime config.yaml; fallback to DefaultConfig
	cfg, _ := LoadConfigFile()

	// 2. Child processes inherit parent process parameters
	cfg.IsChild = childFlag
	cfg.MonitorIndex = monitorFlag
	cfg.HubPort = hubPortFlag

	// 3. Command line flags take precedence if explicitly specified
	if passcodeFlag != "" {
		cfg.Passcode = passcodeFlag
	}
	if speedFlag > 0 {
		cfg.Speed = speedFlag
	}
	if themeFlag != "" {
		cfg.Theme = normalizeTheme(themeFlag)
	}
	if modeFlag != "" {
		cfg.Mode = normalizeMode(modeFlag)
	}
	if windowedFlag {
		cfg.Windowed = true
		cfg.Mode = "windowed"
	}
	if workspaceFlag != "" {
		cfg.WorkspaceDir = workspaceFlag
	}

	// 4. Save latest config to config.yaml if primary instance
	if !childFlag {
		_ = SaveConfigFile(cfg)
	}

	return cfg
}

func normalizeTheme(t string) string {
	lower := strings.ToLower(strings.TrimSpace(t))
	if lower == "light" || lower == "white" || lower == "白" || lower == "浅色" {
		return "light"
	}
	return "dark"
}

func normalizeMode(m string) string {
	lower := strings.ToLower(strings.TrimSpace(m))
	if lower == "wallpaper" || lower == "desk" || lower == "壁纸" || lower == "桌面" {
		return "wallpaper"
	}
	if lower == "lock" || lower == "锁屏" {
		return "lock"
	}
	return "windowed"
}
