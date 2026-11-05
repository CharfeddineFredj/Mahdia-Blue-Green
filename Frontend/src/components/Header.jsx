import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme, THEMES } from '../context/ThemeContext';
import { ChevronDown, LogOut, UserCircle, LayoutDashboard, ClipboardList, FilePlus, CalendarPlus, BellRing } from 'lucide-react';
import authService from '../services/auth.service';
import questionnaireService from '../services/questionnaire.service';
import { eventQuestionnaireService } from '../services/eventQuestionnaire.service';
import {
    isAwaitingAnswer, isNotYetOpen, EVENT_QUESTIONNAIRES_CHANGED,
    EVENT_QUESTIONNAIRES_SEEN, getSeenQuestionnaireIds, markQuestionnairesSeen,
} from '../utils/eventQuestionnaireRules';
import logoDark from '../assets/logo.png';
import logoLight from '../assets/logo_blanc.png';
import { canDisplayProfileImage, getUserInitialsFromName } from '../utils/userAvatar';

// Theme icons as SVG components
const SunIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SystemIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

function parseNavSession() {
    try {
        const raw = localStorage.getItem('mbg_user');
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data?.token) return null;
        const account = data.user || data;
        return { data, account };
    } catch {
        return null;
    }
}

function displayNameFromAccount(account) {
    if (!account) return '';
    if (account.username) return account.username;
    if (account.email) return account.email.split('@')[0];
    return 'Membre';
}

/**
 * Nom court pour la barre de navigation : comptes Google = « Prénom Nom » ou e-mail → premier mot / partie avant @.
 * Le nom complet reste disponible en infobulle.
 */
function shortNavName(name) {
    const base = String(name || '').split('@')[0].trim();
    const first = base.split(/\s+/)[0] || base;
    return first.length > 16 ? `${first.slice(0, 15)}…` : first;
}

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);
    const [economiesOpen, setEconomiesOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [navSession, setNavSession] = useState(() => parseNavSession());
    const [pendingSurveyCount, setPendingSurveyCount] = useState(0);
    const themeMenuRef = useRef(null);
    const userMenuRef = useRef(null);
    const location = useLocation();
    const { theme, setTheme, resolvedTheme } = useTheme();

    const account = navSession?.account;
    const role = account?.role;
    const isStaffRole = !!(role && ['superadmin', 'analyst', 'moderator'].includes(role));
    const sessionUserId = account?._id || account?.id || null;

    // Questionnaires d'événements auxquels l'utilisateur est inscrit : l'indicateur « s'allume »
    // dès qu'un questionnaire est ouvert (après la fin de l'événement) et qu'il n'y a pas encore répondu.
    const [loadedEventQuestionnaires, setEventQuestionnaires] = useState([]);
    const [nowTick, setNowTick] = useState(() => Date.now());
    useEffect(() => {
        if (!sessionUserId || isStaffRole) return undefined;
        let cancelled = false;
        let openingTimer = null;
        const load = () => {
            eventQuestionnaireService.getParticipating()
                .then((r) => {
                    if (cancelled || !r?.success) return;
                    setEventQuestionnaires((r.data || []).filter((q) => !isNotYetOpen(q)));
                    // Questionnaire encore caché (ouverture après la fin de l'événement) :
                    // nouvelle vérification à l'heure d'ouverture pour allumer l'indicateur
                    clearTimeout(openingTimer);
                    const wait = r.nextOpensAt ? new Date(r.nextOpensAt).getTime() - Date.now() + 1500 : null;
                    if (wait != null && wait > 0 && wait < 24 * 60 * 60 * 1000) openingTimer = setTimeout(load, wait);
                })
                .catch(() => { /* indicateur facultatif */ });
        };
        load();
        const refetch = setInterval(load, 5 * 60 * 1000);
        const tick = setInterval(() => setNowTick(Date.now()), 30 * 1000);
        window.addEventListener(EVENT_QUESTIONNAIRES_CHANGED, load);
        return () => {
            cancelled = true;
            clearTimeout(openingTimer);
            clearInterval(refetch);
            clearInterval(tick);
            window.removeEventListener(EVENT_QUESTIONNAIRES_CHANGED, load);
        };
    }, [sessionUserId, isStaffRole, location.pathname]);
    // Déconnexion / compte staff : aucun indicateur (sans remettre l'état à zéro dans l'effet)
    const eventQuestionnaires = sessionUserId && !isStaffRole ? loadedEventQuestionnaires : [];
    // Notification rouge : questionnaires ouverts, sans réponse, pas encore vus dans « Questionnaires de mes événements »
    const [seenVersion, setSeenVersion] = useState(0);
    useEffect(() => {
        const onSeen = () => setSeenVersion((v) => v + 1);
        window.addEventListener(EVENT_QUESTIONNAIRES_SEEN, onSeen);
        window.addEventListener('storage', onSeen);
        return () => {
            window.removeEventListener(EVENT_QUESTIONNAIRES_SEEN, onSeen);
            window.removeEventListener('storage', onSeen);
        };
    }, []);
    const seenIds = seenVersion >= 0 ? getSeenQuestionnaireIds(sessionUserId) : new Set();
    const unseenOpenQuestionnaires = eventQuestionnaires.filter((q) => isAwaitingAnswer(q, nowTick) && !seenIds.has(String(q._id)));
    const openEventQuestionnaireCount = unseenOpenQuestionnaires.length;

    const refreshSession = () => setNavSession(parseNavSession());

    useEffect(() => {
        refreshSession();
    }, [location.pathname]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'mbg_user') refreshSession();
        };
        window.addEventListener('storage', onStorage);
        const interval = setInterval(refreshSession, 2000);
        return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
    }, []);

    useEffect(() => {
        if (!navSession || authService.needsQuestionnaireCompletion() || isStaffRole) {
            setPendingSurveyCount(0);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const r = await questionnaireService.getPending();
                if (cancelled || !r.success) return;
                setPendingSurveyCount(r.count ?? 0);
            } catch {
                if (!cancelled) setPendingSurveyCount(0);
            }
        })();
        return () => { cancelled = true; };
    }, [location.pathname, navSession, isStaffRole]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'mbg_user' || e.key === null) refreshSession();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
                setThemeMenuOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        setThemeMenuOpen(false);
    };

    const getCurrentThemeIcon = () => {
        if (theme === THEMES.SYSTEM) return <SystemIcon />;
        if (resolvedTheme === 'light') return <SunIcon />;
        return <MoonIcon />;
    };

    // « Blog » reste surligné sur le blog, les articles et les pages Économies
    const isBlogSection = /^\/(blog|article|economies)(\/|$)/.test(location.pathname);

    const displayName = displayNameFromAccount(account);
    const initials = getUserInitialsFromName(account);
    const showAvatarImage = canDisplayProfileImage(account);
    const showAdminEntry = isStaffRole;
    const showQuestionnairesNav =
        !!navSession &&
        !isStaffRole &&
        !authService.needsQuestionnaireCompletion();

    const handleLogout = async () => {
        setUserMenuOpen(false);
        setIsOpen(false);
        await authService.logout();
        refreshSession();
        window.location.replace('/');
    };

    return (
        <>
            <a href="#main-content" className="skip-link">Aller au contenu principal</a>
            <header className={`header${navSession ? ' header--session' : ''}`} role="banner">
                <div className="header__container">
                    <Link to="/" className="header__logo" aria-label="Mahdia Blue & Green - Accueil">
                        <img src={resolvedTheme === 'light' ? logoDark : logoLight} alt="" width="80" height="80" />
                    </Link>

                    <nav className={`nav ${isOpen ? 'nav--open' : ''}`} role="navigation" aria-label="Navigation principale">
                        <button
                            className={`nav__toggle ${isOpen ? 'open' : ''}`}
                            aria-expanded={isOpen}
                            aria-controls="nav-list"
                            aria-label="Menu"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>

                        <ul className="nav__list" id="nav-list">
                            <li>
                                <NavLink to="/" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} end onClick={() => setIsOpen(false)}>
                                    Accueil
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/a-propos" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} onClick={() => setIsOpen(false)}>
                                    À propos
                                </NavLink>
                            </li>
                            {/* Blog : articles + pages Économies regroupés dans un même menu */}
                            <li className={`nav__dropdown ${economiesOpen ? 'nav__dropdown--open' : ''}`}>
                                <button
                                    className={`nav__link nav__dropdown-toggle ${isBlogSection ? 'nav__link--active' : ''}`}
                                    aria-haspopup="true"
                                    aria-expanded={economiesOpen}
                                    onClick={() => setEconomiesOpen(!economiesOpen)}
                                >
                                    Blog
                                    <svg className="nav__dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                                {economiesOpen && (
                                    <ul className="nav__dropdown-menu" role="menu">
                                        <li><Link to="/blog" className="nav__dropdown-item" role="menuitem" onClick={() => { setEconomiesOpen(false); setIsOpen(false); }}>Tous les articles</Link></li>
                                        <li><Link to="/economies/bleue" className="nav__dropdown-item" role="menuitem" onClick={() => { setEconomiesOpen(false); setIsOpen(false); }}>Économie Bleue</Link></li>
                                        <li><Link to="/economies/verte" className="nav__dropdown-item" role="menuitem" onClick={() => { setEconomiesOpen(false); setIsOpen(false); }}>Économie Verte</Link></li>
                                        <li><Link to="/economies/circulaire" className="nav__dropdown-item" role="menuitem" onClick={() => { setEconomiesOpen(false); setIsOpen(false); }}>Économie Circulaire</Link></li>
                                    </ul>
                                )}
                            </li>
                            <li>
                                <NavLink to="/evenements" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} onClick={() => setIsOpen(false)}>
                                    Événements
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/ressources" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} onClick={() => setIsOpen(false)}>
                                    Ressources
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/entrepreneurs" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} onClick={() => setIsOpen(false)}>
                                    Entrepreneurs
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/contact" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`} onClick={() => setIsOpen(false)}>
                                    Contact
                                </NavLink>
                            </li>
                            <li className="nav__theme-switcher" ref={themeMenuRef}>
                                <button
                                    className="theme-toggle"
                                    onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                                    aria-label="Changer le thème"
                                    aria-expanded={themeMenuOpen}
                                    aria-haspopup="true"
                                    title="Thème"
                                >
                                    {getCurrentThemeIcon()}
                                </button>
                                {themeMenuOpen && (
                                    <div className="theme-menu" role="menu">
                                        <button
                                            className={`theme-menu__item ${theme === THEMES.LIGHT ? 'theme-menu__item--active' : ''}`}
                                            onClick={() => handleThemeChange(THEMES.LIGHT)}
                                            role="menuitem"
                                        >
                                            <SunIcon />
                                            <span>Clair</span>
                                        </button>
                                        <button
                                            className={`theme-menu__item ${theme === THEMES.DARK ? 'theme-menu__item--active' : ''}`}
                                            onClick={() => handleThemeChange(THEMES.DARK)}
                                            role="menuitem"
                                        >
                                            <MoonIcon />
                                            <span>Sombre</span>
                                        </button>
                                        <button
                                            className={`theme-menu__item ${theme === THEMES.SYSTEM ? 'theme-menu__item--active' : ''}`}
                                            onClick={() => handleThemeChange(THEMES.SYSTEM)}
                                            role="menuitem"
                                        >
                                            <SystemIcon />
                                            <span>Système</span>
                                        </button>
                                    </div>
                                )}
                            </li>

                            <li className="nav__user-area" ref={userMenuRef}>
                                {navSession ? (
                                    <div className="nav-user">
                                        <button
                                            type="button"
                                            className="nav-user__trigger"
                                            aria-label={`Menu du compte de ${displayName}`}
                                            title={displayName}
                                            aria-expanded={userMenuOpen}
                                            aria-haspopup="true"
                                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        >
                                            <span className="nav-user__avatar-wrap" aria-hidden="true">
                                                <span className="nav-user__avatar">
                                                    {showAvatarImage
                                                        ? <img src={account.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                        : initials}
                                                </span>
                                                {/* Pastille : uniquement pour un avis d'événement non vu (même règle que « Avis d'événements ») */}
                                                {openEventQuestionnaireCount > 0 ? (
                                                    <span className="nav-user__notif-dot" />
                                                ) : null}
                                            </span>
                                            {showQuestionnairesNav && pendingSurveyCount > 0 && (
                                                <span className="sr-only">{pendingSurveyCount} questionnaire(s) à compléter</span>
                                            )}
                                            {openEventQuestionnaireCount > 0 && (
                                                <span className="sr-only">{openEventQuestionnaireCount} questionnaire(s) d’événement disponible(s)</span>
                                            )}
                                            <span className="nav-user__meta">
                                                <span className="nav-user__label">Connecté</span>
                                                <span className="nav-user__name" title={displayName}>{shortNavName(displayName)}</span>
                                            </span>
                                            <ChevronDown size={18} className={`nav-user__chevron ${userMenuOpen ? 'nav-user__chevron--open' : ''}`} aria-hidden="true" />
                                        </button>
                                        {userMenuOpen && (
                                            <div className="nav-user__dropdown" role="menu">
                                                <Link to="/compte" className="nav-user__dropdown-item" role="menuitem" onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}>
                                                    <UserCircle size={18} />
                                                    Mon compte
                                                </Link>
                                                {showQuestionnairesNav && (
                                                    <Link to="/questionnaire" className="nav-user__dropdown-item" role="menuitem" onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}>
                                                        <ClipboardList size={18} />
                                                        Questionnaires
                                                        {pendingSurveyCount > 0 && (
                                                            <span className="nav-user__count" title="Enquêtes à compléter">
                                                                {pendingSurveyCount > 9 ? '9+' : pendingSurveyCount}
                                                            </span>
                                                        )}
                                                    </Link>
                                                )}
                                                {openEventQuestionnaireCount > 0 && (
                                                    <Link
                                                        to="/compte#mes-questionnaires"
                                                        className="nav-user__dropdown-item"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            // Clic sur « Avis d'événements » : tous les questionnaires listés sont vus, la pastille rouge
                                                            // disparaît et ne se rallume qu'à l'arrivée d'un nouveau questionnaire (nouvel identifiant)
                                                            markQuestionnairesSeen(sessionUserId, eventQuestionnaires.map((q) => q._id));
                                                            setUserMenuOpen(false);
                                                            setIsOpen(false);
                                                        }}
                                                    >
                                                        <BellRing size={18} />
                                                        <span style={{ whiteSpace: 'nowrap' }}>Avis d&apos;événements</span>
                                                        {openEventQuestionnaireCount > 0 && (
                                                            <span className="nav-user__count" title="Nouveaux questionnaires disponibles : vous pouvez y répondre">
                                                                {openEventQuestionnaireCount > 9 ? '9+' : openEventQuestionnaireCount}
                                                            </span>
                                                        )}
                                                    </Link>
                                                )}
                                                {showAdminEntry ? (
                                                    <Link
                                                        to="/admin"
                                                        className="nav-user__dropdown-item nav-user__dropdown-item--dashboard"
                                                        role="menuitem"
                                                        onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}
                                                    >
                                                        <LayoutDashboard size={18} />
                                                        Tableau de bord
                                                    </Link>
                                                ) : (
                                                    <>
                                                        <Link to="/blog/creer" className="nav-user__dropdown-item" role="menuitem" onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}>
                                                            <FilePlus size={18} />
                                                            Créer un article
                                                        </Link>
                                                        <Link to="/evenements/creer" className="nav-user__dropdown-item" role="menuitem" onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}>
                                                            <CalendarPlus size={18} />
                                                            Créer un événement
                                                        </Link>
                                                    </>
                                                )}
                                                <button type="button" className="nav-user__dropdown-item nav-user__dropdown-item--danger" role="menuitem" onClick={handleLogout}>
                                                    <LogOut size={18} />
                                                    Déconnexion
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link to="/auth" className="btn btn--sm btn--primary" onClick={() => setIsOpen(false)}>
                                        Connexion
                                    </Link>
                                )}
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
        </>
    );
}
