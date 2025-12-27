package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/roset-dev/roset/monorepo/cli/pkg/api"
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

// StatusOutput is the JSON output format for status command
type StatusOutput struct {
	Config     ConfigStatus `json:"config"`
	Connection ConnStatus   `json:"connection"`
	System     SystemInfo   `json:"system"`
	Mounts     []string     `json:"mounts"`
}

type ConfigStatus struct {
	APIURL    string `json:"apiUrl"`
	HasAPIKey bool   `json:"hasApiKey"`
}

type ConnStatus struct {
	Reachable     bool   `json:"reachable"`
	Authenticated bool   `json:"authenticated"`
	LatencyMs     int64  `json:"latencyMs,omitempty"`
	Error         string `json:"error,omitempty"`
}

type SystemInfo struct {
	OS        string `json:"os"`
	Arch      string `json:"arch"`
	GoVersion string `json:"goVersion"`
}

func runStatus(cmd *cobra.Command, args []string) {
	success := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warning := lipgloss.NewStyle().Foreground(lipgloss.Color("214"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	info := lipgloss.NewStyle().Foreground(lipgloss.Color("#4DA3FF"))
	label := lipgloss.NewStyle().Bold(true).Width(16)
	dim := lipgloss.NewStyle().Foreground(lipgloss.Color("240"))

	output := StatusOutput{
		Config: ConfigStatus{
			APIURL:    config.Cfg.APIURL,
			HasAPIKey: config.Cfg.APIKey != "",
		},
		System: SystemInfo{
			OS:        runtime.GOOS,
			Arch:      runtime.GOARCH,
			GoVersion: runtime.Version(),
		},
		Mounts: checkFuseMounts(),
	}

	// Check API connectivity and auth
	if config.Cfg.APIKey != "" {
		client := api.NewClient(config.Cfg.APIURL, config.Cfg.APIKey)
		_, latency, err := client.Whoami()
		output.Connection.LatencyMs = latency.Milliseconds()

		if err == nil {
			output.Connection.Reachable = true
			output.Connection.Authenticated = true
		} else {
			// Check if it's just auth error (API is reachable)
			if apiErr, ok := err.(*api.APIError); ok {
				output.Connection.Reachable = true
				output.Connection.Authenticated = false
				output.Connection.Error = apiErr.Message
			} else {
				output.Connection.Reachable = false
				output.Connection.Error = err.Error()
			}
		}
	}

	// JSON output
	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(output)
		return
	}

	// Human output
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

	// Connectivity
	fmt.Println()
	if output.Connection.Reachable {
		if output.Connection.Authenticated {
			fmt.Printf("%s %s %s\n",
				label.Render("API Status:"),
				success.Render("● Connected"),
				dim.Render(fmt.Sprintf("(%dms)", output.Connection.LatencyMs)),
			)
		} else {
			fmt.Printf("%s %s\n",
				label.Render("API Status:"),
				errorStyle.Render("● Auth failed: "+output.Connection.Error),
			)
		}
	} else if config.Cfg.APIKey != "" {
		fmt.Printf("%s %s\n",
			label.Render("API Status:"),
			errorStyle.Render("● Unreachable: "+output.Connection.Error),
		)
	} else {
		fmt.Printf("%s %s\n", label.Render("API Status:"), dim.Render("● Not configured"))
	}

	// System info
	fmt.Println()
	fmt.Printf("%s %s/%s\n", label.Render("System:"), runtime.GOOS, runtime.GOARCH)
	fmt.Printf("%s %s\n", label.Render("Go Version:"), runtime.Version())

	// Check for FUSE mounts
	fmt.Println()
	if len(output.Mounts) > 0 {
		fmt.Printf("%s\n", label.Render("Active Mounts:"))
		for _, m := range output.Mounts {
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
