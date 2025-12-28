package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/roset-dev/roset/monorepo/cli/pkg/api"
	"github.com/roset-dev/roset/monorepo/cli/pkg/config"
	"github.com/spf13/cobra"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with the Roset API",
	Run:   runLogin,
}

func init() {
	rootCmd.AddCommand(loginCmd)
}

type loginModel struct {
	textInput  textinput.Model
	state      int // 0: URL, 1: Key, 2: Validating, 3: Done
	url        string
	key        string
	err        error
	validating bool
	latency    string
}

func initialLoginModel() loginModel {
	ti := textinput.New()
	ti.Placeholder = "ros_..."
	ti.Focus()
	ti.CharLimit = 156
	ti.Width = 40
	ti.EchoMode = textinput.EchoPassword

	return loginModel{
		textInput: ti,
		state:     1, // Start at Key input
		url:       "https://api.roset.dev",
	}
}

func (m loginModel) Init() tea.Cmd {
	return textinput.Blink
}

// validateCredentials is a tea.Cmd that validates the API key
type validateResult struct {
	success bool
	latency string
	err     error
}

func validateCredentials(url, key string) tea.Cmd {
	return func() tea.Msg {
		client := api.NewClient(url, key)
		_, latency, err := client.Whoami()

		if err != nil {
			return validateResult{
				success: false,
				err:     err,
			}
		}

		return validateResult{
			success: true,
			latency: latency.Round(1e6).String(), // Round to milliseconds
		}
	}
}

func (m loginModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case validateResult:
		m.validating = false
		if !msg.success {
			m.err = msg.err
			m.state = 3 // Done with error
			return m, tea.Quit
		}

		// Validation succeeded - save config
		m.latency = msg.latency
		if err := config.Save(m.url, m.key); err != nil {
			m.err = err
		}
		m.state = 3
		return m, tea.Quit

	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		case tea.KeyEnter:
			if m.validating {
				return m, nil // Ignore while validating
			}

			switch m.state {
			case 1:
				m.key = m.textInput.Value()
				if m.key == "" {
					m.err = fmt.Errorf("API key cannot be empty")
					m.state = 3
					return m, tea.Quit
				}
				m.state = 2
				m.validating = true
				return m, validateCredentials(m.url, m.key)
			}
		}
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m loginModel) View() string {
	titleStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4DA3FF"))
	successStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("42"))
	errorStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
	dimStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("240"))

	switch m.state {
	case 1:
		return fmt.Sprintf(
			"%s\n\n%s\n\n%s",
			titleStyle.Render("Enter your API Key:"),
			m.textInput.View(),
			"(esc to quit)",
		) + "\n"
	case 2:
		return titleStyle.Render("Validating credentials...") + "\n"
	case 3:
		if m.err != nil {
			return fmt.Sprintf(
				"%s %s\n%s\n",
				errorStyle.Render("✗"),
				errorStyle.Render("Authentication failed"),
				dimStyle.Render(m.err.Error()),
			)
		}
		return fmt.Sprintf(
			"%s %s\n",
			successStyle.Render("✔"),
			successStyle.Render(fmt.Sprintf("Authenticated successfully (latency: %s)", m.latency)),
		)
	}
	return ""
}

func runLogin(cmd *cobra.Command, args []string) {
	p := tea.NewProgram(initialLoginModel())
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
}
