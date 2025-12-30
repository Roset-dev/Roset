package config

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

// Config holds all CLI configuration with explicit types.
type Config struct {
	APIURL  string `mapstructure:"api_url"`
	APIKey  string `mapstructure:"api_key"`
	Profile string `mapstructure:"profile"`
	Debug   bool   `mapstructure:"debug"`
}

// Defaults
const (
	DefaultAPIURL = "https://api.roset.dev"
)

var Cfg Config

// Init loads configuration from file and environment.
// Precedence: Flags > Env > File > Defaults (flags applied later via Resolve)
func Init() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	configPath := filepath.Join(home, ".roset")
	configName := "config"

	viper.AddConfigPath(configPath)
	viper.SetConfigName(configName)
	viper.SetConfigType("yaml")

	// Set defaults
	viper.SetDefault("api_url", DefaultAPIURL)
	viper.SetDefault("profile", "default")
	viper.SetDefault("debug", false)

	// Environment variable binding (ROSET_API_KEY, ROSET_API_URL, etc.)
	viper.SetEnvPrefix("ROSET")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return fmt.Errorf("error reading config file: %w", err)
		}
		// Config file not found is okay, we'll use defaults/env
	}

	if err := viper.Unmarshal(&Cfg); err != nil {
		return fmt.Errorf("unable to decode config: %w", err)
	}

	return nil
}

// Resolve applies flag overrides to the config.
// This implements: Flags > Env > File > Defaults
func Resolve(apiKey, apiURL string, debug bool) {
	if apiKey != "" {
		Cfg.APIKey = apiKey
	}
	if apiURL != "" {
		Cfg.APIURL = apiURL
	}
	if debug {
		Cfg.Debug = true
	}
}

// GetAPIURL returns the effective API URL.
func GetAPIURL() string {
	if Cfg.APIURL != "" {
		return Cfg.APIURL
	}
	return DefaultAPIURL
}

// Save persists the current configuration to disk.
func Save(url, key string) error {
	viper.Set("api_key", key)
	if url != "" && url != DefaultAPIURL {
		viper.Set("api_url", url)
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	configDir := filepath.Join(home, ".roset")
	if err := os.MkdirAll(configDir, 0700); err != nil {
		return err
	}

	configFile := filepath.Join(configDir, "config.yaml")
	if err := viper.WriteConfigAs(configFile); err != nil {
		return err
	}

	// Harden permissions to 0600 (owner read/write only)
	return os.Chmod(configFile, 0600)
}

// Clear removes stored credentials.
func Clear() error {
	viper.Set("api_key", "")

	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	configFile := filepath.Join(home, ".roset", "config.yaml")
	if err := viper.WriteConfigAs(configFile); err != nil {
		return err
	}

	Cfg.APIKey = ""
	return nil
}
