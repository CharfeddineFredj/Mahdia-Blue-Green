/** Filtre par date de création (champ ISO) sur une journée locale [dateFrom, dateTo] (inputs type="date"). */
export function matchesCreatedAtRange(isoDate, dateFromStr, dateToStr) {
    if (!dateFromStr && !dateToStr) return true;
    const t = new Date(isoDate).getTime();
    if (Number.isNaN(t)) return false;
    if (dateFromStr) {
        const start = new Date(`${dateFromStr}T00:00:00`);
        if (t < start.getTime()) return false;
    }
    if (dateToStr) {
        const end = new Date(`${dateToStr}T23:59:59.999`);
        if (t > end.getTime()) return false;
    }
    return true;
}

export function textIncludes(haystack, q) {
    if (!q || !String(q).trim()) return true;
    return String(haystack ?? '')
        .toLowerCase()
        .includes(String(q).trim().toLowerCase());
}
