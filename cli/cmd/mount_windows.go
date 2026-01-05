//go:build windows

package cmd

import (
	"os"
	"os/exec"
	"os/signal"
)

func execMount(binPath string, args []string) error {
	// args[0] is the binary path (argv[0]), so we skip it for exec.Command arguments
	cmd := exec.Command(binPath, args[1:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = os.Environ()

	if err := cmd.Start(); err != nil {
		return err
	}

	// Forward signals to the child process
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)

	go func() {
		for sig := range sigChan {
			// Windows only supports os.Interrupt (CTRL_BREAK_EVENT) via Process.Signal
			cmd.Process.Signal(sig)
		}
	}()

	err := cmd.Wait()
	signal.Stop(sigChan)
	close(sigChan)

	return err
}
