# ADR Index — MirrorBuddy

> AI-ready index. Each row: decision + impact in one line.
> Full ADR: `docs/adr/NNNN-name.md`

## Core Architecture

| #    | Decision                                            | Impact                                           |
| ---- | --------------------------------------------------- | ------------------------------------------------ |
| 0003 | Triangle of Support Architecture                    | Maestri/Coaches/Buddies character system         |
| 0010 | Separate Conversations Per Character                | Each character has own chat history              |
| 0015 | Database-First Architecture (No localStorage)       | Zustand + REST, never localStorage for user data |
| 0016 | Component Modularization & Infrastructure Hardening | Modular components, cleaner boundaries           |
| 0028 | PostgreSQL with pgvector Migration                  | Vector search for RAG, production-grade DB       |
| 0045 | Domain Boundaries and Module Organization           | Clear separation of concerns                     |
| 0117 | Technical Debt Cleanup (Plan 112)                   | Systematic debt reduction strategy               |

## UI & Layout

| #    | Decision                  | Impact                                                  |
| ---- | ------------------------- | ------------------------------------------------------- |
| 0120 | UI Layout Standardization | Slot-based chat layout, h-dvh viewport, mobile-first UX |

## Internationalization (9 ADRs)

| #    | Decision                                  | Impact                                    |
| ---- | ----------------------------------------- | ----------------------------------------- |
| 0064 | Formal/Informal Address for Professors    | Lei/tu distinction for historical figures |
| 0066 | Multi-Language i18n Architecture          | 5 languages from day 1                    |
| 0082 | i18n Namespace-Based Structure            | Organized translation files               |
| 0083 | i18n Context Architecture                 | Server-first i18n with next-intl          |
| 0091 | SSE Push Architecture for Admin Dashboard | Real-time admin updates                   |
| 0094 | Language Preference Synchronization       | Cookie + DB sync for language choice      |
| 0096 | i18n Implementation and Merge Risks       | Risk mitigation for i18n rollout          |
| 0101 | i18n Translation Key Naming Convention    | camelCase keys, no kebab-case             |
| 0104 | i18n Namespace Wrapper Key Convention     | Single wrapper key prevents collisions    |

## Characters & Learning

| #    | Decision                                        | Impact                                    |
| ---- | ----------------------------------------------- | ----------------------------------------- |
| 0013 | Platform Support Handled by Coach               | Coaches handle metacognitive support      |
| 0021 | Conversational Memory Injection                 | Context-aware conversations               |
| 0031 | Character-Based Maestri with Embedded Knowledge | 200-line knowledge embeddings per maestro |
| 0041 | Adaptive Difficulty Engine                      | Dynamic question difficulty               |
| 0090 | Total Memory System                             | Unified memory across sessions            |
| 0097 | Tier-Specific Memory System                     | Memory features by tier                   |

## Voice & Audio

| #    | Decision                                          | Impact                                 |
| ---- | ------------------------------------------------- | -------------------------------------- |
| 0005 | Real-time Tool Canvas with Server-Sent Events     | SSE for voice streaming                |
| 0011 | Voice Commands for Mindmap Modifications          | Voice-first mindmap editing            |
| 0012 | Unified Maestri Voice Experience                  | All maestri have voice capability      |
| 0017 | Voice Commands for Summary Modifications          | Voice control for summaries            |
| 0018 | Audio Coordination Architecture                   | Prevents audio conflicts               |
| 0027 | Bilingual Voice Recognition for Language Teachers | Switch languages mid-session           |
| 0035 | Voice Session Context Continuity                  | Preserve context across voice sessions |
| 0038 | WebRTC Migration for Azure Realtime Voice         | Low-latency voice via WebRTC           |
| 0042 | Vocal Prosody Frustration Detection               | Detect student frustration from voice  |
| 0050 | Voice Cost Guards                                 | Cost limits for voice features         |
| 0069 | Adaptive VAD for Accessibility Profiles           | Voice activity detection per profile   |

## Security & Auth

| #    | Decision                                      | Impact                                                                                          |
| ---- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 0004 | Safety Guardrails for Child Protection        | Content filtering, bias detection                                                               |
| 0055 | Internal Auth System for Beta Access          | Session-based auth                                                                              |
| 0062 | AI Compliance Framework                       | EU AI Act compliance                                                                            |
| 0072 | Secrets Scan Pre-Commit Hook                  | Prevent secret leaks                                                                            |
| 0074 | Contact Form Security and Validation Patterns | Input validation standards                                                                      |
| 0075 | Cookie Handling Standards                     | httpOnly, signed cookies                                                                        |
| 0077 | Security Hardening (Plan 17)                  | Comprehensive security measures                                                                 |
| 0080 | Security Audit Hardening                      | Post-audit security fixes                                                                       |
| 0098 | Trial Security Implementation                 | Secure anonymous trial access                                                                   |
| 0100 | Multi-Country Compliance Architecture         | EU, Italy, US compliance                                                                        |
| 0115 | Amodei Safety Enhancements                    | Dependency detection, STEM safety                                                               |
| 0127 | Security & Encryption Hardening               | AES-256-GCM PII encryption, privacy-aware RAG, cookie encryption, key rotation, Azure Key Vault |

## Observability & Operations

| #    | Decision                                            | Impact                            |
| ---- | --------------------------------------------------- | --------------------------------- |
| 0006 | Telemetry System with Prometheus-Compatible Metrics | Metrics in Prometheus format      |
| 0007 | Server-Side Notification Persistence                | DB-backed notifications           |
| 0014 | PWA Push Notifications                              | Native push notifications         |
| 0047 | Grafana Cloud Enterprise Observability              | Production monitoring             |
| 0058 | Observability and KPIs for Beta Launch              | KPI tracking dashboard            |
| 0065 | Service Limits Monitoring and Observability         | External service quota monitoring |
| 0070 | Sentry Error Tracking Integration                   | Error tracking and alerting       |
| 0076 | Centralized Logging with Sentry Integration         | Structured logging                |
| 0121 | Admin Console Data Integrity                        | No mock data, honest health       |

## Testing & CI

| #    | Decision                                           | Impact                           |
| ---- | -------------------------------------------------- | -------------------------------- |
| 0032 | E2E Conversation Test Framework                    | Playwright E2E for conversations |
| 0059 | E2E Test Setup Requirements                        | Global setup bypasses walls      |
| 0081 | Test Data Isolation Strategy                       | Separate test database           |
| 0093 | Redirect Metadata + E2E Guardrails                 | Prevent redirect regressions     |
| 0099 | Vercel Deployment Checks Gate                      | 14-check CI gate before deploy   |
| 0102 | Incremental E2E Execution and Release Flow         | Fast/full release gates          |
| 0103 | E2E Test Stability Requirements and CI Enforcement | Mobile timeout fixes             |
| 0124 | k6 Load Testing Framework                          | Scalability testing with k6      |
| 0128 | Capacitor Mobile Architecture                      | Native iOS/Android via WebView   |
| 0129 | Enterprise SSO Architecture                        | OIDC+PKCE for Google/Microsoft   |
| 0130 | Multi-Provider AI Router                           | Azure/Claude/Ollama failover     |
| 0131 | SOC 2 Type II Readiness Framework                  | Audit logging, policies, vendor  |

## Deployment & Infrastructure

| #    | Decision                                                  | Impact                                 |
| ---- | --------------------------------------------------------- | -------------------------------------- |
| 0044 | Performance Optimizations                                 | Bundle splitting, lazy loading         |
| 0046 | Production Hardening (Plan 46)                            | Pre-production checklist               |
| 0052 | Vercel Deployment Configuration                           | CI-controlled deployments              |
| 0053 | Supabase Migration                                        | Managed PostgreSQL hosting             |
| 0054 | Upstash Redis for Distributed Rate Limiting               | Serverless Redis                       |
| 0063 | Supabase SSL Certificate Requirements                     | SSL certificate chain handling         |
| 0067 | Database Performance Optimization for Serverless          | Connection pooling, query optimization |
| 0073 | Staging System on Vercel                                  | Preview deployments                    |
| 0078 | Vercel Runtime Constraints                                | Edge function limits                   |
| 0079 | Web Vitals Analytics and Legal Documentation Architecture | Performance monitoring                 |
| 0105 | Prisma Race Condition Prevention                          | Transaction-based updates              |
| 0107 | Composable API Handler Pipeline                           | Standard API route handler chain       |
| 0113 | Composable API Handler Pattern (pipe middleware)          | withCSRF/withAdmin/withSentry pipeline |
| 0114 | Query Raw Elimination                                     | Prisma typed queries only              |
| 0116 | Documentation AI-Ready Architecture                       | 3-tier docs, 96% token reduction       |

## Features & Tools

| #    | Decision                                               | Impact                           |
| ---- | ------------------------------------------------------ | -------------------------------- |
| 0001 | Materials Storage Strategy                             | File upload and storage          |
| 0002 | Use MarkMap for Mind Map Rendering                     | Interactive mindmaps             |
| 0008 | Parent Dashboard GDPR Consent Model                    | GDPR-compliant parent access     |
| 0009 | Tool Execution Architecture                            | Plugin-based tool system         |
| 0019 | Session Summaries & Unified Archive                    | Auto-generated session summaries |
| 0020 | Mindmap Data Structure and Rendering Fix               | Stable mindmap rendering         |
| 0022 | Knowledge Hub Architecture                             | Centralized learning resources   |
| 0026 | Maestro-Agent Communication for Demo Generation        | AI-generated demos               |
| 0033 | RAG Semantic Search Architecture                       | Vector search for knowledge      |
| 0034 | Chat Streaming Architecture                            | Streaming chat responses         |
| 0036 | Per-Character Conversation History Sidebar             | Character-specific sidebar       |
| 0037 | Tool Plugin Architecture                               | Extensible tool system           |
| 0040 | Google Drive Integration                               | Import from Google Drive         |
| 0043 | Brave Search API Integration                           | Web search capability            |
| 0060 | Instant Accessibility Feature                          | Floating a11y quick panel        |
| 0061 | Admin Section Redesign                                 | Improved admin UX                |
| 0106 | Admin Panel Redesign                                   | Server components, audit service |
| 0068 | Conversion Funnel Dashboard                            | Trial-to-paid analytics          |
| 0092 | Hreflang SEO Tags for Multi-Locale Pages               | SEO for 5 languages              |
| 0095 | Localized Open Graph Metadata for Social Media Sharing | Language-specific OG tags        |
| 0118 | Webcam Fullscreen Architecture                         | Fullscreen overlay, dual-flow    |
| 0122 | Realtime Video Vision (Pro-Only)                       | Periodic frames to Realtime API  |
| 0125 | Research & Benchmarking Lab                            | Admin research tools dashboard   |
| 0126 | Unified Camera Architecture                            | Video/photo mode selector        |

## Tier & Business

| #    | Decision                              | Impact                                              |
| ---- | ------------------------------------- | --------------------------------------------------- |
| 0056 | Trial Mode Architecture               | Anonymous trial access                              |
| 0057 | Beta Invite System and Data Migration | Invite-based beta access                            |
| 0071 | Tier Subscription System              | Trial/Base/Pro tiers                                |
| 0119 | Stripe Payment Integration            | Checkout, webhooks, dunning, VAT, revenue dashboard |

## Consortium & Grants

| #    | Decision                                 | Impact                                                        |
| ---- | ---------------------------------------- | ------------------------------------------------------------- |
| 0123 | Consortium & Grant Application Readiness | Gap analysis: DPO, insurance, ethics, IP register, governance |

## Archived

| #    | Decision                         | Status   | Reason                        |
| ---- | -------------------------------- | -------- | ----------------------------- |
| 0023 | Apache 2 License                 | Archived | License decision deferred     |
| 0024 | Demo HTML Builder Centralization | Archived | Superseded by 0026            |
| 0029 | Claude Code Optimization         | Archived | Moved to global CLAUDE.md     |
| 0030 | E2E Test Optimization            | Archived | Superseded by 0102/0103       |
| 0039 | Deferred Production Items        | Archived | Items completed in later ADRs |
| 0049 | Enterprise Reliability Plan49    | Archived | Superseded by 0046            |
| 0051 | Claude MD Optimization           | Archived | Merged into CLAUDE.md         |

---

**Total Active ADRs**: 110
**Archived ADRs**: 7
**Last Updated**: 2026-02-06
