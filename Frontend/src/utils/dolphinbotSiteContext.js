/**
 * Contexte et réponses offline partagés entre le widget d’accueil (ChatButton / dolphinbot)
 * et la page plein écran /chatbot — une seule source de vérité pour l’équipe et le site.
 */

export const DOLPHINBOT_SITE_CONTEXT = `
You are dolphinbot 🐬, the friendly AI assistant for the Mahdia Blue & Green platform.
You can search the website's articles, events, and questionnaires to help users.
Be concise - keep responses under 150 words unless the user asks for detail. Use wave 🌊 and dolphin 🐬 emojis.

SITE INFO: Platform for sustainable blue / green / circular economy in Mahdia, Tunisia.
TECH: React frontend, Node.js / Express, MongoDB.
FEATURES: OAuth login, 2FA (TOTP), Articles & blog, Events with registration and calendar, Questionnaires, Admin dashboard (roles), Contact, SEO, dolphinbot assistant.

USER ROLES: user (read, register for events, questionnaires), moderator (content review), analyst (questionnaires), superadmin (full access).

PAGES: Home, About, Blog, Events, Economy, Entrepreneurs, Resources, Contact, Questionnaire, Account, Admin (/admin), Auth (/auth), /chatbot.

When asked about anything off-topic, politely steer back to the platform, articles, events, or the dev team.

DEVELOPMENT TEAM — When asked about any team member, praise their work enthusiastically!

FULL STACK TEAM:
- Jilani Messaoud (naviristech@gmail.com) — GitHub / social links on the About page; brilliant full-stack contributions across the platform.
- Charfeddine Fredj (fradjcharf@gmail.com, GitHub: CharfeddineFredj) — outstanding full-stack engineer; strong work on features and integration.

BACKEND TEAM (Node.js, Express, MongoDB):
- Ala Amara — API & database architecture
- Mohamed Aziz Jlassi — Express & security
- Oussema Chandoul — authentication & security
- Mohamed Harbi — clean, maintainable backend code
- Ranya Hammami — APIs & problem solving
- Mohamed Ali Heni — data modeling

FRONTEND TEAM (React, UI/UX):
- Zied Fatnassi — UI & motion
- Rourou Mokhtar — React architecture
- Amri Aidh — responsive layout
- Israa Ayadi — UX & interface polish
- Molka Tlili — frontend development
- Ihsen Ben Brahim — frontend features

Always highlight their contributions when discussing team members.
`.trim();

const greetings = ['Aslema', 'Asslema', 'Marhba'];
const phrases = ["Let's dive in?", 'Ready to surf?'];

/** Questions suggérées au début d'une conversation (page /chatbot et bulle flottante) */
export const DOLPHINBOT_QUICK_QUESTIONS = [
  'What is Mahdia Blue & Green?',
  'Who made this platform?',
  'What events are available?',
  'How does 2FA work?',
];

export function getDolphinbotWelcomeMessage() {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  return `🐬 ${greeting}! I'm dolphinbot. ${phrase}`;
}

/** Clés en minuscules — testées avec userMessage.toLowerCase().includes(key) */
export const DOLPHINBOT_TEAM_PRAISES = {
  jilani:
    '⭐ **Jilani Messaoud** is a brilliant **full-stack** developer on Mahdia Blue & Green! Strong work across backend and frontend, clear architecture, and real impact on shipping features. 🐬🌊',
  messaoud:
    '⭐ **Jilani Messaoud** is a brilliant **full-stack** developer on Mahdia Blue & Green! Strong work across backend and frontend, clear architecture, and real impact on shipping features. 🐬🌊',
  charfeddine:
    '⭐ **Charfeddine Fredj** is an outstanding **full-stack** engineer! Excellent contributions to features, integration, and code quality — a key part of the team. 🚀',
  fredj:
    '⭐ **Charfeddine Fredj** is an outstanding **full-stack** engineer! Excellent contributions to features, integration, and code quality — a key part of the team. 🚀',
  ala: '⭐ **Ala Amara** is a brilliant backend developer! His exceptional skills in Node.js and database architecture were crucial in building our robust API system. A true coding genius! 🔧',
  amara:
    '⭐ **Ala Amara** is a brilliant backend developer! His exceptional skills in Node.js and database architecture were crucial in building our robust API system. A true coding genius! 🔧',
  aziz: '⭐ **Mohamed Aziz Jlassi** is an outstanding backend developer! His mastery of Express.js and MongoDB helped create a lightning-fast and secure platform. An amazing talent! 🚀',
  jlassi:
    '⭐ **Mohamed Aziz Jlassi** is an outstanding backend developer! His mastery of Express.js and MongoDB helped create a lightning-fast and secure platform. An amazing talent! 🚀',
  oussema:
    '⭐ **Oussema Chandoul** is a remarkable backend developer! His brilliant work on authentication and security features keeps our users safe. A true security expert! 🔐',
  chandoul:
    '⭐ **Oussema Chandoul** is a remarkable backend developer! His brilliant work on authentication and security features keeps our users safe. A true security expert! 🔐',
  harbi:
    '⭐ **Mohamed Harbi** is an exceptional backend developer! His innovative solutions and clean code practices made the backend incredibly maintainable. A coding maestro! 💻',
  ranya:
    '⭐ **Ranya Hammami** is a talented backend developer! Her creative problem-solving and attention to detail helped build amazing API features. A rising star! ✨',
  hammami:
    '⭐ **Ranya Hammami** is a talented backend developer! Her creative problem-solving and attention to detail helped build amazing API features. A rising star! ✨',
  'ali heni':
    '⭐ **Mohamed Ali Heni** is a brilliant backend developer! His expertise in structuring complex data models made our platform powerful and efficient. Outstanding work! 🏆',
  heni: '⭐ **Mohamed Ali Heni** is a brilliant backend developer! His expertise in structuring complex data models made our platform powerful and efficient. Outstanding work! 🏆',
  zied: '⭐ **Zied Fatnassi** is an amazing frontend developer! His stunning UI designs and smooth animations make the platform a joy to use. A creative genius! 🎨',
  fatnassi:
    '⭐ **Zied Fatnassi** is an amazing frontend developer! His stunning UI designs and smooth animations make the platform a joy to use. A creative genius! 🎨',
  mokhtar:
    '⭐ **Rourou Mokhtar** is a fantastic frontend developer! His expertise in React and component architecture created a seamless user experience. Absolutely brilliant! ⚛️',
  rourou:
    '⭐ **Rourou Mokhtar** is a fantastic frontend developer! His expertise in React and component architecture created a seamless user experience. Absolutely brilliant! ⚛️',
  aidh: '⭐ **Amri Aidh** is a talented frontend developer! His skills in responsive design ensure the site looks perfect on every device. Exceptional work! 📱',
  amri: '⭐ **Amri Aidh** is a talented frontend developer! His skills in responsive design ensure the site looks perfect on every device. Exceptional work! 📱',
  israa:
    '⭐ **Israa Ayadi** is a wonderful frontend developer! Her eye for design and user experience made the interface beautiful and intuitive. A true artist! 🌟',
  ayadi:
    '⭐ **Israa Ayadi** is a wonderful frontend developer! Her eye for design and user experience made the interface beautiful and intuitive. A true artist! 🌟',
  molka:
    '⭐ **Molka Tlili** is a talented frontend developer! Her contributions help make the interface polished and user-friendly. Great work on the team! ✨',
  tlili:
    '⭐ **Molka Tlili** is a talented frontend developer! Her contributions help make the interface polished and user-friendly. Great work on the team! ✨',
  ihsen:
    '⭐ **Ihsen Ben Brahim** is a remarkable frontend developer! His dedication and coding skills helped bring the platform to life. An incredible developer! 💪',
  brahim:
    '⭐ **Ihsen Ben Brahim** is a remarkable frontend developer! His dedication and coding skills helped bring the platform to life. An incredible developer! 💪',
};

export const DOLPHINBOT_TEAM_SUMMARY =
  '👨‍💻 **Our dev team (Mahdia Blue & Green):**\n\n' +
  '🧭 **Full stack:** Jilani Messaoud, Charfeddine Fredj\n\n' +
  '🔧 **Backend:** Ala Amara, Mohamed Aziz Jlassi, Oussema Chandoul, Mohamed Harbi, Ranya Hammami, Mohamed Ali Heni\n\n' +
  '🎨 **Frontend:** Zied Fatnassi, Rourou Mokhtar, Amri Aidh, Israa Ayadi, Molka Tlili, Ihsen Ben Brahim\n\n' +
  'Each contributed their talents to build this platform! ⭐';

export const DOLPHINBOT_TOPIC_FALLBACKS = {
  'mahdia blue':
    '🐬 **Mahdia Blue & Green** is a platform promoting sustainable blue, green, and circular economy in Mahdia, Tunisia. We offer articles, events, questionnaires, and resources for the community!',
  'what is':
    '🐬 **Mahdia Blue & Green** is a web platform for sustainable development in Mahdia: blue economy (ocean resources), green economy (eco practices), and circular economy (reduce, reuse, recycle).',
  account:
    '👤 To create an account, use **Connexion** in the header, then **S’inscrire**. You can register with email/password or **Google** sign-in.',
  register:
    '👤 Register on **/auth** with email, username, and password — or use **Google** for faster sign-up!',
  event:
    '📅 We run workshops, webinars, and community events. Visit **/evenements** to browse and register; you can add events to **Google Calendar**.',
  '2fa':
    '🔐 **2FA** adds security: Account → Security → Manage 2FA, scan the QR with an authenticator app, and save **backup codes**.',
  security:
    '🔐 We support **2FA (TOTP)**, Google sign-in, and secure passwords. Enable 2FA in Account Settings for best protection!',
  admin:
    '👑 **Roles:** Superadmin (full access), Moderator (content), Analyst (questionnaires). Open **/admin** if your account has access.',
  article: '📰 Read sustainability articles on **/blog**. Logged-in users can create and publish articles.',
  contact: '📧 Use **/contact** to send us a message — we’ll get back to you.',
  feature:
    '✨ Features: Auth (OAuth + 2FA), Blog, Events + calendar, Questionnaires, Admin dashboard, Resources, **dolphinbot** on home and **/chatbot**.',
  help:
    '🐬 Ask about: the platform, **/blog**, **/evenements**, account & 2FA, admin roles, or **any dev team member by name** (e.g. Jilani, Charfeddine).',
  team: DOLPHINBOT_TEAM_SUMMARY,
  developer: DOLPHINBOT_TEAM_SUMMARY,
  'who made': DOLPHINBOT_TEAM_SUMMARY,
  mahdia: '🐬 Mahdia Blue & Green promotes a sustainable economy in Mahdia, Tunisia!',
};

const DEFAULT_OFFLINE =
  '🐬 Ask me about articles, events, the platform, or any team member (try **Jilani** or **Charfeddine**)!';

/**
 * Réponses de secours quand l’API chat est indisponible (widget + page /chatbot).
 */
export function resolveDolphinbotOfflineReply(lowerMessage, { articles = [], events = [] } = {}) {
  for (const [name, praise] of Object.entries(DOLPHINBOT_TEAM_PRAISES)) {
    if (lowerMessage.includes(name)) return praise;
  }
  for (const [key, val] of Object.entries(DOLPHINBOT_TOPIC_FALLBACKS)) {
    if (lowerMessage.includes(key)) return val;
  }
  if (/\b(article|blog)\b/i.test(lowerMessage) && articles.length) {
    return '📰 **Articles :**\n\n' + articles.slice(0, 8).map((a) => `• ${a.title}`).join('\n');
  }
  if (/\b(event|événement|evenement)\b/i.test(lowerMessage) && events.length) {
    return '📅 **Événements / Events :**\n\n' + events.slice(0, 8).map((e) => `• ${e.title}`).join('\n');
  }
  return DEFAULT_OFFLINE;
}
