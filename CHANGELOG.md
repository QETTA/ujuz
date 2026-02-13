# Changelog

All notable changes to UjuZ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project direction document (PROJECT-DIRECTION.md)
- Expo + NativeWind mobile project scaffold (mobile/)
- Privacy policy and Terms of Service pages
- AI response disclaimer labels
- GitHub Actions CI workflow
- Codex-Spark MCP integration

### Changed
- ESLint lint script fixed for flat config (removed --ext flag)
- Dev server now explicitly uses port 3001
- Claude Code settings: added Write/Edit to allow list
- Serena project.yml: added initial_prompt and ignored_paths

### Fixed
- MCP config: switched to -c flag format for codex mcp-server
- Hook portability: removed absolute paths from typecheck hook
- Removed redundant enabledMcpjsonServers from project settings.local.json
- Unified AUTOCOMPACT_PCT to 80 across global settings

## [0.1.0] - 2026-02-14

### Added
- Initial Next.js 15 App Router fullstack application
- MongoDB Atlas integration with 25+ collections
- Bayesian Gamma-Poisson admission engine (admissionEngineV2)
- AI counseling bot with Claude (10 intent classification, streaming, memory)
- Facility data pipeline (data.go.kr crawl, normalize, search, nearby)
- TO vacancy detection and email alerts
- Community posts (read-only) with anonymous sessions
- Subscription service with Free/Basic/Premium tiers (schema only)
- Zod v4 request validation across all endpoints
- Rate limiting and cost tracking for LLM usage
- Security headers (CSP, HSTS, X-Frame-Options)
