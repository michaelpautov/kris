# Code Style Guide

## Context

Global code style rules for Agent OS projects focused on TypeScript, React, Next.js, and NestJS.

## General Formatting

### Indentation
- Use 2 spaces for indentation (never tabs)
- Maintain consistent indentation throughout files
- Align nested structures for readability

### Naming Conventions
- **Functions and Variables**: Use camelCase (e.g., `userProfile`, `calculateTotal`)
- **Components and Classes**: Use PascalCase (e.g., `UserProfile`, `PaymentProcessor`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Files**: Use kebab-case for files, PascalCase for components (e.g., `user-profile.tsx`, `UserProfile.tsx`)

### String Formatting
- Use single quotes for strings: `'Hello World'`
- Use template literals for interpolation: `\`Hello \${name}\``
- Use double quotes in JSX attributes: `<div className="container">`

### Code Comments
- Add brief comments above non-obvious business logic
- Document complex algorithms or calculations
- Explain the "why" behind implementation choices
- Use JSDoc for function/component documentation
- Keep comments concise and relevant

## TypeScript/React Specific

### Component Structure
- Use functional components with hooks
- Define props interface before component
- Use TypeScript strict mode
- Export component as default at bottom of file

### Imports
- Group imports: React, third-party, local components, utils
- Use absolute imports when configured
- Prefer named imports over default when possible

### State Management
- Use useState for local state
- Use useReducer for complex state logic
- Consider Zustand or Context for global state


## CSS/TailwindCSS

### Class Ordering
- Layout (display, position, etc.)
- Box model (width, height, margin, padding)
- Typography (font, text)
- Visual (background, border, shadow)
- Misc (transform, transition)

### Component Styling
- Use cn() utility for conditional classes
- Keep Tailwind classes readable with line breaks for long lists
- Use CSS variables for theme customization
EOF </dev/null
