export function formatAdminTeamDateTime(value) {
    if (value == null || value === '') return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function adminTeamDisplayValue(v) {
    if (v == null) return '—';
    const s = String(v).trim();
    return s === '' ? '—' : s;
}

export function formatArticleStatus(status) {
    if (status === 'published') return 'Publié';
    if (status === 'draft') return 'Brouillon';
    if (status === 'archived') return 'Archivé';
    return status ? String(status) : '—';
}

export function staffRolePillClass(role) {
    if (role === 'superadmin') return 'staff-role-pill staff-role-pill--superadmin';
    if (role === 'analyst') return 'staff-role-pill staff-role-pill--analyst';
    if (role === 'moderator') return 'staff-role-pill staff-role-pill--moderator';
    return 'staff-role-pill staff-role-pill--user';
}

export function adminUserRoleSelectClass(role) {
    if (role === 'moderator') return 'admin-table-select admin-table-select--role-moderator';
    if (role === 'analyst') return 'admin-table-select admin-table-select--role-analyst';
    return 'admin-table-select admin-table-select--role-user';
}

export function adminUserStatusSelectClass(isActive) {
    return isActive
        ? 'admin-table-select admin-table-select--status-active'
        : 'admin-table-select admin-table-select--status-inactive';
}

export function adminSidebarRoleTitle(role) {
    switch (role) {
        case 'superadmin':
            return 'Super Admin';
        case 'moderator':
            return 'Modérateur';
        case 'analyst':
            return 'Analyste';
        default:
            return 'Admin';
    }
}
