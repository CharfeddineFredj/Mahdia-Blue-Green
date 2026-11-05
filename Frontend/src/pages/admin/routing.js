/** Segments d’URL valides pour `/admin/:section` (hors redirections). */
export const ADMIN_SECTION_SLUGS = [
    'dashboard',
    'analytics',
    'articles',
    'events',
    'resources',
    'contacts',
    'partners',
    'entrepreneurs',
    'publicteam',
    'newsletter',
    'users',
    'reactivation',
    'staff',
    'questionnaire',
];

/**
 * Extrait le segment après `/admin/` (chaîne vide si URL = `/admin` ou `/admin/`).
 * @param {string} pathname
 * @returns {string}
 */
export function getAdminSectionSlug(pathname) {
    const normalized = String(pathname || '').replace(/\/$/, '') || '/';
    const m = normalized.match(/^\/admin(?:\/([^/?#]+))?$/);
    if (!m) return '';
    return m[1] || '';
}

export function adminPath(section) {
    return `/admin/${section}`;
}

/**
 * Sections accessibles pour un rôle (aligné sur la construction du menu admin).
 * @param {string | null} role
 * @returns {string[]}
 */
export function getAllowedAdminSectionSlugs(role) {
    if (!role) return [];
    const isAnalystOnly = role === 'analyst';
    const canViewContacts = ['superadmin', 'moderator', 'analyst'].includes(role);
    const canManageTeamAndNewsletter = ['superadmin', 'moderator'].includes(role);
    const canManageQuestionnaires = ['superadmin', 'analyst'].includes(role);
    const canAccessAnalytics = ['superadmin', 'analyst'].includes(role);

    const keys = [];
    if (!isAnalystOnly) keys.push('dashboard');
    if (canAccessAnalytics) keys.push('analytics');
    if (!isAnalystOnly) {
        keys.push('articles', 'events', 'resources', 'users');
    }
    if (role === 'superadmin') {
        keys.push('reactivation', 'staff');
    }
    if (canManageQuestionnaires) keys.push('questionnaire');
    if (!isAnalystOnly && canViewContacts) keys.push('contacts');
    if (!isAnalystOnly && canManageTeamAndNewsletter) {
        keys.push('partners', 'entrepreneurs', 'publicteam', 'newsletter');
    }
    return keys;
}
