# Frontend Audit Report — Mahdia Blue & Green

**Date:** June 2025  
**Scope:** All files in `frontend/src/` (pages, components, services, context, data, styles)  
**Files Analyzed:** 44 source files

---

## Table of Contents

1. [CRITICAL — Security Vulnerabilities](#1-critical--security-vulnerabilities)
2. [CRITICAL — JSX Syntax Errors](#2-critical--jsx-syntax-errors)
3. [CRITICAL — Forms With No API Integration](#3-critical--forms-with-no-api-integration)
4. [HIGH — Broken Routes & Navigation](#4-high--broken-routes--navigation)
5. [HIGH — Pages Using Mock Data Instead of API](#5-high--pages-using-mock-data-instead-of-api)
6. [HIGH — Missing Functionality (Buttons/Features That Do Nothing)](#6-high--missing-functionality-buttonsfeatures-that-do-nothing)
7. [MEDIUM — Hardcoded URLs (localhost)](#7-medium--hardcoded-urls-localhost)
8. [MEDIUM — Authentication & Authorization Issues](#8-medium--authentication--authorization-issues)
9. [MEDIUM — Service Layer Bugs](#9-medium--service-layer-bugs)
10. [MEDIUM — UX/UI Anti-Patterns](#10-medium--uxui-anti-patterns)
11. [LOW — Hardcoded Content & Placeholder Text](#11-low--hardcoded-content--placeholder-text)
12. [LOW — Code Quality Issues](#12-low--code-quality-issues)
13. [LOW — Missing Infrastructure](#13-low--missing-infrastructure)
14. [Summary Matrix](#14-summary-matrix)

---

## 1. CRITICAL — Security Vulnerabilities

### 1.1 API Key Exposed in Client-Side Code
| File | Line |
|---|---|
| `src/components/ChatButton.jsx` | ~168 |
| `src/pages/Chatbot.jsx` | ~110 |

**Both files** contain the OpenRouter API key in plain text:
```
sk-or-v1-[REDACTED]
```
This key is shipped to every user's browser and can be extracted by anyone. It should be proxied through the backend.

### 1.2 `dangerouslySetInnerHTML` Without Sanitization
| File | Line | Data Source |
|---|---|---|
| `src/pages/Article.jsx` | 126 | `post.content` (mock data, but designed for API) |
| `src/pages/Event.jsx` | 121 | `event.content` (mock data) |
| `src/pages/Legal.jsx` | 151 | Hardcoded HTML |

When these pages switch to real API data, injecting unsanitized HTML creates XSS vulnerabilities. A sanitizer like DOMPurify should be used.

### 1.3 No CSRF / Token Refresh Mechanism
- `api.js` has no request interceptor, no response interceptor, no token refresh logic, and no CSRF token handling.
- Tokens are read from `localStorage` on every request but never validated or refreshed client-side.

---

## 2. CRITICAL — JSX Syntax Errors

### 2.1 `class=` Instead of `className=` in Account.jsx
| File | Line | Code |
|---|---|---|
| `src/pages/Account.jsx` | 442 | `<input type="password" class="form-input" required />` |
| `src/pages/Account.jsx` | 446 | `<input type="password" class="form-input" required minLength="8" />` |

React will print console warnings and the CSS class will not apply correctly. Must be `className="form-input"`.

---

## 3. CRITICAL — Forms With No API Integration

These forms exist in the UI but **never send data to the backend**:

| Page | Form/Action | What Actually Happens |
|---|---|---|
| `Contact.jsx` | Contact form (3 steps) | `console.log(formData)` — data goes nowhere. `contactService` exists but is never imported or called. |
| `CreatePost.jsx` | Article creation form | `setTimeout` simulates an API call — no real request sent. `articlesService` exists but is never used. |
| `CompleteProfile.jsx` | Post-registration profile form | `setTimeout` simulates success — no API call. `usersService.updateProfile()` exists but unused. |
| `Account.jsx` | Profile save | Saves only to `localStorage`. `usersService.updateProfile()` exists but unused. |
| `Account.jsx` | Photo upload | Stores base64 in `localStorage` — never uploaded to server/Cloudinary. |
| `Account.jsx` | Password change | Shows toast: "Fonctionnalité à venir" — completely unimplemented. |
| `Account.jsx` | Preferences save | Checkboxes exist but the "Enregistrer" button has **no onClick handler**. |
| `Questionnaire.jsx` | Questionnaire submit | Saves to `localStorage` only. `questionnaireService.submitResponse()` exists but unused. |
| `Home.jsx` | Newsletter subscription | Client-side state change only — no API endpoint. |
| `Event.jsx` | Event registration modal | Stores to `localStorage` only. `eventsService.register()` exists but unused. |

---

## 4. HIGH — Broken Routes & Navigation

| File | Issue | Details |
|---|---|---|
| `Account.jsx` | Links to `/agenda` | This route does not exist in `App.jsx`. Should be `/evenements`. |
| `TwoFactorAuth.jsx` | Navigates to `/account` | Route does not exist. Should be `/compte`. |
| `Auth.jsx` line 382 | "Mot de passe oublié" is `href="#"` | Non-functional link — no forgot-password feature exists. |
| `Entrepreneurs.jsx` | "Remplir le questionnaire" CTA | Button text says "questionnaire" but links to `/contact`. |

---

## 5. HIGH — Pages Using Mock Data Instead of API

**Every public-facing page** uses hardcoded mock data from `mockData.js` instead of fetching from the backend API, even though corresponding services exist:

| Page | Mock Data Used | Service That Exists |
|---|---|---|
| `Home.jsx` | `posts`, `events`, `partners` | `postsService`, `eventsService` |
| `Blog.jsx` | `posts`, `categories` | `articlesService`, `postsService` |
| `Article.jsx` | `posts` (finds by slug) | `articlesService.getBySlug()` |
| `Events.jsx` | `events` | `eventsService.getAll()` |
| `Event.jsx` | `events` (finds by slug) | `eventsService.getBySlug()` |
| `Economy.jsx` | `posts`, `resources` | `articlesService`, `postsService` |
| `Resources.jsx` | `resources` | None (no resource service exists) |
| `About.jsx` | `users` (as team) | Backend has team data endpoint |
| `Entrepreneurs.jsx` | `testimonials` | None |
| `Questionnaire.jsx` | `questionnaires[1]` (hardcoded index) | `questionnaireService` |

### Mock Data Shape Mismatches
- `Events.jsx` references `event._id` (MongoDB-style) but mock data uses `event.id`. This will break when switching to real API data.
- `Article.jsx` fetches comments via API with fallback to hardcoded mock comments in the catch block.

---

## 6. HIGH — Missing Functionality (Buttons/Features That Do Nothing)

| File | Element | Issue |
|---|---|---|
| `Admin.jsx` | Article edit/delete buttons | Buttons exist but have **no click handlers**. |
| `Admin.jsx` | "Nouvelle ressource" button | No handler — does nothing on click. |
| `Admin.jsx` | Resource section | Uses mock data, not API. No CRUD operations. |
| `Admin.jsx` | Article "Voir" (view) button | No handler. |
| `Resources.jsx` | Download button | Increments local counter only — **no actual file download**. All resource URLs are `#`. |
| `UI.jsx` (PostCard) | Reaction buttons (Like, Love, etc.) | API call is **commented out**. Reactions are client-side only, reset on page refresh. |
| `UI.jsx` (ResourceCard) | Download button | Same issue as Resources.jsx — no real download. |
| `Home.jsx` | Counter animation | Uses `document.querySelectorAll` (anti-pattern in React). Values are hardcoded: 150, 45, 240, 1200. |

---

## 7. MEDIUM — Hardcoded URLs (localhost)

6 locations hardcode `localhost:5000` instead of using environment variables:

| File | Line | URL |
|---|---|---|
| `services/api.js` | 3 | `http://localhost:5000/api` (fallback) |
| `services/oauth.service.js` | 4 | `http://localhost:5000/api/auth` |
| `pages/Auth.jsx` | 335 | `http://localhost:5000/api/auth/google` |
| `pages/Auth.jsx` | 347 | `http://localhost:5000/api/auth/microsoft` |
| `pages/AuthCallback.jsx` | 37 | `http://localhost:5000/api/auth/me` |
| `components/ChatButton.jsx` | 5 | `http://localhost:5000/api` |

**None of these use `VITE_API_URL`** except `api.js` (as fallback). The OAuth URLs and ChatButton bypass the `api.js` wrapper entirely.

### No Vite Proxy Configured
`vite.config.js` has no proxy configuration. API calls to `localhost:5000` from the dev server (typically `localhost:5173`) will fail due to CORS unless the backend has permissive CORS headers.

---

## 8. MEDIUM — Authentication & Authorization Issues

### 8.1 Admin Page Has No Role Verification
`Admin.jsx` (line ~57-71) only checks if `localStorage` contains user data — it does **not** verify the user's role. Any logged-in user could potentially access the admin dashboard.

### 8.2 Header Auth State Is Not Reactive
`Header.jsx` reads user state from `localStorage` once on mount with an empty dependency array. **The header will not update** when a user logs in or out until a full page reload.

### 8.3 Inconsistent Role Checks
- `Header.jsx` shows admin button for `superadmin` and `analyst` roles only.
- `Admin.jsx` doesn't check roles at all.
- The backend has roles: `user`, `moderator`, `admin`, `superadmin`, `analyst`.
- `moderator` and `admin` roles are excluded from the Header admin button check.

### 8.4 Inconsistent localStorage Data Structure
Multiple different patterns are used to read user data from `localStorage`:
- `JSON.parse(localStorage.getItem('mbg_user'))` (most pages)
- Accessing `.token` directly from the parsed object (api.js)
- Accessing `.user.token` or `.token` with fallback (api.js)
- Some pages assume the stored object IS the user, others assume it's `{user, token}`.

---

## 9. MEDIUM — Service Layer Bugs

### 9.1 visit.service.js — Double `.data` Access
```javascript
// visit.service.js line ~18-20
const response = await api.post('/visits/track', visitData);
localStorage.setItem('mbg_visitor_id', response.data.visitorId);
return response.data;
```
The `api.js` wrapper already returns `data` from the response. Accessing `response.data` again will return `undefined`.

### 9.2 Dual Post/Article System
Two separate services exist for what appears to be the same concept:
- `posts.service.js` — Full CRUD for posts
- `articles.service.js` — Full CRUD for articles

The backend uses a single `Post` model. Having both creates confusion about which to use.

### 9.3 Unused Services
These services exist but are never called from any page:
- `contact.service.js` (Contact.jsx uses console.log instead)
- `visit.service.js` (never imported anywhere in pages/components)
- Most methods in `articles.service.js` (pages use mock data)
- Most methods in `events.service.js` (pages use mock data)

---

## 10. MEDIUM — UX/UI Anti-Patterns

### 10.1 `alert()` Used Instead of Toast Component
| File | Line | Context |
|---|---|---|
| `AuthCallback.jsx` | 30, 67 | OAuth error handling |
| `Admin.jsx` | 193 | Role update error |
| `TwoFactorVerify.jsx` | 84 | Backup code warning |

A `Toast` component exists in `UI.jsx` and is used elsewhere — these should use it too.

### 10.2 Article.jsx — Silent Error Swallowing
When comment posting fails, the error is caught and the comment is **still displayed as if it succeeded** (lines ~70-80). The user sees their comment but it was never saved.

### 10.3 LoadingPage Always Shows 2.5 Seconds
`LoadingPage.jsx` has a fixed `setTimeout(2500)` regardless of actual load status. This delays first interaction unnecessarily.

### 10.4 Loading Page Not Dark-Theme Aware
`LoadingPage.css` has `background: #ffffff` hardcoded. The dark theme (`ThemeContext`) is not applied during loading.

### 10.5 `onKeyPress` Deprecated
`ChatButton.jsx` uses `onKeyPress` which is deprecated. Should use `onKeyDown`.

---

## 11. LOW — Hardcoded Content & Placeholder Text

### 11.1 Legal.jsx — Placeholder Hosting Information
The legal page contains:
- "Nom de l'hébergeur"
- "Adresse de l'hébergeur"

These are unfilled placeholder values.

### 11.2 Footer Social Links — Generic URLs
`Footer.jsx` links to generic social media homepages:
- `https://facebook.com`
- `https://linkedin.com`
- `https://twitter.com`
- `https://instagram.com`
- `https://youtube.com`

These should point to actual Mahdia Blue & Green social accounts.

### 11.3 Hardcoded Statistics
| File | Values |
|---|---|
| `Home.jsx` | Counter targets: 150 projets, 45 partenaires, 240 articles, 1200 membres |
| `Economy.jsx` | Various statistics per economy type |

### 11.4 Unsplash Placeholder Images
`Economy.jsx` uses Unsplash URLs for hero images instead of project-specific images.

### 11.5 ChatButton/Chatbot — Team Praise System
Both `ChatButton.jsx` and `Chatbot.jsx` contain extensive hardcoded team member descriptions that serve as fallback responses. This is baked into client code rather than being configurable.

---

## 12. LOW — Code Quality Issues

### 12.1 Excessive console.log Statements
**42 console.log/warn/error calls** found across the codebase. Particularly heavy in:
- `Admin.jsx` (20+ debug logs)
- `api.js` (5 debug logs including token details)

These should be removed or replaced with a proper logging utility for production.

### 12.2 Direct DOM Manipulation
`Home.jsx` uses `document.querySelectorAll('.counter')` for counter animation — this bypasses React's virtual DOM and can cause issues.

### 12.3 Missing CSS Closing Brace
`LoadingPage.css` (line 100-110): The `@media (max-width: 480px)` block is missing its closing `}` brace.

### 12.4 Unused CSS Animations
`LoadingPage.css` defines `@keyframes spin`, `@keyframes float`, and `@keyframes pulse` animations that are never used.

### 12.5 Inline Styles Overuse
`Chatbot.jsx` (652 lines) and `ChatButton.jsx` (781 lines) contain their **entire CSS as inline `<style>` blocks**, totaling ~1400 lines of styling. This bypasses the project's theme system and CSS architecture.

### 12.6 Duplicate Chat Components
Both `ChatButton.jsx` (widget) and `Chatbot.jsx` (full page at `/chatbot`) implement the same AI chat feature with similar code, duplicating:
- The OpenRouter API integration
- Team member fallback responses
- The same API key (security issue mentioned above)

### 12.7 No TypeScript / PropTypes
No type checking of any kind. Components accept props without validation.

### 12.8 `@babel/core` in Dependencies
`package.json` includes `@babel/core` as a dependency, but Vite uses esbuild/SWC. Likely unused.

---

## 13. LOW — Missing Infrastructure

| Item | Status |
|---|---|
| **Testing framework** | None — no test files, no test dependencies |
| **Form validation library** | None — manual validation only, inconsistent across forms |
| **State management** | None — uses localStorage + prop drilling |
| **HTTP client** | None — custom fetch wrapper with no interceptors |
| **Error boundary** | None — unhandled errors crash the whole app |
| **SEO** | No `react-helmet` or meta tag management (despite backend having SEO service) |
| **Accessibility** | Minimal — icons have `aria-hidden` but no skip-nav, focus management, or ARIA roles on interactive elements |
| **i18n** | None — all text hardcoded in French |
| **Environment variables** | Only `VITE_API_URL` defined, no `.env.example` file |
| **Rich text editor** | `CreatePost.jsx` uses plain `<textarea>` for article content — no formatting possible |
| **Image optimization** | No lazy loading, no srcset, Unsplash URLs used without size parameters |

---

## 14. Summary Matrix

| Severity | Count | Category |
|---|---|---|
| **CRITICAL** | 5 | API key exposure, XSS risk, JSX errors, no CSRF |
| **HIGH** | 17 | No API integration (10 forms), broken routes (4), mock data (10 pages), dead buttons (8) |
| **MEDIUM** | 12 | Hardcoded URLs (6), auth issues (4), service bugs (3), UX anti-patterns (5) |
| **LOW** | 20+ | Placeholder text, console.logs, code quality, missing infrastructure |

### Priority Recommendations

1. **Immediately**: Remove the exposed API key from client code — proxy through backend
2. **Immediately**: Fix `class=` → `className=` in Account.jsx
3. **High Priority**: Connect all forms to their corresponding backend services
4. **High Priority**: Replace all mock data usage with API calls
5. **High Priority**: Fix broken routes (`/agenda` → `/evenements`, `/account` → `/compte`)
6. **Medium Priority**: Add proper role-based authorization to admin pages
7. **Medium Priority**: Make Header auth state reactive
8. **Medium Priority**: Add DOMPurify for all `dangerouslySetInnerHTML` usage
9. **Medium Priority**: Replace `alert()` with Toast component
10. **Low Priority**: Remove console.log statements, add error boundaries, add testing
