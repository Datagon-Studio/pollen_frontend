# PollenHive Backend

Express.js API server with Controller → Service → Repository pattern.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Module Structure

Each module contains:
- `*.controller.ts` - HTTP routing and request handling
- `*.service.ts` - Business logic
- `*.repository.ts` - Supabase database queries

## Adding a New Module

1. Create folder: `src/modules/your-module/`
2. Create repository with Supabase queries
3. Create service with business logic
4. Create controller with routes
5. Register routes in `src/routes.ts`

