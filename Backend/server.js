console.log('--- SERVER.JS IS LOADING ---');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const passport = require('./config/passport');
const connectDB = require('./config/database');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');
const ensureDataSeeded = require('./utils/ensureDataSeeded');
const ensureEntrepreneursSeeded = require('./utils/ensureEntrepreneursSeeded');
const ensureQuestionnaire = require('./utils/ensureQuestionnaire');
const ensurePublicQuestionnaires = require('./utils/ensurePublicQuestionnaires');
const ensureEventModeration = require('./utils/ensureEventModeration');

const app = express();

// Derrière un reverse-proxy (HTTPS), pour que OAuth reconstruise la bonne URL publique
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

console.log('--- SETTING UP MIDDLEWARE ---');

// Security Middleware
app.use(helmet());

// CORS (frontend dev server runs on :5173)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/server-to-server (no Origin header) and configured origins
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Preflight requests
app.options(/.*/, cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 1500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL injection (skip chat: long user/system text must not be altered)
app.use(
  mongoSanitize({
    skipRoutes: [/^\/api\/chat(\/|$)/],
  })
);

// Initialize Passport
app.use(passport.initialize());

// Core API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/oauth', require('./routes/oauth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/events', require('./routes/events'));
app.use('/api/questionnaire', require('./routes/questionnaire'));
app.use('/api/questionnaires', require('./routes/questionnaire'));
app.use('/api/event-questionnaires', require('./routes/eventQuestionnaires'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/team', require('./routes/team'));
app.use('/api/partners', require('./routes/partner'));
app.use('/api/entrepreneurs', require('./routes/entrepreneur'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/chat', require('./routes/chat'));

// Additional API routes
app.use('/api/categories', require('./routes/categories'));
app.use('/api/levels', require('./routes/levels'));

// Health check route
app.get('/', (req, res) => {
  console.log('HEALTH CHECK HIT');
  res.json({ success: true, message: 'Blog API is running' });
});

app.get('/test-query', (req, res) => {
  console.log('TEST QUERY HIT:', req.query);
  res.json({ success: true, query: req.query });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.message
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  ensureSuperAdmin()
    .then(({ created, user }) => {
      if (created) {
        console.log(`Superadmin auto-created: ${user?.email}`);
      } else {
        console.log(`Superadmin already exists: ${user?.email}`);
      }
    })
    .then(() => ensureDataSeeded())
    .then(({ seeded } = {}) => {
      if (seeded) console.log('Initial data seeded from Backend/data');
    })
    .then(() => ensureEntrepreneursSeeded())
    .then(({ seeded, count } = {}) => {
      if (seeded) console.log(`Legacy entrepreneurs seeded: ${count}`);
    })
    .then(() => ensureQuestionnaire())
    .then(({ created } = {}) => {
      if (created) console.log('Registration questionnaire created on startup.');
    })
    .then(() => ensurePublicQuestionnaires())
    .then(({ created } = {}) => {
      if (created) console.log('Default public questionnaire(s) created on startup.');
    })
    .then(() => ensureEventModeration())
    .then(({ approved, pending } = {}) => {
      if (approved || pending) console.log(`Event moderation backfilled: ${approved} approved, ${pending} pending.`);
    })
    .catch((error) => {
      console.error(`Failed to ensure superadmin: ${error.message}`);
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log('------------------------------');
        console.log(`Server running on port ${PORT}`);
        console.log('------------------------------');
      });
    });
});

module.exports = app;
