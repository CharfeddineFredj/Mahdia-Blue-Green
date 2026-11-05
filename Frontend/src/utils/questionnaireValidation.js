/** Règles de validation du questionnaire d'inscription (alignées sur `personalInfoField` côté backend). */

export const Q_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_MIN_LEN = 8;
export const PHONE_MAX_LEN = 15;
export const NAME_MIN_LEN = 2;
export const CITY_MIN_LEN = 2;
export const GENERIC_TEXT_MIN = 2;
export const INSTITUTION_MIN_WHEN_FILLED = 2;

export function isFirstOrLastNameField(personalInfoField) {
    return personalInfoField === 'firstName' || personalInfoField === 'lastName';
}

/** Garde uniquement les chiffres (saisie téléphone). */
export function digitsOnly(s) {
    return String(s ?? '').replace(/\D/g, '');
}

/** Retire les chiffres (prénom / nom). */
export function removeDigits(s) {
    return String(s ?? '').replace(/\d/g, '');
}

export function isQuestionAnswerEmpty(question, rawVal) {
    if (rawVal === undefined || rawVal === null) return true;
    if (typeof rawVal === 'string' && rawVal.trim() === '') return true;
    if (Array.isArray(rawVal) && rawVal.length === 0) return true;
    return false;
}

export function validateQuestionnaireAnswer(question, rawVal) {
    const q = question;
    if (!q) return { ok: false, message: 'Question invalide.' };

    const val =
        q.type === 'text' && typeof rawVal === 'string'
            ? rawVal.trim()
            : rawVal;
    const empty = isQuestionAnswerEmpty(q, rawVal);

    if (!q.isRequired) {
        if (empty) return { ok: true };
        if (q.type === 'date') return validateQuestionnaireDate(q, val);
        if (q.type === 'text' && val === '') return { ok: true };
        if (q.type === 'text') return validateQuestionnaireTextFormats(q, val, true);
        return { ok: true };
    }

    if (empty) {
        return { ok: false, message: 'Ce champ est obligatoire.' };
    }

    switch (q.type) {
        case 'text':
            return validateQuestionnaireTextFormats(q, val, false);
        case 'date':
            return validateQuestionnaireDate(q, val);
        case 'multiple_choice':
            return Array.isArray(val) && val.length > 0
                ? { ok: true }
                : { ok: false, message: 'Sélectionnez au moins une option.' };
        case 'single_choice':
        case 'boolean':
        case 'rating':
            return { ok: true };
        default:
            return { ok: true };
    }
}

export function validateQuestionnaireDate(q, val) {
    if (!val) return { ok: false, message: 'Choisissez une date.' };
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return { ok: false, message: 'Date invalide.' };
    if (q.personalInfoField === 'dateOfBirth') {
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 18);
        if (d > minDate) return { ok: false, message: 'Vous devez avoir au moins 18 ans.' };
    }
    return { ok: true };
}

export function validateQuestionnaireTextFormats(q, v, optional) {
    const pif = q.personalInfoField || '';
    const textLower = (q.text || '').toLowerCase();

    if (pif === 'phone') {
        const digits = String(v).replace(/\D/g, '');
        if (digits.length < PHONE_MIN_LEN || digits.length > PHONE_MAX_LEN) {
            return {
                ok: false,
                message: `Numéro invalide : ${PHONE_MIN_LEN} à ${PHONE_MAX_LEN} chiffres (sans lettres ni symboles).`,
            };
        }
        return { ok: true };
    }

    const looksLikeEmail =
        pif === 'email' ||
        textLower.includes('e-mail') ||
        textLower.includes('email') ||
        textLower.includes('courriel');
    if (looksLikeEmail) {
        if (!Q_EMAIL_RE.test(String(v).trim())) {
            return { ok: false, message: 'Format email invalide (ex: nom@domaine.com).' };
        }
        return { ok: true };
    }

    if (pif === 'firstName' || pif === 'lastName') {
        if (v.length < NAME_MIN_LEN) {
            return { ok: false, message: `Au moins ${NAME_MIN_LEN} lettres.` };
        }
        if (/\d/.test(v)) {
            return { ok: false, message: 'Les chiffres ne sont pas autorisés pour le prénom ou le nom.' };
        }
        if (!/^[\p{L}][\p{L}\s'-]*$/u.test(v)) {
            return { ok: false, message: 'Lettres, espaces ou tirets uniquement (pas de chiffres).' };
        }
        return { ok: true };
    }

    if (pif === 'address.city') {
        if (v.length < CITY_MIN_LEN) {
            return { ok: false, message: `Au moins ${CITY_MIN_LEN} caractères pour la ville.` };
        }
        return { ok: true };
    }

    if (pif === 'institution') {
        if (optional && !v) return { ok: true };
        if (v.length < INSTITUTION_MIN_WHEN_FILLED) {
            return {
                ok: false,
                message: `Au moins ${INSTITUTION_MIN_WHEN_FILLED} caractères si vous renseignez l’établissement.`,
            };
        }
        return { ok: true };
    }

    if (pif === 'bio') {
        if (optional && !v) return { ok: true };
        /* Bio optionnelle : si remplie, même seuil que les autres champs texte (évite de bloquer le bouton pendant la saisie pour un minimum trop élevé). */
        if (v.length > 0 && v.length < GENERIC_TEXT_MIN) {
            return {
                ok: false,
                message: `Au moins ${GENERIC_TEXT_MIN} caractères si vous remplissez la bio.`,
            };
        }
        return { ok: true };
    }

    if (v.length < GENERIC_TEXT_MIN) {
        return { ok: false, message: `Au moins ${GENERIC_TEXT_MIN} caractères.` };
    }
    return { ok: true };
}
