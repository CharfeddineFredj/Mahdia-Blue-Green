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








## Screenshots

### Public website

| Home | About |
|:---:|:---:|
| <img src="docs/screenshots/home.png" width="480" alt="Home page"> | <img src="docs/screenshots/about.png" width="480" alt="About page"> |

| Blog | Events |
|:---:|:---:|
| <img src="docs/screenshots/blog.png" width="480" alt="Blog"> | <img src="docs/screenshots/events.png" width="480" alt="Events calendar"> |

| Event detail | Resources |
|:---:|:---:|
| <img src="docs/screenshots/event-detail.png" width="480" alt="Event detail page"> | <img src="docs/screenshots/resources.png" width="480" alt="Resources library"> |

| Entrepreneurs |
|:---:|
| <img src="docs/screenshots/entrepreneurs.png" width="480" alt="Entrepreneurs page"> |

### Admin panel

| Dashboard | Articles |
|:---:|:---:|
| <img src="docs/screenshots/admin-dashboard.png" width="480" alt="Admin dashboard"> | <img src="docs/screenshots/admin-articles.png" width="480" alt="Articles management"> |

| Events | Resources |
|:---:|:---:|
| <img src="docs/screenshots/admin-events.png" width="480" alt="Events management"> | <img src="docs/screenshots/admin-resources.png" width="480" alt="Resources management"> |

| Analytics |
|:---:|
| <img src="docs/screenshots/admin-analytics.png" width="480" alt="Analytics dashboard"> |

## Author

**Charfeddine Fredj**: [github.com/CharfeddineFredj](https://github.com/CharfeddineFredj)
