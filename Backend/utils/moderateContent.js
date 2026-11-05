// Normalize Franco-Arabic: replace number-letter substitutions
// 9=q/ق  7=h/ح  3=a/ع  5=kh/خ  6=t/ط  8=gh/غ  2=a(hamza)
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[_\-.*!@#$%^&()=+~`]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'a')
    .replace(/5/g, 'kh')
    .replace(/6/g, 't')
    .replace(/7/g, 'h')
    .replace(/8/g, 'gh')
    .replace(/9/g, 'q')
    .replace(/(.)\1{2,}/g, '$1$1');
}

const TUNISIAN_ROOTS = [
  'qahba', 'kahba', 'qa7ba', 'qhba', 'kahb', 'qahb',
  'zebi', 'zeb', 'zebbi', 'zbi', 'zabbi', 'ki zebi',
  'nik', 'nikomok', 'nikommok', 'nikoumouk', 'nikom', 'nayek', 'naik', 'tnayak',
  'koss', 'kos', 'kosomok', 'kosommok', 'kosom',
  'taboun', 'tabboun', 'tboun', 'tabboune', 'tabouna',
  'manyouk', 'manyouka', 'mnyouk', 'manyou','mnayka','nayek','tnayek','mnayek',
  'metnak', 'metnaka', 'mitnak',
  'charmouta', 'charmout', 'sharmouta', 'sharmout', 'charmota', 'sharmota',
  'hmar', 'hmara', 'bhim', 'bhima',
  'kalb', 'kalba', 'kelb', 'kelba',
  'zamel', 'zmell', 'zaml',
  'khra', 'khara',
  'yelaan', 'yalaan', 'naal', 'nael', 'nelaan', 'ylaen',
  'yelaan dinak', 'yelaan bouk', 'naal bouk', 'naal dinak',
  'maars', 'maaras', 'aars',
  'wahdi', 'watiya', 'haqir', 'haqira',
  'bouzbal', 'bouzabal',
  'louti','miboun'
];

const FRENCH_WORDS = [
  'merde', 'putain', 'connard', 'connasse', 'encule', 'enculer', 'enculé',
  'salaud', 'salope', 'pute', 'fils de pute', 'fdp',
  'batard', 'bâtard', 'nique', 'ntm', 'ta gueule', 'ferme ta gueule',
  'pd', 'pedale', 'pédale', 'gouine',
  'bordel', 'ta mere', 'ta mère', 'tg',
];

const ENGLISH_WORDS = [
  'fuck', 'fucking', 'fucker', 'fck', 'shit', 'bitch',
  'asshole', 'dick', 'pussy', 'bastard', 'motherfucker', 'stfu', 'wtf',
  'nigga', 'nigger', 'faggot', 'retard',
];

const ARABIC_WORDS = [
  'زب', 'زبي', 'نيك', 'ينيك', 'نايك', 'كس', 'كسك', 'كس أمك', 'كس امك',
  'قحبة', 'قحب', 'يا قحبة', 'ولد القحبة', 'بنت القحبة', 'مقحوب',
  'عاهر', 'عاهرة', 'زانية', 'زاني', 'شرموطة', 'شرموط',
  'طبون', 'طبونك', 'طبون امك', 'طبون أمك',
  'يلعن', 'يلعن دينك', 'يلعن بوك', 'يلعن أمك', 'نعل', 'نعل بوك', 'نعل دينك',
  'حمار', 'بهيم', 'بهيمة', 'حيوان', 'كلب', 'كلبة', 'يا كلب',
  'منيوك', 'منيوكة', 'متناك', 'متناكة',
  'عرص', 'معرص', 'يا معرص',
  'خرا', 'خرة', 'يا خرا',
  'واطي', 'واطية', 'حقير', 'حقيرة',
  'لوطي', 'زمال',
];

function buildWordSet() {
  const set = new Set();

  for (const w of ARABIC_WORDS) set.add(w);
  for (const w of FRENCH_WORDS) set.add(w.toLowerCase());
  for (const w of ENGLISH_WORDS) set.add(w.toLowerCase());

  for (const w of TUNISIAN_ROOTS) {
    set.add(w.toLowerCase());
    set.add(normalize(w));
  }

  return set;
}

const WORD_SET = buildWordSet();

function buildRegexList() {
  const allWords = [...TUNISIAN_ROOTS, ...FRENCH_WORDS, ...ENGLISH_WORDS];
  allWords.sort((a, b) => b.length - a.length);

  return allWords.map(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[\\s.,!?;:'"\`])${escaped}(?:[\\s.,!?;:'"\`]|$)`, 'i');
  });
}

const REGEX_LIST = buildRegexList();

function localFilter(text) {
  if (!text || !text.trim()) return { blocked: false };

  const raw = text.trim();

  // Check Arabic script words directly
  for (const w of ARABIC_WORDS) {
    if (raw.includes(w)) {
      return { blocked: true, reason: 'Votre commentaire contient un langage inapproprié.' };
    }
  }

  const lower = raw.toLowerCase();
  const normalized = normalize(raw);

  // Direct match (whole text or word in set)
  if (WORD_SET.has(lower) || WORD_SET.has(normalized)) {
    return { blocked: true, reason: 'Votre commentaire contient un langage inapproprié.' };
  }

  // Check each word individually
  const words = lower.split(/[\s.,!?;:'"]+/).filter(Boolean);
  const normWords = normalized.split(/[\s.,!?;:'"]+/).filter(Boolean);

  for (const w of words) {
    if (WORD_SET.has(w)) {
      return { blocked: true, reason: 'Votre commentaire contient un langage inapproprié.' };
    }
  }
  for (const w of normWords) {
    if (WORD_SET.has(w)) {
      return { blocked: true, reason: 'Votre commentaire contient un langage inapproprié.' };
    }
  }

  // Multi-word phrase regex check
  for (const rx of REGEX_LIST) {
    if (rx.test(lower) || rx.test(normalized)) {
      return { blocked: true, reason: 'Votre commentaire contient un langage inapproprié.' };
    }
  }

  return { blocked: false };
}

async function aiModerate(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';

  if (!apiKey) return { blocked: false };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      },
      body: JSON.stringify({
        model,
        max_tokens: 60,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are a strict content moderation assistant for a Tunisian community platform. Analyze the user comment and determine if it contains ANY inappropriate content: insults, profanity, hate speech, threats, harassment, discrimination, or sexual content.

IMPORTANT: The text may use Franco-Arabic transliteration where numbers replace Arabic letters:
- 9 = ق (q)  7 = ح (h)  3 = ع (a)  5 = خ (kh)  6 = ط (t)  8 = غ (gh)
Examples: "9a7ba"=قحبة(insult), "ni9"=نيك(profanity), "ze3ma"=زعما(ok), "7amdoullah"=حمد لله(ok)

The text may be in Tunisian Arabic, French, English, or a mix. Be strict: if in doubt, BLOCK.

Reply ONLY "BLOCK" or "PASS". Nothing else.`
          },
          { role: 'user', content: text }
        ]
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.error('AI moderation API error:', res.status);
      return { blocked: false };
    }

    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();

    if (answer.includes('BLOCK')) {
      return { blocked: true, reason: 'Votre commentaire a été détecté comme inapproprié par notre système de modération.' };
    }

    return { blocked: false };
  } catch (err) {
    console.error('AI moderation error:', err.message);
    return { blocked: false };
  }
}

async function moderateContent(text) {
  if (!text || !text.trim()) return { blocked: false };

  const local = localFilter(text);
  if (local.blocked) return local;

  const ai = await aiModerate(text);
  return ai;
}

async function moderateImage(imageUrl) {
  if (!imageUrl) return { blocked: false };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { blocked: false };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout:free',
        max_tokens: 60,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an EXTREMELY strict image content moderation system for a family-friendly community platform. Analyze this image and BLOCK it if it contains ANY of the following:

- Full or partial nudity
- Swimwear, bikini, lingerie, or revealing clothing
- Sexually suggestive poses, gestures, or expressions
- Cleavage, exposed skin in a suggestive context
- Provocative or seductive imagery of any kind
- Sexual content or innuendo
- Extreme violence, gore, blood
- Hate symbols, racist imagery
- Drugs, drug paraphernalia
- Weapons pointed at people
- Offensive gestures

This is a FAMILY-FRIENDLY platform. If in doubt, BLOCK. Be very strict.
Reply ONLY "BLOCK" or "PASS". Nothing else.`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      console.error('AI image moderation API error:', res.status);
      return { blocked: false };
    }

    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();

    if (answer.includes('BLOCK')) {
      return { blocked: true, reason: 'L\'image contient du contenu inapproprié et a été rejetée par notre système de modération.' };
    }

    return { blocked: false };
  } catch (err) {
    console.error('AI image moderation error:', err.message);
    return { blocked: false };
  }
}

async function moderateArticle({ title, summary, content, tags, imageUrl } = {}) {
  const fields = [
    { name: 'titre', value: title },
    { name: 'résumé', value: summary },
    { name: 'contenu', value: content },
  ];

  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (tag) fields.push({ name: 'tag', value: tag });
    }
  }

  for (const field of fields) {
    if (!field.value) continue;
    const result = localFilter(field.value);
    if (result.blocked) {
      return { blocked: true, reason: `Le ${field.name} de votre article contient un langage inapproprié.` };
    }
  }

  const fullText = fields.map(f => f.value).filter(Boolean).join(' ');
  if (fullText) {
    const aiResult = await aiModerate(fullText);
    if (aiResult.blocked) {
      return { blocked: true, reason: 'Votre article contient du contenu inapproprié détecté par notre système de modération.' };
    }
  }

  if (imageUrl) {
    const imageResult = await moderateImage(imageUrl);
    if (imageResult.blocked) return imageResult;
  }

  return { blocked: false };
}

async function moderateEvent({ title, body, location, venue, eventImage } = {}) {
  const fields = [
    { name: 'titre', value: title },
    { name: 'description', value: body },
    { name: 'lieu', value: location },
    { name: 'lieu (venue)', value: venue },
  ];

  for (const field of fields) {
    if (!field.value) continue;
    const result = localFilter(field.value);
    if (result.blocked) {
      return { blocked: true, reason: `Votre événement contient un langage inapproprié dans le  ${field.name} .` };
    }
  }

  const fullText = fields.map(f => f.value).filter(Boolean).join(' ');
  if (fullText) {
    const aiResult = await aiModerate(fullText);
    if (aiResult.blocked) {
      return { blocked: true, reason: 'Votre événement contient du contenu inapproprié détecté par notre système de modération.' };
    }
  }

  if (eventImage) {
    const imageResult = await moderateImage(eventImage);
    if (imageResult.blocked) {
      return { blocked: true, reason: "L'image de votre événement contient du contenu inapproprié et a été rejetée." };
    }
  }

  return { blocked: false };
}

module.exports = { moderateContent, moderateArticle, moderateEvent, moderateImage, localFilter };
