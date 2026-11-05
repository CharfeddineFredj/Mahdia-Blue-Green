# Blog Backend - Class Diagram

## Complete System Architecture

```mermaid
classDiagram
    direction TB
    
    %% ==========================================
    %% ACCESS SYSTEM (Visitor → User Flow)
    %% ==========================================
    
    class Visitor {
        <<actor>>
        +browseContent()
        +viewArticles()
        +viewEvents()
        +register()
    }
    
    note for Visitor "Unauthenticated user\nCan only READ content\nMust register to interact"
    
    %% ==========================================
    %% USER & AUTHENTICATION SYSTEM
    %% ==========================================
    
    class User {
        +ObjectId _id
        +String email
        +String password
        +String username
        +Enum role
        +ObjectId personalInfo
        +Boolean questionnaireCompleted
        +Boolean isActive
        +comparePassword() Boolean
    }
    
    note for User "Roles: user, superadmin, analyst, moderator"
    
    class PersonalInfo {
        +ObjectId _id
        +String firstName
        +String lastName
        +Date dateOfBirth
        +Enum gender
        +String phone
        +Address address
        +String bio
        +String avatar
        +SocialLinks socialLinks
        +Preferences preferences
        +fullName() String
    }
    
    class Address {
        <<embedded>>
        +String street
        +String city
        +String state
        +String country
        +String zipCode
    }
    
    class SocialLinks {
        <<embedded>>
        +String website
        +String twitter
        +String linkedin
        +String github
    }
    
    class Preferences {
        <<embedded>>
        +Boolean newsletter
        +Boolean notifications
    }
    
    %% User-PersonalInfo Relationships
    User "1" *-- "0..1" PersonalInfo : has
    PersonalInfo *-- "1" Address : contains
    PersonalInfo *-- "1" SocialLinks : contains
    PersonalInfo *-- "1" Preferences : contains
    
    %% Visitor → User Flow
    Visitor ..> User : registers to become
    Visitor ..> Post : reads (public)
    
    %% ==========================================
    %% QUESTIONNAIRE SYSTEM
    %% ==========================================
    
    class Questionnaire {
        +ObjectId _id
        +String title
        +String description
        +ObjectId[] questions
        +Boolean isActive
        +Boolean isDeleted
        +Boolean isRegistrationQuestionnaire
    }
    
    class Question {
        +ObjectId _id
        +String text
        +Enum type
        +String[] options
        +Number order
        +Boolean isRequired
        +String category
        +String personalInfoField
    }
    
    class Response {
        +ObjectId _id
        +ObjectId user
        +ObjectId questionnaire
        +Answer[] answers
        +ObjectId personalInfo
        +Date submittedAt
    }
    
    class Answer {
        <<embedded>>
        +ObjectId question
        +Mixed value
    }
    
    %% Questionnaire Internal Relationships
    Questionnaire "1" o-- "*" Question : contains
    Response "*" o-- "1" Questionnaire : response to
    Response *-- "*" Answer : contains
    Answer "*" --> "1" Question : answers
    
    %% Questionnaire-User Relationships
    Response "*" --> "1" User : submitted by
    Response "1" ..> "0..1" PersonalInfo : populates
    
    %% ==========================================
    %% CONTENT SYSTEM (Embedded Design)
    %% ==========================================
    
    class Post {
        +ObjectId _id
        +Enum type
        +String title
        +String slug
        +String body
        +Enum status
        +ObjectId author
        +ArticleData articleData
        +EventData eventData
        +ObjectId category
        +ObjectId level
        +Number viewCount
        +Boolean isDeleted
        +Date publishedAt
        +isFull() Boolean
        +isPast() Boolean
    }
    
    class ArticleData {
        <<embedded>>
        +String content
        +String summary
        +Number readTime
        +String[] tags
        +String featuredImage
        +SEO seo
    }
    
    class SEO {
        <<embedded>>
        +String metaTitle
        +String metaDescription
        +String[] keywords
    }
    
    class EventData {
        <<embedded>>
        +Date startDate
        +Date endDate
        +String location
        +String venue
        +Boolean isOnline
        +String meetingLink
        +Number capacity
        +ObjectId[] registeredUsers
        +String eventImage
    }
    
    class Comment {
        +ObjectId _id
        +String content
        +Number rating
        +ObjectId post
        +ObjectId author
        +Boolean isApproved
    }
    
    %% Content Internal Relationships (Embedded)
    Post *-- "0..1" ArticleData : contains if type=article
    Post *-- "0..1" EventData : contains if type=event
    ArticleData *-- "0..1" SEO : contains
    Comment "*" --> "1" Post : belongs to
    
    %% Content-User Relationships
    Post "*" --> "1" User : author
    Comment "*" --> "1" User : author
    Post "*" o-- "*" User : eventData.registeredUsers
    
    %% ==========================================
    %% CLASSIFICATION SYSTEM
    %% ==========================================
    
    class Category {
        +ObjectId _id
        +String title
        +String description
        +ObjectId parentId
        +Boolean isActive
        +subcategories() Category[]
    }
    
    class Level {
        +ObjectId _id
        +Number level
        +String name
        +String description
    }
    
    %% Classification Self-Reference
    Category "*" --> "0..1" Category : parent
    
    %% Content-Classification Relationships
    Post "*" --> "0..1" Category : belongs to
    Post "*" --> "0..1" Level : has
    
    %% ==========================================
    %% RESOURCE SYSTEM
    %% ==========================================
    
    class Resource {
        +ObjectId _id
        +String title
        +Enum type
        +String url
        +String description
        +ObjectId category
        +ObjectId uploadedBy
        +Boolean isPublic
    }
    
    %% Resource Relationships
    Resource "*" --> "0..1" Category : belongs to
    Resource "*" --> "0..1" User : uploadedBy
```

---

## System Packages Overview

### 0️⃣ Access System (Visitor → User)
```
┌─────────────────────────────────────────────────────────────────┐
│                        ACCESS SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────────┐                                             │
│   │   VISITOR     │ ◄─── Unauthenticated (No token)            │
│   │   <<actor>>   │                                             │
│   │               │    CAN:                                     │
│   │               │    ✓ Browse and read all public content    │
│   │               │    ✓ View articles, events, posts          │
│   │               │    ✓ View public questionnaires            │
│   │               │                                             │
│   │               │    CANNOT:                                  │
│   │               │    ✗ Create posts, articles, events        │
│   │               │    ✗ Add comments                          │
│   │               │    ✗ Register for events                   │
│   │               │    ✗ Submit questionnaire responses        │
│   └───────┬───────┘                                             │
│           │                                                      │
│           │ /api/auth/register                                  │
│           ▼                                                      │
│   ┌───────────────┐                                             │
│   │ TEMP TOKEN    │ ◄─── 1 hour validity                       │
│   │ (registration)│                                             │
│   │               │    CAN:                                     │
│   │               │    ✓ Complete registration questionnaire   │
│   │               │                                             │
│   │               │    CANNOT:                                  │
│   │               │    ✗ Access protected routes               │
│   └───────┬───────┘                                             │
│           │                                                      │
│           │ /api/auth/complete-questionnaire                    │
│           ▼                                                      │
│   ┌───────────────┐                                             │
│   │     USER      │ ◄─── Full token (30 days)                  │
│   │ (authenticated)│                                            │
│   │               │    CAN:                                     │
│   │               │    ✓ Everything Visitor can do             │
│   │               │    ✓ Create posts, articles, events        │
│   │               │    ✓ Add comments (rating 1-5)             │
│   │               │    ✓ Register for events                   │
│   │               │    ✓ Update profile                        │
│   │               │    ✓ Submit questionnaire responses        │
│   └───────────────┘                                             │
│           │                                                      │
│           │ Promoted by Superadmin                              │
│           ▼                                                      │
│   ┌───────────────────────────────────────────────────────────┐ │
│   │                    ADMIN ROLES                             │ │
│   ├───────────────────────────────────────────────────────────┤ │
│   │                                                            │ │
│   │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │ │
│   │   │ SUPERADMIN  │   │  ANALYST    │   │ MODERATOR   │     │ │
│   │   │             │   │             │   │             │     │ │
│   │   │ Full access │   │ Questionnaire│  │ Content     │     │ │
│   │   │ to system   │   │ management  │   │ supervision │     │ │
│   │   │             │   │             │   │             │     │ │
│   │   │ CAN:        │   │ CAN:        │   │ CAN:        │     │ │
│   │   │ • Manage    │   │ • Create    │   │ • Review    │     │ │
│   │   │   users     │   │   question- │   │   posts     │     │ │
│   │   │ • Assign    │   │   naires    │   │ • Approve/  │     │ │
│   │   │   roles     │   │ • View all  │   │   reject    │     │ │
│   │   │ • Delete    │   │   responses │   │   content   │     │ │
│   │   │   users     │   │ • Analyze   │   │ • Delete    │     │ │
│   │   │ • All       │   │   user data │   │   posts     │     │ │
│   │   │   admin ops │   │             │   │             │     │ │
│   │   └─────────────┘   └─────────────┘   └─────────────┘     │ │
│   │                                                            │ │
│   └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1️⃣ User & Authentication System
```
┌─────────────────────────────────────────────────────────────────┐
│                    USER & AUTHENTICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐                    ┌──────────────┐              │
│   │   USER   │───── 1:0..1 ──────▶│ PERSONAL INFO│              │
│   └──────────┘                    └──────┬───────┘              │
│        │                                 │                       │
│        │                    ┌────────────┼────────────┐         │
│        │                    ▼            ▼            ▼         │
│        │              ┌─────────┐  ┌──────────┐ ┌───────────┐   │
│        │              │ Address │  │SocialLinks│ │Preferences│   │
│        │              │(embedded)│ │(embedded) │ │(embedded) │   │
│        │              └─────────┘  └──────────┘ └───────────┘   │
│        │                                                         │
│        │ Access Levels:                                          │
│        │ • Guest (no token): Read only                          │
│        │ • Temp Token (1h): Complete questionnaire              │
│        │ • Full Token (30d): All features                       │
│        │                                                         │
└────────┴────────────────────────────────────────────────────────┘
```

### 2️⃣ Questionnaire System
```
┌─────────────────────────────────────────────────────────────────┐
│                    QUESTIONNAIRE SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────────┐         ┌────────────┐                      │
│   │ QUESTIONNAIRE │── 1:* ──│  QUESTION  │                      │
│   │               │         │            │                      │
│   │ • title       │         │ • text     │                      │
│   │ • isRegistra- │         │ • type     │                      │
│   │   tionQuest.  │         │ • options[]│                      │
│   └───────┬───────┘         │ • personal-│                      │
│           │                 │   InfoField│◄─── Maps to          │
│           │ 1:*             └─────┬──────┘     PersonalInfo     │
│           ▼                       │                              │
│   ┌───────────────┐               │                              │
│   │   RESPONSE    │◄──────────────┘                              │
│   │               │                                              │
│   │ • user        │         ┌────────────┐                      │
│   │ • answers[]   │── 1:* ──│   ANSWER   │                      │
│   │ • personalInfo│         │ (embedded) │                      │
│   └───────┬───────┘         │ • question │                      │
│           │                 │ • value    │                      │
│           │                 └────────────┘                      │
│           │ populates (if registration questionnaire)           │
│           ▼                                                      │
│   ┌───────────────┐                                             │
│   │ PERSONAL INFO │                                             │
│   └───────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3️⃣ Content System (Post/Article/Event)
```
┌─────────────────────────────────────────────────────────────────┐
│                       CONTENT SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                     ┌──────────────┐                            │
│                     │     POST     │ ◄─── Polymorphic Container │
│                     │              │                            │
│                     │ • type       │                            │
│                     │ • title      │                            │
│                     │ • body       │                            │
│                     │ • status     │                            │
│                     │ • author ────┼──────▶ User                │
│                     │ • category ──┼──────▶ Category            │
│                     │ • level ─────┼──────▶ Level               │
│                     └──────┬───────┘                            │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │ type='article'   │    type='event'  │                 │
│         ▼                  │                  ▼                 │
│   ┌───────────┐            │            ┌───────────┐           │
│   │  ARTICLE  │            │            │   EVENT   │           │
│   │           │            │            │           │           │
│   │ • content │            │            │ • startDate│          │
│   │ • summary │            │            │ • endDate │           │
│   │ • tags[]  │            │            │ • location│           │
│   │ • seo ────┼──┐         │            │ • capacity│           │
│   └───────────┘  │         │            │ • register│           │
│                  ▼         │            │   edUsers│───▶ User[] │
│            ┌─────────┐     │            └───────────┘           │
│            │   SEO   │     │                                     │
│            │(embedded)│    │                                     │
│            └─────────┘     │                                     │
│                            │                                     │
│                            ▼                                     │
│                     ┌──────────────┐                            │
│                     │   COMMENT    │                            │
│                     │              │                            │
│                     │ • content    │                            │
│                     │ • rating     │                            │
│                     │ • author ────┼──────▶ User                │
│                     │ • isApproved │                            │
│                     └──────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4️⃣ Classification System
```
┌─────────────────────────────────────────────────────────────────┐
│                    CLASSIFICATION SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────────┐              ┌───────────────┐              │
│   │   CATEGORY    │              │     LEVEL     │              │
│   │               │              │               │              │
│   │ • title       │              │ • level (num) │              │
│   │ • description │              │ • name        │              │
│   │ • parentId ───┼──┐           │ • description │              │
│   │ • isActive    │  │           │               │              │
│   └───────────────┘  │           └───────────────┘              │
│          ▲           │                   ▲                       │
│          │           │                   │                       │
│          └───────────┘                   │                       │
│        (self-reference                   │                       │
│         for hierarchy)                   │                       │
│                                          │                       │
│   Used by:                               │                       │
│   • Post.category ───────────────────────┤                       │
│   • Resource.category                    │                       │
│   • Post.level ──────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5️⃣ Resource System
```
┌─────────────────────────────────────────────────────────────────┐
│                      RESOURCE SYSTEM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────────┐                                             │
│   │   RESOURCE    │                                             │
│   │               │                                             │
│   │ • title       │                                             │
│   │ • type ───────┼──── [document, video, link, image, file]   │
│   │ • url         │                                             │
│   │ • description │                                             │
│   │ • category ───┼──────▶ Category                            │
│   │ • uploadedBy ─┼──────▶ User                                │
│   │ • isPublic    │                                             │
│   └───────────────┘                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Relationship Summary

### Composition (Owns Lifecycle) `*--`
| Parent | Child | Description |
|--------|-------|-------------|
| User | PersonalInfo | User owns their profile |
| PersonalInfo | Address | Address embedded in PersonalInfo |
| PersonalInfo | SocialLinks | SocialLinks embedded |
| PersonalInfo | Preferences | Preferences embedded |
| Article | SEO | SEO metadata embedded |
| Response | Answer[] | Answers embedded in Response |

### Aggregation (Has Reference) `o--`
| Parent | Child | Description |
|--------|-------|-------------|
| Post | Article | Post references Article (if type='article') |
| Post | Event | Post references Event (if type='event') |
| Questionnaire | Question | Questionnaire has questions |
| Event | User[] | Event has registered users |

### Association (References) `-->`
| From | To | Cardinality | Description |
|------|-----|-------------|-------------|
| Post | User | *:1 | Posts have author |
| Post | Category | *:0..1 | Posts belong to category |
| Post | Level | *:0..1 | Posts have difficulty level |
| Comment | Post | *:1 | Comments belong to post |
| Comment | User | *:1 | Comments have author |
| Response | User | *:1 | Responses submitted by user |
| Response | Questionnaire | *:1 | Responses to questionnaire |
| Resource | User | *:0..1 | Resources uploaded by user |
| Resource | Category | *:0..1 | Resources in category |
| Category | Category | *:0..1 | Categories have parent |

### Dependency (Creates/Populates) `..>`
| From | To | Description |
|------|-----|-------------|
| Response | PersonalInfo | Registration response creates PersonalInfo |

---

## Registration & Access Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         ACCESS FLOW                              │
└─────────────────────────────────────────────────────────────────┘

    VISITOR (No Token) <<actor>>
    ════════════════════════════
    ✓ GET /api/posts (public posts)
    ✓ GET /api/articles (all published)
    ✓ GET /api/articles/:slug
    ✓ GET /api/events (all events)
    ✓ GET /api/events/:id
    ✓ GET /api/questionnaires (non-registration)
    ✗ Cannot create, comment, or register for events
                │
                │ Wants to interact? → Register
                ▼
    ┌───────────────────────────────────────┐
    │  POST /api/auth/register              │
    │  Body: { email, password, username }  │
    │                                       │
    │  Response:                            │
    │  • tempToken (1 hour)                 │
    │  • Registration questionnaire         │
    └───────────────────┬───────────────────┘
                        │
                        │ Fill questionnaire
                        ▼
    ┌───────────────────────────────────────┐
    │  POST /api/auth/complete-questionnaire│
    │  Header: Authorization: Bearer <temp> │
    │  Body: { answers: [...] }             │
    │                                       │
    │  Process:                             │
    │  1. Validate required questions       │
    │  2. Create Response                   │
    │  3. Extract PersonalInfo from answers │
    │  4. Link PersonalInfo to User         │
    │  5. Set questionnaireCompleted = true │
    │                                       │
    │  Response:                            │
    │  • Full access token (30 days)        │
    └───────────────────┬───────────────────┘
                        │
                        ▼
    AUTHENTICATED USER (Full Token)
    ════════════════════════════════
    ✓ All guest capabilities
    ✓ POST /api/articles (create)
    ✓ POST /api/events (create)
    ✓ POST /api/posts/:id/comments
    ✓ POST /api/events/:id/register
    ✓ PUT /api/users/profile/update
    ✓ All protected routes
```

---

## PersonalInfo Field Mapping

When completing the registration questionnaire, answers are mapped to PersonalInfo fields using `question.personalInfoField`:

| personalInfoField | PersonalInfo Field | Example Answer |
|-------------------|-------------------|----------------|
| `firstName` | firstName | "John" |
| `lastName` | lastName | "Doe" |
| `dateOfBirth` | dateOfBirth | "1990-05-15" |
| `gender` | gender | "male" |
| `phone` | phone | "+1234567890" |
| `bio` | bio | "Software developer..." |
| `address.street` | address.street | "123 Main St" |
| `address.city` | address.city | "New York" |
| `address.state` | address.state | "NY" |
| `address.country` | address.country | "USA" |
| `address.zipCode` | address.zipCode | "10001" |
| `socialLinks.website` | socialLinks.website | "https://..." |
| `socialLinks.twitter` | socialLinks.twitter | "@johndoe" |
| `socialLinks.linkedin` | socialLinks.linkedin | "linkedin.com/in/..." |
| `socialLinks.github` | socialLinks.github | "github.com/..." |
| `preferences.newsletter` | preferences.newsletter | true |
| `preferences.notifications` | preferences.notifications | true |
