# <img src="../logo.png" width="32" height="32" align="center" /> Roset CLI

Manage, debug, and automate your Roset environment from the terminal.

## Installation

```bash
# requires Go 1.21+
go install github.com/roset-dev/roset/monorepo/cli@latest
```

## Commands

- `login` - Auth with DK or RK key
- `status` - Check connectivity and active mounts
- `stat` - Quick metadata check for any path
- `ls` - List virtual directory contents
- `debug bundle` - Generate diagnostics for support

## Configuration

Auth is stored in `~/.roset/config.yaml`.

```bash
roset login --api-url https://api.roset.dev
```

[Documentation](https://docs.roset.dev/cli)

## License
MIT
