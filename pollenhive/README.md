# PollenHive

A modular-monolith architecture application for community contribution management.

## Architecture

```
pollenhive/
├── backend/              # Express.js API Server
│   └── src/
│       ├── modules/      # Feature modules
│       │   ├── account/  # Account management
│       │   ├── member/   # Member management
│       │   ├── fund/     # Fund management
│       │   ├── contribution/ # Contribution tracking
│       │   ├── expense/  # Expense management
│       │   └── reporting/ # Reports & analytics
│       └── shared/       # Shared utilities
│           └── supabase/ # Supabase client
│
└── frontend/             # React + Vite Application
    └── src/
        ├── app/          # Page components
        │   ├── admin/    # Admin pages
        │   └── public/   # Public pages
        ├── components/   # Reusable components
        ├── services/     # API client services
        ├── hooks/        # Custom React hooks
        └── lib/          # Utilities
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or bun
- Supabase account (for database)

### Backend Setup

```bash
cd backend
npm install

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

The backend runs on http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

The frontend runs on http://localhost:8080

## API Endpoints

All API endpoints are prefixed with `/api/v1`

### Accounts
- `GET /accounts` - List all accounts
- `GET /accounts/:id` - Get account by ID
- `POST /accounts` - Create account
- `PUT /accounts/:id` - Update account
- `DELETE /accounts/:id` - Delete account

### Members
- `GET /members?accountId=xxx` - List members by account
- `GET /members/:id` - Get member by ID
- `POST /members` - Create member
- `PUT /members/:id` - Update member
- `DELETE /members/:id` - Delete member

### Funds
- `GET /funds?accountId=xxx` - List funds by account
- `GET /funds/active?accountId=xxx` - List active funds
- `POST /funds` - Create fund
- `PUT /funds/:id` - Update fund
- `DELETE /funds/:id` - Delete fund

### Contributions
- `GET /contributions?accountId=xxx` - List contributions
- `GET /contributions/pending?accountId=xxx` - List pending
- `POST /contributions` - Record contribution
- `POST /contributions/:id/confirm` - Confirm contribution
- `POST /contributions/:id/reject` - Reject contribution

### Expenses
- `GET /expenses?accountId=xxx` - List expenses
- `POST /expenses` - Create expense
- `PUT /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense

### Reports
- `GET /reports/dashboard?accountId=xxx` - Dashboard stats
- `GET /reports/monthly?accountId=xxx` - Monthly overview
- `GET /reports/fund-breakdown?accountId=xxx` - Fund breakdown
- `GET /reports/net-position?accountId=xxx` - Net position

## Module Pattern

Each module follows the Controller → Service → Repository pattern:

- **Controller**: HTTP request handling, input validation, response formatting
- **Service**: Business logic, workflow enforcement, validation rules
- **Repository**: Database queries via Supabase

## Tech Stack

### Backend
- Express.js
- TypeScript
- Supabase (PostgreSQL)
- Zod (validation)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui components
- TanStack Query
- React Router

## Environment Variables

### Backend (.env)
```
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:8080
```

## License

MIT

