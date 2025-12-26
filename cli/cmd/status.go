package cmd

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/roset-dev/roset/monorepo/cli/pkg/config"
	"github.com/spf13/cobra"
)

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show current Roset configuration and connection status",
	Run:   runStatus,
}

func init() {
	rootCmd.AddCommand(statusCmd)
}

func runStatus(cmd *cobra.Command, args []string) {
	success := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warning := lipgloss.NewStyle().Foreground(lipgloss.Color("214"))
	info := lipgloss.NewStyle().Foreground(lipgloss.Color("#4DA3FF"))
	label := lipgloss.NewStyle().Bold(true).Width(16)

	fmt.Println()
	fmt.Println(info.Bold(true).Render("Roset CLI Status"))
	fmt.Println(strings.Repeat("─", 40))

	// Configuration
	fmt.Printf("%s %s\n", label.Render("API URL:"), config.Cfg.APIURL)
	if config.Cfg.APIKey != "" {
		masked := maskKey(config.Cfg.APIKey)
		fmt.Printf("%s %s\n", label.Render("API Key:"), success.Render(masked))
	} else {
		fmt.Printf("%s %s\n", label.Render("API Key:"), warning.Render("Not set (run `roset login`)"))
	}

	// System info
	fmt.Println()
	fmt.Printf("%s %s/%s\n", label.Render("System:"), runtime.GOOS, runtime.GOARCH)
	fmt.Printf("%s %s\n", label.Render("Go Version:"), runtime.Version())

	// Check for FUSE mounts
	fmt.Println()
	mounts := checkFuseMounts()
	if len(mounts) > 0 {
		fmt.Printf("%s\n", label.Render("Active Mounts:"))
		for _, m := range mounts {
			fmt.Printf("  %s %s\n", success.Render("●"), m)
		}
	} else {
		fmt.Printf("%s %s\n", label.Render("Active Mounts:"), warning.Render("None detected"))
	}

	fmt.Println()
}

func maskKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + strings.Repeat("*", len(key)-8) + key[len(key)-4:]
}

func checkFuseMounts() []string {
	var mounts []string
	out, err := exec.Command("mount").Output()
	if err != nil {
		return mounts
	}

	for _, line := range strings.Split(string(out), "\n") {
		lower := strings.ToLower(line)
		if strings.Contains(lower, "roset") || strings.Contains(lower, "fuse") && strings.Contains(lower, "/mnt") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				mounts = append(mounts, parts[2])
			}
		}
	}
	return mounts
}
