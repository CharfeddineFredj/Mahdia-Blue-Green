/**
 * Photos de profil hébergées par Google (souvent non affichables correctement côté app).
 * On préfère des initiales basées sur le nom.
 */
export function isGoogleProfileImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return u.includes('googleusercontent.com') || u.includes('ggpht.com');
}

/**
 * Indique si l’URL peut être affichée comme image (hors hébergeur Google).
 */
export function canDisplayProfileImage(user) {
    const url = user?.profilePicture;
    if (!url || !String(url).trim()) return false;
    if (isGoogleProfileImageUrl(url)) return false;
    return true;
}

/**
 * Initiales à partir du prénom/nom, du nom complet ou du pseudo — pas à partir de l’e-mail.
 * Deux premiers mots du nom : première lettre de chaque mot ; un seul mot : deux premières lettres.
 */
export function getUserInitialsFromName(user) {
    if (!user) return '?';
    const fn = (user.firstName && String(user.firstName).trim()) || '';
    const ln = (user.lastName && String(user.lastName).trim()) || '';
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase().slice(0, 2);
    if (fn) return (fn.length >= 2 ? fn.slice(0, 2) : fn[0]).toUpperCase();
    if (ln) return (ln.length >= 2 ? ln.slice(0, 2) : ln[0]).toUpperCase();

    const nameLike = [user.name, user.username]
        .map((x) => (x != null ? String(x).trim() : ''))
        .find(Boolean);
    if (nameLike) {
        const parts = nameLike.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
        if (parts.length === 1) {
            const w = parts[0];
            return w.length >= 2 ? w.slice(0, 2).toUpperCase() : w[0].toUpperCase();
        }
    }
    return '?';
}
