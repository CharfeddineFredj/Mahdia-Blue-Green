/**
 * Règles des questionnaires d'événements côté client (miroir de Backend/utils/eventQuestionnaireRules.js).
 * Le backend reste l'autorité : ces fonctions servent à l'affichage et à éviter des envois voués à l'échec.
 */

export const QUESTIONNAIRE_GRACE_HOURS = 72;
const GRACE_MS = QUESTIONNAIRE_GRACE_HOURS * 60 * 60 * 1000;

/** Types proposés à la création (« date » reste lisible pour les anciens questionnaires) */
export const EVENT_QUESTION_TYPES = [
    { value: 'text', label: 'Texte' },
    { value: 'single_choice', label: 'Choix unique' },
    { value: 'multiple_choice', label: 'Choix multiple' },
    { value: 'rating', label: 'Note de satisfaction (1 à 5)' },
    { value: 'boolean', label: 'Oui / Non' },
];
/** Anciens types : affichés uniquement pour les questions existantes (plus proposés à la création) */
export const LEGACY_QUESTION_TYPES = [{ value: 'date', label: 'Date' }, { value: 'long_text', label: 'Réponse longue (non acceptée)' }];

/** Calendrier de réponse : publication avant (dès la validation) ou après la fin de l'événement */
export const RESPONSE_WINDOW_MAX_HOURS = 72;
export const PUBLISH_MODES = [
    { value: 'after_end', label: 'Après la fin de l’événement', hint: 'Invisible pour les inscrits jusqu’à l’ouverture (au plus tard 72 h après la fin), puis notification pour répondre.' },
    { value: 'before', label: 'Avant l’événement', hint: 'Accessible aux inscrits dès la validation par un administrateur.' },
];
export const RESPONSE_WINDOW_PRESETS = [12, 24, 48, 72];

export function getEventEnd(eventData) {
    const ref = eventData?.endDate || eventData?.startDate;
    if (!ref) return null;
    const d = new Date(ref);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function clampWindowHours(h) {
    const n = Math.round(Number(h));
    if (!Number.isFinite(n)) return RESPONSE_WINDOW_MAX_HOURS;
    return Math.min(RESPONSE_WINDOW_MAX_HOURS, Math.max(1, n));
}

/** Date limite de réponse = fin de l'événement + durée choisie (72 h max) */
export function getResponseDeadline(eventEnd, hours) {
    if (!eventEnd) return null;
    const t = new Date(eventEnd).getTime();
    if (Number.isNaN(t)) return null;
    return new Date(t + clampWindowHours(hours) * 60 * 60 * 1000);
}

const HOUR_MS = 60 * 60 * 1000;

/** Date → valeur d'un champ <input type="datetime-local"> (heure locale) */
export function toDateTimeLocal(d) {
    if (!d) return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Date d'affichage du questionnaire aux inscrits (« après la fin » : date choisie, sinon fin de l'événement).
 * null pour « avant l'événement » (affiché dès la validation, pas de date à montrer).
 */
export function getDisplayOpening(eventData, version) {
    if (!version || version.publishMode === 'before') return null;
    return getEffectiveOpening(getEventEnd(eventData), version.opensAt);
}

/** Bornes de l'ouverture « après la fin » : [fin de l'événement, fin + 72 h] */
export function getOpeningBounds(eventEnd) {
    if (!eventEnd) return null;
    const t = new Date(eventEnd).getTime();
    if (Number.isNaN(t)) return null;
    return { min: new Date(t), max: new Date(t + RESPONSE_WINDOW_MAX_HOURS * HOUR_MS) };
}

/** Ouverture effective : date choisie, sinon la fin de l'événement */
export function getEffectiveOpening(eventEnd, opensAt) {
    const b = getOpeningBounds(eventEnd);
    if (!b) return null;
    const o = opensAt ? new Date(opensAt) : null;
    return o && !Number.isNaN(o.getTime()) ? o : b.min;
}

/** Vérifie le calendrier choisi (miroir du backend) — renvoie un message d'erreur ou '' */
export function validateSchedule(q, eventEnd) {
    if (q?.publishMode !== 'after_end' || !q.opensAt) return '';
    const b = getOpeningBounds(eventEnd);
    if (!b) return '';
    const o = new Date(q.opensAt).getTime();
    if (Number.isNaN(o)) return 'Date d’ouverture du questionnaire invalide.';
    if (o < b.min.getTime()) return 'L’ouverture du questionnaire doit être postérieure à la fin de l’événement.';
    if (o > b.max.getTime()) return `L’ouverture du questionnaire ne peut pas dépasser ${RESPONSE_WINDOW_MAX_HOURS} h après la fin de l’événement.`;
    const deadline = getResponseDeadline(eventEnd, q.responseWindowHours);
    if (deadline && o >= deadline.getTime()) return 'La date limite doit être postérieure à l’ouverture : allongez la durée de réponse.';
    return '';
}

/**
 * Questionnaire d'événement ouvert maintenant et sans réponse de l'utilisateur.
 * Recalculé côté client avec opensAt / closesAt pour « s'allumer » dès l'ouverture, sans rechargement.
 */
export function isAwaitingAnswer(q, now = Date.now()) {
    if (!q || q.hasResponded) return false;
    const opens = q.opensAt ? new Date(q.opensAt).getTime() : null;
    const closes = q.closesAt ? new Date(q.closesAt).getTime() : null;
    if (opens == null && closes == null) return q.availability === 'open';
    return (opens == null || now >= opens) && (closes == null || now <= closes);
}

/**
 * Questionnaire pas encore ouvert (option « Après la fin de l'événement ») :
 * il ne doit pas être montré aux inscrits avant son heure d'ouverture.
 */
export function isNotYetOpen(q, now = Date.now()) {
    if (!q) return true;
    if (q.availability === 'upcoming') return true;
    const opens = q.opensAt ? new Date(q.opensAt).getTime() : null;
    return opens != null && now < opens;
}

/**
 * Notification « vue » : une fois l'utilisateur passé sur « Questionnaires de mes événements »,
 * la pastille rouge disparaît pour ces questionnaires (préférence locale au navigateur).
 * Un nouveau questionnaire qui s'ouvre plus tard rallume la notification.
 */
export const EVENT_QUESTIONNAIRES_SEEN = 'mbg:event-questionnaires-seen';
const seenKey = (userId) => `mbg_eq_seen_${userId}`;

export function getSeenQuestionnaireIds(userId) {
    if (!userId) return new Set();
    try {
        const raw = JSON.parse(localStorage.getItem(seenKey(userId)) || '[]');
        return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch {
        return new Set();
    }
}

export function markQuestionnairesSeen(userId, ids) {
    if (!userId || !ids?.length) return;
    const seen = getSeenQuestionnaireIds(userId);
    const before = seen.size;
    ids.forEach((id) => seen.add(String(id)));
    if (seen.size === before) return;
    try {
        localStorage.setItem(seenKey(userId), JSON.stringify([...seen].slice(-300)));
    } catch { /* stockage indisponible : la pastille reviendra au prochain chargement */ }
    window.dispatchEvent(new Event(EVENT_QUESTIONNAIRES_SEEN));
}

/** Événement diffusé après l'envoi / la modification d'une réponse (rafraîchit les indicateurs) */
export const EVENT_QUESTIONNAIRES_CHANGED = 'mbg:event-questionnaires-changed';

/** Libellé de disponibilité côté participant (données renvoyées par l'API) */
export function availabilityLabel(q) {
    if (!q?.availability) return null;
    if (q.availability === 'upcoming') return { tone: 'blue', text: `Ouvre le ${formatDateTime(q.opensAt)}` };
    if (q.availability === 'closed') return { tone: 'gray', text: `Clos depuis le ${formatDateTime(q.closesAt)}` };
    return { tone: 'green', text: `Répondre avant le ${formatDateTime(q.closesAt)}` };
}

export const CHOICE_TYPES = ['single_choice', 'multiple_choice'];

/** Fin de l'événement (ou début si fin absente) + 72 h */
export function getQuestionnaireDeadline(eventData) {
    const ref = eventData?.endDate || eventData?.startDate;
    if (!ref) return null;
    const t = new Date(ref).getTime();
    if (Number.isNaN(t)) return null;
    return new Date(t + GRACE_MS);
}

/** Événement terminé (fin, ou début si la fin manque, dépassée) : plus aucune modification par le créateur */
export function isEventEnded(eventData, now = new Date()) {
    const ref = eventData?.endDate || eventData?.startDate;
    if (!ref) return false;
    const t = new Date(ref).getTime();
    return !Number.isNaN(t) && now.getTime() > t;
}

/** Contenu validé et publié par un administrateur : figé pour son auteur */
export const PUBLISHED_LOCK_MESSAGES = {
    article: 'Cet article a été validé et publié par un administrateur : il ne peut plus être modifié.',
    event: 'Cet événement a été validé et publié par un administrateur : il ne peut plus être modifié.',
    questionnaire: 'Ce questionnaire a été validé par un administrateur : il ne peut plus être modifié.',
};

export const EVENT_ENDED_MESSAGE = 'Cet événement est terminé : l’événement et son questionnaire ne peuvent plus être modifiés.';

export function isQuestionnaireWindowOpen(eventData, now = new Date()) {
    const deadline = getQuestionnaireDeadline(eventData);
    return !!deadline && now.getTime() <= deadline.getTime();
}

export function formatDateTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

/** Statut de validation effectif d'un événement (rétrocompatible avec les anciens événements). */
export function getEventReviewStatus(evt) {
    const s = evt?.moderation?.status;
    if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
    return evt?.status === 'published' ? 'approved' : 'pending';
}

export const REVIEW_STATUS_META = {
    pending: { label: 'En attente de validation', badge: 'yellow' },
    approved: { label: 'Approuvé', badge: 'green' },
    rejected: { label: 'Refusé', badge: 'red' },
};

export function emptyQuestion() {
    return { text: '', type: 'text', options: [], isRequired: false };
}

export function emptyQuestionnaire() {
    return { title: '', description: '', questions: [emptyQuestion()], publishMode: 'after_end', responseWindowHours: RESPONSE_WINDOW_MAX_HOURS, opensAt: '' };
}

/** Validation minimale côté client — renvoie un message d'erreur ou '' */
export function validateQuestionnaireDraft(q) {
    if (!q?.title?.trim()) return 'Le titre du questionnaire est obligatoire.';
    const questions = q.questions || [];
    if (questions.length === 0) return 'Ajoutez au moins une question.';
    const h = Number(q.responseWindowHours ?? RESPONSE_WINDOW_MAX_HOURS);
    if (!Number.isInteger(h) || h < 1 || h > RESPONSE_WINDOW_MAX_HOURS) {
        return `La durée de réponse doit être comprise entre 1 et ${RESPONSE_WINDOW_MAX_HOURS} heures.`;
    }
    for (let i = 0; i < questions.length; i += 1) {
        const item = questions[i];
        if (!item.text?.trim()) return `Question ${i + 1} : le libellé est obligatoire.`;
        if (item.type === 'long_text') return `Question ${i + 1} : le type « Réponse longue » n’est pas accepté. Choisissez « Texte ».`;
        if (CHOICE_TYPES.includes(item.type)) {
            const opts = (item.options || []).map((o) => o.trim()).filter(Boolean);
            if (opts.length < 2) return `Question ${i + 1} : au moins 2 options sont requises.`;
            if (new Set(opts).size !== opts.length) return `Question ${i + 1} : les options doivent être distinctes.`;
        }
    }
    return '';
}

/** Prépare l'envoi : nettoie les options et conserve les _id existants */
export function toQuestionnairePayload(q) {
    return {
        title: q.title.trim(),
        description: (q.description || '').trim(),
        publishMode: q.publishMode === 'before' ? 'before' : 'after_end',
        responseWindowHours: clampWindowHours(q.responseWindowHours ?? RESPONSE_WINDOW_MAX_HOURS),
        // Heure locale saisie → ISO (null = ouverture à la fin de l'événement)
        opensAt: q.publishMode !== 'before' && q.opensAt ? new Date(q.opensAt).toISOString() : null,
        questions: (q.questions || []).map((item) => ({
            ...(item._id ? { _id: item._id } : {}),
            text: item.text.trim(),
            type: item.type,
            isRequired: !!item.isRequired,
            options: CHOICE_TYPES.includes(item.type)
                ? (item.options || []).map((o) => o.trim()).filter(Boolean)
                : [],
        })),
    };
}

/** Version éditable à partir d'une version renvoyée par l'API */
export function fromVersion(version) {
    if (!version) return emptyQuestionnaire();
    return {
        title: version.title || '',
        description: version.description || '',
        publishMode: version.publishMode === 'before' ? 'before' : 'after_end',
        responseWindowHours: clampWindowHours(version.responseWindowHours ?? RESPONSE_WINDOW_MAX_HOURS),
        opensAt: toDateTimeLocal(version.opensAt),
        questions: (version.questions || []).map((item) => ({
            _id: item._id,
            text: item.text || '',
            type: item.type || 'text',
            options: item.options || [],
            isRequired: !!item.isRequired,
        })),
    };
}

/** Affichage lisible d'une valeur de réponse */
export function formatAnswerValue(value, type) {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (type === 'boolean' || typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (type === 'rating') return `${value} / 5`;
    if (type === 'date') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
    }
    return String(value);
}
