# Development Best Practices

## Context

Global development guidelines for Agent OS projects focused on TypeScript, React, Next.js, and NestJS.

## Core Principles

### Keep It Simple
- Implement code in the fewest lines possible
- Avoid over-engineering solutions
- Choose straightforward approaches over clever ones

### Optimize for Readability
- Prioritize code clarity over micro-optimizations
- Write self-documenting code with clear variable names
- Add comments for "why" not "what"

### DRY (Don't Repeat Yourself)
- Extract repeated business logic to utilities
- Create reusable components for repeated UI patterns
- Use custom hooks for repeated React logic

## React/Next.js Best Practices

### Component Design
- Keep components small and focused (single responsibility)
- Use composition over inheritance
- Prefer function components with hooks
- Use TypeScript interfaces for props

### State Management
- Keep state as close to where it's used as possible
- Use local state (useState) by default
- Use global state (Context, Zustand) sparingly
- Consider server state (React Query, SWR) for API data

### Performance
- Use React.memo for expensive components
- Implement proper key props in lists
- Use useCallback/useMemo when necessary (not by default)
- Optimize images with Next.js Image component

### File Organization
- Group by feature, not by type
- Use index files for clean imports
- Separate components, hooks, and utils
- Keep related files close together

## NestJS Best Practices

### Architecture
- Follow modular architecture pattern
- Use dependency injection properly
- Separate concerns (controllers, services, repositories)
- Use DTOs for data validation and transformation

### API Design
- Use proper HTTP status codes
- Implement consistent error handling
- Use decorators for validation (@IsString, @IsEmail, etc.)
- Document APIs with Swagger decorators

### Database
- Use migrations for schema changes
- Implement proper relations in entities
- Use transactions for complex operations
- Add database indexes for performance

### Security
- Use guards for authentication/authorization
- Validate all inputs with DTOs
- Implement rate limiting
- Use CORS properly

## TypeScript Best Practices

### Type Safety
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use union types for controlled values
- Avoid `any` type - use `unknown` when needed

### API Integration
- Type API responses with interfaces
- Use type guards for runtime validation
- Consider using tRPC for end-to-end type safety
- Share types between frontend and backend

## Testing

### Test Strategy
- Write tests for business logic, not implementation details
- Use React Testing Library for component tests
- Test user interactions, not internal state
- Mock external dependencies

### NestJS Testing
- Use Jest for unit and integration tests
- Test services independently
- Use supertest for e2e API testing
- Mock database calls in unit tests

### Test Organization
- Place tests next to the code they test
- Use descriptive test names
- Group related tests in describe blocks
- Keep tests simple and focused

## Security

### Data Protection
- Validate all user inputs
- Use environment variables for secrets
- Never commit secrets to version control
- Use HTTPS in production

### Authentication
- Use JWT tokens with proper expiration
- Implement refresh token strategy
- Use secure cookie settings
- Consider rate limiting for APIs

### API Security
- Implement proper CORS configuration
- Use helmet for security headers
- Validate request payloads
- Implement proper error handling (don't expose internal details)
EOF </dev/null
