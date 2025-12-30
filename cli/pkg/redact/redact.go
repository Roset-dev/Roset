package redact

import (
	"math"
	"regexp"
	"strings"
)

// Pattern defines a redaction rule.
type Pattern struct {
	regex       *regexp.Regexp
	replacement string
	name        string
}

var patterns = []Pattern{
	// Roset API keys
	{regexp.MustCompile(`ros_[a-zA-Z0-9]{32,}`), "REDACTED_ROSET_KEY", "roset_key"},

	// AWS Access Key IDs
	{regexp.MustCompile(`AKIA[A-Z0-9]{12,20}`), "REDACTED_AWS_ACCESS_KEY", "aws_access_key"},

	// AWS Secret Access Keys (context-aware)
	{regexp.MustCompile(`(?i)(secret[_ ]?access[_ ]?key[:= ]+['"]?)([a-zA-Z0-9/+=]{40})(['"]?)`), "$1REDACTED_AWS_SECRET$3", "aws_secret"},

	// AWS Session Tokens
	{regexp.MustCompile(`(?i)(session[_ ]?token[:= ]+['"]?)([a-zA-Z0-9/+=]{100,})(['"]?)`), "$1REDACTED_AWS_SESSION_TOKEN$3", "aws_session"},

	// Database URLs (PostgreSQL, MySQL, etc.)
	{regexp.MustCompile(`(?i)(postgres(?:ql)?|mysql|mongodb)://[^@]+:[^@]+@[^\s'"]+`), "REDACTED_DB_URL", "database_url"},

	// Bearer tokens
	{regexp.MustCompile(`(?i)(bearer[: ]+)([a-zA-Z0-9._-]{20,})`), "$1REDACTED_TOKEN", "bearer_token"},

	// GCP Service Account private keys (JSON format)
	{regexp.MustCompile(`(?i)("private_key":\s*")([^"]+)(")`), "$1REDACTED_GCP_PRIVATE_KEY$3", "gcp_private_key"},
	{regexp.MustCompile(`(?i)("private_key_id":\s*")([^"]+)(")`), "$1REDACTED_GCP_KEY_ID$3", "gcp_key_id"},

	// Azure SAS tokens
	{regexp.MustCompile(`(?i)(sig=)([a-zA-Z0-9%/+=]+)`), "$1REDACTED_AZURE_SIG", "azure_sig"},
	{regexp.MustCompile(`(?i)(sv=)(\d{4}-\d{2}-\d{2})`), "$1REDACTED_AZURE_VERSION", "azure_version"},

	// Generic secrets in environment variables or config
	{regexp.MustCompile(`(?i)([\w]*(?:TOKEN|SECRET|KEY|PASSWORD|CREDENTIAL|AUTH)[=:]\s*['"]?)([a-zA-Z0-9._/+=-]{8,})(['"]?)`), "$1REDACTED$3", "generic_secret"},

	// JWT tokens (three base64 segments separated by dots)
	{regexp.MustCompile(`eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*`), "REDACTED_JWT", "jwt"},
}

// Report tracks redaction statistics for trust-building.
type Report struct {
	TotalRedactions int            `json:"totalRedactions"`
	ByRule          map[string]int `json:"byRule"`
	EntropyMatches  int            `json:"entropyMatches"`
}

// NewReport creates an empty redaction report.
func NewReport() *Report {
	return &Report{
		ByRule: make(map[string]int),
	}
}

// String redacts sensitive information from a string.
func String(input string) string {
	result := input
	for _, p := range patterns {
		result = p.regex.ReplaceAllString(result, p.replacement)
	}
	// Apply entropy-based redaction as a second pass
	result = redactHighEntropy(result)
	return result
}

// StringWithReport redacts sensitive information and returns a report.
func StringWithReport(input string, report *Report) string {
	result := input

	// Pass 1: Regex patterns
	for _, p := range patterns {
		before := result
		result = p.regex.ReplaceAllString(result, p.replacement)
		if result != before {
			count := strings.Count(before, p.regex.FindString(before))
			if count == 0 {
				count = 1
			}
			report.ByRule[p.name] += count
			report.TotalRedactions += count
		}
	}

	// Pass 2: Entropy-based detection
	result, entropyCount := redactHighEntropyWithCount(result)
	report.EntropyMatches += entropyCount
	report.TotalRedactions += entropyCount

	return result
}

// highEntropyThreshold is the Shannon entropy threshold (bits per character).
// Random base64 strings typically have entropy > 4.5
const highEntropyThreshold = 4.5

// calculateEntropy computes Shannon entropy of a string.
func calculateEntropy(s string) float64 {
	if len(s) == 0 {
		return 0
	}

	freq := make(map[rune]float64)
	for _, c := range s {
		freq[c]++
	}

	var entropy float64
	n := float64(len(s))
	for _, count := range freq {
		p := count / n
		if p > 0 {
			entropy -= p * math.Log2(p)
		}
	}
	return entropy
}

// redactHighEntropy finds and redacts high-entropy strings.
func redactHighEntropy(input string) string {
	result, _ := redactHighEntropyWithCount(input)
	return result
}

// redactHighEntropyWithCount finds and redacts high-entropy strings, returning count.
func redactHighEntropyWithCount(input string) (string, int) {
	// Match long alphanumeric strings that might be secrets
	re := regexp.MustCompile(`[a-zA-Z0-9+/=_-]{20,}`)
	count := 0

	result := re.ReplaceAllStringFunc(input, func(match string) string {
		// Skip if it looks like a regular word or path
		if strings.Contains(match, "/") && !strings.Contains(match, "=") {
			return match
		}
		// Skip if already redacted
		if strings.HasPrefix(match, "REDACTED") {
			return match
		}

		entropy := calculateEntropy(match)
		if entropy > highEntropyThreshold {
			count++
			return "REDACTED_HIGH_ENTROPY"
		}
		return match
	})

	return result, count
}
