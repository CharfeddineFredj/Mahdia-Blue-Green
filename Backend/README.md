# Blog Backend API

A Node.js/Express REST API for a blog platform with user authentication, posts system (Articles & Events), questionnaire system, and admin panel functionality.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Security Features](#security-features)

## Overview

This backend API provides:
- **User Authentication** - Register, login, JWT-based auth
- **Posts System** - Articles and Events as polymorphic content
- **Questionnaire System** - Create questionnaires and collect responses
- **Admin Panel** - User management, content moderation, analytics

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v5
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JWT (JSON Web Tokens)
- **Security:** Helmet, CORS, Rate Limiting, Mongo Sanitize
- **File Uploads:** Multer, Cloudinary

## Project Structure

```
Backend_blog/
├── config/
│   ├── cloudinary.js          # Cloudinary configuration
│   └── database.js            # MongoDB connection
├── controllers/
│   ├── adminController.js     # Admin operations
│   ├── articleController.js   # Article CRUD
│   ├── authController.js      # Authentication
│   ├── eventController.js     # Event CRUD + registration
│   ├── postController.js      # Generic post operations
│   ├── questionnaireController.js
│   └── userController.js      # User management
├── middleware/
│   ├── auth.js                # JWT & role authorization
│   ├── upload.js              # File upload handling
│   └── validation.js          # Input validation
├── models/
│   ├── Article.js             # Article data
│   ├── Category.js            # Hierarchical categories
│   ├── Comment.js             # Post comments
│   ├── Event.js               # Event data
│   ├── Level.js               # Difficulty levels
│   ├── PersonalInfo.js        # User profile
│   ├── Post.js                # Main post container
│   ├── Question.js            # Questionnaire questions
│   ├── Questionnaire.js       # Questionnaire container
│   ├── Resource.js            # Uploadable resources
│   ├── Response.js            # Questionnaire responses
│   └── User.js                # User authentication
├── routes/
│   ├── admin.js
│   ├── articles.js
│   ├── auth.js
│   ├── events.js
│   ├── posts.js
│   ├── questionnaire.js
│   └── users.js
├── utils/
│   ├── emailService.js
│   └── seoHelper.js
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Alap06/Backend_blog.git
   cd Backend_blog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   node server.js
   ```

5. **Server runs on** `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login user |
| GET | `/api/auth/logout` | Public | Logout user |
| GET | `/api/auth/me` | Private | Get current user |

### Articles

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/articles` | Public | Get all published articles |
| GET | `/api/articles/featured` | Public | Get popular articles |
| GET | `/api/articles/tag/:tag` | Public | Get articles by tag |
| GET | `/api/articles/:id` | Public | Get single article |
| GET | `/api/articles/user/my-articles` | Private | Get user's articles |
| POST | `/api/articles` | Private | Create article |
| PUT | `/api/articles/:id` | Private | Update article (owner) |
| DELETE | `/api/articles/:id` | Private | Delete article (owner) |

### Events

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/events` | Public | Get all published events |
| GET | `/api/events/upcoming` | Public | Get upcoming events |
| GET | `/api/events/:id` | Public | Get single event |
| GET | `/api/events/user/my-events` | Private | Get user's events |
| GET | `/api/events/user/registered` | Private | Get registered events |
| POST | `/api/events` | Private | Create event |
| PUT | `/api/events/:id` | Private | Update event (owner) |
| DELETE | `/api/events/:id` | Private | Delete event (owner) |
| POST | `/api/events/:id/register` | Private | Register for event |
| DELETE | `/api/events/:id/register` | Private | Unregister from event |
| GET | `/api/events/:id/attendees` | Private | Get attendees (owner) |

### Posts

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/posts` | Public | Get all posts |
| GET | `/api/posts/:id` | Public | Get single post |
| GET | `/api/posts/user/my-posts` | Private | Get user's posts |
| POST | `/api/posts/article` | Private | Create article post |
| POST | `/api/posts/event` | Private | Create event post |
| PUT | `/api/posts/:id` | Private | Update post |
| DELETE | `/api/posts/:id` | Private | Delete post |
| POST | `/api/posts/:id/comments` | Private | Add comment |
| GET | `/api/posts/:id/comments` | Public | Get comments |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | Get all users |
| GET | `/api/users/:id` | Private | Get single user |
| PUT | `/api/users/:id` | Private | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| PUT | `/api/users/profile/update` | Private | Update profile |

### Questionnaires

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/questionnaires` | Public | Get all questionnaires |
| GET | `/api/questionnaires/:id` | Public | Get single questionnaire |
| POST | `/api/questionnaires` | Admin | Create questionnaire |
| PUT | `/api/questionnaires/:id` | Admin | Update questionnaire |
| DELETE | `/api/questionnaires/:id` | Admin | Delete questionnaire |
| POST | `/api/questionnaires/:id/submit` | Private | Submit response |
| GET | `/api/questionnaires/user/responses` | Private | Get user's responses |

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/dashboard` | Admin | Get dashboard stats |
| GET | `/api/admin/users` | Admin | Get all users |
| GET | `/api/admin/users/:id` | Admin | Get user details |
| PUT | `/api/admin/users/:id/role` | Admin | Update user role |
| DELETE | `/api/admin/users/:id` | Admin | Deactivate user |
| GET | `/api/admin/posts` | Admin | Get all posts |
| PUT | `/api/admin/posts/:id/approve` | Admin | Approve post |
| DELETE | `/api/admin/posts/:id` | Admin | Delete post |
| GET | `/api/admin/responses` | Admin | Get all responses |

## Data Models

### Post System Architecture

```
POST (Container)
├── type: 'article' | 'event'
├── title, body, status
├── author → User
├── article → Article (if type='article')
├── event → Event (if type='event')
├── category → Category
├── level → Level
└── comments[] → Comment

ARTICLE                     EVENT
├── content                 ├── startDate, endDate
├── summary                 ├── location, venue
├── readTime                ├── isOnline, meetingLink
├── tags[]                  ├── capacity
├── featuredImage           ├── registeredUsers[]
└── seo                     └── eventImage
```

### User System

```
USER                        PERSONAL INFO
├── email                   ├── firstName, lastName
├── password (hashed)       ├── dateOfBirth
├── username                ├── phone, address
├── role (user/admin)       ├── bio, avatar
└── isActive                └── socialLinks
```

## Security Features

- **JWT Authentication** - Token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Role-Based Access Control** - User/Admin authorization
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Helmet** - Security HTTP headers
- **CORS** - Configured cross-origin requests
- **Mongo Sanitize** - NoSQL injection prevention
- **Input Validation** - express-validator

## License

ISC

## Author

Mohamed Harbi
