// Package api provides a minimal HTTP client for the Roset API.
package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	Message string `json:"message"`
	Code    string `json:"code"`
	Status  int    `json:"-"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("%s (%s)", e.Message, e.Code)
}

// doRequest performs an authenticated HTTP request.
func (c *Client) doRequest(method, path string) ([]byte, int, time.Duration, error) {
	url := c.BaseURL + path

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "roset-cli/1.0")

	start := time.Now()
	resp, err := c.HTTPClient.Do(req)
	latency := time.Since(start)

	if err != nil {
		return nil, 0, latency, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, latency, fmt.Errorf("failed to read response: %w", err)
	}

	return body, resp.StatusCode, latency, nil
}

// Whoami returns the authenticated user's identity.
// It also returns the request latency for diagnostics.
func (c *Client) Whoami() (*WhoamiResponse, time.Duration, error) {
	// Try /v1/org/members to validate auth - any member can list members
	body, status, latency, err := c.doRequest("GET", "/v1/org/members")
	if err != nil {
		return nil, latency, err
	}

	if status == 401 {
		return nil, latency, &APIError{
			Message: "Invalid or expired API key",
			Code:    "UNAUTHORIZED",
			Status:  401,
		}
	}

	if status == 403 {
		return nil, latency, &APIError{
			Message: "API key does not have permission to access this resource",
			Code:    "FORBIDDEN",
			Status:  403,
		}
	}

	if status >= 400 {
		var apiErr APIError
		if json.Unmarshal(body, &apiErr) == nil && apiErr.Message != "" {
			apiErr.Status = status
			return nil, latency, &apiErr
		}
		return nil, latency, &APIError{
			Message: fmt.Sprintf("API returned status %d", status),
			Code:    "API_ERROR",
			Status:  status,
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
	_, status, latency, err := c.doRequest("GET", "/v1/org/members")
	if err != nil {
		// Network error
		return nil, latency, err
	}

	// Any HTTP response means the API is reachable
	return &HealthResponse{
		Status: fmt.Sprintf("reachable (HTTP %d)", status),
	}, latency, nil
}
