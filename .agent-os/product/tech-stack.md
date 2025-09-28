# Technical Stack

## Application Framework

- **Framework:** Node.js
- **Version:** 20+
- **Runtime:** Node.js with Express.js

## Database System

- **Primary Database:** PostgreSQL
- **ORM:** Prisma
- **Caching:** Redis
- **File Storage:** MinIO (локальный S3-совместимый сервер)

## JavaScript Framework

- **Backend:** Node.js with TypeScript
- **Bot Framework:** Telegraf.js (основной + админ бот)
- **Import Strategy:** Node modules (CommonJS/ESM)

## CSS Framework

- **Framework:** n/a (Telegram Bot UI для всех интерфейсов)
- **Version:** n/a

## UI Component Library

- **User Bot:** Telegram Bot Inline Keyboards
- **Admin Bot:** Расширенные Telegram inline меню для управления
- **Additional:** Custom Telegram markup

## Fonts Provider

- **Provider:** n/a (Telegram handles fonts)

## Icon Library

- **Library:** Telegram Emoji
- **Additional:** Unicode emojis

## Application Hosting

- **Hosting:** Railway / Render / VPS
- **Environment:** Docker containers

## Database Hosting

- **Hosting:** PostgreSQL on Railway/Render
- **Backup:** Automated daily backups

## Asset Hosting

- **Hosting:** Telegram File API
- **Large Files:** MinIO Object Storage (локально развернутый)

## Deployment Solution

- **Solution:** Docker + GitHub Actions
- **CI/CD:** Automated deployment on push

## Code Repository URL

- **Repository:** TBD (GitHub private repository)

## External APIs

- **AI Service:** Google Gemini API
- **Bot Platform:** Telegram Bot API
- **Phone Validation:** Собственная система валидации номеров

## Security

- **Bot Authentication:** Telegram User ID verification
- **Admin Authentication:** JWT tokens + bcrypt password hashing
- **Role-based Access:** Admin, Manager, Verified User, Regular User
- **Encryption:** TLS/SSL for all connections
- **API Keys:** Environment variables with encryption