//go:build !windows

package cmd

import (
	"os"
	"syscall"
)

func execMount(binPath string, args []string) error {
	return syscall.Exec(binPath, args, os.Environ())
}
