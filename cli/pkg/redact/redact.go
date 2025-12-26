package redact

import (
	"regexp"
)

var patterns = []struct {
	regex       *regexp.Regexp
	replacement string
}{
	{regexp.MustCompile(`ros_[a-zA-Z0-9]{32,}`), "REDACTED_ROSET_KEY"},
	{regexp.MustCompile(`AKIA[A-Z0-9]{12,20}`), "REDACTED_AWS_ACCESS_KEY"},
	{regexp.MustCompile(`(?i)(secret[_ ]?access[_ ]?key[:= ]+['\"]?)([a-zA-Z0-9/+=]{40})(['\"]?)`), "$1REDACTED_AWS_SECRET$3"},
	{regexp.MustCompile(`(?i)(database[_ ]?url[:= ]+['\"]?)(postgres(?:ql)?://[^@]+:[^@]+@[^/]+/[^'\"]+)(['\"]?)`), "$1REDACTED_DB_URL$4"},
	{regexp.MustCompile(`(?i)(bearer[: ]+)([a-zA-Z0-9._-]{20,})`), "$1REDACTED_TOKEN"},
}

// String redacts sensitive information from a string.
func String(input string) string {
	result := input
	for _, p := range patterns {
		result = p.regex.ReplaceAllString(result, p.replacement)
	}
	return result
}
