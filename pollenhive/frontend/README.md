# PollenHive Frontend

React + Vite frontend application.

## Setup

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Folder Structure

```
src/
├── app/              # Page components
│   ├── admin/        # Admin pages (Members, Funds, etc.)
│   └── public/       # Public pages
├── components/       # Reusable components
│   ├── layout/       # Layout components
│   ├── modals/       # Modal dialogs
│   └── ui/           # shadcn/ui components
├── services/         # API client services
├── hooks/            # Custom React hooks
└── lib/              # Utilities
```

## API Services

All API calls go through the services layer:

```typescript
import { memberApi } from '@/services';

// Fetch members
const { data } = await memberApi.getByAccount(accountId);

// Create member
await memberApi.create({ first_name: 'John', ... });
```

