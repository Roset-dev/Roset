package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"

	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

var unmountCmd = &cobra.Command{
	Use:   "unmount <mountpoint>",
	Short: "Unmount a Roset filesystem",
	Long: `Unmount a Roset FUSE filesystem.

This command is a convenience wrapper around the system unmount commands:
  - macOS/Linux: umount or fusermount -u
  - Windows: Not supported (FUSE not available)

Example:
  roset unmount /mnt/roset`,
	Args: cobra.ExactArgs(1),
	RunE: runUnmount,
}

func init() {
	rootCmd.AddCommand(unmountCmd)
}

func runUnmount(cmd *cobra.Command, args []string) error {
	mountpoint := args[0]

	success := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("196"))

	// Check if mountpoint exists
	if _, err := os.Stat(mountpoint); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "%s Mountpoint does not exist: %s\n", errorStyle.Render("✗"), mountpoint)
		return fmt.Errorf("mountpoint does not exist: %s", mountpoint)
	}

	var unmountErr error

	switch runtime.GOOS {
	case "linux":
		// Try fusermount first (FUSE-specific), fall back to umount
		if _, err := exec.LookPath("fusermount"); err == nil {
			unmountErr = exec.Command("fusermount", "-u", mountpoint).Run()
		} else {
			unmountErr = exec.Command("umount", mountpoint).Run()
		}

	case "darwin":
		// macOS uses umount
		unmountErr = exec.Command("umount", mountpoint).Run()

	case "windows":
		fmt.Fprintf(os.Stderr, "%s FUSE unmount is not supported on Windows\n", errorStyle.Render("✗"))
		return fmt.Errorf("FUSE unmount is not supported on Windows")

	default:
		// Try generic umount
		unmountErr = exec.Command("umount", mountpoint).Run()
	}

	if unmountErr != nil {
		fmt.Fprintf(os.Stderr, "%s Failed to unmount %s: %v\n", errorStyle.Render("✗"), mountpoint, unmountErr)
		return unmountErr
	}

	fmt.Printf("%s Unmounted %s\n", success.Render("✔"), mountpoint)
	return nil
}
