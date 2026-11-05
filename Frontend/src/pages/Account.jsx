import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Settings, Shield, Calendar, LogOut, Trash2, Mail, MapPin, Camera, Upload, FileText, Edit3, Eye, Clock, CheckCircle, CalendarPlus, ClipboardList, AlertTriangle, FilePlus, Lock, EyeOff } from 'lucide-react';
import { Toast, Modal } from '../components/UI';
import Pagination from '../components/Pagination';

/** Au-delà de 5 inscriptions, le tableau est paginé */
const REGISTRATIONS_PAGE_SIZE = 5;
/** Panier Pro : éléments par page (Mes Articles, Mes Événements, Questionnaires de mes événements) */
const PANIER_PAGE_SIZE = 5;
import authService from '../services/auth.service';
import usersService from '../services/users.service';
import { articlesService } from '../services/articles.service';
import { eventsService } from '../services/events.service';
import { api, eventQuestionnaireService } from '../services';
import EventQuestionnaireManager from '../components/EventQuestionnaireManager';
import EventQuestionnaireAnswerForm from '../components/EventQuestionnaireAnswerForm';
import EventQuestionnaireMyResponse from '../components/EventQuestionnaireMyResponse';
import {
    REVIEW_STATUS_META,
    formatDateTime,
    getEventReviewStatus,
    getQuestionnaireDeadline,
    isQuestionnaireWindowOpen,
    getDisplayOpening,
    isEventEnded,
    availabilityLabel,
    isAwaitingAnswer,
    isNotYetOpen,
    EVENT_QUESTIONNAIRES_CHANGED,
    markQuestionnairesSeen,
} from '../utils/eventQuestionnaireRules';
import { canDisplayProfileImage, getUserInitialsFromName } from '../utils/userAvatar';
import { withDaySeparators } from '../utils/dayGroups';
export default function Account() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [profileLoadState, setProfileLoadState] = useState('loading'); // loading | ready
    const location = useLocation();
    const initialTab = ['#panier', '#mes-questionnaires'].includes(location.hash) ? 'panier' : 'profile';
    const [panierLoaded, setPanierLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [registrations, setRegistrations] = useState([]);
    const [registrationsPage, setRegistrationsPage] = useState(1);
    const [registrationsTotal, setRegistrationsTotal] = useState(0);
    const [registrationsLoading, setRegistrationsLoading] = useState(false);
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwdErrors, setPwdErrors] = useState({});
    const [pwdLoading, setPwdLoading] = useState(false);
    const [addPwdForm, setAddPwdForm] = useState({ newPassword: '', confirmPassword: '' });
    const [addPwdLoading, setAddPwdLoading] = useState(false);
    const [showAddPwd, setShowAddPwd] = useState({ newPassword: false, confirmPassword: false });
    const [myArticles, setMyArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [myEvents, setMyEvents] = useState([]);
    const [articlesPage, setArticlesPage] = useState(1);
    const [eventsPage, setEventsPage] = useState(1);
    const [questionnairesPage, setQuestionnairesPage] = useState(1);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [eventQuestionnaires, setEventQuestionnaires] = useState({});
    const [participatingQuestionnaires, setParticipatingQuestionnaires] = useState([]);
    const [questionnaireEvent, setQuestionnaireEvent] = useState(null);
    const [answeringQuestionnaire, setAnsweringQuestionnaire] = useState(null);
    const [viewingResponseOf, setViewingResponseOf] = useState(null);
    const [answerSubmitting, setAnswerSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const toastHideTimerRef = useRef(null);
    const IMPORT_SUCCESS_TOAST_MS = 10_000;
    const navigate = useNavigate();

    const normalizeUser = (rawUser) => {
        if (!rawUser) return null;
        return {
            ...rawUser,
            bio: rawUser.bio ?? rawUser.personalInfo?.bio ?? '',
            city: rawUser.city ?? rawUser.personalInfo?.address?.city ?? '',
            firstName: rawUser.firstName ?? rawUser.personalInfo?.firstName ?? '',
            lastName: rawUser.lastName ?? rawUser.personalInfo?.lastName ?? ''
        };
    };

    useEffect(() => {
        const initializeProfile = async () => {
            const stored = localStorage.getItem('mbg_user');
            if (!stored) {
                navigate('/auth');
                return;
            }

            try {
                setProfileLoadState('loading');
                const parsedData = JSON.parse(stored);
                if (parsedData.token) setToken(parsedData.token);

                const profileResponse = await authService.getProfile();
                const profileUser = normalizeUser(profileResponse?.data);
                if (!profileUser) throw new Error('Profil introuvable');

                setUser(profileUser);
                setProfileLoadState('ready');

                // Keep local storage synchronized with latest backend user.
                const updatedStored = parsedData.user
                    ? { ...parsedData, user: profileUser }
                    : { ...parsedData, ...profileUser };
                localStorage.setItem('mbg_user', JSON.stringify(updatedStored));
            } catch (error) {
                console.error('Error loading profile:', error);
                if (error.requiresQuestionnaire) {
                    setToast({
                        show: true,
                        message: 'Vous devez d’abord compléter le questionnaire d’inscription.',
                        type: 'info'
                    });
                    setTimeout(() => navigate('/auth/complete-profile', { replace: true }), 800);
                    return;
                }
                try {
                    await authService.logout();
                } catch {
                    /* ignore API logout failure */
                }
                localStorage.removeItem('mbg_registrations');
                navigate('/auth', { replace: true });
            }
        };

        initializeProfile();
    }, [navigate]);

    // Inscriptions réelles (API), une page à la fois
    useEffect(() => {
        if (activeTab !== 'registrations') return undefined;
        let cancelled = false;
        setRegistrationsLoading(true);
        eventsService.getRegisteredEvents({ page: registrationsPage, limit: REGISTRATIONS_PAGE_SIZE })
            .then((res) => {
                if (cancelled) return;
                setRegistrations(res.data || []);
                setRegistrationsTotal(res.total || 0);
                // Page devenue vide (désinscription entre-temps) : revenir à la dernière page existante
                if ((res.data || []).length === 0 && registrationsPage > 1) {
                    setRegistrationsPage(Math.max(1, res.totalPages || 1));
                }
            })
            .catch((err) => {
                if (!cancelled) console.error('Error loading registrations:', err);
            })
            .finally(() => { if (!cancelled) setRegistrationsLoading(false); });
        return () => { cancelled = true; };
    }, [activeTab, registrationsPage]);

    const loadMyArticles = async () => {
        setArticlesLoading(true);
        try {
            const res = await articlesService.getMyArticles({ limit: 100 });
            setMyArticles(res.data || []);
        } catch (err) {
            console.error('Error loading articles:', err);
        } finally {
            setArticlesLoading(false);
        }
    };

    const loadMyEvents = async () => {
        setEventsLoading(true);
        try {
            const res = await eventsService.getMyEvents({ limit: 100 });
            setMyEvents(res.data || []);
        } catch (err) {
            console.error('Error loading events:', err);
        } finally {
            setEventsLoading(false);
        }
    };

    const loadEventQuestionnaires = async () => {
        try {
            const [mineRes, partRes] = await Promise.all([
                eventQuestionnaireService.getMine(),
                eventQuestionnaireService.getParticipating(),
            ]);
            const byEvent = {};
            for (const item of mineRes.data || []) byEvent[String(item.event)] = item;
            setEventQuestionnaires(byEvent);
            // Questionnaires pas encore ouverts : invisibles pour l'inscrit
            setParticipatingQuestionnaires((partRes.data || []).filter((q) => !isNotYetOpen(q)));
        } catch (err) {
            console.error('Error loading event questionnaires:', err);
        }
    };

    useEffect(() => {
        if (activeTab === 'panier') {
            Promise.all([loadMyArticles(), loadMyEvents(), loadEventQuestionnaires()])
                .finally(() => setPanierLoaded(true));
        }
    }, [activeTab]);

    // Arrivée via /compte#mes-questionnaires (ex. après avoir répondu depuis la page d'un événement) :
    // défilement vers « Questionnaires de mes événements » une fois le Panier Pro chargé et affiché
    const scrolledToQuestionnairesRef = useRef(false);

    // Lien vers /compte#mes-questionnaires alors que la page est déjà ouverte : bascule sur Panier Pro
    useEffect(() => {
        if (location.hash === '#mes-questionnaires' || location.hash === '#panier') {
            setActiveTab('panier');
            scrolledToQuestionnairesRef.current = false;
        }
    }, [location.hash, location.key]);

    useEffect(() => {
        if (scrolledToQuestionnairesRef.current) return undefined;
        if (location.hash !== '#mes-questionnaires' || activeTab !== 'panier' || !panierLoaded || profileLoadState !== 'ready') return undefined;
        scrolledToQuestionnairesRef.current = true;

        // Le contenu au-dessus (articles, événements, images) peut encore s'agrandir après le chargement :
        // on réaligne la section pendant quelques instants, sauf si l'utilisateur fait défiler lui-même.
        let stopped = false;
        const align = () => {
            if (stopped) return;
            document.getElementById('mes-questionnaires')?.scrollIntoView({ behavior: 'auto', block: 'start' });
        };
        const stop = () => { stopped = true; };
        const userEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
        userEvents.forEach((e) => window.addEventListener(e, stop, { passive: true }));
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(align) : null;
        observer?.observe(document.body);
        const first = requestAnimationFrame(align);
        const end = setTimeout(stop, 2500);
        return () => {
            stop();
            cancelAnimationFrame(first);
            clearTimeout(end);
            observer?.disconnect();
            userEvents.forEach((e) => window.removeEventListener(e, stop));
        };
    }, [location.hash, activeTab, panierLoaded, profileLoadState]);

    // « Questionnaires de mes événements » affiché : la notification rouge de la barre de navigation est considérée comme vue
    const viewerId = user?._id || user?.id || null;
    useEffect(() => {
        if (activeTab !== 'panier' || !viewerId || participatingQuestionnaires.length === 0) return;
        markQuestionnairesSeen(viewerId, participatingQuestionnaires.filter((q) => isAwaitingAnswer(q)).map((q) => q._id));
    }, [activeTab, viewerId, participatingQuestionnaires]);

    const showPanierToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    }, []);

    // Réponse unique : envoyée une seule fois, ensuite non modifiable
    const handleSubmitAnswers = async (answers) => {
        if (!answeringQuestionnaire) return;
        setAnswerSubmitting(true);
        try {
            const eventId = answeringQuestionnaire.eventInfo._id;
            const res = await eventQuestionnaireService.submitResponse(eventId, answers);
            showPanierToast(res.message || 'Réponses enregistrées', 'success');
            setAnsweringQuestionnaire(null);
            loadEventQuestionnaires();
            window.dispatchEvent(new Event(EVENT_QUESTIONNAIRES_CHANGED));
        } catch (err) {
            showPanierToast(err.message || 'Erreur lors de l’envoi des réponses', 'error');
        } finally {
            setAnswerSubmitting(false);
        }
    };

    const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (!PWD_RE.test(addPwdForm.newPassword)) {
            setToast({ show: true, message: '8 car. min. avec majuscule, minuscule, chiffre et symbole.', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
            return;
        }
        if (addPwdForm.newPassword !== addPwdForm.confirmPassword) {
            setToast({ show: true, message: 'Les mots de passe ne correspondent pas.', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
            return;
        }
        setAddPwdLoading(true);
        try {
            await authService.setPassword(addPwdForm.newPassword);
            setUser((prev) => (prev ? { ...prev, hasPassword: true, authProvider: 'local' } : prev));
            setAddPwdForm({ newPassword: '', confirmPassword: '' });
            setToast({ show: true, message: 'Mot de passe ajouté. Vous pouvez aussi vous connecter avec votre e-mail.', type: 'success' });
        } catch (error) {
            setToast({ show: true, message: error.message || 'Erreur lors de l’ajout du mot de passe', type: 'error' });
        } finally {
            setAddPwdLoading(false);
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const errs = {};

        if (!pwdForm.currentPassword) errs.currentPassword = 'Requis.';
        if (!pwdForm.newPassword) errs.newPassword = 'Le nouveau mot de passe est obligatoire.';
        else if (!PWD_RE.test(pwdForm.newPassword)) errs.newPassword = '8 car. min. avec majuscule, minuscule, chiffre et symbole.';
        if (!pwdForm.confirmPassword) errs.confirmPassword = 'Confirmez votre mot de passe.';
        else if (pwdForm.newPassword !== pwdForm.confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas.';

        if (Object.keys(errs).length) {
            setPwdErrors(errs);
            return;
        }
        setPwdErrors({});
        setPwdLoading(true);

        try {
            await authService.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
            setToast({ show: true, message: 'Mot de passe modifié avec succès !', type: 'success' });
            setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setToast({ show: true, message: error.message || 'Erreur lors du changement de mot de passe', type: 'error' });
        } finally {
            setPwdLoading(false);
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('mbg_user');
        navigate('/');
        window.location.reload();
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            bio: formData.get('bio'),
            city: formData.get('city'),
            profilePicture: user.profilePicture || ''
        };

        try {
            const response = await usersService.updateProfile(payload);
            const updatedUser = normalizeUser(response?.data);

            if (!updatedUser) {
                throw new Error('Réponse invalide après mise à jour');
            }

            const storedData = localStorage.getItem('mbg_user');
            if (storedData) {
                const parsed = JSON.parse(storedData);
                if (parsed.user) {
                    parsed.user = updatedUser;
                    localStorage.setItem('mbg_user', JSON.stringify(parsed));
                } else {
                    localStorage.setItem('mbg_user', JSON.stringify({ ...parsed, ...updatedUser }));
                }
            }

            setUser(updatedUser);
            setToast({ show: true, message: 'Profil mis à jour !', type: 'success' });
        } catch (error) {
            setToast({ show: true, message: error.message || 'Erreur lors de la mise à jour', type: 'error' });
        } finally {
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setToast({ show: true, message: 'L\'image est trop volumineuse (max 5Mo)', type: 'error' });
            return;
        }

        setToast({ show: true, message: 'Import en cours…', type: 'info' });

        try {
            const uploadRes = await api.upload(file, 'mahdia_bg/profiles');
            if (!uploadRes?.success || !uploadRes?.data?.url) {
                throw new Error('Upload échoué');
            }

            const newPhotoUrl = uploadRes.data.url;

            await usersService.updateProfile({ profilePicture: newPhotoUrl });

            const updatedUser = { ...user, profilePicture: newPhotoUrl };
            const storedData = localStorage.getItem('mbg_user');
            if (storedData) {
                const parsed = JSON.parse(storedData);
                if (parsed.user) {
                    parsed.user = { ...parsed.user, profilePicture: newPhotoUrl };
                } else {
                    parsed.profilePicture = newPhotoUrl;
                }
                localStorage.setItem('mbg_user', JSON.stringify(parsed));
            }

            setUser(updatedUser);
            if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
            setToast({ show: true, message: 'Photo importée avec succès', type: 'success' });
            toastHideTimerRef.current = setTimeout(() => {
                setToast({ show: false, message: '', type: 'success' });
                toastHideTimerRef.current = null;
            }, IMPORT_SUCCESS_TOAST_MS);
        } catch (err) {
            setToast({ show: true, message: err.message || 'Erreur lors de l\'import de la photo', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await usersService.deleteProfile();
            localStorage.removeItem('mbg_user');
            localStorage.removeItem('mbg_registrations');
            setToast({ show: true, message: 'Compte supprimé avec succès', type: 'success' });
            setShowDeleteModal(false);
            setTimeout(() => {
                navigate('/');
                window.location.reload();
            }, 500);
        } catch (error) {
            setToast({ show: true, message: error.message || 'Erreur lors de la suppression du compte', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        }
    };

    if (profileLoadState !== 'ready' || !user) {
        return (
            <section className="section section--alt">
                <div className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Chargement de votre espace…</p>
                </div>
                <Toast message={toast.message} show={toast.show} type={toast.type} />
            </section>
        );
    }

    // Panier Pro : listes triées du plus récent au plus ancien (séparées par jour), puis paginées
    const byDateDesc = (getDate) => (a, b) => new Date(getDate(b) || 0) - new Date(getDate(a) || 0);
    const paginate = (list, page) => {
        const pages = Math.max(1, Math.ceil(list.length / PANIER_PAGE_SIZE));
        const safe = Math.min(Math.max(1, page), pages);
        return [list.slice((safe - 1) * PANIER_PAGE_SIZE, safe * PANIER_PAGE_SIZE), safe];
    };
    const [pagedArticles, articlesPageSafe] = paginate([...myArticles].sort(byDateDesc((a) => a.createdAt)), articlesPage);
    const [pagedEvents, eventsPageSafe] = paginate([...myEvents].sort(byDateDesc((e) => e.createdAt)), eventsPage);
    const [pagedQuestionnaires, questionnairesPageSafe] = paginate(
        [...participatingQuestionnaires].sort(byDateDesc((q) => q.eventInfo?.startDate)),
        questionnairesPage
    );

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'panier', label: 'Panier Pro', icon: FileText },
        { id: 'prefs', label: 'Préférences', icon: Settings },
        { id: 'registrations', label: 'Mes inscriptions', icon: Calendar },
        { id: 'security', label: 'Sécurité', icon: Shield },
    ];

    // Determine values for inputs (fallback to parsing name if first/last not set)
    const defaultFirstName = user.firstName || (user.name ? user.name.split(' ')[0] : '');
    const defaultLastName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');
    const normalizedRole = (user.role || '').toLowerCase();
    const canDeleteOwnAccount = normalizedRole === 'user';

    return (
        <section className="section section--alt">
            <div className="container">
                <div className="dashboard-layout">
                    {/* Sidebar */}
                    <aside className="dashboard-sidebar">
                        <div className="user-snippet">
                            <div className="user-avatar-container" style={{ position: 'relative', width: '80px', margin: '0 auto 1rem' }}>
                                <div className="user-avatar" style={{ marginBottom: 0 }}>
                                    {canDisplayProfileImage(user) ? (
                                        <img src={user.profilePicture} alt="Profile" />
                                    ) : (
                                        getUserInitialsFromName(user)
                                    )}
                                </div>
                                <button
                                    className="avatar-edit-btn"
                                    onClick={handlePhotoClick}
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: '2px solid var(--bg-surface)',
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                    title="Modifier la photo"
                                >
                                    <Camera size={14} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoChange}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                            </div>
                            <h3 className="user-snippet__name">
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name}
                            </h3>
                            <p className="user-snippet__email">{user.email}</p>
                        </div>

                        <nav className="dashboard-nav">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`nav-item ${activeTab === tab.id ? 'nav-item--active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <tab.icon />
                                    <span>{tab.label}</span>
                                </button>
                            ))}

                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '1rem 0' }}></div>

                            <button className="nav-item" onClick={handleLogout}>
                                <LogOut />
                                <span>Déconnexion</span>
                            </button>
                            {canDeleteOwnAccount ? (
                                <button className="nav-item nav-item--danger" onClick={() => setShowDeleteModal(true)}>
                                    <Trash2 />
                                    <span>Supprimer le compte</span>
                                </button>
                            ) : null}
                        </nav>
                    </aside>

                    {/* Content Area */}
                    <main className="dashboard-content">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="content-card">
                                <div className="card-header">
                                    <h2 className="card-title">Informations personnelles</h2>
                                </div>
                                <form onSubmit={handleSaveProfile}>
                                    <div className="grid grid--2" style={{ gap: '2rem', marginBottom: '2rem' }}>
                                        <div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Prénom</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        name="firstName"
                                                        defaultValue={defaultFirstName}
                                                        placeholder="Votre prénom"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Nom</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        name="lastName"
                                                        defaultValue={defaultLastName}
                                                        placeholder="Votre nom"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label" htmlFor="account-username">Nom d&apos;utilisateur</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        id="account-username"
                                                        type="text"
                                                        className="form-input"
                                                        value={user.username || ''}
                                                        readOnly
                                                        style={{ paddingLeft: '2.5rem' }}
                                                        disabled
                                                    />
                                                    <User style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '18px', color: 'var(--text-muted)' }} />
                                                </div>
                                                <p className="form-help">Le nom d&apos;utilisateur ne peut pas être modifié. Il vous permet de vous connecter, comme votre adresse email.</p>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Email</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="email"
                                                        className="form-input"
                                                        name="email"
                                                        value={user.email || ''}
                                                        readOnly
                                                        style={{ paddingLeft: '2.5rem' }}
                                                        disabled
                                                    />
                                                    <Mail style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '18px', color: 'var(--text-muted)' }} />
                                                </div>
                                                <p className="form-help">L'adresse email ne peut pas être modifiée.</p>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Ville</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        name="city"
                                                        defaultValue={user.city || ''}
                                                        placeholder="Votre ville"
                                                        style={{ paddingLeft: '2.5rem' }}
                                                    />
                                                    <MapPin style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', width: '18px', color: 'var(--text-muted)' }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="form-group">
                                                <label className="form-label">Bio (À propos de vous)</label>
                                                <textarea
                                                    className="form-textarea"
                                                    name="bio"
                                                    rows="8"
                                                    defaultValue={user.bio || ''}
                                                    placeholder="Dites-nous en plus sur vous..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button type="submit" className="btn btn--primary btn--lg">
                                            Enregistrer les modifications
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Panier Professionnel Tab */}
                        {activeTab === 'panier' && (
                            <>
                            {/* --- Mes Articles --- */}
                            <div className="content-card">
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h2 className="card-title">Mes Articles</h2>
                                    <button className="btn btn--primary btn--sm" onClick={() => navigate('/blog/creer')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FilePlus size={16} aria-hidden="true" />
                                        Nouvel article
                                    </button>
                                </div>

                                {articlesLoading ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>Chargement de vos articles…</p>
                                    </div>
                                ) : myArticles.length > 0 ? (
                                    <>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {withDaySeparators(pagedArticles, (a) => a.createdAt, (article) => {
                                            const isPublished = article.status === 'published';
                                            const isArchived = article.status === 'archived';
                                            const wasPublished = !!article.publishedOnce;
                                            // Validé et publié par un admin : plus modifiable par l'auteur
                                            const isLocked = isPublished || wasPublished;
                                            const reviewStatus = getEventReviewStatus(article);
                                            const reviewMeta = REVIEW_STATUS_META[reviewStatus];
                                            const revision = article.pendingRevision;

                                            return (
                                                <div
                                                    key={article._id}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--bg-base)',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    {article.articleData?.featuredImage && (
                                                        <img
                                                            src={article.articleData.featuredImage}
                                                            alt=""
                                                            style={{
                                                                width: '80px',
                                                                height: '60px',
                                                                objectFit: 'cover',
                                                                borderRadius: 'var(--radius-sm)',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    )}

                                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>
                                                            {article.title}
                                                        </h4>
                                                        {article.articleData?.summary && (
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                                {article.articleData.summary.substring(0, 100)}{article.articleData.summary.length > 100 ? '…' : ''}
                                                            </p>
                                                        )}
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                            {isPublished ? (
                                                                <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
                                                                    <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />Publié
                                                                </span>
                                                            ) : isArchived ? (
                                                                <span className="badge badge--gray" style={{ fontSize: '0.75rem' }}>Archivé</span>
                                                            ) : (
                                                                <span className={`badge badge--${wasPublished ? 'gray' : reviewMeta.badge}`} style={{ fontSize: '0.75rem' }}>
                                                                    {reviewStatus === 'pending' && <Clock size={12} style={{ marginRight: '0.25rem' }} />}
                                                                    {wasPublished ? 'Dépublié' : reviewMeta.label}
                                                                </span>
                                                            )}
                                                            {revision?.status === 'pending' && (
                                                                <span className="badge badge--yellow" style={{ fontSize: '0.75rem' }}>
                                                                    <Clock size={12} style={{ marginRight: '0.25rem' }} />Modification en attente
                                                                </span>
                                                            )}
                                                            {revision?.status === 'rejected' && (
                                                                <span className="badge badge--red" style={{ fontSize: '0.75rem' }}>Modification refusée</span>
                                                            )}
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {new Date(article.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        {!isPublished && reviewStatus === 'rejected' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-error, #e53e3e)' }}>
                                                                <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: '-1px' }} />
                                                                Motif du refus : {article.moderation?.reason || 'non précisé'}
                                                            </p>
                                                        )}
                                                        {revision?.status === 'rejected' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-error, #e53e3e)' }}>
                                                                <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: '-1px' }} />
                                                                Modification refusée : {revision.rejectionReason || 'motif non précisé'}. La version publiée reste inchangée.
                                                            </p>
                                                        )}
                                                        {revision?.status === 'pending' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                La version actuellement publiée reste visible jusqu&apos;à la validation de votre modification.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                                        {isLocked && (
                                                            <span className="lock-pill" title="Validé et publié par un administrateur : modification impossible">
                                                                <Lock size={12} /> Non modifiable
                                                            </span>
                                                        )}
                                                        {!isArchived && !isLocked && (
                                                            <button
                                                                className="btn btn--outline btn--sm"
                                                                onClick={() => navigate(`/blog/modifier/${article._id}`)}
                                                                title="Modifier cet article (soumis à validation)"
                                                            >
                                                                <Edit3 size={14} style={{ marginRight: '0.35rem' }} />
                                                                Modifier
                                                            </button>
                                                        )}
                                                        {(isPublished || wasPublished) && article.slug && (
                                                            <Link
                                                                to={`/article/${article.slug}`}
                                                                className="btn btn--outline btn--sm"
                                                                title="Voir l'article"
                                                            >
                                                                <Eye size={14} style={{ marginRight: '0.35rem' }} />
                                                                Voir
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Pagination
                                        currentPage={articlesPageSafe}
                                        totalItems={myArticles.length}
                                        pageSize={PANIER_PAGE_SIZE}
                                        onPageChange={setArticlesPage}
                                        itemLabel={myArticles.length > 1 ? 'articles' : 'article'}
                                    />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                                        <FileText style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: '0.5' }} />
                                        <p>Vous n&apos;avez pas encore d&apos;article.</p>
                                        <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                            Créez votre premier article — chaque création ou modification est publiée après validation d&apos;un administrateur.
                                        </p>
                                        <button className="btn btn--primary btn--sm" onClick={() => navigate('/blog/creer')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <FilePlus size={16} aria-hidden="true" />
                                            Créer un article
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* --- Mes Événements --- */}
                            <div className="content-card" style={{ marginTop: '1.5rem' }}>
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h2 className="card-title">Mes Événements</h2>
                                    <button className="btn btn--primary btn--sm" onClick={() => navigate('/evenements/creer')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <CalendarPlus size={16} aria-hidden="true" />
                                        Nouvel événement
                                    </button>
                                </div>

                                {eventsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>Chargement de vos événements…</p>
                                    </div>
                                ) : myEvents.length > 0 ? (
                                    <>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {withDaySeparators(pagedEvents, (e) => e.createdAt, (evt) => {
                                            const isPublished = evt.status === 'published';
                                            const isArchived = evt.status === 'archived';
                                            const wasPublished = !!evt.publishedOnce;
                                            const isLocked = isPublished || wasPublished;
                                            const reviewStatus = getEventReviewStatus(evt);
                                            const reviewMeta = REVIEW_STATUS_META[reviewStatus];
                                            const revision = evt.pendingRevision;
                                            const qInfo = eventQuestionnaires[String(evt._id)];
                                            const q = qInfo?.questionnaire;
                                            const qDeadline = qInfo?.deadline || getQuestionnaireDeadline(evt.eventData);
                                            const qWindowOpen = qInfo ? qInfo.canSubmit : isQuestionnaireWindowOpen(evt.eventData);
                                            // Date d'affichage aux inscrits : affichée tant qu'elle n'est pas encore atteinte
                                            const qOnlineVersion = q?.approvedVersion || q?.pendingVersion || null;
                                            const qDisplayAt = getDisplayOpening(evt.eventData, qOnlineVersion);
                                            const qNotDisplayedYet = !!q && !!qDisplayAt && qDisplayAt.getTime() > Date.now();
                                            // Événement terminé : plus aucune modification (événement et questionnaire)
                                            const isEnded = qInfo?.ended ?? isEventEnded(evt.eventData);
                                            const evImg = evt.eventData?.eventImage;
                                            const startD = evt.eventData?.startDate
                                                ? new Date(evt.eventData.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '';

                                            return (
                                                <div
                                                    key={evt._id}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        background: 'var(--bg-base)',
                                                        alignItems: 'center',
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    {evImg ? (
                                                        <img
                                                            src={evImg}
                                                            alt=""
                                                            style={{
                                                                width: '80px',
                                                                height: '60px',
                                                                objectFit: 'cover',
                                                                borderRadius: 'var(--radius-sm)',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: '80px',
                                                            height: '60px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            background: 'var(--bg-surface)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}>
                                                            <CalendarPlus size={24} style={{ color: 'var(--text-muted)' }} />
                                                        </div>
                                                    )}

                                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                                        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>
                                                            {evt.title}
                                                        </h4>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {startD && <span>{startD}</span>}
                                                            {evt.eventData?.location && <span>• {evt.eventData.location}</span>}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                            {isPublished ? (
                                                                <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
                                                                    <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />Publié
                                                                </span>
                                                            ) : isArchived ? (
                                                                <span className="badge badge--gray" style={{ fontSize: '0.75rem' }}>Archivé</span>
                                                            ) : (
                                                                <span className={`badge badge--${wasPublished ? 'gray' : reviewMeta.badge}`} style={{ fontSize: '0.75rem' }}>
                                                                    {reviewStatus === 'pending' && <Clock size={12} style={{ marginRight: '0.25rem' }} />}
                                                                    {wasPublished ? 'Dépublié' : reviewMeta.label}
                                                                </span>
                                                            )}
                                                            {revision?.status === 'pending' && (
                                                                <span className="badge badge--yellow" style={{ fontSize: '0.75rem' }}>
                                                                    <Clock size={12} style={{ marginRight: '0.25rem' }} />Modification en attente
                                                                </span>
                                                            )}
                                                            {revision?.status === 'rejected' && (
                                                                <span className="badge badge--red" style={{ fontSize: '0.75rem' }}>Modification refusée</span>
                                                            )}
                                                            <span
                                                                className={`badge badge--${q ? REVIEW_STATUS_META[q.reviewStatus].badge : 'gray'}`}
                                                                style={{ fontSize: '0.68rem', textTransform: 'none', letterSpacing: 'normal', fontWeight: 500, lineHeight: 1.3, padding: '0.2rem 0.55rem' }}
                                                                title="Statut du questionnaire"
                                                            >
                                                                <ClipboardList size={12} style={{ marginRight: '0.25rem' }} />
                                                                {q
                                                                    ? `Questionnaire : ${REVIEW_STATUS_META[q.reviewStatus].label.toLowerCase()}${q.approvedVersion && q.reviewStatus !== 'approved' ? ' (version approuvée en ligne)' : ''}`
                                                                    : 'Sans questionnaire'}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {new Date(evt.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        {!isPublished && reviewStatus === 'rejected' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-error, #e53e3e)' }}>
                                                                <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: '-1px' }} />
                                                                Motif du refus : {evt.moderation?.reason || 'non précisé'}
                                                            </p>
                                                        )}
                                                        {revision?.status === 'rejected' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-error, #e53e3e)' }}>
                                                                <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: '-1px' }} />
                                                                Modification refusée : {revision.rejectionReason || 'motif non précisé'}. La version publiée reste inchangée.
                                                            </p>
                                                        )}
                                                        {revision?.status === 'pending' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                La version actuellement publiée reste visible jusqu&apos;à la validation de votre modification.
                                                            </p>
                                                        )}
                                                        {q?.reviewStatus === 'rejected' && (
                                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-error, #e53e3e)' }}>
                                                                <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: '-1px' }} />
                                                                Questionnaire refusé : {q.rejectionReason || 'motif non précisé'}
                                                            </p>
                                                        )}
                                                        {qNotDisplayedYet && (
                                                            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                {q.approvedVersion
                                                                    ? `Affiché aux inscrits le ${formatDateTime(qDisplayAt)}`
                                                                    : `Après validation par un administrateur, affiché aux inscrits le ${formatDateTime(qDisplayAt)}`}
                                                            </p>
                                                        )}
                                                        {(qInfo?.locked || isEnded || !qWindowOpen) && (
                                                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: qWindowOpen ? 'var(--text-muted)' : 'var(--color-error, #e53e3e)' }}>
                                                            {qInfo?.locked && !isEnded
                                                                ? 'Des participants ont déjà répondu : le questionnaire n’est plus modifiable'
                                                                : isEnded
                                                                ? (q || !qWindowOpen
                                                                    ? 'Événement terminé : l’événement et le questionnaire ne sont plus modifiables'
                                                                    : `Événement terminé : questionnaire encore ajoutable jusqu'au ${formatDateTime(qDeadline)}`)
                                                                : 'Délai de 72 h dépassé : création de questionnaire impossible'}
                                                            {q ? ` · ${qInfo.responseCount} réponse${qInfo.responseCount > 1 ? 's' : ''}` : ''}
                                                        </p>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                                                        {isEnded && (
                                                            <span className="badge badge--gray" style={{ fontSize: '0.75rem', alignSelf: 'center' }} title="Les événements terminés ne sont plus modifiables">
                                                                Terminé
                                                            </span>
                                                        )}
                                                        {isLocked && !isEnded && !(q && qInfo?.canSubmit) && (
                                                            <span className="lock-pill" title="Validé et publié par un administrateur : modification impossible">
                                                                <Lock size={12} /> Non modifiable
                                                            </span>
                                                        )}
                                                        {!isArchived && !isEnded && !isLocked && (
                                                            <button
                                                                type="button"
                                                                className="btn btn--outline btn--sm"
                                                                onClick={() => navigate(`/evenements/modifier/${evt._id}`)}
                                                                title="Modifier cet événement (soumis à validation)"
                                                            >
                                                                <Edit3 size={14} style={{ marginRight: '0.35rem' }} />
                                                                Modifier
                                                            </button>
                                                        )}
                                                        {(q || qWindowOpen) && (
                                                            <button
                                                                type="button"
                                                                className="btn btn--outline btn--sm"
                                                                onClick={() => setQuestionnaireEvent(evt)}
                                                                title={q ? (isEnded || qInfo?.locked ? 'Consulter le questionnaire et les réponses' : 'Gérer le questionnaire et consulter les réponses') : 'Ajouter un questionnaire'}
                                                            >
                                                                <ClipboardList size={14} style={{ marginRight: '0.35rem' }} />
                                                                {q ? (isEnded || qInfo?.locked ? 'Questionnaire et réponses' : 'Questionnaire') : 'Ajouter un questionnaire'}
                                                            </button>
                                                        )}
                                                        {(isPublished || wasPublished) && (
                                                            <Link
                                                                to={`/evenement/${evt.eventNumber != null ? evt.eventNumber : (evt._id || evt.slug)}`}
                                                                className="btn btn--outline btn--sm"
                                                                title="Voir l'événement"
                                                            >
                                                                <Eye size={14} style={{ marginRight: '0.35rem' }} />
                                                                Voir
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Pagination
                                        currentPage={eventsPageSafe}
                                        totalItems={myEvents.length}
                                        pageSize={PANIER_PAGE_SIZE}
                                        onPageChange={setEventsPage}
                                        itemLabel={myEvents.length > 1 ? 'événements' : 'événement'}
                                    />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                                        <Calendar style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: '0.5' }} />
                                        <p>Vous n&apos;avez pas encore d&apos;événement.</p>
                                        <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                            Proposez un événement — chaque création ou modification est publiée après validation d&apos;un administrateur.
                                        </p>
                                        <button className="btn btn--primary btn--sm" onClick={() => navigate('/evenements/creer')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <CalendarPlus size={16} aria-hidden="true" />
                                            Créer un événement
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* --- Questionnaires des événements auxquels je participe --- */}
                            {/* scrollMarginTop : la barre de navigation fixe ne recouvre pas le titre après défilement */}
                            <div id="mes-questionnaires" className="content-card" style={{ marginTop: '1.5rem', scrollMarginTop: '110px' }}>
                                <div className="card-header">
                                    <h2 className="card-title">Questionnaires de mes événements</h2>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Questionnaires proposés par les organisateurs des événements auxquels vous êtes inscrit.
                                    </p>
                                </div>
                                {participatingQuestionnaires.length > 0 ? (
                                    <>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {withDaySeparators(pagedQuestionnaires, (q) => q.eventInfo?.startDate, (pq) => (
                                            <div
                                                key={pq._id}
                                                className={isAwaitingAnswer(pq) ? 'eq-row--live' : undefined}
                                                style={{
                                                    display: 'flex', gap: '1rem', padding: '1rem', alignItems: 'center', flexWrap: 'wrap',
                                                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: '200px' }}>
                                                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{pq.title}</h4>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {pq.eventInfo?.title}{pq.eventInfo?.startDate ? ` • ${formatDateTime(pq.eventInfo.startDate)}` : ''}
                                                    </div>
                                                    {!pq.hasResponded && availabilityLabel(pq) && (
                                                        <span className={`eq-avail eq-avail--${availabilityLabel(pq).tone}`}>
                                                            <Clock size={12} /> {availabilityLabel(pq).text}
                                                        </span>
                                                    )}
                                                </div>
                                                {pq.hasResponded ? (
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
                                                            <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />
                                                            Répondu{pq.respondedAt ? ` le ${new Date(pq.respondedAt).toLocaleDateString('fr-FR')}` : ''}
                                                        </span>
                                                        <button type="button" className="btn btn--outline btn--sm" onClick={() => setViewingResponseOf(pq)}>
                                                            <Eye size={14} style={{ marginRight: '0.35rem' }} />
                                                            Voir mes réponses
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={`btn btn--primary btn--sm${isAwaitingAnswer(pq) ? ' btn--live' : ''}`}
                                                        disabled={!!pq.availability && pq.availability !== 'open'}
                                                        title={pq.availability && pq.availability !== 'open' ? availabilityLabel(pq).text : undefined}
                                                        onClick={() => setAnsweringQuestionnaire(pq)}
                                                    >
                                                        {pq.availability === 'closed' ? 'Clos' : pq.availability === 'upcoming' ? 'Bientôt' : 'Répondre'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={questionnairesPageSafe}
                                        totalItems={participatingQuestionnaires.length}
                                        pageSize={PANIER_PAGE_SIZE}
                                        onPageChange={setQuestionnairesPage}
                                        itemLabel={participatingQuestionnaires.length > 1 ? 'questionnaires' : 'questionnaire'}
                                    />
                                    </>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                        Aucun questionnaire disponible pour vos inscriptions.
                                    </p>
                                )}
                            </div>
                            </>
                        )}

                        {/* Preferences Tab */}
                        {activeTab === 'prefs' && (
                            <div className="content-card">
                                <div className="card-header">
                                    <h2 className="card-title">Préférences de notification</h2>
                                </div>
                                <div style={{ maxWidth: '600px' }}>
                                    <label className="form-checkbox" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                        <input type="checkbox" defaultChecked />
                                        <div>
                                            <span style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Newsletter</span>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Recevez nos dernières actualités et mises à jour.</span>
                                        </div>
                                    </label>
                                    <label className="form-checkbox" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                        <input type="checkbox" defaultChecked />
                                        <div>
                                            <span style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Événements</span>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Soyez notifié des nouveaux événements à venir.</span>
                                        </div>
                                    </label>
                                    <label className="form-checkbox" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                        <input type="checkbox" />
                                        <div>
                                            <span style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Articles de blog</span>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Recevez une alerte lorsqu'un nouvel article est publié.</span>
                                        </div>
                                    </label>
                                    <button className="btn btn--primary">Sauvegarder mes préférences</button>
                                </div>
                            </div>
                        )}

                        {/* Registrations Tab */}
                        {activeTab === 'registrations' && (
                            <div className="content-card">
                                <div className="card-header">
                                    <h2 className="card-title">Mes inscriptions aux événements</h2>
                                </div>
                                {registrationsLoading && registrations.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                        <p style={{ color: 'var(--text-secondary)' }}>Chargement de vos inscriptions…</p>
                                    </div>
                                ) : registrationsTotal > 0 ? (
                                    <>
                                    <div className="table-responsive" style={{ opacity: registrationsLoading ? 0.6 : 1, transition: 'opacity 150ms' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Événement</th>
                                                    <th>Date de l&apos;événement</th>
                                                    <th>Date d&apos;inscription</th>
                                                    <th>Statut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {registrations.map((reg) => (
                                                    <tr key={reg._id}>
                                                        <td>
                                                            <Link
                                                                to={`/evenement/${reg.eventNumber != null ? reg.eventNumber : (reg.slug || reg._id)}`}
                                                                style={{ fontWeight: 500 }}
                                                            >
                                                                {reg.title}
                                                            </Link>
                                                            {reg.location && (
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{reg.location}</div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {reg.startDate
                                                                ? new Date(reg.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : '—'}
                                                        </td>
                                                        <td>
                                                            {reg.registeredAt
                                                                ? new Date(reg.registeredAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
                                                                : '—'}
                                                        </td>
                                                        <td>
                                                            {reg.isPast
                                                                ? <span className="badge badge--gray">Terminé</span>
                                                                : <span className="badge badge--green">Confirmé</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        currentPage={registrationsPage}
                                        totalItems={registrationsTotal}
                                        pageSize={REGISTRATIONS_PAGE_SIZE}
                                        onPageChange={setRegistrationsPage}
                                        itemLabel={registrationsTotal > 1 ? 'inscriptions' : 'inscription'}
                                    />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                                        <Calendar style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: '0.5' }} />
                                        <p>Vous n'êtes inscrit à aucun événement pour le moment.</p>
                                        <button className="btn btn--outline btn--sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/evenements')}>
                                            Voir l'agenda
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="content-card">
                                <div className="card-header">
                                    <h2 className="card-title">Sécurité et Connexion</h2>
                                </div>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-label">Méthode de connexion</div>
                                        <div className="info-value" style={{ textTransform: 'capitalize' }}>
                                            {user.authProvider || 'Email/Mot de passe'}
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <div className="info-label">Dernière connexion</div>
                                        <div className="info-value">Aujourd'hui</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Authentification à deux facteurs (2FA)</h3>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                Ajoutez une couche de sécurité supplémentaire à votre compte.
                                            </p>
                                            {user.twoFactorEnabled ? (
                                                <div className="security-status">
                                                    <Shield size={18} />
                                                    Authentification à deux facteurs activée
                                                </div>
                                            ) : (
                                                <div className="security-status security-status--warning">
                                                    <Shield size={18} />
                                                    Authentification à deux facteurs désactivée
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="btn btn--primary"
                                            onClick={() => navigate('/compte/2fa')}
                                        >
                                            {user.twoFactorEnabled ? 'Gérer la 2FA' : 'Activer la 2FA'}
                                        </button>
                                    </div>
                                </div>

                                {user.hasPassword === false && (
                                    <div style={{ marginTop: '2rem' }}>
                                        <h3 style={{ marginBottom: '0.5rem' }}>Ajouter un mot de passe</h3>
                                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                                            Votre compte est lié à {user.authProvider === 'google' ? 'Google' : user.authProvider}.
                                            Ajoutez un mot de passe pour vous connecter aussi avec votre e-mail ({user.email}).
                                            Votre compte et vos données restent les mêmes.
                                        </p>
                                        <form onSubmit={handleSetPassword}>
                                            <div className="form-group">
                                                <label className="form-label">Nouveau mot de passe *</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showAddPwd.newPassword ? 'text' : 'password'}
                                                        className="form-input"
                                                        required
                                                        style={{ paddingRight: '2.75rem' }}
                                                        value={addPwdForm.newPassword}
                                                        onChange={(e) => setAddPwdForm({ ...addPwdForm, newPassword: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddPwd((p) => ({ ...p, newPassword: !p.newPassword }))}
                                                        aria-label={showAddPwd.newPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                        title={showAddPwd.newPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                                                    >
                                                        {showAddPwd.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Confirmer le mot de passe *</label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type={showAddPwd.confirmPassword ? 'text' : 'password'}
                                                        className="form-input"
                                                        required
                                                        style={{ paddingRight: '2.75rem' }}
                                                        value={addPwdForm.confirmPassword}
                                                        onChange={(e) => setAddPwdForm({ ...addPwdForm, confirmPassword: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddPwd((p) => ({ ...p, confirmPassword: !p.confirmPassword }))}
                                                        aria-label={showAddPwd.confirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                        title={showAddPwd.confirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                                                    >
                                                        {showAddPwd.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                                                <button type="submit" className="btn btn--primary" disabled={addPwdLoading}>
                                                    {addPwdLoading ? 'Ajout…' : 'Ajouter le mot de passe'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {user.hasPassword === true && (
                                    <div style={{ marginTop: '2rem' }}>
                                        <h3 style={{ marginBottom: '1.5rem' }}>Changer de mot de passe</h3>
                                        <form onSubmit={handleChangePassword}>
                                            <div className="form-group">
                                                <label className="form-label">Mot de passe actuel *</label>
                                                <input
                                                    type="password"
                                                    className="form-input"
                                                    name="currentPassword"
                                                    required
                                                    value={pwdForm.currentPassword}
                                                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid--2" style={{ gap: '1.5rem' }}>
                                                <div className="form-group">
                                                    <label className="form-label">Nouveau mot de passe *</label>
                                                    <input
                                                        type="password"
                                                        className="form-input"
                                                        name="newPassword"
                                                        required
                                                        value={pwdForm.newPassword}
                                                        onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                                        style={pwdErrors.newPassword ? { borderColor: 'var(--color-error, #e53e3e)' } : {}}
                                                    />
                                                    {pwdErrors.newPassword && (
                                                        <p style={{ color: 'var(--color-error, #e53e3e)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                            {pwdErrors.newPassword}
                                                        </p>
                                                    )}
                                                    {pwdForm.newPassword && !pwdErrors.newPassword && (
                                                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                            {[
                                                                { test: /.{8,}/, label: '8 caractères minimum' },
                                                                { test: /[A-Z]/, label: 'Une majuscule' },
                                                                { test: /[a-z]/, label: 'Une minuscule' },
                                                                { test: /\d/, label: 'Un chiffre' },
                                                                { test: /[\W_]/, label: 'Un symbole' },
                                                            ].map(({ test, label }) => (
                                                                <span key={label} style={{ fontSize: '0.75rem', color: test.test(pwdForm.newPassword) ? 'var(--color-success, #38a169)' : 'var(--text-muted)' }}>
                                                                    {test.test(pwdForm.newPassword) ? '✓' : '○'} {label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Confirmer le mot de passe *</label>
                                                    <input
                                                        type="password"
                                                        className="form-input"
                                                        name="confirmPassword"
                                                        required
                                                        value={pwdForm.confirmPassword}
                                                        onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                                                        style={pwdErrors.confirmPassword ? { borderColor: 'var(--color-error, #e53e3e)' } : {}}
                                                    />
                                                    {pwdErrors.confirmPassword && (
                                                        <p style={{ color: 'var(--color-error, #e53e3e)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                            {pwdErrors.confirmPassword}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                                                <button type="submit" className="btn btn--primary" disabled={pwdLoading}>
                                                    {pwdLoading ? 'Modification…' : 'Mettre à jour le mot de passe'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <Toast message={toast.message} show={toast.show} type={toast.type} />
            <Modal
                isOpen={!!questionnaireEvent}
                onClose={() => setQuestionnaireEvent(null)}
                title={questionnaireEvent ? `Questionnaire — ${questionnaireEvent.title}` : ''}
                contentClassName="modal__content--lg"
            >
                {questionnaireEvent && (
                    <EventQuestionnaireManager
                        event={questionnaireEvent}
                        onChanged={loadEventQuestionnaires}
                        onToast={showPanierToast}
                    />
                )}
            </Modal>
            <Modal
                isOpen={!!answeringQuestionnaire}
                onClose={() => setAnsweringQuestionnaire(null)}
                title={answeringQuestionnaire ? answeringQuestionnaire.title : ''}
                contentClassName="modal__content--lg"
            >
                {answeringQuestionnaire && (
                    <EventQuestionnaireAnswerForm
                        key={answeringQuestionnaire._id}
                        questionnaire={answeringQuestionnaire}
                        onSubmit={handleSubmitAnswers}
                        submitting={answerSubmitting}
                        submitLabel="Envoyer mes réponses"
                    />
                )}
            </Modal>
            <Modal
                isOpen={!!viewingResponseOf}
                onClose={() => setViewingResponseOf(null)}
                title={viewingResponseOf ? `Mes réponses — ${viewingResponseOf.title}` : ''}
                contentClassName="modal__content--lg"
            >
                {viewingResponseOf && (
                    <EventQuestionnaireMyResponse eventId={viewingResponseOf.eventInfo?._id} />
                )}
            </Modal>
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Confirmer la suppression"
            >
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <p>Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button className="btn btn--ghost" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                        <button className="btn btn--primary" onClick={handleDeleteAccount}>Confirmer</button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
