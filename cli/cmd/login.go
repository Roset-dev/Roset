package cmd

import (
	"fmt"
	"os"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
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

type model struct {
	textInput textinput.Model
	state     int // 0: URL, 1: Key, 2: Done
	url       string
	key       string
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "https://api.roset.dev"
	ti.Focus()
	ti.CharLimit = 156
	ti.Width = 40

	return model{
		textInput: ti,
		state:     0,
	}
}

func (m model) Init() tea.Cmd {
	return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		case tea.KeyEnter:
			if m.state == 0 {
				m.url = m.textInput.Value()
				if m.url == "" {
					m.url = "https://api.roset.dev"
				}
				m.state = 1
				m.textInput.Reset()
				m.textInput.Placeholder = "ros_..."
				m.textInput.EchoMode = textinput.EchoPassword
				return m, nil
			} else if m.state == 1 {
				m.key = m.textInput.Value()
				m.state = 2

				// Save config
				if err := config.Save(m.url, m.key); err != nil {
					m.err = err
				}

				return m, tea.Quit
			}
		}
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v\n", m.err)
	}

	titleStyle := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#4DA3FF"))

	switch m.state {
	case 0:
		return fmt.Sprintf(
			"%s\n\n%s\n\n%s",
			titleStyle.Render("Enter your Roset API Endpoint:"),
			m.textInput.View(),
			"(esc to quit)",
		) + "\n"
	case 1:
		return fmt.Sprintf(
			"%s\n\n%s\n\n%s",
			titleStyle.Render("Enter your API Key:"),
			m.textInput.View(),
			"(esc to quit)",
		) + "\n"
	case 2:
		return lipgloss.NewStyle().Foreground(lipgloss.Color("42")).Render("✔ Authenticated successfully!") + "\n"
	}
	return ""
}

func runLogin(cmd *cobra.Command, args []string) {
	p := tea.NewProgram(initialModel())
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
}
