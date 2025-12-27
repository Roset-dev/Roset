package redact

import (
	"regexp"
)

var patterns = []struct {
	regex       *regexp.Regexp
	replacement string
}{
	// Roset API keys
	{regexp.MustCompile(`ros_[a-zA-Z0-9]{32,}`), "REDACTED_ROSET_KEY"},

	// AWS Access Key IDs
	{regexp.MustCompile(`AKIA[A-Z0-9]{12,20}`), "REDACTED_AWS_ACCESS_KEY"},

	// AWS Secret Access Keys (context-aware)
	{regexp.MustCompile(`(?i)(secret[_ ]?access[_ ]?key[:= ]+['"]?)([a-zA-Z0-9/+=]{40})(['"]?)`), "$1REDACTED_AWS_SECRET$3"},

	// AWS Session Tokens
	{regexp.MustCompile(`(?i)(session[_ ]?token[:= ]+['"]?)([a-zA-Z0-9/+=]{100,})(['"]?)`), "$1REDACTED_AWS_SESSION_TOKEN$3"},

	// Database URLs (PostgreSQL, MySQL, etc.) - FIXED: was using $4 but only had 3 groups
	{regexp.MustCompile(`(?i)(postgres(?:ql)?|mysql|mongodb)://[^@]+:[^@]+@[^\s'"]+`), "REDACTED_DB_URL"},

	// Bearer tokens
	{regexp.MustCompile(`(?i)(bearer[: ]+)([a-zA-Z0-9._-]{20,})`), "$1REDACTED_TOKEN"},

	// GCP Service Account private keys (JSON format)
	{regexp.MustCompile(`(?i)("private_key":\s*")([^"]+)(")`), "$1REDACTED_GCP_PRIVATE_KEY$3"},
	{regexp.MustCompile(`(?i)("private_key_id":\s*")([^"]+)(")`), "$1REDACTED_GCP_KEY_ID$3"},

	// Azure SAS tokens
	{regexp.MustCompile(`(?i)(sig=)([a-zA-Z0-9%/+=]+)`), "$1REDACTED_AZURE_SIG"},
	{regexp.MustCompile(`(?i)(sv=)(\d{4}-\d{2}-\d{2})`), "$1REDACTED_AZURE_VERSION"},

	// Generic secrets in environment variables or config
	// Matches patterns like: API_TOKEN=abc123, SECRET_KEY="xyz", _SECRET: 'value'
	{regexp.MustCompile(`(?i)([\w]*(?:TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL|AUTH)[=:]\s*['"]?)([a-zA-Z0-9._/+=-]{8,})(['"]?)`), "$1REDACTED$3"},

	// JWT tokens (three base64 segments separated by dots)
	{regexp.MustCompile(`eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*`), "REDACTED_JWT"},
}

// String redacts sensitive information from a string.
func String(input string) string {
	result := input
	for _, p := range patterns {
		result = p.regex.ReplaceAllString(result, p.replacement)
	}
	return result
}
