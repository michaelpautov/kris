# Tech Stack

## Context

Global tech stack defaults for Agent OS projects, overridable in project-specific `.agent-os/product/tech-stack.md`.

- App Framework: Next.js 15+ (App Router)
- Language: TypeScript
- Backend Framework: NestJS
- Backend Language: Node.js 22 LTS with TypeScript
- Primary Database: PostgreSQL 17+
- ORM: Prisma or TypeORM (NestJS compatible)
- Frontend Framework: React 18+
- Build Tool: Next.js built-in / Vite for standalone React
- Import Strategy: ES6 modules
- Package Manager: npm / pnpm
- Node Version: 22 LTS
- CSS Framework: TailwindCSS 4.0+
- UI Components: shadcn/ui latest
- UI Installation: Via shadcn/ui CLI
- Font Provider: Google Fonts / Next.js Fonts
- Font Loading: Self-hosted via @next/font for performance
- Icons: lucide-react (used by shadcn/ui)
- API Documentation: NestJS Swagger/OpenAPI
- Validation: class-validator + class-transformer (NestJS)
- Authentication: NestJS Passport + JWT
- Application Hosting: Vercel (Frontend) / Digital Ocean / AWS (Backend)
- Hosting Region: Primary region based on user base
- Database Hosting: Digital Ocean Managed PostgreSQL / AWS RDS
- Database Backups: Daily automated
- Asset Storage: Vercel Blob / Amazon S3
- CDN: Vercel Edge Network / CloudFront
- Asset Access: Optimized with Next.js Image component
- CI/CD Platform: Vercel / GitHub Actions
- CI/CD Trigger: Push to main/staging branches
- Tests: Vitest / Jest + React Testing Library (Frontend), Jest (Backend)
- Production Environment: main branch
- Staging Environment: staging branch
- API Client: React Query (TanStack Query) + Axios
- State Management: React Query for server state, Zustand for client state
EOF </dev/null

## AI & Telegram Bots
- AI Platform: Google Gemini + Vertex AI
- AI Framework: LangChain (for complex workflows)
- Telegram Bot: grammy.js (TypeScript-native)
- Session Management: Redis for bot state
- Queue System: Bull MQ for background tasks
- Vector Database: Chroma for embeddings/RAG
- Rate Limiting: Built-in for API calls protection
EOF </dev/null
