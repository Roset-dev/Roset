/*
Package cmd provides CLI commands for the Roset client.

mount.go implements the `roset mount` command, which wraps the roset-fuse binary.
*/
package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"

	"github.com/roset-dev/roset/monorepo/cli/pkg/config"
	"github.com/spf13/cobra"
)

var mountCmd = &cobra.Command{
	Use:   "mount <mountpoint>",
	Short: "Mount a Roset filesystem",
	Long: `Mount Roset-managed object storage as a local filesystem using FUSE.

This command wraps the roset-fuse binary. Ensure roset-fuse is installed
and available in your PATH.

Example:
  roset mount /mnt/roset
  roset mount /mnt/roset --debug
  roset mount /mnt/roset --read-only`,
	Args: cobra.ExactArgs(1),
	RunE: runMount,
}

var (
	mountDebug    bool
	mountReadOnly bool
	mountMountID  string
)

func init() {
	rootCmd.AddCommand(mountCmd)

	mountCmd.Flags().BoolVar(&mountDebug, "debug", false, "Enable debug logging")
	mountCmd.Flags().BoolVar(&mountReadOnly, "read-only", false, "Mount as read-only")
	mountCmd.Flags().StringVar(&mountMountID, "mount-id", "", "Specific mount ID (uses default if omitted)")
}

func runMount(cmd *cobra.Command, args []string) error {
	mountpoint := args[0]

	// Find roset-fuse binary
	fusePath, err := exec.LookPath("roset-fuse")
	if err != nil {
		return fmt.Errorf("roset-fuse binary not found in PATH. Please install it first.\n\nInstallation:\n  cd fuse && cargo build --release\n  sudo cp target/release/roset-fuse /usr/local/bin/")
	}

	// Load config
	cfg := config.Cfg

	// Build arguments
	fuseArgs := []string{fusePath, mountpoint}

	// Add API URL and key from config (CLI flags override)
	url := cfg.APIURL
	if apiURL != "" {
		url = apiURL
	}
	if url != "" {
		fuseArgs = append(fuseArgs, "--api-url", url)
	}

	key := cfg.APIKey
	if apiKey != "" {
		key = apiKey
	}
	if key != "" {
		fuseArgs = append(fuseArgs, "--api-key", key)
	}

	// Add optional flags
	if mountDebug {
		fuseArgs = append(fuseArgs, "--debug")
	}
	if mountReadOnly {
		fuseArgs = append(fuseArgs, "--read-only")
	}
	if mountMountID != "" {
		fuseArgs = append(fuseArgs, "--mount-id", mountMountID)
	}

	// Always run in foreground when launched from CLI
	fuseArgs = append(fuseArgs, "--foreground")

	fmt.Printf("Mounting %s...\n", mountpoint)

	// Execute roset-fuse (replaces current process)
	// Execute roset-fuse (replaces current process)
	// TODO: syscall.Exec is not supported on Windows. Use exec.Command + wait for Windows support.
	return syscall.Exec(fusePath, fuseArgs, os.Environ())
}
