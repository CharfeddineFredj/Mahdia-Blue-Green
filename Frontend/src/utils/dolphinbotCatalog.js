export function extractSearchQuery(raw) {
  return raw
    .replace(/^\s*(find|search|look for|show me|liste|montre|affiche|cherche|recherche)\s+/i, '')
    .trim();
}

export function classifyLocalSearch(raw) {
  const t = raw.trim();
  const lower = t.toLowerCase();

  const browseAll =
    /articles?\s+and\s+events?/i.test(lower) ||
    /événements?\s+et\s+articles?/i.test(lower) ||
    /\b(show|liste)\s+(all|everything|tout)\b/i.test(lower);

  const browseArticles =
    browseAll
      ? false
      : /^(search\s+|show\s+)?articles?\s*$/i.test(t) ||
        /^liste\s+d'?articles?\s*$/i.test(t) ||
        /^articles?\s*$/i.test(t) ||
        /what articles/i.test(t) ||
        /liste\s+(des\s+)?articles?/i.test(lower);

  const browseEvents =
    browseAll
      ? false
      : /^(show\s+)?events?\s*$/i.test(t) ||
        /^liste\s+d'?(événements?|evenements?)\s*$/i.test(t) ||
        /^events?\s*$/i.test(t) ||
        /^quels?\s+(sont\s+)?(les\s+)?(événements?|evenements?)\s*\??$/i.test(t) ||
        /what events are available/i.test(t) ||
        /quels?\s+événements?/i.test(t) ||
        /événements?\s+disponibles?/i.test(lower);

  const topicTerms = ['blue economy', 'green economy', 'circular economy', 'circular', 'sustainability', 'ocean'];
  const matchedTerm = topicTerms.find((term) => lower.includes(term));

  const explicitSearch =
    /\b(find|search|look for)\b/i.test(lower) ||
    /^show me\s+/i.test(lower) ||
    /^(cherche|recherche|liste|montre|affiche)\s+/i.test(lower);

  const useLocal =
    browseAll || browseArticles || browseEvents || Boolean(matchedTerm) || explicitSearch;

  let mode = 'filter';
  let query = '';

  if (browseAll) {
    mode = 'all';
  } else if (browseArticles && browseEvents) {
    mode = 'all';
  } else if (browseArticles) {
    mode = 'articles_only';
  } else if (browseEvents) {
    mode = 'events_only';
  } else {
    mode = 'filter';
    query = matchedTerm || extractSearchQuery(t);
    if (/^articles?$/i.test(query)) {
      mode = 'articles_only';
      query = '';
    } else if (/^events?$/i.test(query)) {
      mode = 'events_only';
      query = '';
    }
  }

  return { useLocal, mode, query };
}

export function filterPublishedCatalog({ articles, events }, query, mode) {
  const q = (query || '').trim().toLowerCase();
  let arts = [...(articles || [])];
  let evs = [...(events || [])];

  if (mode === 'articles_only') evs = [];
  if (mode === 'events_only') arts = [];

  if (q) {
    const hayArticle = (a) =>
      [a.title, a.body, a.articleData?.summary, a.articleData?.content, a.slug, ...(a.articleData?.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    const hayEvent = (e) =>
      [e.title, e.body, e.eventData?.location, e.eventData?.venue, e.slug].filter(Boolean).join(' ').toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const matchHay = (hay) => hay.includes(q) || (words.length > 0 && words.every((w) => hay.includes(w)));
    arts = arts.filter((a) => matchHay(hayArticle(a)));
    evs = evs.filter((e) => matchHay(hayEvent(e)));
  }

  return {
    articles: arts.slice(0, 10),
    events: evs.slice(0, 10),
    found: arts.length > 0 || evs.length > 0,
  };
}

export function formatCatalogResults(results, query, mode) {
  if (!results.found) {
    return query
      ? `🔍 Aucun résultat pour « ${query} ». Essayez d’autres mots ou ouvrez /blog et /evenements.\n\n(No results for "${query}". Try /blog or /events.)`
      : `🐬 Aucun article ou événement publié n’a été chargé. Vérifiez l’API ou ouvrez **Blog** / **Événements** sur le site.\n\n(No published posts loaded — check API connection.)`;
  }

  let header = '';
  if (!query) {
    if (mode === 'articles_only') header = '📰 **Articles récents / Recent articles:**\n\n';
    else if (mode === 'events_only') header = '📅 **Événements / Events:**\n\n';
    else header = '🐬 **Contenu du site / Site content:**\n\n';
  } else {
    header = `🐬 **Résultats pour « ${query} » / Results:**\n\n`;
  }

  let response = header;
  if (results.articles.length > 0) {
    response += '📰 **Articles:**\n';
    results.articles.forEach((a) => {
      response += `• "${a.title}"\n`;
    });
  }
  if (results.events.length > 0) {
    if (results.articles.length > 0) response += '\n';
    response += '📅 **Events:**\n';
    results.events.forEach((e) => {
      response += `• "${e.title}"\n`;
    });
  }
  return response;
}

/** Nombre total de messages dans la discussion (ex. « 1 message », « 3 messages ») */
export function formatConversationStats(msgs) {
  const total = msgs.length;
  return total === 1 ? ' 1 message' : ` ${total} messages`;
}

const GREETING_REPLIES = [
  '🐬 **Aslema!** 🌊 N7ebb n3awnek 3la **Mahdia Blue & Green** : articles, événements, l’équipe, ou kifech t7ell compte. Chnowa t7ebb t3ref?\n\nHi! Ask me about articles, events, the dev team, or how the site works.',
  '🐬 **Marhba!** Ready to surf? 🌊 Dis-moi : blog, événements, questionnaire, ou une question sur la plateforme.\n\n(Hello! I’m here for anything about the site.)',
  '🐬 **Salam!** Yalla 🐬 — je peux chercher des **articles** / **événements** ou parler de l’**équipe**. Tu veux quoi en premier?',
  '🐬 **Hello!** 🌊 Nice to meet you. Try: *Show events*, *Search articles*, or ask about **2FA** / **OAuth** / the team.',
  '🐬 **Hi there!** I’m dolphinbot for Mahdia Blue & Green 🐬🌊 — blue / green / circular economy in Mahdia. What should we dive into?',
];

const GREETING_WORDS = new Set([
  'hi',
  'hello',
  'hey',
  'yo',
  'slm',
  'salam',
  'salaam',
  'salut',
  'slt',
  'sslm',
  'ssalam',
  'aslema',
  'asslema',
  'aslemaa',
  'ahla',
  'ahlan',
  'marhba',
  'mar7ba',
  'merhba',
  'bonjour',
  'coucou',
  'cc',
  'hola',
  'hallo',
  'ciao',
]);

/**
 * Réponse locale pour salutations courtes (slm, hi, hello, aslema…) — évite d’appeler l’IA pour un simple bonjour.
 */
export function getGreetingReply(raw) {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[!?.…،؛:]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized.length > 56) return null;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > 6) return null;

  if (words.length === 1 && GREETING_WORDS.has(normalized)) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }

  if (
    words.length >= 2 &&
    GREETING_WORDS.has(words[0]) &&
    words.length <= 4 &&
    !/\b(search|find|article|event|événement|show|liste)\b/i.test(normalized)
  ) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }

  const phraseOk =
    /^salam(\s+3likoum|\s+alaykoum|\s+alaikum|\s+alikoum)?$/i.test(normalized) ||
    /^assalam\s*u?\s*alaykum/i.test(raw.trim()) ||
    /^good\s+(morning|afternoon|evening|day)\b/i.test(normalized) ||
    /^hi\s+there$/i.test(normalized) ||
    /^hello\s+there$/i.test(normalized);

  if (phraseOk) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }

  if (words.length <= 3 && /^(slm|salam|hello|hi|hey|aslema|ahla)\b/.test(normalized)) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }

  if (/^salam\b/.test(normalized) && normalized.length < 32) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }

  return null;
}
