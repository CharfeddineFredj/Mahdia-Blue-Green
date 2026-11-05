# Mahdia Blue & Green

A full-stack web platform promoting the **blue** (sea) and **green** (sustainable) economy in Mahdia, Tunisia. It publishes articles, events and resources, showcases local entrepreneurs, and gives content teams an admin panel to manage everything.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-API-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)

---

## Features

**Public website**
- Blog with rich-text articles (TipTap editor) and category filters
- Events listing and event pages, with a questionnaire flow
- Resources library and a directory of local entrepreneurs
- Economy pages by sector, an "About" page, contact form and legal pages
- Newsletter subscription
- AI assistant (chatbot) powered by OpenRouter, which can be switched on or off

**Accounts & security**
- Email/password sign-up with email verification and password reset
- Google sign-in (OAuth 2.0)
- Two-factor authentication (TOTP) with QR-code setup for authenticator apps
- JWT-based sessions, bcrypt password hashing, rate limiting
- Hardening middleware: Helmet, input validation and sanitization, NoSQL-injection protection

**Administration**
- Admin panel with roles: `superadmin`, `analyst`, `moderator`, `user`
- Content management for articles, events and resources, with a moderation workflow
- Registration questionnaires that complete user profiles
- Image uploads stored on Cloudinary
- Dashboards and analytics charts (Recharts)

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 7, React Router, TipTap, Recharts, Lucide icons, DOMPurify |
| Backend | Node.js, Express, MongoDB with Mongoose, Passport (Google OAuth), JWT, Nodemailer, Multer, Cloudinary |
| Security | Helmet, express-rate-limit, express-validator, express-mongo-sanitize, xss-clean, sanitize-html, speakeasy (TOTP) |
| Tooling | ESLint, Node test runner, nodemon |

## Architecture

```
.
├── Frontend/          # React + Vite single-page application
│   ├── src/pages/     # Public pages and admin panel
│   ├── src/components/
│   └── src/services/  # API client
├── Backend/           # Express REST API
│   ├── routes/        # Endpoints (auth, articles, events, admin, chat, ...)
│   ├── controllers/   # Business logic
│   ├── models/        # Mongoose schemas
│   ├── middleware/    # Auth, validation, security
│   ├── utils/         # Email, seeding, helpers
│   └── tests/         # Unit and integration tests
└── documentation/     # Project documentation and diagrams
```

![Class diagram](documentation/giagramme%20e%20class.jpg)

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 7)
- A MongoDB database, local or on MongoDB Atlas
- Optional, for the full feature set: Google OAuth credentials, a Cloudinary account, an SMTP account, an OpenRouter API key

### 1. Clone the repository

```bash
git clone https://github.com/CharfeddineFredj/Mahdia-Blue-Green-Portfolio.git
cd Mahdia-Blue-Green-Portfolio
```

### 2. Start the backend

```bash
cd Backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
# Fill in the values in .env (see "Environment variables" below)
npm run dev                 # API on http://localhost:5000
```

On first start the API creates the superadmin account (if `SUPERADMIN_*` variables are set) and loads the initial content from `Backend/data`.

### 3. Start the frontend

In a second terminal:

```bash
cd Frontend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev                 # App on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## Environment Variables

Backend (`Backend/.env`):

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `FRONTEND_URL` | Public URL of the frontend (used in emails and redirects) |
| `CORS_ORIGINS` | Allowed frontend origins, comma-separated |
| `TRUST_PROXY` | Set to `true` when running behind a reverse proxy |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` | Credentials of the first superadmin account. No default values are provided |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP settings for verification and password-reset emails |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image upload storage |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google sign-in |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | AI assistant |

Frontend (`Frontend/.env`):

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:5000/api` |
| `VITE_ENABLE_CHATBOT` | Show or hide the AI assistant |

Never commit real values. Keep `.env` files out of version control; `.env.example` contains placeholders only.

## Available Scripts

| Location | Command | Description |
|---|---|---|
| `Backend` | `npm run dev` | Start the API with auto-reload |
| `Backend` | `npm start` | Start the API in production mode |
| `Backend` | `npm test` | Run the unit tests |
| `Backend` | `npm run test:integration` | Run the integration workflows |
| `Frontend` | `npm run dev` | Start the Vite development server |
| `Frontend` | `npm run build` | Build the production bundle into `dist/` |
| `Frontend` | `npm run lint` | Lint the source code |

## Screenshots

<!-- To add screenshots: save them in docs/screenshots/ and replace each cell with ![Name](docs/screenshots/file.png) -->

| Page | Preview |
|---|---|
| Home | _Screenshot coming soon_ |
| Blog | _Screenshot coming soon_ |
| Events | _Screenshot coming soon_ |
| Admin panel | _Screenshot coming soon_ |
| Account & two-factor authentication | _Screenshot coming soon_ |
| AI assistant | _Screenshot coming soon_ |

## Author

**Charfeddine Fredj**: [github.com/CharfeddineFredj](https://github.com/CharfeddineFredj)
