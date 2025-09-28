# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-28-telegram-bot-setup/spec.md

> Created: 2025-09-28
> Version: 1.0.0

## Technical Requirements

### Bot Framework Setup
- **Grammy.js Configuration**: Set up Grammy bot with TypeScript support and environment-based configuration
- **Webhook Integration**: Configure secure webhook endpoints for production deployment with proper URL validation
- **Session Management**: Implement Redis-based session storage for conversation state and user context
- **Error Handling**: Comprehensive error catching with graceful degradation and user-friendly error messages
- **Middleware Stack**: Authentication, rate limiting, logging, and validation middleware

### Authentication Integration
- **UserService Integration**: Connect to existing `src/services/client-service.ts` for user management and authentication
- **Telegram ID Verification**: Validate Telegram users against database records using existing user roles
- **Role-Based Access**: Implement permission checking using existing roles (ADMIN, MANAGER, VERIFIED_USER, REGULAR_USER)
- **Session Context**: Maintain authenticated user state across bot interactions using Redis sessions

### Command Architecture
- **Command Handlers**: Modular command system with separate handlers for /start, /help, /check, /profile, /settings
- **Inline Keyboards**: Dynamic keyboard generation based on user role and current context
- **Command Middleware**: Rate limiting, authentication checks, input validation, and structured logging
- **Conversation Flow**: State-based conversation handling for multi-step operations

### Service Integration
- **Database Services**: Connect to existing Prisma client and services without modification:
  - ClientService for phone number verification
  - ReviewService for client reviews and ratings
  - UserService for profile management
  - RateLimitService for API call management
  - PhotoStorageService for profile photo handling
  - BotConfigService for dynamic bot configuration
- **Rate Limiting**: Use existing rate limiting service for command and API call management
- **Photo Handling**: Integration with MinIO through existing PhotoStorageService for user profile photos

### Production Configuration
- **Environment Variables**: Secure handling of BOT_TOKEN, WEBHOOK_URL, REDIS_URL, and other configuration
- **Health Monitoring**: Bot status endpoints and automatic restart capabilities
- **Logging**: Structured logging using existing performance utilities and monitoring
- **Deployment**: Docker-compatible setup with proper service discovery and webhook configuration

## External Dependencies

Grammy.js framework will be added as the primary new dependency:
- **grammy** - Modern Telegram bot framework with TypeScript support
- **@grammyjs/session** - Session management plugin for Grammy
- **@grammyjs/menu** - Inline keyboard menu system for Grammy

All other dependencies (Redis, Prisma, Express) are already available in the existing tech stack.