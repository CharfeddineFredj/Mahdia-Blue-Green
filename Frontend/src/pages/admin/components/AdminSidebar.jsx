import { Link, NavLink } from 'react-router-dom';
import { House, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../../../assets/logo.png';
import { adminSidebarRoleTitle } from '../utils/helpers';

/**
 * Barre latérale navigation admin (liens vers `/admin/:section`).
 * @param {{ navItems: Array<{ key: string, label: string, icon: React.ReactNode }>, sidebarCollapsed: boolean, setSidebarCollapsed: (v: boolean | ((b: boolean) => boolean)) => void, currentUserRole: string | null }} props
 */
export default function AdminSidebar({
    navItems,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentUserRole,
}) {
    // Regroupement logique des sections (les clés inconnues vont dans « Autres »)
    const NAV_GROUPS = [
        { title: 'Pilotage', keys: ['dashboard', 'analytics'] },
        { title: 'Contenu', keys: ['articles', 'events', 'resources'] },
        { title: 'Communauté', keys: ['users', 'entrepreneurs', 'partners', 'publicteam', 'newsletter', 'contacts'] },
        { title: 'Administration', keys: ['reactivation', 'staff', 'questionnaire'] },
    ];
    const knownKeys = NAV_GROUPS.flatMap((g) => g.keys);
    const groupedItems = NAV_GROUPS
        .map((g) => ({ title: g.title, items: navItems.filter((i) => g.keys.includes(i.key)) }))
        .filter((g) => g.items.length > 0);
    const otherItems = navItems.filter((i) => !knownKeys.includes(i.key));
    if (otherItems.length > 0) groupedItems.push({ title: 'Autres', items: otherItems });

    return (
        <aside className="admin-sidebar" aria-label="Navigation administration">
            <div className="admin-sidebar__inner">
                <div className="admin-sidebar__brand">
                    <div className="admin-sidebar__logo-mark" aria-hidden="true">
                        <img src={logo} alt="" className="admin-sidebar__logo-img" />
                    </div>
                    <div className="admin-sidebar__brand-text">
                        <span className="admin-sidebar__title">{adminSidebarRoleTitle(currentUserRole)}</span>
                        <span className="admin-sidebar__subtitle">Espace administration</span>
                    </div>
                    <button
                        type="button"
                        className="admin-sidebar__toggle"
                        onClick={() => setSidebarCollapsed((v) => !v)}
                        aria-expanded={!sidebarCollapsed}
                        aria-controls="admin-sidebar-nav"
                        title={sidebarCollapsed ? 'Développer le menu' : 'Réduire le menu'}
                    >
                        {sidebarCollapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                    </button>
                </div>
                <nav className="admin-sidebar__scroll" aria-label="Sections">
                    <ul id="admin-sidebar-nav" className="admin-nav">
                        {groupedItems.map((group) => (
                            <li key={group.title} className="admin-nav__group">
                                <span className="admin-nav__group-title">{group.title}</span>
                                <ul className="admin-nav__group-list">
                                    {group.items.map((item) => (
                                        <li key={item.key} className="admin-nav__item">
                                            <NavLink
                                                to={`/admin/${item.key}`}
                                                title={item.label}
                                                className={({ isActive }) => `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`}
                                                aria-current={undefined}
                                            >
                                                <span className="admin-nav__link-icon" aria-hidden>
                                                    {item.icon}
                                                </span>
                                                <span className="admin-nav__link-text">{item.label}</span>
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                        <li className="admin-nav__item admin-nav__item--back">
                            <Link to="/" className="admin-nav__link admin-nav__link--back" title="Site public — Retour au site">
                                <span className="admin-nav__link--back-icon-wrap" aria-hidden>
                                    <House size={18} strokeWidth={2} />
                                </span>
                                <span className="admin-nav__link--back-label">
                                    <span className="admin-nav__link--back-title">Site public</span>
                                    <span className="admin-nav__link--back-sub">Quitter l&apos;administration</span>
                                </span>
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </aside>
    );
}
