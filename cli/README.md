# Roset CLI

The operator's interface for Roset. Manage, debug, and automate your object storage infrastructure from the terminal.

## Quick Start

```bash
# Install (Go 1.23+)
go install github.com/roset-dev/roset/monorepo/cli@latest

# OR run via Docker Agent
docker run -it --rm ghcr.io/roset-dev/roset/roset-agent roset status

# Authenticate
roset login

# Check connectivity
roset status
```

## Commands

| Command | Description |
|---------|-------------|
| `login` | Authenticate with your API key (validates before saving) |
| `logout` | Remove stored credentials |
| `status` | Check connectivity, auth status, and latency |
| `mount <path>` | Mount Roset filesystem via FUSE |
| `unmount <path>` | Unmount a Roset filesystem |
| `debug bundle` | Generate diagnostics for support |
| `completion` | Generate shell completions |

## Shell Completions

```bash
# Zsh
roset completion zsh > "${fpath[1]}/_roset"

# Bash
roset completion bash > /etc/bash_completion.d/roset

# Fish
roset completion fish > ~/.config/fish/completions/roset.fish
```

## JSON Output

All commands support `--json` for automation:

```bash
roset status --json | jq '.connection.latencyMs'
```

## Configuration

Credentials are stored in `~/.roset/config.yaml` with 0600 permissions.

Override via flags or environment:
```bash
roset status --api-url https://custom.api.dev --api-key ros_...
# or
export ROSET_API_KEY=ros_...
```

## Troubleshooting

```bash
# Generate a support bundle (secrets are auto-redacted)
roset debug bundle -o diagnostics.tar.gz

# Check API connectivity
roset status --json
```

## License

MIT

