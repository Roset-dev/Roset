// Package output provides a centralized output abstraction for the Roset CLI.
// It ensures consistent JSON/human output and error formatting across all commands.
package output

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Exit codes for different error categories
const (
	ExitOK     = 0
	ExitAuth   = 1 // Authentication/authorization errors
	ExitUser   = 2 // User input errors (bad flags, missing args)
	ExitSystem = 3 // System errors (network, file I/O)
)

// Printer handles output formatting based on the --json flag.
type Printer struct {
	JSONMode bool
}

// New creates a new Printer with the given JSON mode setting.
func New(jsonMode bool) *Printer {
	return &Printer{JSONMode: jsonMode}
}

// Result is a generic wrapper for command output.
type Result struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   *Error `json:"error,omitempty"`
}

// Error represents a structured error response.
type Error struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

// Print outputs data in JSON or human-readable format.
func (p *Printer) Print(data any) {
	if p.JSONMode {
		p.printJSON(Result{Success: true, Data: data})
		return
	}
	// For human output, just print the data directly
	fmt.Printf("%v\n", data)
}

// PrintJSON outputs a raw object as JSON (for custom structures).
func (p *Printer) PrintJSON(data any) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(data)
}

// PrintTable outputs data in a formatted table.
func (p *Printer) PrintTable(headers []string, rows [][]string) {
	if p.JSONMode {
		// Convert table to JSON array of objects
		var data []map[string]string
		for _, row := range rows {
			obj := make(map[string]string)
			for i, h := range headers {
				if i < len(row) {
					obj[h] = row[i]
				}
			}
			data = append(data, obj)
		}
		p.printJSON(Result{Success: true, Data: data})
		return
	}

	// Human-readable table
	if len(rows) == 0 {
		fmt.Println("No data")
		return
	}

	// Calculate column widths
	widths := make([]int, len(headers))
	for i, h := range headers {
		widths[i] = len(h)
	}
	for _, row := range rows {
		for i, cell := range row {
			if i < len(widths) && len(cell) > widths[i] {
				widths[i] = len(cell)
			}
		}
	}

	// Print header
	headerStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4DA3FF"))
	var headerParts []string
	for i, h := range headers {
		headerParts = append(headerParts, fmt.Sprintf("%-*s", widths[i], h))
	}
	fmt.Println(headerStyle.Render(strings.Join(headerParts, "  ")))

	// Print separator
	var sepParts []string
	for _, w := range widths {
		sepParts = append(sepParts, strings.Repeat("─", w))
	}
	fmt.Println(lipgloss.NewStyle().Foreground(lipgloss.Color("240")).Render(strings.Join(sepParts, "  ")))

	// Print rows
	for _, row := range rows {
		var rowParts []string
		for i := range headers {
			cell := ""
			if i < len(row) {
				cell = row[i]
			}
			rowParts = append(rowParts, fmt.Sprintf("%-*s", widths[i], cell))
		}
		fmt.Println(strings.Join(rowParts, "  "))
	}
}

// PrintError outputs an error in JSON or human-readable format.
func (p *Printer) PrintError(err error, code string, requestID string) {
	apiErr := &Error{
		Code:      code,
		Message:   err.Error(),
		RequestID: requestID,
	}

	if p.JSONMode {
		p.printJSON(Result{Success: false, Error: apiErr})
		return
	}

	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	dimStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("240"))

	fmt.Fprintf(os.Stderr, "%s %s\n", errorStyle.Render("Error:"), err.Error())
	if requestID != "" {
		fmt.Fprintf(os.Stderr, "%s\n", dimStyle.Render("Request ID: "+requestID))
	}
}

// PrintSuccess outputs a success message.
func (p *Printer) PrintSuccess(message string) {
	if p.JSONMode {
		p.printJSON(Result{Success: true, Data: map[string]string{"message": message}})
		return
	}
	successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	fmt.Println(successStyle.Render("✓ " + message))
}

func (p *Printer) printJSON(result Result) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(result)
}

// ExitWithError prints an error and exits with the appropriate code.
func (p *Printer) ExitWithError(err error, code string, exitCode int) {
	p.PrintError(err, code, "")
	os.Exit(exitCode)
}
