// Package api provides a minimal HTTP client for the Roset API.
package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// Client is a minimal Roset API client for CLI operations.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// NewClient creates a new API client with the given base URL and API key.
func NewClient(baseURL, apiKey string) *Client {
	if baseURL == "" {
		baseURL = "https://api.roset.dev"
	}
	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// WhoamiResponse contains the authenticated user's identity info.
type WhoamiResponse struct {
	TenantID    string `json:"tenantId"`
	PrincipalID string `json:"principalId"`
	Email       string `json:"email,omitempty"`
	Role        string `json:"role,omitempty"`
}

// HealthResponse contains API health status.
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version,omitempty"`
	Region  string `json:"region,omitempty"`
}

// APIError represents an error returned by the API.
type APIError struct {
	Message   string `json:"message"`
	Code      string `json:"code"`
	Status    int    `json:"-"`
	RequestID string `json:"requestId,omitempty"`
}

func (e *APIError) Error() string {
	if e.RequestID != "" {
		return fmt.Sprintf("%s (%s) [request: %s]", e.Message, e.Code, e.RequestID)
	}
	return fmt.Sprintf("%s (%s)", e.Message, e.Code)
}

// generateRequestID creates a unique request ID for tracing.
func generateRequestID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return "cli-" + hex.EncodeToString(b)
}

// doRequest performs an authenticated HTTP request with retry logic.
func (c *Client) doRequest(method, path string) ([]byte, int, time.Duration, string, error) {
	url := c.BaseURL + path
	requestID := generateRequestID()

	var lastErr error
	var totalLatency time.Duration

	// Retry up to 3 times for 429/5xx errors
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequest(method, url, nil)
		if err != nil {
			return nil, 0, 0, requestID, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+c.APIKey)
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "roset-cli/1.0")
		req.Header.Set("X-Request-Id", requestID)

		start := time.Now()
		resp, err := c.HTTPClient.Do(req)
		latency := time.Since(start)
		totalLatency += latency

		if err != nil {
			lastErr = fmt.Errorf("request failed: %w", err)
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, resp.StatusCode, totalLatency, requestID, fmt.Errorf("failed to read response: %w", err)
		}

		// Check for retryable status codes
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			// Respect Retry-After header if present
			if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
				if secs, err := strconv.Atoi(retryAfter); err == nil && secs > 0 && secs <= 30 {
					time.Sleep(time.Duration(secs) * time.Second)
					continue
				}
			}
			// Default backoff: 1s, 2s
			time.Sleep(time.Duration(attempt+1) * time.Second)
			lastErr = fmt.Errorf("server error: %d", resp.StatusCode)
			continue
		}

		return body, resp.StatusCode, totalLatency, requestID, nil
	}

	return nil, 0, totalLatency, requestID, lastErr
}

// Whoami returns the authenticated user's identity.
// It also returns the request latency for diagnostics.
func (c *Client) Whoami() (*WhoamiResponse, time.Duration, error) {
	// Try /v1/org/members to validate auth - any member can list members
	body, status, latency, requestID, err := c.doRequest("GET", "/v1/org/members")
	if err != nil {
		return nil, latency, err
	}

	if status == 401 {
		return nil, latency, &APIError{
			Message:   "Invalid or expired API key",
			Code:      "UNAUTHORIZED",
			Status:    401,
			RequestID: requestID,
		}
	}

	if status == 403 {
		return nil, latency, &APIError{
			Message:   "API key does not have permission to access this resource",
			Code:      "FORBIDDEN",
			Status:    403,
			RequestID: requestID,
		}
	}

	if status >= 400 {
		var apiErr APIError
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Message != "" {
			apiErr.Status = status
			apiErr.RequestID = requestID
			return nil, latency, &apiErr
		}
		return nil, latency, &APIError{
			Message:   fmt.Sprintf("API returned status %d", status),
			Code:      "API_ERROR",
			Status:    status,
			RequestID: requestID,
		}
	}

	// Parse member list response to extract info
	var membersResp struct {
		Items []struct {
			ID   string `json:"id"`
			Role string `json:"role"`
		} `json:"items"`
		Meta struct {
			Total int `json:"total"`
		} `json:"meta"`
	}

	if err := json.Unmarshal(body, &membersResp); err != nil {
		return nil, latency, fmt.Errorf("failed to parse response: %w", err)
	}

	// Auth succeeded - return basic info
	return &WhoamiResponse{
		TenantID: "connected", // We don't have tenant ID from this endpoint
		Role:     "authenticated",
	}, latency, nil
}

// Ping checks API connectivity without authentication.
func (c *Client) Ping() (*HealthResponse, time.Duration, error) {
	// Try a simple request - even 401 means API is reachable
	_, status, latency, _, err := c.doRequest("GET", "/v1/org/members")
	if err != nil {
		// Network error
		return nil, latency, err
	}

	// Any HTTP response means the API is reachable
	return &HealthResponse{
		Status: fmt.Sprintf("reachable (HTTP %d)", status),
	}, latency, nil
}
