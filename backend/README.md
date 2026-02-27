# Backend API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update DATABASE_URL in `.env` with your PostgreSQL credentials

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Run migrations:
```bash
npm run prisma:migrate
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## API Endpoints

- GET /health - Health check
- POST /api/auth/login - Login
- POST /api/auth/register - Register
- GET /api/vendors - Get all vendors
