# AGENTS.md

## Do Not

- Do not introduce breaking changes to public SDK/CLI APIs, commands, or output formats unless explicitly requested.
- Do not make broad cross-package changes when the request is scoped to one package.
- Do not run destructive git commands or revert unrelated local changes.
- Do not start local servers, simulators, or long-running processes unless the user asks.

## Do

- Verify changes with package-local commands (`pnpm`, `go test`, `cargo test`) instead of guessing.
- Preserve backward compatibility by default, and clearly call out any intentional breaking change.
- Keep docs and examples public-safe (no real keys, tokens, account IDs, or credentials).
- Prefer small, focused changes with clear rationale and reproducible validation steps.
