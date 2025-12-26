package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove stored credentials and configuration",
	Run:   runLogout,
}

func init() {
	rootCmd.AddCommand(logoutCmd)
}

func runLogout(cmd *cobra.Command, args []string) {
	success := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	warning := lipgloss.NewStyle().Foreground(lipgloss.Color("214"))

	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Println(warning.Render("Error getting home directory: " + err.Error()))
		return
	}

	configFile := filepath.Join(home, ".roset", "config.yaml")

	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		fmt.Println(warning.Render("No credentials found. Already logged out."))
		return
	}

	if err := os.Remove(configFile); err != nil {
		fmt.Println(warning.Render("Error removing credentials: " + err.Error()))
		return
	}

	fmt.Println(success.Render("✔ Successfully logged out. Credentials removed."))
}
