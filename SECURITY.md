# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainer directly or use GitHub's private vulnerability reporting feature
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Considerations

This MCP server:

- **Does not store credentials** - API keys are provided via environment variables
- **Uses read-only API access** - No OAuth scopes that modify data
- **Sanitizes error output** - API keys are redacted from all error messages and logs
- **Rate limits API calls** - Prevents API abuse with built-in throttling

## Known Limitations

- The @modelcontextprotocol/sdk v1.23.0 has a DNS rebinding vulnerability (CVE-2025-66414), but this **does not affect** this server because:
  - This server uses **stdio transport**, not HTTP
  - The vulnerability only affects HTTP-based MCP servers running on localhost without authentication

## Response Timeline

- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity (critical issues prioritized)
