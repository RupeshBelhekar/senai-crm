# API Documentation

## Rate Limits by Tier
- **Starter:** 100 requests / minute
- **Standard:** 1,000 requests / minute
- **Enterprise:** 10,000 requests / minute (or as negotiated)

## Deprecation Timeline (v1)
- The v1 API is officially deprecated as of January 1, 2026.
- It will be completely sunset and turned off on December 31, 2026.

## Breaking Changes (v2)
- v2 introduces strict JSON schema validation for all endpoints.
- Authentication now requires Bearer tokens in the `Authorization` header instead of URL parameters.

## Header Requirements
- All POST/PUT requests must include `Content-Type: application/json`.
- `X-Api-Key` is still supported for legacy internal endpoints, but `Authorization: Bearer <token>` is the standard for v2.
