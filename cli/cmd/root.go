package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/lipgloss"
	"github.com/roset-dev/roset/monorepo/cli/pkg/config"
	"github.com/spf13/cobra"
)

var (
	jsonOutput bool
	verbose    bool
	apiURL     string
	apiKey     string
)

var banner = `
    ____  ____  _____ ______ ______ 
   / __ \/ __ \/ ___// ____//_  __/ 
  / /_/ / / / /\__ \/ __/    / /    
 / _, _/ /_/ /___/ / /___   / /     
/_/ |_|\____//____/_____/  /_/      
`

var rootCmd = &cobra.Command{
	Use:   "roset",
	Short: "Roset CLI - The operator's interface for Roset",
	Long:  `Roset CLI is a specialized tool for developers and SREs to manage, debug, and automate Roset environments.`,
	Run: func(cmd *cobra.Command, args []string) {
		printBanner()
		_ = cmd.Help()
	},
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output in JSON format")
	rootCmd.PersistentFlags().BoolVar(&verbose, "verbose", false, "Enable verbose logging")
	rootCmd.PersistentFlags().StringVar(&apiURL, "api-url", "", "Roset API URL (overrides config)")
	rootCmd.PersistentFlags().StringVar(&apiKey, "api-key", "", "Roset API Key (overrides config)")
}

func initConfig() {
	if err := config.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "Config error: %v\n", err)
	}
}

func printBanner() {
	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#4DA3FF")).
		Padding(1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color("#4DA3FF"))

	fmt.Println(style.Render(banner))
	fmt.Println(lipgloss.NewStyle().Bold(true).Render("Roset Control Plane CLI") + "\n")
}
