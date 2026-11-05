const pad = (n) => String(n).padStart(2, '0');

/** Format local `Date` for `input[type="datetime-local"]` (minute precision). */
export function toDatetimeLocalString(d) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Demain 00:00 (heure locale) — première date autorisée (aujourd’hui et le passé exclus). */
export function getTomorrowMidnightLocal() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getTomorrowMidnightLocalString() {
    return toDatetimeLocalString(getTomorrowMidnightLocal());
}

export function addMinutesToDatetimeLocalString(localStr, minutes) {
    const d = new Date(localStr);
    if (Number.isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() + minutes);
    return toDatetimeLocalString(d);
}

export const MIN_EVENT_DURATION_MINUTES = 90;

export function isStartStrictlyAfterEndOfToday(startInput) {
    const start = new Date(startInput);
    if (Number.isNaN(start.getTime())) return false;
    const limit = new Date();
    limit.setHours(23, 59, 59, 999);
    return start.getTime() > limit.getTime();
}

/** @returns {string[]} messages d’erreur (vide si OK) */
export function validateEventSchedule(startStr, endStr) {
    const errors = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.push('Dates invalides.');
        return errors;
    }
    if (!isStartStrictlyAfterEndOfToday(start)) {
        errors.push('La date de début doit être à partir de demain (passé et aujourd’hui ne sont pas autorisés).');
    }
    if (end < start) {
        errors.push('La date de fin doit être après la date de début.');
    }
    const ms = end.getTime() - start.getTime();
    if (ms < MIN_EVENT_DURATION_MINUTES * 60 * 1000) {
        errors.push("La durée minimale de l'événement est de 1 h 30.");
    }
    return errors;
}

/** `min` pour le champ début en édition : si l’événement est déjà dans le passé, ne pas imposer `min` (valeur affichable). */
export function getDatetimeLocalMinForStartEdit(startStr) {
    const t = getTomorrowMidnightLocalString();
    if (!startStr) return t;
    if (new Date(startStr) < new Date(t)) return undefined;
    return t;
}
