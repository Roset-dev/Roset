package cmd

import (
	"fmt"
	"runtime/debug"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

var (
	version   = "dev"
	commit    = "none"
	buildDate = "unknown"
)

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
