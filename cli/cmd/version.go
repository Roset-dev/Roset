package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"runtime/debug"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

var (
	version   = "dev"
	commit    = "none"
	buildDate = "unknown"
)

// VersionInfo is the JSON output for version command.
type VersionInfo struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildDate string `json:"buildDate"`
	GoVersion string `json:"goVersion"`
	OS        string `json:"os"`
	Arch      string `json:"arch"`
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the CLI version information",
	Run:   runVersion,
}

func init() {
	rootCmd.AddCommand(versionCmd)

	// Try to get version from build info
	if info, ok := debug.ReadBuildInfo(); ok {
		if version == "dev" {
			version = info.Main.Version
		}
		for _, setting := range info.Settings {
			switch setting.Key {
			case "vcs.revision":
				if len(setting.Value) > 7 {
					commit = setting.Value[:7]
				} else {
					commit = setting.Value
				}
			case "vcs.time":
				buildDate = setting.Value
			}
		}
	}
}

func runVersion(cmd *cobra.Command, args []string) {
	info := VersionInfo{
		Version:   version,
		Commit:    commit,
		BuildDate: buildDate,
		GoVersion: goVersion(),
		OS:        goos(),
		Arch:      goarch(),
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(info)
		return
	}

	title := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4DA3FF"))
	label := lipgloss.NewStyle().Bold(true).Width(12)

	fmt.Println()
	fmt.Println(title.Render("Roset CLI"))
	fmt.Println()
	fmt.Printf("%s %s\n", label.Render("Version:"), version)
	fmt.Printf("%s %s\n", label.Render("Commit:"), commit)
	fmt.Printf("%s %s\n", label.Render("Built:"), buildDate)
	fmt.Println()
}

func goVersion() string {
	if info, ok := debug.ReadBuildInfo(); ok {
		return info.GoVersion
	}
	return "unknown"
}

func goos() string {
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, s := range info.Settings {
			if s.Key == "GOOS" {
				return s.Value
			}
		}
	}
	return "unknown"
}

func goarch() string {
	if info, ok := debug.ReadBuildInfo(); ok {
		for _, s := range info.Settings {
			if s.Key == "GOARCH" {
				return s.Value
			}
		}
	}
	return "unknown"
}
