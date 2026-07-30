# P2P Lending Platform

A peer-to-peer micro-lending platform where borrowers can request loans and lenders can fund them, with automated EMI repayments via Stripe Connect.

**Status:** Development complete — ready for production deployment.

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React 18 + Vite + shadcn/ui + Zustand + Stripe Elements |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT + bcryptjs |
| Payments | Stripe Connect + PaymentIntents + Transfers |
| Scheduler | Agenda.js |
| Email | Resend (SDK) |

## Project Structure

```
p2p/
├── client/                          # React + Vite + shadcn/ui
│   └── src/
│       ├── components/
│       │   ├── layout/              # AppShell, Sidebar, RoleGuard, NavUser
│       │   ├── stripe/              # StripeOnboardingBanner, FundLoanDialog
│       │   └── ui/                  # shadcn auto-generated components
│       ├── pages/
│       │   ├── auth/                # Login, Register
│       │   ├── borrower/            # Dashboard, CreateLoan, MyLoans, Repayments
│       │   └── lender/              # Dashboard, Marketplace, Investments, Onboarding, Payouts
│       ├── store/                   # Zustand (useAuthStore)
│       ├── hooks/                   # Custom hooks
│       └── lib/                     # API client (axios), stripe, emi calculator
│
└── server/                          # Express backend
    ├── models/                      # User, LoanRequest, FundedLoan, RepaymentSchedule, Transaction, StripeEvent
    ├── routes/                      # auth, loans, repayments, stripe
    ├── middleware/                   # auth (protect, requireRole)
    ├── services/                    # stripe.js, resend.js, agenda.js, jobs.js
    └── utils/                       # db.js, emi.js
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local `mongod` or [MongoDB Atlas](https://www.mongodb.com/atlas) URI)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook testing)
- A [Stripe](https://stripe.com) account with Connect enabled
- A [Resend](https://resend.com) API key (for emails; optional in dev)

### 1. Clone & install

```bash
git clone <repo-url>
cd p2p

# Install all dependencies
npm run install:all
```

### 2. Set up environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env — fill in MONGO_URI, JWT_SECRET, STRIPE_* keys

# Client
cp client/.env.example client/.env
# Edit client/.env — fill in VITE_STRIPE_PUBLISHABLE_KEY
```

### 3. Run in development

```bash
npm run dev
# Runs both client (localhost:5173) and server (localhost:5000) concurrently
```

Or separately:

```bash
npm run client   # Vite dev server on :5173
npm run server   # Express + nodemon on :5000
```

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs |
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | Stripe webhook signing secret (whsec_...) |
| `CLIENT_URL` | No | Frontend URL for onboarding redirect (default: http://localhost:5173) |
| `RESEND_API_KEY` | No | Resend API key (skips emails if unset) |
| `RESEND_FROM_EMAIL` | No | From address for emails (default: p2p-lending <noreply@p2plend.example.com>) |

### Client (`client/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API base URL (default: http://localhost:5000/api) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | **Yes** | Stripe publishable key (pk_test_...) |

## Features

### Borrower
- **Dashboard**: Summary cards, active loans with progress bars, upcoming repayments (next 3), overdue alert
- **Create Loan**: Amount, tenure selector, reason textarea, live EMI preview
- **My Loans**: Status tabs (All/Pending/Funded/Repaying/Completed), edit/cancel pending loans
- **Repayments**: Per-loan repayment table with overdue/pending/paid badges, Stripe PaymentElement dialog

### Lender
- **Dashboard**: Summary bar, active portfolio list, recent transactions
- **Marketplace**: Filterable 2-column loan cards with risk indicator, pagination, detail dialog with EMI preview
- **Loan Detail**: Full info, projected payout schedule, **"Fund this loan"** with Stripe PaymentElement dialog
- **Stripe Onboarding**: Connection banner, Stripe Express onboarding flow, account status check
- **Investments**: Portfolio grid, per-investment instalment timeline with accordion breakdown

### Platform (Backend)
- **Stripe Connect**: Express account creation, onboarding link generation, webhook verification
- **Loan Funding**: PaymentIntent creation, `payment_intent.succeeded` webhook with MongoDB ACID transaction
- **Repayments**: PaymentIntent for EMI, `payment_intent.succeeded` with 2% fee deduction, 98% payout to lender via `stripe.transfers.create`
- **Schedule**: Auto-generate repayment schedule on funding, `GET /api/loans/:id/schedule` endpoint
- **Auto-complete**: Loan auto-completed when all instalments paid
- **Scheduler**: Agenda jobs — mark-overdue (daily 9am), send-repayment-reminder (3 days before due)
- **Emails**: Loan funded (borrower), repayment received (lender), reminder (borrower), overdue alert (borrower)

## Stripe Webhook (Local Testing)

### Setup

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login and forward to your local server:

```bash
stripe login
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

3. Copy the webhook signing secret (`whsec_...`) into `server/.env` as `STRIPE_WEBHOOK_SECRET`

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success — any future expiry, any CVC |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |
| `4000 0000 0000 9995` | Declined |

### Trigger Events Locally

```bash
# Account onboarding completed
stripe trigger account.updated

# Successful payment (funding or repayment)
stripe trigger payment_intent.succeeded
```

## Agenda Scheduler (Local Testing)

Agenda starts automatically when the server boots (requires `MONGO_URI`). Jobs run daily at 9:00 AM, but you can trigger them manually for testing:

```bash
# From within the server directory, via a quick Node script or by
# setting an earlier schedule temporarily in services/jobs.js
```

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user (body: name, email, password, role) |
| POST | `/api/auth/login` | No | Login (body: email, password) → JWT token |

### Loans

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/loans` | Yes | borrower | Create a loan request |
| GET | `/api/loans/my` | Yes | borrower | List borrower's loans |
| GET | `/api/loans/borrower/dashboard` | Yes | borrower | Dashboard stats + active loans + upcoming EMIs |
| GET | `/api/loans/marketplace` | Yes | lender | Browse pending loans (paginated, filterable) |
| GET | `/api/loans/lender/dashboard` | Yes | lender | Portfolio stats + recent investments + transactions |
| GET | `/api/loans/lender/investments` | Yes | lender | All funded loans for this lender |
| GET | `/api/loans/:id` | Yes | both | Loan detail with EMI preview + schedule preview |
| GET | `/api/loans/:id/schedule` | Yes | both | Full persisted repayment schedule |
| POST | `/api/loans/:id/fund` | Yes | lender | Create PaymentIntent for loan funding |
| PUT | `/api/loans/:id` | Yes | borrower | Edit a pending loan |
| DELETE | `/api/loans/:id` | Yes | borrower | Cancel a pending loan |

### Repayments

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/repayments/borrower` | Yes | borrower | All repayment instalments for borrower |
| POST | `/api/repayments/:scheduleId/pay` | Yes | borrower | Create PaymentIntent for an EMI |
| GET | `/api/repayments/lender/:fundedLoanId` | Yes | lender | Instalment timeline for a specific funded loan |

### Stripe Connect

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/stripe/create-connect-account` | Yes | lender | Create Stripe Express account |
| POST | `/api/stripe/onboarding-link` | Yes | lender | Generate Stripe onboarding URL |
| GET | `/api/stripe/onboarding-return` | Yes | lender | Verify account after onboarding return |
| GET | `/api/stripe/account-status` | Yes | lender | Check Connect account status |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stripe/webhook` | Stripe event handler (raw body) |

## Deployment (Railway / Fly.io / Render)

### 1. Build the client

```bash
cd client
npm run build   # outputs to client/dist/
```

The server serves `client/dist/` as static files in production (or configure a separate host).

### 2. Set environment variables on the platform

Core variables needed:

- `MONGO_URI` — production MongoDB (Atlas recommended)
- `JWT_SECRET` — strong random string
- `STRIPE_SECRET_KEY` — Stripe **live** secret key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — webhook secret from Stripe dashboard
- `CLIENT_URL` — your production domain
- `RESEND_API_KEY` — for production emails

### 3. Register webhook in Stripe dashboard

- Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://yourdomain.com/api/stripe/webhook`
- Events: `account.updated`, `payment_intent.succeeded`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

### 4. Start the server

```bash
node server/index.js
```

## Commit Convention

This project follows daily commits grouped by feature area:

```
feat(stripe): webhook handler with signature verification
feat(frontend): lender Stripe onboarding banner and flow
feat(repayment+scheduler): schedule endpoint, Agenda.js init
feat(scheduler): mark-overdue and send-repayment-reminder Agenda jobs
```

## License

MIT
