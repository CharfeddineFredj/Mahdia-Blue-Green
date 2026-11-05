# Mahdia Blue & Green

A full-stack web application for promoting sustainable blue, green, and circular economy in Mahdia, Tunisia.

## Project Structure

```
mahdia/
├── frontend/          # React/Vite frontend application
├── backend/           # Node.js/Express API server
├── shared/            # Shared types and constants
├── docs/              # Documentation
└── scripts/           # Build and deployment scripts
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

2. **Configure environment:**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend uses .env.development by default
```

3. **Start development servers:**
```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3001
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only the frontend |
| `npm run dev:backend` | Start only the backend |
| `npm run build` | Build both for production |
| `npm run test` | Run tests in all workspaces |
| `npm run lint` | Lint all workspaces |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/articles` | Get all articles |
| `GET /api/articles/:slug` | Get article by slug |
| `GET /api/events` | Get all events |
| `GET /api/events/:slug` | Get event by slug |
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login user |
| `POST /api/contact` | Send contact message |

## Tech Stack

### Frontend
- React 19
- React Router 7
- Vite 7
- CSS (custom styling)

### Backend
- Node.js
- Express.js
- MongoDB / Mongoose
- JWT Authentication

## License

MIT
