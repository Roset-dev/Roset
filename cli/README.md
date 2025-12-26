# Roset CLI

The operator's interface for Roset - a specialized tool for developers and SREs to manage, debug, and automate Roset environments.

## Installation

### From Source

```bash
cd cli
go build -o roset .
./roset
```

### With Go Install

```bash
go install github.com/roset-dev/roset/monorepo/cli@latest
```

## Usage

```
roset [command]

Available Commands:
  login       Authenticate with the Roset API
  logout      Remove stored credentials
  status      Show current configuration and connection status
  version     Print CLI version information
  debug       Debugging and diagnostic tools

Flags:
  --json       Output in JSON format
  --verbose    Enable verbose logging
  --api-url    Override API URL from config
  --api-key    Override API key from config
  -h, --help   Help for roset
```

## Commands

### Login

Interactive authentication with the Roset API:

```bash
roset login
```

This will prompt for:
1. API endpoint (default: `https://api.roset.dev`)
2. API key (hidden input)

Credentials are stored in `~/.roset/config.yaml`.

### Status

Check your current configuration and active mounts:

```bash
roset status
```

Shows:
- API URL and key status
- System information
- Active FUSE mounts

### Debug Bundle

Create a diagnostic bundle for troubleshooting:

```bash
roset debug bundle
roset debug bundle --output my-bundle.tar.gz
roset debug bundle --no-redact  # Include secrets (dangerous!)
```

The bundle includes:
- System information
- Mount info
- Logs (last 1000 lines)

**Note**: By default, sensitive information (API keys, database URLs, etc.) is automatically redacted.

## Configuration

Configuration is stored in `~/.roset/config.yaml`:

```yaml
api_url: https://api.roset.dev
api_key: ros_your_api_key_here
```

Environment variables override config file:
- `ROSET_API_URL`
- `ROSET_API_KEY`

## Development

```bash
# Build
go build -o roset .

# Run
./roset

# Test
go test ./...
```

## License

MIT
