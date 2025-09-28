# ClientCheck - Client Verification Bot

ClientCheck - это Telegram-бот с искусственным интеллектом, который помогает эскорт-службам проверять безопасность клиентов через верификацию номеров, систему отзывов и анализ профилей.

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+ 
- PostgreSQL 13+
- npm или yarn
- Git

### Установка

1. **Клонируйте репозиторий**
```bash
git clone <repository-url>
cd clientcheck
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте окружение**
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
```

4. **Инициализируйте проект**
```bash
chmod +x scripts/init-project.sh
./scripts/init-project.sh
```

5. **Запустите тесты**
```bash
npm test
```

6. **Запустите в режиме разработки**
```bash
npm run dev
```

## 🗄️ База данных

### Схема
Проект использует PostgreSQL с Prisma ORM. Основные таблицы:

- **users** - Пользователи системы с ролями
- **client_profiles** - Профили клиентов для проверки
- **reviews** - Отзывы о клиентах
- **photos** - Фотографии клиентов 
- **ai_analysis** - Результаты ИИ анализа

### Роли пользователей
- **ADMIN** - Полный доступ к системе
- **MANAGER** - Может верифицировать пользователей
- **VERIFIED_USER** - Может добавлять номера и отзывы
- **REGULAR_USER** - Только просмотр информации

### Команды базы данных
```bash
# Генерация Prisma клиента
npm run db:generate

# Применение миграций
npm run db:migrate

# Просмотр базы данных
npm run db:studio

# Сброс базы данных (только для разработки)
npx prisma migrate reset
```

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
npm test

# Тесты в режиме watch
npm run test:watch

# Покрытие кода
npm run test:coverage
```

### Категории тестов
- **Connection Tests** - Проверка подключения к БД
- **Migration Tests** - Тесты миграций
- **Schema Validation** - Валидация схемы
- **User Management** - Управление пользователями
- **RLS Security** - Row Level Security

## 🔒 Безопасность

### Row Level Security (RLS)
Система использует PostgreSQL RLS для контроля доступа:

- Пользователи видят только свои данные
- Админы имеют полный доступ
- Верифицированные пользователи могут создавать контент

### Аутентификация
- Базируется на Telegram User ID
- JWT токены для сессий
- Bcrypt для хеширования паролей

## 📁 Структура проекта

```
clientcheck/
├── .agent-os/              # Agent OS конфигурация
│   ├── product/            # Документация продукта  
│   └── specs/              # Технические спецификации
├── prisma/                 # База данных
│   ├── schema.prisma       # Схема Prisma
│   └── migrations/         # Миграции
├── src/                    # Исходный код
│   └── database/           # Подключение к БД
├── tests/                  # Тесты
│   └── database/           # Тесты базы данных
├── scripts/                # Скрипты автоматизации
└── docs/                   # Документация
```

## 🛠️ Разработка

### Доступные команды
```bash
npm run dev          # Разработка с hot reload
npm run build        # Сборка проекта
npm run start        # Запуск продакшн версии
npm test             # Запуск тестов
npm run db:studio    # Браузер базы данных
```

### Git workflow
```bash
# Создание feature ветки
git checkout -b feature/your-feature

# Коммит изменений
git add .
git commit -m "feat: your feature description"

# Push и создание PR
git push origin feature/your-feature
```

## 📝 Логи и мониторинг

### Логирование
- Development: Все логи в консоль
- Production: Только error и warn
- Prisma: Query логи в dev режиме

### Мониторинг производительности
- Отслеживание медленных запросов (>100ms)
- Мониторинг пула соединений
- Алерты при высоком уровне ошибок

## 🔧 Конфигурация

### Переменные окружения
Основные переменные в `.env`:

```bash
DATABASE_URL=          # PostgreSQL строка подключения
BOT_TOKEN=            # Telegram Bot токен
ADMIN_BOT_TOKEN=      # Админ бот токен
GEMINI_API_KEY=       # Google Gemini API ключ
JWT_SECRET=           # JWT секретный ключ
```

### Производственная настройка
- Используйте SSL для всех соединений
- Настройте автоматические бэкапы
- Включите мониторинг и алерты
- Ротация логов

## 🤝 Вклад в разработку

1. Fork репозитория
2. Создайте feature ветку
3. Напишите тесты для новой функциональности
4. Убедитесь что все тесты проходят
5. Создайте Pull Request

## 📄 Лицензия

MIT License

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте README и документацию
2. Просмотрите Issues в репозитории
3. Создайте новый Issue с подробным описанием

---

**ClientCheck Team** - Безопасность превыше всего! 🛡️