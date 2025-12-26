package cmd

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/fatih/color"
	"github.com/roset-dev/roset/monorepo/cli/pkg/redact"
	"github.com/spf13/cobra"
)

var (
	outputFile string
	noRedact   bool
)

var debugCmd = &cobra.Command{
	Use:   "debug",
	Short: "Debugging and diagnostic tools",
}

var bundleCmd = &cobra.Command{
	Use:   "bundle",
	Short: "Create a diagnostic bundle for troubleshooting",
	Run:   runBundle,
}

func init() {
	bundleCmd.Flags().StringVarP(&outputFile, "output", "o", "", "Output path for the bundle")
	bundleCmd.Flags().BoolVar(&noRedact, "no-redact", false, "Disable secret redaction (DANGEROUS)")
	debugCmd.AddCommand(bundleCmd)
	rootCmd.AddCommand(debugCmd)
}

func runBundle(cmd *cobra.Command, args []string) {
	if noRedact {
		color.Red("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
		color.Red("!! WARNING: Redaction is DISABLED. This bundle will       !!")
		color.Red("!! contain secrets (API keys, DB URLs, etc.).             !!")
		color.Red("!! DO NOT share this bundle with unauthorized parties.    !!")
		color.Red("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
	}

	timestamp := time.Now().Format("20060102-150405")
	if outputFile == "" {
		outputFile = fmt.Sprintf("roset-debug-%s.tar.gz", timestamp)
	}

	color.Cyan("🚀 Starting diagnostic bundle collection...")

	tmpDir, err := os.MkdirTemp("", "roset-debug-*")
	if err != nil {
		fmt.Printf("Error creating temp dir: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	// 1. System Info
	color.Blue("📋 Collecting system info...")
	sysInfo := getSystemInfo()
	writeJSON(filepath.Join(tmpDir, "system_info.json"), sysInfo)

	// 2. Mount Info
	color.Blue("🏔️ Collecting mount info...")
	mountInfo := getMountInfo()
	writeJSON(filepath.Join(tmpDir, "mount_info.json"), mountInfo)

	// 3. Logs
	color.Blue("📜 Collecting logs...")
	collectLogs(tmpDir)

	// 4. Compress
	color.Blue("📦 Creating archive %s...", outputFile)
	if err := createArchive(tmpDir, outputFile); err != nil {
		fmt.Printf("Error creating archive: %v\n", err)
		os.Exit(1)
	}

	color.Green("✅ Bundle created successfully: %s", outputFile)
}

func getSystemInfo() map[string]interface{} {
	return map[string]interface{}{
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"os":             runtime.GOOS,
		"arch":           runtime.GOARCH,
		"python_version": "N/A (Go CLI)",
		"env_vars":       filterEnvVars(),
	}
}

func filterEnvVars() map[string]string {
	env := make(map[string]string)
	for _, e := range os.Environ() {
		pair := strings.SplitN(e, "=", 2)
		key := strings.ToLower(pair[0])
		if strings.Contains(key, "roset") || strings.Contains(key, "path") || strings.Contains(key, "user") {
			val := pair[1]
			if !noRedact {
				val = redact.String(val)
			}
			env[pair[0]] = val
		}
	}
	return env
}

func getMountInfo() map[string]interface{} {
	out, err := exec.Command("mount").Output()
	if err != nil {
		return map[string]interface{}{"error": err.Error()}
	}

	lines := strings.Split(string(out), "\n")
	var rosetMounts []string
	for _, line := range lines {
		if strings.Contains(strings.ToLower(line), "roset") || strings.Contains(strings.ToLower(line), "fuse") {
			rosetMounts = append(rosetMounts, line)
		}
	}
	return map[string]interface{}{"all_fuse_roset_mounts": rosetMounts}
}

func collectLogs(tmpDir string) {
	logDir := filepath.Join(tmpDir, "logs")
	if err := os.Mkdir(logDir, 0755); err != nil {
		fmt.Printf("Warning: failed to create log dir: %v\n", err)
		return
	}

	sources := []string{
		"/var/log/syslog",
		"/var/log/messages",
		"/var/log/roset.log",
	}

	for _, src := range sources {
		if _, err := os.Stat(src); err == nil {
			// Read last 1000 lines (simplified for Go)
			content, _ := os.ReadFile(src)
			lines := strings.Split(string(content), "\n")
			start := 0
			if len(lines) > 1000 {
				start = len(lines) - 1001
			}
			data := strings.Join(lines[start:], "\n")

			if !noRedact {
				data = redact.String(data)
			}

			if err := os.WriteFile(filepath.Join(logDir, filepath.Base(src)), []byte(data), 0644); err != nil {
				fmt.Printf("Warning: failed to write log file %s: %v\n", src, err)
			}
		}
	}
}

func writeJSON(path string, data interface{}) {
	b, _ := json.MarshalIndent(data, "", "  ")
	if err := os.WriteFile(path, b, 0644); err != nil {
		fmt.Printf("Warning: failed to write JSON to %s: %v\n", path, err)
	}
}

func createArchive(src, dest string) error {
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	gw := gzip.NewWriter(out)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		header, err := tar.FileInfoHeader(info, info.Name())
		if err != nil {
			return err
		}

		rel, _ := filepath.Rel(src, path)
		header.Name = filepath.Join("roset-debug", rel)

		if err := tw.WriteHeader(header); err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()

		_, err = io.Copy(tw, f)
		return err
	})
}
