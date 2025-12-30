package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/charmbracelet/lipgloss"
	"github.com/roset-dev/roset/monorepo/cli/pkg/config"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var doctorCmd = &cobra.Command{
	Use:   "doctor",
	Short: "Diagnose configuration issues",
	Long:  `Check for common configuration problems including file permissions, environment overrides, and missing settings.`,
	Run:   runDoctor,
}

func init() {
	// Add as subcommand of a config group
	configCmd := &cobra.Command{
		Use:   "config",
		Short: "Manage CLI configuration",
	}
	configCmd.AddCommand(doctorCmd)
	rootCmd.AddCommand(configCmd)
}

// DoctorResult contains the diagnostic output.
type DoctorResult struct {
	ConfigPath   string        `json:"configPath"`
	ConfigExists bool          `json:"configExists"`
	Permissions  string        `json:"permissions,omitempty"`
	Issues       []DoctorIssue `json:"issues"`
	EnvOverrides []string      `json:"envOverrides,omitempty"`
}

// DoctorIssue represents a single diagnostic issue.
type DoctorIssue struct {
	Level   string `json:"level"` // "warn", "error"
	Message string `json:"message"`
}

func runDoctor(cmd *cobra.Command, args []string) {
	success := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warning := lipgloss.NewStyle().Foreground(lipgloss.Color("214"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	title := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4DA3FF"))
	label := lipgloss.NewStyle().Bold(true).Width(16)

	home, _ := os.UserHomeDir()
	configPath := filepath.Join(home, ".roset", "config.yaml")

	result := DoctorResult{
		ConfigPath: configPath,
		Issues:     []DoctorIssue{},
	}

	// Check if config file exists
	info, err := os.Stat(configPath)
	if err != nil {
		result.ConfigExists = false
		result.Issues = append(result.Issues, DoctorIssue{
			Level:   "warn",
			Message: "Config file not found. Run 'roset login' to create one.",
		})
	} else {
		result.ConfigExists = true
		result.Permissions = fmt.Sprintf("%04o", info.Mode().Perm())

		// Check permissions
		perm := info.Mode().Perm()
		if perm&0077 != 0 {
			result.Issues = append(result.Issues, DoctorIssue{
				Level:   "error",
				Message: fmt.Sprintf("Config file has insecure permissions (%04o). Should be 0600.", perm),
			})
		}
	}

	// Check for environment overrides
	envVars := []string{"ROSET_API_KEY", "ROSET_API_URL", "ROSET_DEBUG"}
	for _, env := range envVars {
		if val := os.Getenv(env); val != "" {
			result.EnvOverrides = append(result.EnvOverrides, env)
		}
	}

	// Check API key
	if config.Cfg.APIKey == "" && os.Getenv("ROSET_API_KEY") == "" {
		result.Issues = append(result.Issues, DoctorIssue{
			Level:   "warn",
			Message: "No API key configured. Run 'roset login' to authenticate.",
		})
	}

	// Check for Viper config conflicts
	if viper.ConfigFileUsed() != "" && viper.ConfigFileUsed() != configPath {
		result.Issues = append(result.Issues, DoctorIssue{
			Level:   "warn",
			Message: fmt.Sprintf("Viper using different config: %s", viper.ConfigFileUsed()),
		})
	}

	// JSON output
	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(result)
		return
	}

	// Human output
	fmt.Println()
	fmt.Println(title.Render("Roset Config Doctor"))
	fmt.Println()

	fmt.Printf("%s %s\n", label.Render("Config Path:"), configPath)
	if result.ConfigExists {
		fmt.Printf("%s %s %s\n", label.Render("Status:"), success.Render("● Found"), "("+result.Permissions+")")
	} else {
		fmt.Printf("%s %s\n", label.Render("Status:"), warning.Render("● Not found"))
	}

	// Environment overrides
	if len(result.EnvOverrides) > 0 {
		fmt.Println()
		fmt.Printf("%s\n", label.Render("Env Overrides:"))
		for _, env := range result.EnvOverrides {
			fmt.Printf("  %s %s\n", success.Render("●"), env)
		}
	}

	// Issues
	if len(result.Issues) > 0 {
		fmt.Println()
		fmt.Printf("%s\n", label.Render("Issues:"))
		for _, issue := range result.Issues {
			var style lipgloss.Style
			if issue.Level == "error" {
				style = errorStyle
			} else {
				style = warning
			}
			fmt.Printf("  %s %s\n", style.Render("●"), issue.Message)
		}
	} else {
		fmt.Println()
		fmt.Printf("%s %s\n", label.Render("Status:"), success.Render("✓ No issues found"))
	}

	fmt.Println()
}
