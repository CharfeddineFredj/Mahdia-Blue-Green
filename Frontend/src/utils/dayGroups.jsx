/**
 * Séparation des listes par jour : un intitulé de date (« Aujourd'hui », « Hier », « Lundi 27 octobre 2026 »)
 * est inséré avant le premier élément de chaque nouveau jour.
 */

/** Jour local AAAA-MM-JJ, '' si date invalide */
export function dayKey(value) {
    // new Date(null) vaut le 1er janvier 1970 : une date absente doit rester « inconnue »
    if (value === null || value === undefined || value === '') return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(value) {
    const key = dayKey(value);
    if (!key) return 'Date inconnue';
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (key === dayKey(today)) return 'Aujourd’hui';
    if (key === dayKey(yesterday)) return 'Hier';
    const label = new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Rend une liste en insérant un séparateur à chaque changement de jour.
 * @param {Array} items éléments déjà triés par date
 * @param {(item) => any} getDate date utilisée pour le regroupement
 * @param {(item, index) => import('react').ReactNode} renderItem rendu d'un élément (avec sa key)
 */
export function withDaySeparators(items, getDate, renderItem) {
    const out = [];
    let previous = null;
    items.forEach((item, i) => {
        const date = getDate(item);
        const key = dayKey(date) || 'inconnue';
        if (key !== previous) {
            const label = dayLabel(date);
            out.push(
                <div key={`day-${key}-${i}`} className="day-sep" role="separator" aria-label={label}>
                    <span className="day-sep__label">{label}</span>
                </div>
            );
            previous = key;
        }
        out.push(renderItem(item, i));
    });
    return out;
}
