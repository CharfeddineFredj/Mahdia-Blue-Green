import { users as fallbackMockUsers } from '../data/mockData';

function normName(s) {
    return String(s || '').trim().toLowerCase();
}

const mockByName = new Map(fallbackMockUsers.map((u) => [normName(u.name), u]));

function pickLink(primary, fallback) {
    const p = String(primary || '').trim();
    const f = String(fallback || '').trim();
    if (p && p !== '#') return p;
    if (f && f !== '#') return f;
    return undefined;
}

/**
 * API TeamMember → shape attendu par la page À propos (cartes + modal).
 * Complète avec mockData si champs vides (pas de perte d’affichage tant que la photo n’est pas sur Cloudinary).
 */
export function normalizePublicTeamMember(doc) {
    const mock = mockByName.get(normName(doc.name));

    const email = String(doc.email || doc.contact || mock?.email || '')
        .trim();

    const organization = String(doc.organization || '').trim();
    const roleField = String(doc.role || '').trim();
    const mockEquipe = String(mock?.organization || mock?.role || '').trim();
    const equipe = organization || mockEquipe;
    const jobRole =
        roleField && roleField !== equipe
            ? roleField
            : equipe
              ? 'Développeur'
              : '';

    return {
        id: doc._id || doc.externalId,
        name: doc.name,
        avatar: String(doc.avatar || '').trim() || mock?.avatar,
        /** Ligne « équipe » (ex. Backend Team) — alias pour cartes / modal */
        equipe,
        /** Métier / rôle affiché (ex. Developer, Développeur) */
        jobRole,
        organization: equipe,
        email: email || undefined,
        linkedin: pickLink(doc.linkedin, mock?.linkedin),
        github: pickLink(doc.github, mock?.github),
        facebook: pickLink(doc.facebook, mock?.facebook),
        instagram: pickLink(doc.instagram, mock?.instagram),
        twitter: pickLink(doc.twitter, mock?.twitter),
    };
}

export function normalizePublicTeamMembers(docs) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    return docs.map(normalizePublicTeamMember);
}
