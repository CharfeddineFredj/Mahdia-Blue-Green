/**
 * Pastille rôle (équipe admin / staff).
 * @param {{ role: 'superadmin' | 'moderator' | 'analyst' | string }} props
 */
export default function StaffRolePill({ role }) {
    switch (role) {
        case 'superadmin':
            return (
                <>
                    <span className="staff-role-pill__icon" aria-hidden>
                        👑
                    </span>
                    <span>SUPER ADMIN</span>
                </>
            );
        case 'analyst':
            return (
                <>
                    <span className="staff-role-pill__icon" aria-hidden>
                        📊
                    </span>
                    <span>ANALYSTE</span>
                </>
            );
        case 'moderator':
            return (
                <>
                    <span className="staff-role-pill__icon" aria-hidden>
                        🛡️
                    </span>
                    <span>MODÉRATEUR</span>
                </>
            );
        default:
            return (
                <>
                    <span className="staff-role-pill__icon" aria-hidden>
                        👤
                    </span>
                    <span>UTILISATEUR</span>
                </>
            );
    }
}
