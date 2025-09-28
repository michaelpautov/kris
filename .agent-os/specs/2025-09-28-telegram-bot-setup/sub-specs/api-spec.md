# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-28-telegram-bot-setup/spec.md

> Created: 2025-09-28
> Version: 1.0.0

## Webhook Endpoints

### POST /webhook
**Purpose:** Handle incoming Telegram updates for the main bot
**Parameters:** 
- Body: Telegram Update object (JSON)
- Headers: Content-Type: application/json
**Response:** 200 OK on successful processing
**Errors:** 
- 400 Bad Request (malformed update)
- 401 Unauthorized (invalid bot token)
- 500 Internal Server Error (processing failure)

### GET /health/bot
**Purpose:** Check bot connectivity and health status
**Parameters:** None
**Response:** JSON with bot status, webhook info, and service connectivity
**Errors:** 
- 503 Service Unavailable (bot offline or unhealthy)

## Bot Commands

### /start
**Purpose:** Initialize bot interaction and authenticate user
**Parameters:** Optional deep link parameter for referrals
**Response:** Welcome message with user role-based menu
**Business Logic:** Create or retrieve user via UserService, set up session context

### /help
**Purpose:** Display available commands based on user role and permissions
**Parameters:** None
**Response:** Contextual help message with inline keyboard navigation
**Business Logic:** Check user role and display appropriate command list

### /check
**Purpose:** Initiate phone number verification process
**Parameters:** Optional phone number in message
**Response:** Phone input prompt or verification results
**Business Logic:** Use ClientService to search database, respect rate limits and permissions

### /profile
**Purpose:** Display and manage user profile information
**Parameters:** None
**Response:** Profile information with inline keyboard for editing
**Business Logic:** Retrieve user data via UserService, allow profile updates

### /settings
**Purpose:** Manage user preferences and bot configuration
**Parameters:** None
**Response:** Settings menu with inline keyboard options
**Business Logic:** Access BotConfigService for user-specific settings

## Bot Controllers

### Authentication Controller
**Actions:**
- authenticateUser: Validate Telegram ID against database
- createSession: Set up Redis session with user context
- checkPermissions: Verify user role for command access

**Business Logic:**
- Use existing UserService for authentication
- Maintain session state in Redis
- Implement role-based access control

**Error Handling:**
- Graceful authentication failures
- Session timeout handling
- Permission denied responses

### Command Controller
**Actions:**
- handleTextMessage: Process incoming text for phone numbers or commands
- handleCallbackQuery: Process inline keyboard button presses
- handlePhoto: Process profile photo uploads

**Business Logic:**
- Route commands to appropriate handlers
- Validate input and enforce rate limits
- Maintain conversation state

**Error Handling:**
- User-friendly error messages
- Input validation feedback
- Service unavailability responses