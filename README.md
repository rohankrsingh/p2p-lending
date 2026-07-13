# P2P Lending Platform

A peer-to-peer micro-lending platform where borrowers can request loans and lenders can fund them, with automated EMI repayments via Stripe.

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React + Vite + shadcn/ui + Zustand |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Payments | Stripe Connect |
| Scheduler | Agenda.js |
| Email | Resend |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 1. Clone & install

```bash
git clone <repo-url>
cd p2p

# Install root dev tools
npm install

# Install client deps
cd client && npm install && cd ..

# Install server deps
cd server && npm install && cd ..
```

### 2. Set up environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env — fill in MONGO_URI, JWT_SECRET

# Client
cp client/.env.example client/.env
# Edit client/.env — fill in VITE_API_URL if different from default
```

### 3. Run in development

```bash
npm run dev
# Runs both client (localhost:5173) and server (localhost:5000) concurrently
```

Or run separately:
```bash
npm run client   # Vite dev server on :5173
npm run server   # Express + nodemon on :5000
```

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `STRIPE_SECRET_KEY` | Stripe secret key (Week 2) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (Week 2) |
| `RESEND_API_KEY` | Resend API key for emails (Week 4) |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: http://localhost:5000/api) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (Week 2) |

## Project Structure

```
p2p/
├── client/                    # React + Vite + shadcn/ui
│   └── src/
│       ├── components/        # Shared + shadcn UI components
│       ├── pages/             # Route-level pages (auth, borrower, lender)
│       ├── store/             # Zustand stores
│       ├── hooks/             # Custom hooks
│       └── lib/               # API client, utils
└── server/                    # Express backend
    ├── models/                # Mongoose schemas
    ├── routes/                # Express routers
    ├── middleware/            # auth, requireRole
    ├── services/              # stripe, resend, agenda
    └── utils/                 # db, emi calculator
```

## Stripe Webhook (Local Testing)

Install [Stripe CLI](https://stripe.com/docs/stripe-cli) then:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

Copy the webhook signing secret it prints into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

Test with card: `4242 4242 4242 4242`, any future expiry, any CVC.
