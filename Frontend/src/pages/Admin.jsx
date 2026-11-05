import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Users, Newspaper, Handshake, Briefcase, BarChart3 } from 'lucide-react';
import { ArticlesIcon, EventsIcon, ResourcesIcon, UsersIcon } from '../components/Icons';
import { adminService, eventsService, articlesService, resourcesService, contactService, teamService, newsletterService, partnerService, entrepreneurService, api } from '../services';
import { downloadFileResource } from '../utils/cloudinaryDelivery';
import { matchesCreatedAtRange, textIncludes } from '../utils/adminListFilters';
import {
    getTomorrowMidnightLocalString,
    addMinutesToDatetimeLocalString,
    validateEventSchedule,
    getDatetimeLocalMinForStartEdit,
} from '../utils/eventScheduling';
import {
    ADMIN_PAGE_SIZE,
    EMPTY_PARTNER_FORM,
    EMPTY_PUBLIC_TEAM_FORM,
    EMPTY_ENTREPRENEUR_FORM,
    DEFAULT_ADMIN_ARTICLE_FORM,
    emptyPaginated,
    QUESTION_CATEGORY_OPTIONS,
    SIDEBAR_COLLAPSED_KEY,
    PERSONAL_INFO_FIELD_VALUES,
    QUESTIONNAIRE_PREVIEW_FALLBACK_DESC,
    Q_STATS_PAGE_SIZE,
} from './admin/constants';
import {
    formatAdminTeamDateTime,
    adminTeamDisplayValue,
    formatArticleStatus,
    staffRolePillClass,
    adminUserRoleSelectClass,
    adminUserStatusSelectClass,
} from './admin/utils/helpers';
import DashboardIcon from './admin/components/DashboardIcon';
import { AdminCheckingAuth, AdminUnauthenticated } from './admin/components/AdminAuthScreens';
import { getAdminSectionSlug, adminPath, ADMIN_SECTION_SLUGS, getAllowedAdminSectionSlugs } from './admin/routing';
import { AdminPanelContext } from './admin/AdminPanelContext';
import AdminShell from './admin/AdminShell';


export default function Admin() {
    const [dashboardData, setDashboardData] = useState(null);
    const dashboardDataRef = useRef(null);
    const [users, setUsers] = useState(emptyPaginated);
    const [userPage, setUserPage] = useState(1);
    const [staffUsers, setStaffUsers] = useState(emptyPaginated);
    const [staffPage, setStaffPage] = useState(1);
    const [posts, setPosts] = useState(emptyPaginated);
    const [articlesLoading, setArticlesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [updatingRole, setUpdatingRole] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });
    const [showEventForm, setShowEventForm] = useState(false);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [editEventForm, setEditEventForm] = useState({ title: '', body: '', startDate: '', endDate: '', location: '', capacity: '', eventImage: '', status: 'draft' });
    const [editEventImageUploading, setEditEventImageUploading] = useState(false);
    const [resources, setResources] = useState([]);
    const [categories, setCategories] = useState([]);
    const [levels, setLevels] = useState([]);
    const [eventFormData, setEventFormData] = useState({
        title: '', body: '', startDate: '', endDate: '', location: '', capacity: '50', eventImage: '', category: '', level: '',
    });
    const [eventImageUploading, setEventImageUploading] = useState(false);
    const [eventImageUrlCheckStatus, setEventImageUrlCheckStatus] = useState('');
    const [eventFormSubmitting, setEventFormSubmitting] = useState(false);
    const adminNewEventImageCheckTimer = useRef(null);
    const [resourceFormData, setResourceFormData] = useState({
        title: '', type: 'document', url: '', description: '', category: '', fileExtension: '', mimeType: '', originalName: ''
    });
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    const [editingResource, setEditingResource] = useState(null);
    const [editResourceForm, setEditResourceForm] = useState({ title: '', type: 'document', url: '', description: '', category: '', fileExtension: '', mimeType: '', originalName: '' });
    const [editResourceUploading, setEditResourceUploading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const toastHideTimerRef = useRef(null);

    // Questionnaire state
    const [registrationQuestionnaire, setRegistrationQuestionnaire] = useState(null);
    const [questionnairesList, setQuestionnairesList] = useState([]);
    const [showQForm, setShowQForm] = useState(false);
    const PROFESSION_OPTIONS = [
        'Étudiant(e)', 'Enseignant(e) / Professeur', 'Chercheur(euse)',
        'Entrepreneur(euse) / CEO', 'Employé(e) / Salarié(e)', 'Fonctionnaire',
        'Freelance / Indépendant', 'Sans emploi / En recherche', 'Retraité(e)', 'Autre'
    ];
    const [qFormData, setQFormData] = useState({
        title: '',
        description: '',
        isRegistrationQuestionnaire: false,
        targetProfessions: [],
        questions: [],
        opensAt: '',
        closesAt: ''
    });
    const [qEditId, setQEditId] = useState(null);
    const [qEditForm, setQEditForm] = useState({
        title: '',
        description: '',
        isActive: true,
        isRegistrationQuestionnaire: false,
        targetProfessions: [],
        opensAt: '',
        closesAt: ''
    });
    const [qSaving, setQSaving] = useState(false);
    const [qQuestionsModal, setQQuestionsModal] = useState(null);
    const [qPreview, setQPreview] = useState(null);
    const [qPreviewLoading, setQPreviewLoading] = useState(false);
    const [qPanelSelectedId, setQPanelSelectedId] = useState(null);
    const [qStats, setQStats] = useState(null);
    const [qStatsLoading, setQStatsLoading] = useState(false);
    const [qQuestionsSaving, setQQuestionsSaving] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: '', type: 'text', isRequired: false, options: '', category: 'general' });
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [postModalMode, setPostModalMode] = useState('view'); // view | edit | create
    const [selectedPost, setSelectedPost] = useState(null);
    const [articlePage, setArticlePage] = useState(1);
    const [articleTotalPages, setArticleTotalPages] = useState(1);
    const [eventPage, setEventPage] = useState(1);
    const [resourcePage, setResourcePage] = useState(1);
    const [qListPage, setQListPage] = useState(1);
    const [reactPage, setReactPage] = useState(1);
    const [postForm, setPostForm] = useState(() => ({ ...DEFAULT_ADMIN_ARTICLE_FORM }));
    const [uploading, setUploading] = useState(false);
    const [resourceUploading, setResourceUploading] = useState(false);
    const [articleSaving, setArticleSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, kind: null, payload: null, message: '' });
    const [userDetailModal, setUserDetailModal] = useState({ isOpen: false, user: null, posts: [], loading: false });
    const [reactivationRequests, setReactivationRequests] = useState([]);
    const [reactivationActionId, setReactivationActionId] = useState(null);

    const [userFilterQ, setUserFilterQ] = useState('');
    const [userFilterQDeb, setUserFilterQDeb] = useState('');
    const [userDateFrom, setUserDateFrom] = useState('');
    const [userDateTo, setUserDateTo] = useState('');
    const [userStatusFilter, setUserStatusFilter] = useState('');

    const [staffFilterQ, setStaffFilterQ] = useState('');
    const [staffFilterQDeb, setStaffFilterQDeb] = useState('');
    const [staffDateFrom, setStaffDateFrom] = useState('');
    const [staffDateTo, setStaffDateTo] = useState('');
    const [staffRoleFilter, setStaffRoleFilter] = useState('');
    const [staffStatusFilter, setStaffStatusFilter] = useState('');

    const [articleFilterQ, setArticleFilterQ] = useState('');
    const [articleFilterQDeb, setArticleFilterQDeb] = useState('');
    /** Une seule journée (colonne Date = createdAt), vide = pas de filtre */
    const [articleFilterDate, setArticleFilterDate] = useState('');
    const [articleStatusFilter, setArticleStatusFilter] = useState('');

    const [eventFilterQ, setEventFilterQ] = useState('');
    const [eventDateFrom, setEventDateFrom] = useState('');
    const [eventDateTo, setEventDateTo] = useState('');
    const [eventStatusFilter, setEventStatusFilter] = useState('');

    const [resourceFilterQ, setResourceFilterQ] = useState('');
    const [resourceDateFrom, setResourceDateFrom] = useState('');
    const [resourceDateTo, setResourceDateTo] = useState('');

    const [contacts, setContacts] = useState([]);
    const [contactPage, setContactPage] = useState(1);
    const [contactFilterQ, setContactFilterQ] = useState('');
    const [contactDateFrom, setContactDateFrom] = useState('');
    const [contactDateTo, setContactDateTo] = useState('');
    const [contactDetail, setContactDetail] = useState(null);
    const [replyModal, setReplyModal] = useState(null);
    const [replyBody, setReplyBody] = useState('');
    const [replySending, setReplySending] = useState(false);

    const [publicTeamMembers, setPublicTeamMembers] = useState([]);
    const [publicTeamPage, setPublicTeamPage] = useState(1);
    const [publicTeamFilterQ, setPublicTeamFilterQ] = useState('');
    const [publicTeamDateFrom, setPublicTeamDateFrom] = useState('');
    const [publicTeamDateTo, setPublicTeamDateTo] = useState('');
    const [publicTeamFormOpen, setPublicTeamFormOpen] = useState(false);
    const [publicTeamEditId, setPublicTeamEditId] = useState(null);
    const [publicTeamForm, setPublicTeamForm] = useState(() => ({ ...EMPTY_PUBLIC_TEAM_FORM }));
    const [publicTeamSaving, setPublicTeamSaving] = useState(false);
    const [publicTeamAvatarUploading, setPublicTeamAvatarUploading] = useState(false);
    const [publicTeamViewMember, setPublicTeamViewMember] = useState(null);

    const [newsletterSubs, setNewsletterSubs] = useState([]);
    const [newsletterPage, setNewsletterPage] = useState(1);
    const [newsletterFilterQ, setNewsletterFilterQ] = useState('');
    const [newsletterDateFrom, setNewsletterDateFrom] = useState('');
    const [newsletterDateTo, setNewsletterDateTo] = useState('');
    const [newsletterEdit, setNewsletterEdit] = useState(null);
    const [newsletterEditEmail, setNewsletterEditEmail] = useState('');
    const [newsletterEditSource, setNewsletterEditSource] = useState('');
    const [newsletterEditStatus, setNewsletterEditStatus] = useState('active');
    const [newsletterSaving, setNewsletterSaving] = useState(false);
    const [newsletterBroadcastOpen, setNewsletterBroadcastOpen] = useState(false);
    const [newsletterBroadcastSubject, setNewsletterBroadcastSubject] = useState('');
    const [newsletterBroadcastMessage, setNewsletterBroadcastMessage] = useState('');
    const [newsletterBroadcastSending, setNewsletterBroadcastSending] = useState(false);
    const [newsletterBroadcastUploading, setNewsletterBroadcastUploading] = useState(false);

    const [partnersList, setPartnersList] = useState([]);
    const [partnerPage, setPartnerPage] = useState(1);
    const [partnerFilterQ, setPartnerFilterQ] = useState('');
    const [partnerDateFrom, setPartnerDateFrom] = useState('');
    const [partnerDateTo, setPartnerDateTo] = useState('');
    const [partnerFormOpen, setPartnerFormOpen] = useState(false);
    const [partnerEditId, setPartnerEditId] = useState(null);
    const [partnerForm, setPartnerForm] = useState(() => ({ ...EMPTY_PARTNER_FORM }));
    const [partnerSaving, setPartnerSaving] = useState(false);
    const [partnerLogoUploading, setPartnerLogoUploading] = useState(false);
    const [partnerViewMember, setPartnerViewMember] = useState(null);

    const [entrepreneursList, setEntrepreneursList] = useState([]);
    const [entrepreneurPage, setEntrepreneurPage] = useState(1);
    const [entrepreneurFilterQ, setEntrepreneurFilterQ] = useState('');
    const [entrepreneurDateFrom, setEntrepreneurDateFrom] = useState('');
    const [entrepreneurDateTo, setEntrepreneurDateTo] = useState('');
    const [entrepreneurFormOpen, setEntrepreneurFormOpen] = useState(false);
    const [entrepreneurEditId, setEntrepreneurEditId] = useState(null);
    const [entrepreneurForm, setEntrepreneurForm] = useState(() => ({ ...EMPTY_ENTREPRENEUR_FORM }));
    const [entrepreneurSaving, setEntrepreneurSaving] = useState(false);
    const [entrepreneurAvatarUploading, setEntrepreneurAvatarUploading] = useState(false);
    const [entrepreneurViewItem, setEntrepreneurViewItem] = useState(null);

    const [qListFilterQ, setQListFilterQ] = useState('');
    const [qListDateFrom, setQListDateFrom] = useState('');
    const [qListDateTo, setQListDateTo] = useState('');

    const [reactFilterQ, setReactFilterQ] = useState('');
    const [reactDateFrom, setReactDateFrom] = useState('');
    const [reactDateTo, setReactDateTo] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const routeSlug = getAdminSectionSlug(location.pathname);
    const activeSection = routeSlug || 'dashboard';
    const goToSection = useCallback((section) => {
        navigate(adminPath(section));
    }, [navigate]);

    useEffect(() => {
        dashboardDataRef.current = dashboardData;
    }, [dashboardData]);

    const fetchDashboardData = useCallback(async ({ silent = false } = {}) => {
        if (!isAuthenticated) return;
        try {
            if (!silent) {
                setLoading(true);
            }
            setError(null);

            const response = await adminService.getDashboard();

            if (response && response.success && response.data) {
                setDashboardData(response.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            const errorMessage = err.message || 'Failed to load dashboard data';
            if (!silent) {
                setError(errorMessage);
            }
            const unauthorized =
                err.message &&
                (err.message.includes('401') ||
                    err.message.includes('403') ||
                    err.message.includes('Unauthorized'));
            if (unauthorized) {
                localStorage.removeItem('mbg_user');
                setTimeout(() => {
                    navigate('/auth', { replace: true });
                }, 2000);
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [isAuthenticated, navigate]);

    const resourceCategoryOptions = useMemo(() => {
        const norm = (s = '') =>
            String(s)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        const findCategoryId = (matcher) => {
            const found = categories.find((c) => matcher(norm(c?.title)));
            return found?._id || '';
        };
        return [
            { value: '', label: 'Guide de ressources' },
            { value: findCategoryId((t) => t.includes('bleu')), label: 'Économie Bleue' },
            { value: findCategoryId((t) => t.includes('vert')), label: 'Économie Verte' },
            { value: findCategoryId((t) => t.includes('circul')), label: 'Économie Circulaire' },
        ];
    }, [categories]);

    useEffect(() => {
        const t = setTimeout(() => setUserFilterQDeb(userFilterQ.trim()), 400);
        return () => clearTimeout(t);
    }, [userFilterQ]);
    useEffect(() => {
        const t = setTimeout(() => setStaffFilterQDeb(staffFilterQ.trim()), 400);
        return () => clearTimeout(t);
    }, [staffFilterQ]);
    useEffect(() => {
        const t = setTimeout(() => setArticleFilterQDeb(articleFilterQ.trim()), 400);
        return () => clearTimeout(t);
    }, [articleFilterQ]);

    useEffect(() => {
        setUserPage(1);
    }, [userFilterQDeb, userDateFrom, userDateTo, userStatusFilter]);
    useEffect(() => {
        setStaffPage(1);
    }, [staffFilterQDeb, staffDateFrom, staffDateTo, staffRoleFilter, staffStatusFilter]);
    useEffect(() => {
        setArticlePage(1);
    }, [articleFilterQDeb, articleFilterDate, articleStatusFilter]);

    useEffect(() => {
        setEventPage(1);
    }, [eventFilterQ, eventDateFrom, eventDateTo, eventStatusFilter]);
    useEffect(() => {
        setResourcePage(1);
    }, [resourceFilterQ, resourceDateFrom, resourceDateTo]);
    useEffect(() => {
        setQListPage(1);
    }, [qListFilterQ, qListDateFrom, qListDateTo]);
    useEffect(() => {
        setReactPage(1);
    }, [reactFilterQ, reactDateFrom, reactDateTo]);
    useEffect(() => {
        setEntrepreneurPage(1);
    }, [entrepreneurFilterQ, entrepreneurDateFrom, entrepreneurDateTo]);

    const filteredEvents = useMemo(() => {
        let list = events;
        if (eventStatusFilter) {
            list = list.filter(e => e.status === eventStatusFilter);
        }
        const q = eventFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (e) =>
                    textIncludes(e.title, q) ||
                    textIncludes(e.body, q) ||
                    textIncludes(e.eventData?.location, q)
            );
        }
        list = list.filter((e) => {
            const ref = e.eventData?.startDate || e.eventData?.endDate || e.createdAt;
            return matchesCreatedAtRange(ref, eventDateFrom, eventDateTo);
        });
        return list;
    }, [events, eventFilterQ, eventDateFrom, eventDateTo, eventStatusFilter]);

    const pagedEvents = useMemo(() => {
        const start = (eventPage - 1) * ADMIN_PAGE_SIZE;
        return filteredEvents.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredEvents, eventPage]);

    const filteredResources = useMemo(() => {
        let list = resources;
        const q = resourceFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (r) =>
                    textIncludes(r.title, q) ||
                    textIncludes(r.description, q) ||
                    textIncludes(r.url, q) ||
                    textIncludes(r.type, q)
            );
        }
        list = list.filter((r) => matchesCreatedAtRange(r.createdAt, resourceDateFrom, resourceDateTo));
        return list;
    }, [resources, resourceFilterQ, resourceDateFrom, resourceDateTo]);

    const pagedResources = useMemo(() => {
        const start = (resourcePage - 1) * ADMIN_PAGE_SIZE;
        return filteredResources.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredResources, resourcePage]);

    const filteredContacts = useMemo(() => {
        let list = contacts;
        const q = contactFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (c) =>
                    textIncludes(c.name, q) ||
                    textIncludes(c.email, q) ||
                    textIncludes(c.subject, q) ||
                    textIncludes(c.message, q) ||
                    textIncludes(c.phone, q) ||
                    textIncludes(c.city, q) ||
                    textIncludes(c.organization, q)
            );
        }
        list = list.filter((c) => matchesCreatedAtRange(c.createdAt, contactDateFrom, contactDateTo));
        return list;
    }, [contacts, contactFilterQ, contactDateFrom, contactDateTo]);

    const pagedContacts = useMemo(() => {
        const start = (contactPage - 1) * ADMIN_PAGE_SIZE;
        return filteredContacts.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredContacts, contactPage]);

    const filteredPublicTeamMembers = useMemo(() => {
        let list = publicTeamMembers;
        const q = publicTeamFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (m) =>
                    textIncludes(m.name, q) ||
                    textIncludes(m.organization, q) ||
                    textIncludes(m.role, q) ||
                    textIncludes(m.email, q) ||
                    textIncludes(m.contact, q) ||
                    textIncludes(m.linkedin, q) ||
                    textIncludes(m.github, q)
            );
        }
        list = list.filter((m) => matchesCreatedAtRange(m.createdAt, publicTeamDateFrom, publicTeamDateTo));
        return list;
    }, [publicTeamMembers, publicTeamFilterQ, publicTeamDateFrom, publicTeamDateTo]);

    const pagedPublicTeamMembers = useMemo(() => {
        const start = (publicTeamPage - 1) * ADMIN_PAGE_SIZE;
        return filteredPublicTeamMembers.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredPublicTeamMembers, publicTeamPage]);

    const filteredNewsletterSubs = useMemo(() => {
        let list = newsletterSubs;
        const q = newsletterFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (s) => textIncludes(s.email, q) || textIncludes(s.source, q)
            );
        }
        list = list.filter((s) =>
            matchesCreatedAtRange(s.createdAt, newsletterDateFrom, newsletterDateTo)
        );
        return list;
    }, [newsletterSubs, newsletterFilterQ, newsletterDateFrom, newsletterDateTo]);

    const pagedNewsletterSubs = useMemo(() => {
        const start = (newsletterPage - 1) * ADMIN_PAGE_SIZE;
        return filteredNewsletterSubs.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredNewsletterSubs, newsletterPage]);

    const filteredPartners = useMemo(() => {
        let list = partnersList;
        const q = partnerFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (p) =>
                    textIncludes(p.name, q) ||
                    textIncludes(p.shortName, q) ||
                    textIncludes(p.role, q)
            );
        }
        list = list.filter((p) => matchesCreatedAtRange(p.createdAt, partnerDateFrom, partnerDateTo));
        return list;
    }, [partnersList, partnerFilterQ, partnerDateFrom, partnerDateTo]);

    const pagedPartners = useMemo(() => {
        const start = (partnerPage - 1) * ADMIN_PAGE_SIZE;
        return filteredPartners.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredPartners, partnerPage]);

    const filteredEntrepreneurs = useMemo(() => {
        let list = entrepreneursList;
        const q = entrepreneurFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (e) =>
                    textIncludes(e.name, q) ||
                    textIncludes(e.role, q) ||
                    textIncludes(e.organization, q) ||
                    textIncludes(e.quote, q)
            );
        }
        list = list.filter((e) => matchesCreatedAtRange(e.createdAt, entrepreneurDateFrom, entrepreneurDateTo));
        return list;
    }, [entrepreneursList, entrepreneurFilterQ, entrepreneurDateFrom, entrepreneurDateTo]);

    const pagedEntrepreneurs = useMemo(() => {
        const start = (entrepreneurPage - 1) * ADMIN_PAGE_SIZE;
        return filteredEntrepreneurs.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredEntrepreneurs, entrepreneurPage]);

    const filteredQuestionnairesList = useMemo(() => {
        let list = questionnairesList;
        const q = qListFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (row) =>
                    textIncludes(row.title, q) ||
                    textIncludes(row.description, q) ||
                    textIncludes(row._id, q)
            );
        }
        list = list.filter((row) =>
            matchesCreatedAtRange(row.updatedAt || row.createdAt, qListDateFrom, qListDateTo)
        );
        return list;
    }, [questionnairesList, qListFilterQ, qListDateFrom, qListDateTo]);

    const pagedQuestionnairesList = useMemo(() => {
        const start = (qListPage - 1) * ADMIN_PAGE_SIZE;
        return filteredQuestionnairesList.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredQuestionnairesList, qListPage]);

    const filteredReactivation = useMemo(() => {
        let list = reactivationRequests;
        const q = reactFilterQ.trim().toLowerCase();
        if (q) {
            list = list.filter(
                (r) =>
                    textIncludes(r.user?.username, q) ||
                    textIncludes(r.user?.email, q) ||
                    textIncludes(r.user?.authProvider, q)
            );
        }
        list = list.filter((r) => matchesCreatedAtRange(r.createdAt, reactDateFrom, reactDateTo));
        return list;
    }, [reactivationRequests, reactFilterQ, reactDateFrom, reactDateTo]);

    const pagedReactivation = useMemo(() => {
        const start = (reactPage - 1) * ADMIN_PAGE_SIZE;
        return filteredReactivation.slice(start, start + ADMIN_PAGE_SIZE);
    }, [filteredReactivation, reactPage]);

    const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / ADMIN_PAGE_SIZE) || 1);
    const resourceTotalPages = Math.max(1, Math.ceil(filteredResources.length / ADMIN_PAGE_SIZE) || 1);
    const contactTotalPages = Math.max(1, Math.ceil(filteredContacts.length / ADMIN_PAGE_SIZE) || 1);
    const publicTeamTotalPages = Math.max(1, Math.ceil(filteredPublicTeamMembers.length / ADMIN_PAGE_SIZE) || 1);
    const newsletterTotalPages = Math.max(1, Math.ceil(filteredNewsletterSubs.length / ADMIN_PAGE_SIZE) || 1);
    const qListTotalPages = Math.max(1, Math.ceil(filteredQuestionnairesList.length / ADMIN_PAGE_SIZE) || 1);
    const reactTotalPages = Math.max(1, Math.ceil(filteredReactivation.length / ADMIN_PAGE_SIZE) || 1);

    useEffect(() => {
        if (eventPage > eventTotalPages) setEventPage(eventTotalPages);
    }, [filteredEvents.length, eventTotalPages, eventPage]);

    useEffect(() => {
        if (resourcePage > resourceTotalPages) setResourcePage(resourceTotalPages);
    }, [filteredResources.length, resourceTotalPages, resourcePage]);

    useEffect(() => {
        if (contactPage > contactTotalPages) setContactPage(contactTotalPages);
    }, [filteredContacts.length, contactTotalPages, contactPage]);

    useEffect(() => {
        if (publicTeamPage > publicTeamTotalPages) setPublicTeamPage(publicTeamTotalPages);
    }, [filteredPublicTeamMembers.length, publicTeamTotalPages, publicTeamPage]);

    useEffect(() => {
        if (newsletterPage > newsletterTotalPages) setNewsletterPage(newsletterTotalPages);
    }, [filteredNewsletterSubs.length, newsletterTotalPages, newsletterPage]);

    useEffect(() => {
        setPublicTeamPage(1);
    }, [publicTeamFilterQ, publicTeamDateFrom, publicTeamDateTo]);

    useEffect(() => {
        setNewsletterPage(1);
    }, [newsletterFilterQ, newsletterDateFrom, newsletterDateTo]);

    useEffect(() => {
        if (qListPage > qListTotalPages) setQListPage(qListTotalPages);
    }, [filteredQuestionnairesList.length, qListTotalPages, qListPage]);

    useEffect(() => {
        if (reactPage > reactTotalPages) setReactPage(reactTotalPages);
    }, [filteredReactivation.length, reactTotalPages, reactPage]);

    useEffect(() => {
        const tp = Math.max(1, users.totalPages || 1);
        if (userPage > tp) setUserPage(tp);
    }, [users.totalPages, userPage]);

    useEffect(() => {
        const tp = Math.max(1, staffUsers.totalPages || 1);
        if (staffPage > tp) setStaffPage(tp);
    }, [staffUsers.totalPages, staffPage]);

    /** Durée d’affichage des toasts de succès après import fichier / image (ms). */
    const IMPORT_SUCCESS_TOAST_MS = 10_000;

    // Toast helper function (durée optionnelle ; les nouveaux toasts annulent le masquage précédent)
    const showToast = useCallback((message, type = 'success', durationMs = 4000) => {
        if (toastHideTimerRef.current) {
            clearTimeout(toastHideTimerRef.current);
            toastHideTimerRef.current = null;
        }
        setToast({ show: true, message, type });
        toastHideTimerRef.current = setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
            toastHideTimerRef.current = null;
        }, durationMs);
    }, []);

    useEffect(() => () => {
        if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
    }, []);

    const toLocalInput = (d) => {
        if (!d) return '';
        const x = new Date(d);
        if (Number.isNaN(x.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
    };

    const loadQuestionnaireStats = async (questionnaireId, page = 1) => {
        if (!questionnaireId) {
            setQStats(null);
            return;
        }
        setQStatsLoading(true);
        try {
            const r = await adminService.getQuestionnaireStatistics(questionnaireId, {
                page,
                limit: Q_STATS_PAGE_SIZE,
            });
            if (r.success && r.data) {
                setQStats(r.data);
            } else {
                setQStats(null);
            }
        } catch (e) {
            setQStats(null);
            showToast(e.message || 'Impossible de charger les statistiques du questionnaire', 'error');
        } finally {
            setQStatsLoading(false);
        }
    };

    const loadQuestionnairePanelDetail = async (id) => {
        if (!id) {
            setQPreview(null);
            setQPanelSelectedId(null);
            setQPreviewLoading(false);
            setQStats(null);
            return;
        }
        setQPanelSelectedId(id);
        setQPreviewLoading(true);
        try {
            const r = await adminService.getQuestionnaireAdminDetail(id);
            if (r.success && r.data) {
                setQPreview(r.data);
                void loadQuestionnaireStats(id, 1);
            } else {
                showToast(r.message || 'Impossible de charger le questionnaire', 'error');
                setQPreview(null);
                setQStats(null);
            }
        } catch (e) {
            showToast(e.message || 'Impossible de charger le questionnaire', 'error');
            setQPreview(null);
            setQStats(null);
        } finally {
            setQPreviewLoading(false);
        }
    };

    /** @param {string|undefined} preferPanelId - ID à garder à l’écran après reload ; sinon inscription puis premier de la liste */
    const loadQuestionnaireSectionData = async (preferPanelId) => {
        try {
            const listRes = await adminService.getQuestionnairesAdminList();
            if (listRes.success) {
                const list = listRes.data || [];
                setQuestionnairesList(list);
                const reg = list.find((q) => q.isRegistrationQuestionnaire) || null;
                setRegistrationQuestionnaire(reg);
                const pick =
                    preferPanelId && list.some((q) => q._id === preferPanelId)
                        ? preferPanelId
                        : reg?._id || list[0]?._id || null;
                if (pick) {
                    await loadQuestionnairePanelDetail(pick);
                } else {
                    setQPreview(null);
                    setQPanelSelectedId(null);
                    setQPreviewLoading(false);
                    setQStats(null);
                }
            }
        } catch (e) {
            showToast(e.message || 'Impossible de charger la liste des questionnaires', 'error');
        }
    };

    const selectQuestionnaireForPanel = (row) => {
        loadQuestionnairePanelDetail(row._id);
    };

    const openQEdit = (item) => {
        setQEditId(item._id);
        setQEditForm({
            title: item.title,
            description: item.description || '',
            isActive: !!item.isActive,
            isRegistrationQuestionnaire: !!item.isRegistrationQuestionnaire,
            targetProfessions: item.targetProfessions || [],
            opensAt: toLocalInput(item.opensAt),
            closesAt: toLocalInput(item.closesAt)
        });
    };

    const closeQEdit = () => {
        setQEditId(null);
    };

    const handleSaveQEdit = async (e) => {
        e.preventDefault();
        if (!qEditId) return;
        setQSaving(true);
        try {
            const body = {
                title: qEditForm.title,
                description: qEditForm.description,
                isActive: qEditForm.isActive,
                isRegistrationQuestionnaire: qEditForm.isRegistrationQuestionnaire
            };
            if (!qEditForm.isRegistrationQuestionnaire) {
                body.opensAt = qEditForm.opensAt || null;
                body.closesAt = qEditForm.closesAt || null;
                body.targetProfessions = qEditForm.targetProfessions || [];
            } else {
                body.opensAt = null;
                body.closesAt = null;
                body.targetProfessions = [];
            }
            const r = await adminService.updateQuestionnaire(qEditId, body);
            if (r.success) {
                showToast(
                    qEditForm.isRegistrationQuestionnaire
                        ? 'Questionnaire mis à jour. Il est désormais le seul questionnaire d’inscription.'
                        : 'Questionnaire mis à jour.',
                    'success'
                );
                closeQEdit();
                await loadQuestionnaireSectionData(qEditId);
            }
        } catch (err) {
            showToast(err.message || 'Erreur lors de la mise à jour', 'error');
        } finally {
            setQSaving(false);
        }
    };

    const emptyDraftQuestion = () => ({
        localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        _id: null,
        text: '',
        type: 'text',
        optionsStr: '',
        isRequired: false,
        category: 'general',
        personalInfoField: ''
    });

    const openQQuestionsModal = async (row) => {
        try {
            const r = await adminService.getQuestionnaireAdminDetail(row._id);
            if (!r.success || !r.data) {
                showToast('Impossible de charger les questions depuis la base.', 'error');
                return;
            }
            const item = r.data;
            const sorted = [...(item.questions || [])].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
            setQQuestionsModal({
                questionnaireId: item._id,
                title: item.title,
                isRegistration: !!item.isRegistrationQuestionnaire,
                questionsDraft: sorted.map((q) => ({
                    localKey: q._id,
                    _id: q._id,
                    text: q.text || '',
                    type: q.type || 'text',
                    optionsStr: (q.options || []).join('\n'),
                    isRequired: !!q.isRequired,
                    category: q.category || 'general',
                    personalInfoField: q.personalInfoField || ''
                }))
            });
        } catch (e) {
            showToast(e.message || 'Erreur de chargement des questions', 'error');
        }
    };

    const closeQQuestionsModal = () => setQQuestionsModal(null);

    const updateQDraft = (index, patch) => {
        setQQuestionsModal((m) => {
            if (!m) return m;
            const questionsDraft = m.questionsDraft.map((q, i) => (i === index ? { ...q, ...patch } : q));
            return { ...m, questionsDraft };
        });
    };

    const removeQDraft = (index) => {
        setQQuestionsModal((m) => {
            if (!m) return m;
            return { ...m, questionsDraft: m.questionsDraft.filter((_, i) => i !== index) };
        });
    };

    const moveQDraft = (index, delta) => {
        setQQuestionsModal((m) => {
            if (!m) return m;
            const j = index + delta;
            if (j < 0 || j >= m.questionsDraft.length) return m;
            const arr = [...m.questionsDraft];
            [arr[index], arr[j]] = [arr[j], arr[index]];
            return { ...m, questionsDraft: arr };
        });
    };

    const addQDraft = () => {
        setQQuestionsModal((m) => {
            if (!m) return m;
            return { ...m, questionsDraft: [...m.questionsDraft, emptyDraftQuestion()] };
        });
    };

    const handleSaveQQuestions = async () => {
        if (!qQuestionsModal) return;
        if (qQuestionsModal.questionsDraft.length === 0) {
            showToast('Ajoutez au moins une question.', 'error');
            return;
        }
        if (qQuestionsModal.questionsDraft.some((q) => !String(q.text || '').trim())) {
            showToast('Renseignez le texte de chaque question.', 'error');
            return;
        }
        setQQuestionsSaving(true);
        try {
            const questions = qQuestionsModal.questionsDraft.map((q) => {
                const opts = ['single_choice', 'multiple_choice'].includes(q.type)
                    ? String(q.optionsStr || '')
                        .split('\n')
                        .map((o) => o.trim())
                        .filter(Boolean)
                    : [];
                const payload = {
                    text: String(q.text).trim(),
                    type: q.type,
                    options: opts,
                    isRequired: !!q.isRequired,
                    category: q.category,
                    personalInfoField: q.personalInfoField || null
                };
                if (q._id) payload._id = q._id;
                return payload;
            });
            const r = await adminService.syncQuestionnaireQuestions(qQuestionsModal.questionnaireId, questions);
            if (r.success) {
                showToast(r.message || 'Questions enregistrées.', 'success');
                const qid = qQuestionsModal.questionnaireId;
                closeQQuestionsModal();
                await loadQuestionnaireSectionData(qid);
            }
        } catch (err) {
            showToast(err.message || 'Erreur lors de l’enregistrement des questions', 'error');
        } finally {
            setQQuestionsSaving(false);
        }
    };

    const handleRestoreDefaultQuestions = async () => {
        if (!qQuestionsModal?.isRegistration) return;
        if (!window.confirm('Remplacer toutes les questions par le jeu par défaut « Complétez votre profil » ? Cette action est irréversible si aucune réponse n’existe encore.')) {
            return;
        }
        setQQuestionsSaving(true);
        try {
            const r = await adminService.restoreRegistrationQuestionDefaults(qQuestionsModal.questionnaireId);
            if (r.success) {
                showToast(r.message || 'Questions restaurées.', 'success');
                const qid = qQuestionsModal.questionnaireId;
                closeQQuestionsModal();
                await loadQuestionnaireSectionData(qid);
            }
        } catch (err) {
            showToast(err.message || 'Restauration impossible (réponses existantes ou erreur serveur).', 'error');
        } finally {
            setQQuestionsSaving(false);
        }
    };

    useEffect(() => {
        try {
            window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
        } catch {
            /* ignore */
        }
    }, [sidebarCollapsed]);

    // Check authentication on mount
    useEffect(() => {
        const checkAuth = () => {
            const user = localStorage.getItem('mbg_user');
            console.log('Checking auth, user:', user ? 'found' : 'not found');

            if (!user) {
                console.log('No user found, redirecting to login');
                setTimeout(() => {
                    navigate('/auth', { replace: true });
                }, 100);
            } else {
                try {
                    const userData = JSON.parse(user);
                    const userObj = userData.user || userData;
                    const allowedRoles = ['superadmin', 'moderator', 'analyst'];
                    if (!allowedRoles.includes(userObj.role)) {
                        console.log('User role not authorized for admin:', userObj.role);
                        navigate('/', { replace: true });
                        return;
                    }
                    console.log('User authenticated:', userData);
                    setCurrentUserRole(userObj.role);
                    setIsAuthenticated(true);
                } catch (err) {
                    console.error('Invalid user data:', err);
                    localStorage.removeItem('mbg_user');
                    navigate('/auth', { replace: true });
                }
            }
            setCheckingAuth(false);
        };

        checkAuth();
    }, [navigate]);

    // Dashboard : chargement initial, rechargement au retour sur la section, rafraîchissement périodique
    useEffect(() => {
        if (!isAuthenticated || activeSection !== 'dashboard') return;
        const silent = dashboardDataRef.current != null;
        fetchDashboardData({ silent });
    }, [isAuthenticated, activeSection, fetchDashboardData]);

    useEffect(() => {
        if (!isAuthenticated || activeSection !== 'dashboard') return;
        const id = setInterval(() => {
            fetchDashboardData({ silent: true });
        }, 60_000);
        return () => clearInterval(id);
    }, [isAuthenticated, activeSection, fetchDashboardData]);

    useEffect(() => {
        if (!isAuthenticated || activeSection !== 'dashboard') return;
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                fetchDashboardData({ silent: true });
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [isAuthenticated, activeSection, fetchDashboardData]);

    // Fetch users when users section is active
    useEffect(() => {
        if (activeSection === 'users' && isAuthenticated) {
            fetchUsersList();
        }
    }, [activeSection, isAuthenticated, userPage, userFilterQDeb, userDateFrom, userDateTo, userStatusFilter]);

    useEffect(() => {
        if (activeSection !== 'reactivation' || !isAuthenticated || currentUserRole !== 'superadmin') return;
        fetchReactivationRequests();
    }, [activeSection, isAuthenticated, currentUserRole]);

    // Fetch staff (rôles admin) when staff section is active
    useEffect(() => {
        if (activeSection === 'staff' && isAuthenticated) {
            fetchStaffUsersList();
        }
    }, [activeSection, isAuthenticated, staffPage, staffFilterQDeb, staffDateFrom, staffDateTo, staffRoleFilter, staffStatusFilter]);

    // Handle role change
    const handleRoleChange = async (userId, newRole) => {
        if (currentUserRole !== 'superadmin') {
            showToast('Seul le superadmin peut modifier les rôles', 'error');
            return;
        }
        setUpdatingRole(userId);
        try {
            const response = await adminService.updateUserRole(userId, newRole);
            if (response.success) {
                // Update local state
                setUsers(prev => ({
                    ...prev,
                    data: (prev.data || []).map(u => u._id === userId ? { ...u, role: newRole } : u)
                }));
                setStaffUsers(prev => ({
                    ...prev,
                    data: (prev.data || []).map(u =>
                        u._id === userId ? { ...u, role: newRole } : u
                    )
                }));
                showToast('Rôle mis à jour', 'success');
            }
        } catch (err) {
            console.error('Error updating role:', err);
            showToast(err.message || 'Erreur lors de la mise à jour du rôle', 'error');
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleStatusChange = async (userId, isActive) => {
        if (currentUserRole !== 'superadmin' && currentUserRole !== 'moderator') {
            showToast('Seul le super administrateur ou le modérateur peut modifier le statut', 'error');
            return;
        }
        setUpdatingStatus(userId);
        try {
            const response = await adminService.updateUserStatus(userId, isActive);
            if (response.success) {
                setUsers(prev => ({
                    ...prev,
                    data: (prev.data || []).map(u => u._id === userId ? { ...u, isActive } : u)
                }));
                setStaffUsers(prev => ({
                    ...prev,
                    data: (prev.data || []).map(u => (u._id === userId ? { ...u, isActive } : u))
                }));
                showToast(`Compte ${isActive ? 'activé' : 'désactivé'}`, 'success');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            showToast(err.message || 'Erreur lors de la mise à jour du statut', 'error');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (currentUserRole !== 'superadmin' && currentUserRole !== 'moderator') {
            showToast('Seul le super administrateur ou le modérateur peut supprimer un compte', 'error');
            return;
        }
        askDeleteConfirmation('user', userId, 'Confirmer la suppression définitive de ce compte ?');
    };

    const handleApproveReactivation = async (requestId) => {
        setReactivationActionId(`${requestId}-approve`);
        try {
            const res = await adminService.approveReactivationRequest(requestId);
            if (res.success) {
                showToast(res.message || 'Compte réactivé', 'success');
                setReactivationRequests((prev) => prev.filter((r) => r._id !== requestId));
            }
        } catch (err) {
            showToast(err.message || 'Erreur', 'error');
        } finally {
            setReactivationActionId(null);
        }
    };

    const handleRejectReactivation = async (requestId) => {
        setReactivationActionId(`${requestId}-reject`);
        try {
            const res = await adminService.rejectReactivationRequest(requestId);
            if (res.success) {
                showToast(res.message || 'Demande refusée', 'success');
                setReactivationRequests((prev) => prev.filter((r) => r._id !== requestId));
            }
        } catch (err) {
            showToast(err.message || 'Erreur', 'error');
        } finally {
            setReactivationActionId(null);
        }
    };

    const fetchEvents = async () => {
        try {
            const response = await adminService.getAllPosts({ type: 'event', limit: 200 });
            setEvents(Array.isArray(response?.data) ? response.data : []);
        } catch (err) {
            console.error('Error fetching events:', err);
        }
    };

    const handlePublishEvent = async (event) => {
        try {
            await adminService.approvePost(event._id, true);
            await fetchEvents();
            showToast('Événement publié avec succès', 'success');
        } catch (err) {
            showToast(err.message || 'Erreur lors de la publication', 'error');
        }
    };

    const fetchResources = async () => {
        try {
            const response = await resourcesService.getAll();
            if (response.success) {
                setResources(Array.isArray(response.data) ? response.data : []);
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            showToast('Erreur lors du chargement des ressources', 'error');
        }
    };

    const fetchContacts = async () => {
        try {
            const response = await contactService.getAll();
            if (response.success) {
                setContacts(Array.isArray(response.data) ? response.data : []);
            }
        } catch (err) {
            console.error('Error fetching contacts:', err);
            showToast('Erreur lors du chargement des messages de contact', 'error');
        }
    };

    const fetchNewsletterSubs = async () => {
        try {
            const res = await newsletterService.getAll();
            if (res.success) setNewsletterSubs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching newsletter:', err);
            showToast('Erreur lors du chargement des abonnés newsletter', 'error');
        }
    };

    const fetchPublicTeamMembers = async () => {
        try {
            const res = await teamService.getAll();
            if (res.success) setPublicTeamMembers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching public team:', err);
            showToast('Erreur lors du chargement de l’équipe dev', 'error');
        }
    };

    const fetchPartners = async () => {
        try {
            const res = await partnerService.getAll();
            if (res.success) setPartnersList(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching partners:', err);
            showToast('Erreur lors du chargement des partenaires', 'error');
        }
    };

    const fetchEntrepreneurs = async () => {
        try {
            const res = await entrepreneurService.getAll();
            if (res.success) setEntrepreneursList(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching entrepreneurs:', err);
            showToast('Erreur lors du chargement des entrepreneurs', 'error');
        }
    };

    const fetchReactivationRequests = async () => {
        try {
            const res = await adminService.getReactivationRequests();
            if (res.success) setReactivationRequests(res.data || []);
        } catch (e) {
            console.error(e);
            showToast(e.message || 'Erreur lors du chargement des demandes', 'error');
        }
    };

    const fetchUsersList = async () => {
        try {
            const response = await adminService.getAllUsers({
                page: userPage,
                limit: ADMIN_PAGE_SIZE,
                ...(userFilterQDeb ? { q: userFilterQDeb } : {}),
                ...(userDateFrom ? { dateFrom: userDateFrom } : {}),
                ...(userDateTo ? { dateTo: userDateTo } : {}),
                ...(userStatusFilter === 'active' ? { isActive: 'true' } : {}),
                ...(userStatusFilter === 'inactive' ? { isActive: 'false' } : {}),
            });
            if (response.success) setUsers(response);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const fetchStaffUsersList = async () => {
        try {
            const response = await adminService.getAllUsers({
                staffOnly: true,
                page: staffPage,
                limit: ADMIN_PAGE_SIZE,
                ...(staffFilterQDeb ? { q: staffFilterQDeb } : {}),
                ...(staffDateFrom ? { dateFrom: staffDateFrom } : {}),
                ...(staffDateTo ? { dateTo: staffDateTo } : {}),
                ...(staffRoleFilter ? { role: staffRoleFilter } : {}),
                ...(staffStatusFilter === 'active' ? { isActive: 'true' } : {}),
                ...(staffStatusFilter === 'inactive' ? { isActive: 'false' } : {}),
            });
            if (response.success) setStaffUsers(response);
        } catch (err) {
            console.error('Error fetching staff:', err);
        }
    };

    // Fetch events when events section is active
    useEffect(() => {
        if (activeSection === 'events' && isAuthenticated) {
            fetchEvents();
        }
    }, [activeSection, isAuthenticated]);

    const fetchAdminPosts = async (pageToLoad = articlePage) => {
        setArticlesLoading(true);
        try {
            const response = await adminService.getAllPosts({
                page: pageToLoad,
                limit: ADMIN_PAGE_SIZE,
                type: 'article',
                ...(articleFilterQDeb ? { q: articleFilterQDeb } : {}),
                ...(articleFilterDate
                    ? { dateFrom: articleFilterDate, dateTo: articleFilterDate }
                    : {}),
                ...(articleStatusFilter ? { status: articleStatusFilter } : {}),
            });
            if (response.success) {
                setPosts(response);
                setArticleTotalPages(response.totalPages || 1);
            }
        } finally {
            setArticlesLoading(false);
        }
    };

    // Fetch posts when articles section is active
    useEffect(() => {
        if (activeSection === 'articles' && isAuthenticated) {
            const fetchPosts = async () => {
                try {
                    await fetchAdminPosts(articlePage);
                } catch (err) {
                    console.error('Error fetching posts:', err);
                }
            };
            fetchPosts();
        }
    }, [
        activeSection,
        isAuthenticated,
        articlePage,
        articleFilterQDeb,
        articleFilterDate,
        articleStatusFilter
    ]);

    useEffect(() => {
        if (activeSection === 'resources' && isAuthenticated) {
            setShowResourceForm(false);
            fetchResources();
        }
    }, [activeSection, isAuthenticated]);

    useEffect(() => {
        if (
            activeSection === 'contacts' &&
            isAuthenticated &&
            ['superadmin', 'moderator', 'analyst'].includes(currentUserRole)
        ) {
            fetchContacts();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    useEffect(() => {
        if (
            activeSection === 'newsletter' &&
            isAuthenticated &&
            ['superadmin', 'moderator'].includes(currentUserRole)
        ) {
            fetchNewsletterSubs();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    useEffect(() => {
        if (
            activeSection === 'publicteam' &&
            isAuthenticated &&
            ['superadmin', 'moderator'].includes(currentUserRole)
        ) {
            fetchPublicTeamMembers();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    useEffect(() => {
        if (
            activeSection === 'partners' &&
            isAuthenticated &&
            ['superadmin', 'moderator'].includes(currentUserRole)
        ) {
            fetchPartners();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    useEffect(() => {
        if (
            activeSection === 'entrepreneurs' &&
            isAuthenticated &&
            ['superadmin', 'moderator'].includes(currentUserRole)
        ) {
            fetchEntrepreneurs();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    useEffect(() => {
        if (showResourceForm && resourceFormData.type === 'file') {
            setResourceFormData((prev) => ({ ...prev, type: 'document' }));
        }
    }, [showResourceForm, resourceFormData.type]);

    // Modérateur : pas d’accès à la section questionnaires (réservée superadmin / analyste)
    useLayoutEffect(() => {
        if (!isAuthenticated || !currentUserRole) return;
        if (currentUserRole === 'moderator' && activeSection === 'questionnaire') {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [isAuthenticated, currentUserRole, activeSection, navigate]);

    // Analyste : accueil = tableau Analyse (pas l’ancien dashboard admin)
    useLayoutEffect(() => {
        if (!isAuthenticated || !currentUserRole) return;
        if (currentUserRole === 'analyst' && activeSection === 'dashboard') {
            navigate('/admin/analytics', { replace: true });
        }
    }, [isAuthenticated, currentUserRole, activeSection, navigate]);

    // `/admin` → section par défaut selon le rôle
    useLayoutEffect(() => {
        if (checkingAuth || !isAuthenticated) return;
        const p = location.pathname.replace(/\/$/, '') || '/';
        if (p === '/admin') {
            navigate(currentUserRole === 'analyst' ? '/admin/analytics' : '/admin/dashboard', { replace: true });
        }
    }, [checkingAuth, isAuthenticated, location.pathname, currentUserRole, navigate]);

    // Segment d’URL inconnu → dashboard
    useLayoutEffect(() => {
        if (checkingAuth || !isAuthenticated) return;
        const slug = getAdminSectionSlug(location.pathname);
        if (slug && !ADMIN_SECTION_SLUGS.includes(slug)) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [checkingAuth, isAuthenticated, location.pathname, navigate]);

    // Section non autorisée pour ce rôle (URL directe) → accueil du rôle
    useLayoutEffect(() => {
        if (checkingAuth || !isAuthenticated || !currentUserRole) return;
        const slug = getAdminSectionSlug(location.pathname);
        if (!slug) return;
        const allowed = getAllowedAdminSectionSlugs(currentUserRole);
        if (!allowed.includes(slug)) {
            navigate(currentUserRole === 'analyst' ? '/admin/analytics' : '/admin/dashboard', { replace: true });
        }
    }, [checkingAuth, isAuthenticated, currentUserRole, location.pathname, navigate]);

    // Fetch questionnaires (liste admin + inscription) when section is active
    useEffect(() => {
        if (
            activeSection === 'questionnaire'
            && isAuthenticated
            && ['superadmin', 'analyst'].includes(currentUserRole)
        ) {
            loadQuestionnaireSectionData();
        }
    }, [activeSection, isAuthenticated, currentUserRole]);

    const handleAddQuestion = () => {
        if (!newQuestion.text.trim()) return showToast('Le texte de la question est obligatoire', 'error');
        const q = {
            ...newQuestion,
            options: ['single_choice', 'multiple_choice'].includes(newQuestion.type)
                ? newQuestion.options.split('\n').map(o => o.trim()).filter(Boolean)
                : []
        };
        setQFormData(prev => ({ ...prev, questions: [...prev.questions, q] }));
        setNewQuestion({ text: '', type: 'text', isRequired: false, options: '', category: 'general' });
    };

    const handleRemoveQuestion = (idx) => {
        setQFormData(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
    };

    const handleCreateQuestionnaire = async (e) => {
        e.preventDefault();
        if (!qFormData.title.trim()) return showToast('Le titre est obligatoire', 'error');
        if (qFormData.questions.length === 0) return showToast('Ajoutez au moins une question', 'error');
        const wasRegistration = qFormData.isRegistrationQuestionnaire;
        try {
            const payload = {
                title: qFormData.title,
                description: qFormData.description,
                isRegistrationQuestionnaire: wasRegistration,
                questions: qFormData.questions.map((q, i) => ({ ...q, order: i + 1 }))
            };
            if (!wasRegistration) {
                if (qFormData.opensAt) payload.opensAt = qFormData.opensAt;
                if (qFormData.closesAt) payload.closesAt = qFormData.closesAt;
                if (qFormData.targetProfessions.length > 0) payload.targetProfessions = qFormData.targetProfessions;
            }
            const r = await adminService.createQuestionnaire(payload);
            if (r.success) {
                showToast(
                    wasRegistration
                        ? 'Questionnaire créé et défini comme unique questionnaire d’inscription.'
                        : 'Questionnaire créé avec succès.',
                    'success'
                );
                setShowQForm(false);
                setQFormData({
                    title: '',
                    description: '',
                    isRegistrationQuestionnaire: false,
                    targetProfessions: [],
                    questions: [],
                    opensAt: '',
                    closesAt: ''
                });
                await loadQuestionnaireSectionData(r.data?._id);
            }
        } catch (err) {
            showToast(err.message || 'Erreur lors de la création', 'error');
        }
    };

    useEffect(() => {
        if ((activeSection === 'articles' || activeSection === 'resources' || activeSection === 'events') && isAuthenticated) {
            const loadMeta = async () => {
                try {
                    const [catRes, lvlRes] = await Promise.all([api.get('/categories'), api.get('/levels')]);
                    if (catRes?.success) setCategories(catRes.data || []);
                    if (lvlRes?.success && (activeSection === 'articles' || activeSection === 'events')) setLevels(lvlRes.data || []);
                } catch (err) {
                    console.error('Error loading categories / levels:', err);
                }
            };
            loadMeta();
        }
    }, [activeSection, isAuthenticated]);

    const handleViewUser = async (userId) => {
        setUserDetailModal({ isOpen: true, user: null, posts: [], loading: true });
        try {
            const response = await adminService.getUserById(userId);
            if (response.success) {
                setUserDetailModal({
                    isOpen: true,
                    user: response.data?.user,
                    posts: response.data?.posts || [],
                    loading: false,
                });
            } else {
                setUserDetailModal(prev => ({ ...prev, loading: false }));
                showToast('Impossible de charger les détails utilisateur', 'error');
            }
        } catch {
            setUserDetailModal(prev => ({ ...prev, loading: false, isOpen: false }));
            showToast('Impossible de charger les détails utilisateur', 'error');
        }
    };

    const openPostModal = (mode, post = null) => {
        setPostModalMode(mode);
        setSelectedPost(post);
        setPostForm({
            ...DEFAULT_ADMIN_ARTICLE_FORM,
            title: post?.title || '',
            body: post?.articleData?.content || post?.body || '',
            summary: post?.articleData?.summary || '',
            featuredImage: post?.articleData?.featuredImage || post?.featuredImage || '',
            category: post?.category?._id || post?.category || '',
            level: post?.level?._id || post?.level || '',
            status: post && post.status === 'published' ? 'published' : 'draft',
        });
        setPostModalOpen(true);
    };

    const closePostModal = () => {
        setPostModalOpen(false);
        setSelectedPost(null);
        setPostForm({ ...DEFAULT_ADMIN_ARTICLE_FORM });
    };

    const askDeleteConfirmation = (kind, payload, message) => {
        setConfirmModal({ isOpen: true, kind, payload, message });
    };

    const closeConfirmModal = () => {
        setConfirmModal({ isOpen: false, kind: null, payload: null, message: '' });
    };

    const confirmDelete = async () => {
        if (confirmModal.kind === 'newsletterBroadcast') {
            const { subject, message } = confirmModal.payload || {};
            closeConfirmModal();
            setNewsletterBroadcastSending(true);
            try {
                const res = await newsletterService.broadcast({ subject, message });
                if (res.success) {
                    showToast(res.message || 'Envoi terminé', 'success');
                    closeNewsletterBroadcastModal();
                }
            } catch (err) {
                showToast(err.message || 'Erreur lors de l’envoi', 'error');
            } finally {
                setNewsletterBroadcastSending(false);
            }
            return;
        }
        try {
            if (confirmModal.kind === 'user') {
                const userId = confirmModal.payload;
                setDeletingUser(userId);
                const response = await adminService.deleteUser(userId);
                if (response.success) {
                    setUsers(prev => ({ ...prev, data: (prev.data || []).filter(u => u._id !== userId) }));
                    setStaffUsers(prev => ({
                        ...prev,
                        data: (prev.data || []).filter(u => u._id !== userId),
                        total: Math.max(0, (prev.total || 0) - 1),
                        count: Math.max(0, (prev.count || 0) - 1)
                    }));
                    showToast('Compte supprimé', 'success');
                }
                setDeletingUser(null);
            }
            if (confirmModal.kind === 'post') {
                const post = confirmModal.payload;
                if (post.type === 'event') {
                    await eventsService.delete(post._id);
                    setEvents((prev) => prev.filter((e) => e._id !== post._id));
                } else {
                    await articlesService.delete(post._id);
                }
                setPosts((prev) => ({ ...prev, data: (prev.data || []).filter((p) => p._id !== post._id) }));
                showToast('Suppression réussie', 'success');
            }
            if (confirmModal.kind === 'event') {
                const event = confirmModal.payload;
                await eventsService.delete(event._id);
                await fetchEvents();
                showToast('Événement supprimé', 'success');
            }
            if (confirmModal.kind === 'resource') {
                const resourceId = confirmModal.payload;
                await resourcesService.delete(resourceId);
                setResources((prev) => prev.filter((r) => r._id !== resourceId));
                showToast('Ressource supprimée', 'success');
            }
            if (confirmModal.kind === 'questionnaire') {
                const qid = confirmModal.payload;
                await adminService.deleteQuestionnaire(qid);
                setQuestionnairesList((prev) => prev.filter((q) => q._id !== qid));
                if (registrationQuestionnaire?._id === qid) {
                    setRegistrationQuestionnaire(null);
                }
                showToast('Questionnaire supprimé', 'success');
                await loadQuestionnaireSectionData();
            }
            if (confirmModal.kind === 'contact') {
                const contactId = confirmModal.payload;
                await contactService.remove(contactId);
                setContacts((prev) => prev.filter((c) => c._id !== contactId));
                setContactDetail((d) => (d && d._id === contactId ? null : d));
                showToast('Message supprimé', 'success');
            }
            if (confirmModal.kind === 'newsletterSub') {
                const id = confirmModal.payload;
                await newsletterService.remove(id);
                setNewsletterSubs((prev) => prev.filter((s) => s._id !== id));
                showToast('Abonné supprimé', 'success');
            }
            if (confirmModal.kind === 'publicTeamMember') {
                const id = confirmModal.payload;
                await teamService.remove(id);
                setPublicTeamMembers((prev) => prev.filter((m) => m._id !== id));
                showToast('Membre retiré de l’équipe dev', 'success');
            }
            if (confirmModal.kind === 'partner') {
                const id = confirmModal.payload;
                await partnerService.remove(id);
                setPartnersList((prev) => prev.filter((p) => p._id !== id));
                showToast('Partenaire supprimé', 'success');
            }
            if (confirmModal.kind === 'entrepreneur') {
                const id = confirmModal.payload;
                await entrepreneurService.remove(id);
                setEntrepreneursList((prev) => prev.filter((e) => e._id !== id));
                showToast('Profil entrepreneur supprimé', 'success');
            }
        } catch (err) {
            showToast(err.message || 'Erreur lors de la suppression', 'error');
        } finally {
            closeConfirmModal();
        }
    };

    /** Même logique que /blog/creer (CreatePost) */
    const handleAdminArticleMediaUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("L'image est trop volumineuse (max 5Mo)", 'error');
            e.target.value = '';
            return;
        }
        setUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/articles');
            if (res.success) {
                setPostForm((prev) => ({ ...prev, featuredImage: res.data.url }));
                showToast('Image importée avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Cette image contient du contenu inapproprié.'
                : err.message || 'Erreur upload image';
            showToast(msg, 'error');
            setPostForm((prev) => ({ ...prev, featuredImage: '' }));
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleEventImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("L'image est trop volumineuse (max 5Mo)", 'error');
            e.target.value = '';
            return;
        }
        setEventImageUploading(true);
        setEventImageUrlCheckStatus('');
        try {
            const res = await api.upload(file, 'mahdia_bg/events');
            if (res.success) {
                setEventFormData((prev) => ({ ...prev, eventImage: res.data.url }));
                setEventImageUrlCheckStatus('ok');
                showToast('Image importée avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Cette image contient du contenu inapproprié.'
                : err.message || 'Erreur upload image';
            showToast(msg, 'error');
            setEventFormData((prev) => ({ ...prev, eventImage: '' }));
            setEventImageUrlCheckStatus('');
        } finally {
            setEventImageUploading(false);
            e.target.value = '';
        }
    };

    const checkAdminNewEventImageUrl = (url) => {
        if (adminNewEventImageCheckTimer.current) clearTimeout(adminNewEventImageCheckTimer.current);
        const trimmed = url.trim();
        if (!trimmed) {
            setEventImageUrlCheckStatus('');
            return;
        }
        if (!/^https?:\/\/.+\..+/i.test(trimmed)) {
            setEventImageUrlCheckStatus('');
            return;
        }
        setEventImageUrlCheckStatus('checking');
        adminNewEventImageCheckTimer.current = setTimeout(async () => {
            try {
                await api.post('/upload/check-image', { url: trimmed });
                setEventImageUrlCheckStatus('ok');
            } catch (err) {
                setEventImageUrlCheckStatus('blocked');
                setEventFormData((prev) => ({ ...prev, eventImage: '' }));
                showToast(err.message || "Cette image contient du contenu inapproprié et a été rejetée.", 'error');
            }
        }, 800);
    };

    const resetAdminNewEventForm = () => {
        if (adminNewEventImageCheckTimer.current) clearTimeout(adminNewEventImageCheckTimer.current);
        adminNewEventImageCheckTimer.current = null;
        setEventImageUrlCheckStatus('');
        setEventFormData({
            title: '', body: '', startDate: '', endDate: '', location: '', capacity: '50', eventImage: '', category: '', level: '',
        });
    };

    const closeNewEventModal = () => {
        setShowEventForm(false);
        resetAdminNewEventForm();
    };

    const openAdminNewEventModal = () => {
        resetAdminNewEventForm();
        setShowEventForm(true);
    };

    const handleAdminNewEventImageUrlChange = (e) => {
        const val = e.target.value;
        setEventFormData((prev) => ({ ...prev, eventImage: val }));
        checkAdminNewEventImageUrl(val);
    };

    const handleAdminNewEventSubmit = async (e) => {
        e.preventDefault();
        const missing = [];
        if (!eventFormData.title.trim()) missing.push('Titre');
        if (!eventFormData.body.trim()) missing.push('Description');
        if (!eventFormData.startDate) missing.push('Date de début');
        if (!eventFormData.endDate) missing.push('Date de fin');
        if (!eventFormData.location.trim()) missing.push('Lieu');
        if (!eventFormData.capacity) missing.push('Capacité');
        if (!eventFormData.category) missing.push('Catégorie');
        if (!eventFormData.level) missing.push('Niveau');
        if (!eventFormData.eventImage?.trim()) missing.push('Image de couverture');
        if (missing.length) {
            showToast(`Champs obligatoires manquants : ${missing.join(', ')}`, 'error');
            return;
        }
        const scheduleErrors = validateEventSchedule(eventFormData.startDate, eventFormData.endDate);
        if (scheduleErrors.length) {
            showToast(scheduleErrors[0], 'error');
            return;
        }
        setEventFormSubmitting(true);
        try {
            const startDateISO = new Date(eventFormData.startDate).toISOString();
            const endDateISO = new Date(eventFormData.endDate).toISOString();
            const response = await eventsService.create({
                title: eventFormData.title.trim(),
                body: eventFormData.body.trim(),
                category: eventFormData.category,
                level: eventFormData.level,
                startDate: startDateISO,
                endDate: endDateISO,
                location: eventFormData.location.trim(),
                capacity: parseInt(eventFormData.capacity, 10) || 50,
                eventImage: eventFormData.eventImage.trim(),
            });
            if (response?.success || response?.data?.success) {
                showToast('Événement créé en brouillon — en attente de validation admin', 'success');
                closeNewEventModal();
                await fetchEvents();
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Le contenu de cet événement est inapproprié.'
                : err.message || 'Erreur lors de la création';
            showToast(msg, 'error');
        } finally {
            setEventFormSubmitting(false);
        }
    };

    const handleViewPost = (post) => {
        openPostModal('view', post);
    };

    const handleEditPost = (post) => {
        openPostModal('edit', post);
    };

    const handleSavePostForm = async (e) => {
        e.preventDefault();
        const normalizedBody = (postForm.body || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .trim();
        if (
            !postForm.title.trim() ||
            !normalizedBody ||
            !postForm.summary.trim() ||
            !postForm.category ||
            !postForm.level ||
            !postForm.featuredImage?.trim()
        ) {
            const missing = [];
            if (!postForm.title.trim()) missing.push('Titre');
            if (!postForm.summary.trim()) missing.push('Résumé');
            if (!normalizedBody) missing.push('Contenu');
            if (!postForm.category) missing.push('Catégorie');
            if (!postForm.level) missing.push('Niveau');
            if (!postForm.featuredImage?.trim()) missing.push('Image de couverture');
            showToast(`Champs obligatoires manquants : ${missing.join(', ')}`, 'error');
            return;
        }
        setArticleSaving(true);
        try {
            const payload = {
                title: postForm.title,
                body: postForm.body,
                content: postForm.body,
                summary: postForm.summary,
                featuredImage: postForm.featuredImage.trim(),
                category: postForm.category,
                level: postForm.level,
            };

            if (postModalMode === 'create') {
                await articlesService.create({ ...payload, status: 'draft' });
            } else {
                await articlesService.update(selectedPost._id, {
                    ...payload,
                    status: postForm.status === 'published' ? 'published' : 'draft',
                });
            }

            await fetchAdminPosts(articlePage);
            if (postModalMode === 'create') {
                showToast('Article créé en brouillon', 'success');
            } else {
                showToast('Article mis à jour', 'success');
            }
            closePostModal();
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Le contenu de cet article est inapproprié.'
                : err.message || 'Erreur lors de l\'enregistrement';
            showToast(msg, 'error');
        } finally {
            setArticleSaving(false);
        }
    };

    const handleDeletePost = async (post) => {
        askDeleteConfirmation('post', post, 'Confirmer la suppression de cet article ?');
    };

    const handleCreateArticle = () => {
        openPostModal('create');
    };

    const handlePublishPost = async (post) => {
        try {
            await adminService.approvePost(post._id, true);
            await fetchAdminPosts(articlePage);
            const nowIso = new Date().toISOString();
            setSelectedPost((prev) =>
                prev && prev._id === post._id ? { ...prev, status: 'published', publishedAt: nowIso } : prev
            );
            showToast('Article publié', 'success');
        } catch (err) {
            showToast(err.message || 'Erreur publication', 'error');
        }
    };

    const handleEditEvent = (event) => {
        const ed = event.eventData || {};
        const fmtDate = (d) => {
            if (!d) return '';
            const dt = new Date(d);
            if (isNaN(dt)) return '';
            return dt.toISOString().slice(0, 16);
        };
        setEditingEvent(event);
        setEditEventForm({
            title: event.title || '',
            body: event.body || '',
            startDate: fmtDate(ed.startDate),
            endDate: fmtDate(ed.endDate),
            location: ed.location || '',
            capacity: ed.capacity || '',
            eventImage: ed.eventImage || '',
            status: event.status === 'published' ? 'published' : 'draft',
        });
    };

    const handleSaveEditEvent = async (e) => {
        e.preventDefault();
        if (!editingEvent) return;
        if (!editEventForm.title.trim() || !editEventForm.body.trim() || !editEventForm.startDate || !editEventForm.location.trim()) {
            showToast('Titre, description, date début et lieu sont obligatoires', 'error');
            return;
        }
        let endLocal = editEventForm.endDate?.trim()
            ? editEventForm.endDate
            : addMinutesToDatetimeLocalString(editEventForm.startDate, 90);
        const scheduleErr = validateEventSchedule(editEventForm.startDate, endLocal);
        if (scheduleErr.length) {
            showToast(scheduleErr[0], 'error');
            return;
        }
        try {
            const startDateISO = new Date(editEventForm.startDate).toISOString();
            const endDateISO = new Date(endLocal).toISOString();
            await eventsService.update(editingEvent._id, {
                title: editEventForm.title.trim(),
                body: editEventForm.body.trim(),
                status: editEventForm.status === 'published' ? 'published' : 'draft',
                startDate: startDateISO,
                endDate: endDateISO,
                location: editEventForm.location.trim(),
                capacity: parseInt(editEventForm.capacity) || 50,
                eventImage: editEventForm.eventImage || '',
            });
            showToast('Événement mis à jour', 'success');
            setEditingEvent(null);
            await fetchEvents();
        } catch (err) {
            showToast(err.message || 'Erreur mise à jour événement', 'error');
        }
    };

    const handleEditEventImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditEventImageUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/events');
            if (res.success) {
                setEditEventForm((prev) => ({ ...prev, eventImage: res.data.url }));
                showToast('Image importée avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            showToast(err.message || 'Erreur upload image', 'error');
        } finally {
            setEditEventImageUploading(false);
            e.target.value = '';
        }
    };

    const handleViewEventParticipants = async (event) => {
        try {
            const response = await eventsService.getAttendees(event._id);
            if (response.success) {
                const attendees = response.data || [];
                setSelectedEvent({ ...event, _attendees: attendees });
            }
        } catch (err) {
            showToast(err.message || 'Impossible de récupérer les participants', 'error');
            setSelectedEvent(event);
        }
    };

    const handleCreateResource = async (e) => {
        e.preventDefault();
        if (!resourceFormData.title.trim() || !resourceFormData.url.trim()) {
            showToast('Titre et URL sont obligatoires', 'error');
            return;
        }
        try {
            const urlForExt = resourceFormData.url.trim().split('?')[0];
            const inferredExtRaw = urlForExt.includes('.') ? urlForExt.split('.').pop().toLowerCase() : '';
            const inferredExt = inferredExtRaw ? `.${inferredExtRaw}` : '';
            const payload = {
                title: resourceFormData.title.trim(),
                type: resourceFormData.type,
                url: resourceFormData.url.trim(),
                description: resourceFormData.description?.trim() || '',
                fileExtension: resourceFormData.fileExtension || inferredExt || undefined,
                mimeType: resourceFormData.mimeType || undefined,
                originalName: resourceFormData.originalName || undefined,
                ...(resourceFormData.category ? { category: resourceFormData.category } : {}),
            };
            const response = await resourcesService.create(payload);
            if (response.success) {
                setShowResourceForm(false);
                setResourceFormData({ title: '', type: 'document', url: '', description: '', category: '', fileExtension: '', mimeType: '', originalName: '' });
                await fetchResources();
                showToast('Ressource ajoutée', 'success');
            }
        } catch (err) {
            showToast(err.message || 'Erreur ajout ressource', 'error');
        }
    };

    const handleAdminResourceMediaUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
            showToast('Fichier trop volumineux (max 50Mo)', 'error');
            e.target.value = '';
            return;
        }
        setResourceUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/resources');
            const mime = String(file.type || '').toLowerCase();
            const nextType = mime.startsWith('image/')
                ? 'image'
                : mime.startsWith('video/')
                    ? 'video'
                    : 'document';
            if (res.success) {
                setResourceFormData((prev) => ({
                    ...prev,
                    type: nextType,
                    url: res.data.url,
                    fileExtension: res.data.fileExtension || (file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''),
                    mimeType: res.data.mimeType || file.type || '',
                    originalName: res.data.originalName || file.name || '',
                }));
                const okMsg =
                    nextType === 'image'
                        ? 'Image importée avec succès'
                        : nextType === 'video'
                            ? 'Vidéo importée avec succès'
                            : 'Document importé avec succès';
                showToast(okMsg, 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Ce fichier contient du contenu inapproprié.'
                : err.message || 'Erreur upload fichier';
            showToast(msg, 'error');
            setResourceFormData((prev) => ({ ...prev, url: '', fileExtension: '', mimeType: '', originalName: '' }));
        } finally {
            setResourceUploading(false);
            e.target.value = '';
        }
    };
    const removeResourceImage = () => {
        setResourceFormData((prev) => ({ ...prev, url: '', fileExtension: '', mimeType: '', originalName: '' }));
    };

    const handleEditResource = (resource) => {
        setEditingResource(resource);
        const catId = typeof resource.category === 'object'
            ? resource.category?._id || ''
            : resource.category || '';
        const matchedCat = catId
            ? resourceCategoryOptions.find((opt) => opt.value === catId)?.value
                || categories.find((c) => c._id === catId)?._id
                || catId
            : '';
        setEditResourceForm({
            title: resource.title || '',
            type: resource.type || 'document',
            url: resource.url || '',
            description: resource.description || '',
            category: matchedCat,
            fileExtension: resource.fileExtension || '',
            mimeType: resource.mimeType || '',
            originalName: resource.originalName || '',
        });
    };

    const handleEditResourceMediaUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEditResourceUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/resources');
            const mime = String(file.type || '').toLowerCase();
            const nextType = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'document';
            if (res.success) {
                setEditResourceForm((prev) => ({
                    ...prev,
                    type: nextType,
                    url: res.data.url,
                    fileExtension: res.data.fileExtension || (file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''),
                    mimeType: res.data.mimeType || file.type || '',
                    originalName: res.data.originalName || file.name || '',
                }));
                const okMsg =
                    nextType === 'image'
                        ? 'Image importée avec succès'
                        : nextType === 'video'
                            ? 'Vidéo importée avec succès'
                            : 'Document importé avec succès';
                showToast(okMsg, 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403 ? err.message || 'Ce fichier contient du contenu inapproprié.' : err.message || 'Erreur upload fichier';
            showToast(msg, 'error');
            setEditResourceForm((prev) => ({ ...prev, url: '', fileExtension: '', mimeType: '', originalName: '' }));
        } finally {
            setEditResourceUploading(false);
            e.target.value = '';
        }
    };

    const removeEditResourceFile = () => {
        setEditResourceForm((prev) => ({ ...prev, url: '', fileExtension: '', mimeType: '', originalName: '' }));
    };

    const handleSaveEditResource = async (e) => {
        e.preventDefault();
        if (!editingResource) return;
        if (!editResourceForm.title.trim() || !editResourceForm.url.trim()) {
            showToast('Titre et URL sont obligatoires', 'error');
            return;
        }
        try {
            const urlForExt = editResourceForm.url.trim().split('?')[0];
            const inferredExtRaw = urlForExt.includes('.') ? urlForExt.split('.').pop().toLowerCase() : '';
            const inferredExt = inferredExtRaw.length <= 5 ? inferredExtRaw : '';
            const payload = {
                title: editResourceForm.title.trim(),
                type: editResourceForm.type,
                url: editResourceForm.url.trim(),
                description: editResourceForm.description?.trim() || '',
                fileExtension: editResourceForm.fileExtension || inferredExt || undefined,
                mimeType: editResourceForm.mimeType || undefined,
                originalName: editResourceForm.originalName || undefined,
                ...(editResourceForm.category ? { category: editResourceForm.category } : {}),
            };
            await resourcesService.update(editingResource._id, payload);
            setResources((prev) => prev.map((r) => r._id === editingResource._id ? { ...r, ...payload } : r));
            showToast('Ressource mise à jour', 'success');
            setEditingResource(null);
        } catch (err) {
            showToast(err.message || 'Erreur mise à jour ressource', 'error');
        }
    };

    const handleDeleteResource = async (resourceId) => {
        askDeleteConfirmation('resource', resourceId, 'Confirmer la suppression de cette ressource ?');
    };

    const handleDeleteContact = (id) => {
        askDeleteConfirmation('contact', id, 'Supprimer définitivement ce message de contact ?');
    };

    const openReplyModal = (c) => {
        setReplyModal(c);
        setReplyBody('');
    };

    const closeReplyModal = () => {
        setReplyModal(null);
        setReplyBody('');
    };

    const handleSendContactReply = async (e) => {
        e.preventDefault();
        if (!replyModal || !replyBody.trim()) return;
        setReplySending(true);
        try {
            await contactService.reply(replyModal._id, replyBody.trim());
            showToast('Réponse envoyée', 'success');
            closeReplyModal();
            await fetchContacts();
        } catch (err) {
            showToast(err.message || 'Erreur lors de l\'envoi', 'error');
        } finally {
            setReplySending(false);
        }
    };

    const closeNewsletterEditModal = () => {
        setNewsletterEdit(null);
        setNewsletterEditEmail('');
        setNewsletterEditSource('');
        setNewsletterEditStatus('active');
    };

    const openNewsletterEditModal = (s) => {
        setNewsletterEdit(s);
        setNewsletterEditEmail(s.email || '');
        setNewsletterEditSource(s.source || '');
        setNewsletterEditStatus(s.status === 'unsubscribed' ? 'unsubscribed' : 'active');
    };

    const handleSaveNewsletterSub = async (e) => {
        e.preventDefault();
        if (!newsletterEdit) return;
        const email = newsletterEditEmail.trim().toLowerCase();
        if (!email) {
            showToast('Email requis', 'error');
            return;
        }
        setNewsletterSaving(true);
        try {
            await newsletterService.update(newsletterEdit._id, {
                email,
                source: newsletterEditSource.trim().slice(0, 80),
                status: newsletterEditStatus,
            });
            showToast('Abonné mis à jour', 'success');
            await fetchNewsletterSubs();
            closeNewsletterEditModal();
        } catch (err) {
            showToast(err.message || 'Erreur mise à jour', 'error');
        } finally {
            setNewsletterSaving(false);
        }
    };

    const handleDeleteNewsletterSub = (id) => {
        askDeleteConfirmation('newsletterSub', id, 'Supprimer cet abonné newsletter ?');
    };

    const closeNewsletterBroadcastModal = () => {
        setNewsletterBroadcastOpen(false);
        setNewsletterBroadcastSubject('');
        setNewsletterBroadcastMessage('');
    };

    const isNewsletterBodyEmpty = (html) => {
        const s = String(html || '');
        if (/<img[\s>]/i.test(s)) return false;
        const text = s
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return !text;
    };

    const handleSendNewsletterBroadcast = (e) => {
        e.preventDefault();
        const subject = newsletterBroadcastSubject.trim();
        const message = newsletterBroadcastMessage.trim();
        if (!subject || isNewsletterBodyEmpty(message)) {
            showToast('Sujet et message sont requis', 'error');
            return;
        }
        if (message.length > 120000) {
            showToast('Message trop long (max 120 000 caractères)', 'error');
            return;
        }
        setConfirmModal({
            isOpen: true,
            kind: 'newsletterBroadcast',
            payload: { subject, message },
            message: '',
        });
    };

    const closePublicTeamModal = () => {
        setPublicTeamFormOpen(false);
        setPublicTeamEditId(null);
        setPublicTeamForm({ ...EMPTY_PUBLIC_TEAM_FORM });
    };

    const closePublicTeamViewModal = () => setPublicTeamViewMember(null);

    const openPublicTeamViewModal = (m) => setPublicTeamViewMember(m);

    const openEditFromPublicTeamView = () => {
        if (!publicTeamViewMember) return;
        const m = publicTeamViewMember;
        closePublicTeamViewModal();
        openPublicTeamModalEdit(m);
    };

    const openPublicTeamModalCreate = () => {
        setPublicTeamEditId(null);
        setPublicTeamForm({ ...EMPTY_PUBLIC_TEAM_FORM });
        setPublicTeamFormOpen(true);
    };

    const openPublicTeamModalEdit = (m) => {
        setPublicTeamEditId(m._id);
        setPublicTeamForm({
            name: m.name || '',
            organization: m.organization || '',
            role: m.role || '',
            email: m.email || m.contact || '',
            avatar: m.avatar || '',
            linkedin: m.linkedin || '',
            github: m.github || '',
            facebook: m.facebook || '',
            instagram: m.instagram || '',
            twitter: m.twitter || '',
            sortOrder: m.sortOrder != null && m.sortOrder !== '' ? String(m.sortOrder) : '',
            externalId: m.externalId != null && m.externalId !== '' ? String(m.externalId) : '',
        });
        setPublicTeamFormOpen(true);
    };

    const handlePublicTeamAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("L'image est trop volumineuse (max 5Mo)", 'error');
            e.target.value = '';
            return;
        }
        setPublicTeamAvatarUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/team');
            if (res.success) {
                setPublicTeamForm((prev) => ({ ...prev, avatar: res.data.url }));
                showToast('Photo importée avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            showToast(err.message || 'Erreur upload photo', 'error');
        } finally {
            setPublicTeamAvatarUploading(false);
            e.target.value = '';
        }
    };

    const handleSavePublicTeamMember = async (e) => {
        e.preventDefault();
        if (!publicTeamForm.name.trim()) {
            showToast('Le nom est requis', 'error');
            return;
        }
        const sortParsed =
            publicTeamForm.sortOrder.trim() === '' ? 999 : Number(publicTeamForm.sortOrder);
        const sortOrder = Number.isFinite(sortParsed) ? sortParsed : 999;
        const email = publicTeamForm.email.trim();
        const body = {
            name: publicTeamForm.name.trim(),
            organization: publicTeamForm.organization.trim(),
            role: publicTeamForm.role.trim(),
            bio: '',
            fullBio: '',
            email,
            contact: email,
            expertise: [],
            avatar: publicTeamForm.avatar.trim(),
            linkedin: publicTeamForm.linkedin.trim(),
            github: publicTeamForm.github.trim(),
            facebook: publicTeamForm.facebook.trim(),
            instagram: publicTeamForm.instagram.trim(),
            twitter: publicTeamForm.twitter.trim(),
            sortOrder,
        };
        if (publicTeamForm.externalId.trim() !== '') {
            const ext = Number(publicTeamForm.externalId);
            if (Number.isFinite(ext)) body.externalId = ext;
        }
        setPublicTeamSaving(true);
        try {
            if (publicTeamEditId) {
                await teamService.update(publicTeamEditId, body);
                showToast('Membre mis à jour', 'success');
            } else {
                await teamService.create(body);
                showToast('Membre ajouté', 'success');
            }
            await fetchPublicTeamMembers();
            closePublicTeamModal();
        } catch (err) {
            showToast(err.message || 'Erreur enregistrement', 'error');
        } finally {
            setPublicTeamSaving(false);
        }
    };

    const handleDeletePublicTeamMember = (id) => {
        askDeleteConfirmation(
            'publicTeamMember',
            id,
            'Retirer ce membre de la liste (page À propos) ?'
        );
    };

    const openPartnerForm = (partner = null) => {
        if (partner) {
            setPartnerEditId(partner._id);
            setPartnerForm({
                name: partner.name || '',
                shortName: partner.shortName || '',
                description: partner.description || '',
                role: partner.role || '',
                logo: partner.logo || '',
                website: partner.website || '',
                collaboration: partner.collaboration || '',
                sortOrder: partner.sortOrder != null ? String(partner.sortOrder) : '',
            });
        } else {
            setPartnerEditId(null);
            setPartnerForm({ ...EMPTY_PARTNER_FORM });
        }
        setPartnerFormOpen(true);
    };

    const closePartnerForm = () => {
        setPartnerFormOpen(false);
        setPartnerEditId(null);
        setPartnerForm({ ...EMPTY_PARTNER_FORM });
    };

    const openPartnerViewModal = (p) => setPartnerViewMember(p);
    const closePartnerViewModal = () => setPartnerViewMember(null);
    const openEditFromPartnerView = () => {
        if (!partnerViewMember) return;
        const p = partnerViewMember;
        closePartnerViewModal();
        openPartnerForm(p);
    };

    const handlePartnerLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("L'image est trop volumineuse (max 5Mo)", 'error');
            e.target.value = '';
            return;
        }
        setPartnerLogoUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/partners');
            if (res.success) {
                setPartnerForm((prev) => ({ ...prev, logo: res.data.url }));
                showToast('Logo importé avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            showToast(err.message || 'Erreur upload logo', 'error');
        } finally {
            setPartnerLogoUploading(false);
            e.target.value = '';
        }
    };

    const handleSavePartner = async (e) => {
        e.preventDefault();
        if (!partnerForm.name.trim()) {
            showToast('Le nom est requis', 'error');
            return;
        }
        const sortParsed = partnerForm.sortOrder.trim() === '' ? 999 : Number(partnerForm.sortOrder);
        const sortOrder = Number.isFinite(sortParsed) ? sortParsed : 999;
        const body = {
            name: partnerForm.name.trim(),
            shortName: partnerForm.shortName.trim(),
            description: partnerForm.description.trim(),
            role: partnerForm.role.trim(),
            logo: partnerForm.logo.trim(),
            website: partnerForm.website.trim(),
            collaboration: partnerForm.collaboration.trim(),
            sortOrder,
        };
        setPartnerSaving(true);
        try {
            if (partnerEditId) {
                await partnerService.update(partnerEditId, body);
                showToast('Partenaire mis à jour', 'success');
            } else {
                await partnerService.create(body);
                showToast('Partenaire ajouté', 'success');
            }
            await fetchPartners();
            closePartnerForm();
        } catch (err) {
            showToast(err.message || 'Erreur enregistrement', 'error');
        } finally {
            setPartnerSaving(false);
        }
    };

    const handleDeletePartner = (id) => {
        askDeleteConfirmation('partner', id, 'Supprimer ce partenaire ?');
    };

    const openEntrepreneurForm = (row = null) => {
        if (row) {
            setEntrepreneurEditId(row._id);
            setEntrepreneurForm({
                name: row.name || '',
                role: row.role || '',
                organization: row.organization || '',
                quote: row.quote || '',
                avatar: row.avatar || '',
                sortOrder: row.sortOrder != null ? String(row.sortOrder) : '',
            });
        } else {
            setEntrepreneurEditId(null);
            setEntrepreneurForm({ ...EMPTY_ENTREPRENEUR_FORM });
        }
        setEntrepreneurFormOpen(true);
    };

    const closeEntrepreneurForm = () => {
        setEntrepreneurFormOpen(false);
        setEntrepreneurEditId(null);
        setEntrepreneurForm({ ...EMPTY_ENTREPRENEUR_FORM });
    };

    const openEntrepreneurViewModal = (e) => setEntrepreneurViewItem(e);
    const closeEntrepreneurViewModal = () => setEntrepreneurViewItem(null);
    const openEditFromEntrepreneurView = () => {
        if (!entrepreneurViewItem) return;
        const e = entrepreneurViewItem;
        closeEntrepreneurViewModal();
        openEntrepreneurForm(e);
    };

    const handleEntrepreneurAvatarUpload = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast("L'image est trop volumineuse (max 5Mo)", 'error');
            ev.target.value = '';
            return;
        }
        setEntrepreneurAvatarUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/entrepreneurs');
            if (res.success) {
                setEntrepreneurForm((prev) => ({ ...prev, avatar: res.data.url }));
                showToast('Photo importée avec succès', 'success', IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            showToast(err.message || 'Erreur upload photo', 'error');
        } finally {
            setEntrepreneurAvatarUploading(false);
            ev.target.value = '';
        }
    };

    const handleSaveEntrepreneur = async (e) => {
        e.preventDefault();
        if (!entrepreneurForm.name.trim()) {
            showToast('Le nom est requis', 'error');
            return;
        }
        const sortParsed = entrepreneurForm.sortOrder.trim() === '' ? 999 : Number(entrepreneurForm.sortOrder);
        const sortOrder = Number.isFinite(sortParsed) ? sortParsed : 999;
        const body = {
            name: entrepreneurForm.name.trim(),
            role: entrepreneurForm.role.trim(),
            organization: entrepreneurForm.organization.trim(),
            quote: entrepreneurForm.quote.trim(),
            avatar: entrepreneurForm.avatar.trim(),
            sortOrder,
        };
        setEntrepreneurSaving(true);
        try {
            if (entrepreneurEditId) {
                await entrepreneurService.update(entrepreneurEditId, body);
                showToast('Profil mis à jour', 'success');
            } else {
                await entrepreneurService.create(body);
                showToast('Profil ajouté', 'success');
            }
            await fetchEntrepreneurs();
            closeEntrepreneurForm();
        } catch (err) {
            showToast(err.message || 'Erreur enregistrement', 'error');
        } finally {
            setEntrepreneurSaving(false);
        }
    };

    const handleDeleteEntrepreneur = (id) => {
        askDeleteConfirmation('entrepreneur', id, 'Supprimer ce profil entrepreneur ?');
    };

    if (checkingAuth) {
        return <AdminCheckingAuth />;
    }

    if (!isAuthenticated) {
        return <AdminUnauthenticated />;
    }

    const canViewContacts = ['superadmin', 'moderator', 'analyst'].includes(currentUserRole);
    const canEditContacts = ['superadmin', 'moderator'].includes(currentUserRole);
    const canManageTeamAndNewsletter = ['superadmin', 'moderator'].includes(currentUserRole);
    const canManageQuestionnaires = ['superadmin', 'analyst'].includes(currentUserRole);
    const canAccessAnalytics = ['superadmin', 'analyst'].includes(currentUserRole);
    const isAnalystOnly = currentUserRole === 'analyst';

    const navItems = [
        ...(!isAnalystOnly ? [{ key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} /> }] : []),
        ...(canAccessAnalytics ? [{ key: 'analytics', label: 'Analyse & rapports', icon: <BarChart3 size={18} /> }] : []),
        ...(!isAnalystOnly
            ? [
                { key: 'articles', label: 'Articles', icon: <ArticlesIcon size={18} /> },
                { key: 'events', label: 'Événements', icon: <EventsIcon size={18} /> },
                { key: 'resources', label: 'Ressources', icon: <ResourcesIcon size={18} /> },
                { key: 'users', label: 'Utilisateurs', icon: <UsersIcon size={18} /> },
            ]
            : []),
        ...(currentUserRole === 'superadmin'
            ? [
                { key: 'reactivation', label: 'Réactivations', icon: <UsersIcon size={18} /> },
                { key: 'staff', label: 'Équipe Admin', icon: <UsersIcon size={18} /> }
            ]
            : []),
        ...(canManageQuestionnaires ? [{ key: 'questionnaire', label: 'Questionnaire', icon: <ArticlesIcon size={18} /> }] : []),
        ...(!isAnalystOnly && canViewContacts ? [{ key: 'contacts', label: 'Contacts', icon: <Mail size={18} /> }] : []),
        ...(!isAnalystOnly && canManageTeamAndNewsletter
            ? [
                { key: 'partners', label: 'Partenaires', icon: <Handshake size={18} /> },
                { key: 'entrepreneurs', label: 'Entrepreneurs', icon: <Briefcase size={18} /> },
                { key: 'publicteam', label: 'Dev team', icon: <Users size={18} /> },
                { key: 'newsletter', label: 'Newsletter', icon: <Newspaper size={18} /> },
            ]
            : []),
    ];

    const adminPanelValue = {

        navigate, goToSection, location, activeSection, routeSlug,
        canViewContacts, canEditContacts, canManageTeamAndNewsletter, canManageQuestionnaires, canAccessAnalytics, isAnalystOnly,
        PROFESSION_OPTIONS, ADMIN_PAGE_SIZE, QUESTION_CATEGORY_OPTIONS, PERSONAL_INFO_FIELD_VALUES, QUESTIONNAIRE_PREVIEW_FALLBACK_DESC,
        formatArticleStatus, staffRolePillClass, adminUserRoleSelectClass, adminUserStatusSelectClass, formatAdminTeamDateTime, adminTeamDisplayValue,
        addQDraft,
        adminNewEventImageCheckTimer,
        articleFilterDate,
        articleFilterQ,
        articleFilterQDeb,
        articlePage,
        articlesLoading,
        articleSaving,
        articleStatusFilter,
        articleTotalPages,
        askDeleteConfirmation,
        categories,
        checkAdminNewEventImageUrl,
        checkingAuth,
        closeConfirmModal,
        closeEntrepreneurForm,
        closeEntrepreneurViewModal,
        closeNewEventModal,
        closeNewsletterBroadcastModal,
        closeNewsletterEditModal,
        closePartnerForm,
        closePartnerViewModal,
        closePostModal,
        closePublicTeamModal,
        closePublicTeamViewModal,
        closeQEdit,
        closeQQuestionsModal,
        closeReplyModal,
        confirmDelete,
        confirmModal,
        contactDateFrom,
        contactDateTo,
        contactDetail,
        contactFilterQ,
        contactPage,
        contactTotalPages,
        contacts,
        currentUserRole,
        dashboardData,
        dashboardDataRef,
        deletingUser,
        editEventForm,
        editEventImageUploading,
        editResourceForm,
        editResourceUploading,
        editingEvent,
        editingResource,
        entrepreneurAvatarUploading,
        entrepreneurDateFrom,
        entrepreneurDateTo,
        entrepreneurEditId,
        entrepreneurFilterQ,
        entrepreneurForm,
        entrepreneurFormOpen,
        entrepreneurPage,
        entrepreneurSaving,
        entrepreneurViewItem,
        entrepreneursList,
        error,
        eventDateFrom,
        eventDateTo,
        eventFilterQ,
        eventFormData,
        eventFormSubmitting,
        eventImageUploading,
        eventImageUrlCheckStatus,
        eventPage,
        eventStatusFilter,
        eventTotalPages,
        events,
        fetchAdminPosts,
        fetchContacts,
        fetchDashboardData,
        fetchEntrepreneurs,
        fetchEvents,
        fetchNewsletterSubs,
        fetchPartners,
        fetchPublicTeamMembers,
        fetchReactivationRequests,
        fetchResources,
        fetchStaffUsersList,
        fetchUsersList,
        filteredContacts,
        filteredEntrepreneurs,
        filteredEvents,
        filteredNewsletterSubs,
        filteredPartners,
        filteredPublicTeamMembers,
        filteredQuestionnairesList,
        filteredReactivation,
        filteredResources,
        handleAddQuestion,
        handleAdminArticleMediaUpload,
        handleAdminNewEventImageUrlChange,
        handleAdminNewEventSubmit,
        handleAdminResourceMediaUpload,
        handleApproveReactivation,
        handleCreateArticle,
        handleCreateQuestionnaire,
        handleCreateResource,
        handleDeleteContact,
        handleDeleteEntrepreneur,
        handleDeleteNewsletterSub,
        handleDeletePartner,
        handleDeletePost,
        handleDeletePublicTeamMember,
        handleDeleteResource,
        handleDeleteUser,
        handleEditEvent,
        handleEditEventImageUpload,
        handleEditPost,
        handleEditResource,
        handleEditResourceMediaUpload,
        handleEntrepreneurAvatarUpload,
        handleEventImageUpload,
        handlePartnerLogoUpload,
        handlePublicTeamAvatarUpload,
        handlePublishEvent,
        handlePublishPost,
        handleRejectReactivation,
        handleRemoveQuestion,
        handleRestoreDefaultQuestions,
        handleRoleChange,
        handleSaveEditEvent,
        handleSaveEditResource,
        handleSaveEntrepreneur,
        handleSaveNewsletterSub,
        handleSavePartner,
        handleSavePostForm,
        handleSavePublicTeamMember,
        handleSaveQEdit,
        handleSaveQQuestions,
        handleSendContactReply,
        handleSendNewsletterBroadcast,
        handleStatusChange,
        handleViewEventParticipants,
        handleViewPost,
        handleViewUser,
        isAuthenticated,
        isNewsletterBodyEmpty,
        levels,
        loadQuestionnairePanelDetail,
        loadQuestionnaireSectionData,
        loading,
        moveQDraft,
        newQuestion,
        newsletterBroadcastMessage,
        newsletterBroadcastOpen,
        newsletterBroadcastSending,
        newsletterBroadcastSubject,
        newsletterBroadcastUploading,
        newsletterDateFrom,
        newsletterDateTo,
        newsletterEdit,
        newsletterEditEmail,
        newsletterEditSource,
        newsletterEditStatus,
        newsletterFilterQ,
        newsletterPage,
        newsletterSaving,
        newsletterSubs,
        newsletterTotalPages,
        openAdminNewEventModal,
        openEditFromEntrepreneurView,
        openEditFromPartnerView,
        openEditFromPublicTeamView,
        openEntrepreneurForm,
        openEntrepreneurViewModal,
        openNewsletterEditModal,
        openPartnerForm,
        openPartnerViewModal,
        openPostModal,
        openPublicTeamModalCreate,
        openPublicTeamModalEdit,
        openPublicTeamViewModal,
        openQEdit,
        openQQuestionsModal,
        openReplyModal,
        pagedContacts,
        pagedEntrepreneurs,
        pagedEvents,
        pagedNewsletterSubs,
        pagedPartners,
        pagedPublicTeamMembers,
        pagedQuestionnairesList,
        pagedReactivation,
        pagedResources,
        partnerDateFrom,
        partnerDateTo,
        partnerEditId,
        partnerFilterQ,
        partnerForm,
        partnerFormOpen,
        partnerLogoUploading,
        partnerPage,
        partnerSaving,
        partnerViewMember,
        partnersList,
        postForm,
        postModalMode,
        postModalOpen,
        posts,
        publicTeamAvatarUploading,
        publicTeamDateFrom,
        publicTeamDateTo,
        publicTeamEditId,
        publicTeamFilterQ,
        publicTeamForm,
        publicTeamFormOpen,
        publicTeamMembers,
        publicTeamPage,
        publicTeamSaving,
        publicTeamTotalPages,
        publicTeamViewMember,
        qEditForm,
        qEditId,
        qFormData,
        qListDateFrom,
        qListDateTo,
        qListFilterQ,
        qListPage,
        qListTotalPages,
        qPanelSelectedId,
        qPreview,
        qPreviewLoading,
        qQuestionsModal,
        qQuestionsSaving,
        qSaving,
        questionnairesList,
        reactDateFrom,
        reactDateTo,
        reactFilterQ,
        reactPage,
        reactTotalPages,
        reactivationActionId,
        reactivationRequests,
        registrationQuestionnaire,
        removeEditResourceFile,
        removeQDraft,
        removeResourceImage,
        replyBody,
        replyModal,
        replySending,
        resetAdminNewEventForm,
        resourceCategoryOptions,
        resourceDateFrom,
        resourceDateTo,
        resourceFilterQ,
        resourceFormData,
        resourcePage,
        resourceTotalPages,
        resourceUploading,
        resources,
        selectQuestionnaireForPanel,
        selectedEvent,
        selectedPost,
        selectedResource,
        setArticleFilterDate,
        setArticleFilterQ,
        setArticleFilterQDeb,
        setArticlePage,
        setArticlesLoading,
        setArticleSaving,
        setArticleStatusFilter,
        setArticleTotalPages,
        setCategories,
        setCheckingAuth,
        setConfirmModal,
        setContactDateFrom,
        setContactDateTo,
        setContactDetail,
        setContactFilterQ,
        setContactPage,
        setContacts,
        setCurrentUserRole,
        setDashboardData,
        setDeletingUser,
        setEditEventForm,
        setEditEventImageUploading,
        setEditResourceForm,
        setEditResourceUploading,
        setEditingEvent,
        setEditingResource,
        setEntrepreneurAvatarUploading,
        setEntrepreneurDateFrom,
        setEntrepreneurDateTo,
        setEntrepreneurEditId,
        setEntrepreneurFilterQ,
        setEntrepreneurForm,
        setEntrepreneurFormOpen,
        setEntrepreneurPage,
        setEntrepreneurSaving,
        setEntrepreneurViewItem,
        setEntrepreneursList,
        setError,
        setEventDateFrom,
        setEventDateTo,
        setEventFilterQ,
        setEventFormData,
        setEventFormSubmitting,
        setEventImageUploading,
        setEventImageUrlCheckStatus,
        setEventPage,
        setEventStatusFilter,
        setEvents,
        setIsAuthenticated,
        setLevels,
        setLoading,
        setNewQuestion,
        setNewsletterBroadcastMessage,
        setNewsletterBroadcastOpen,
        setNewsletterBroadcastSending,
        setNewsletterBroadcastSubject,
        setNewsletterBroadcastUploading,
        setNewsletterDateFrom,
        setNewsletterDateTo,
        setNewsletterEdit,
        setNewsletterEditEmail,
        setNewsletterEditSource,
        setNewsletterEditStatus,
        setNewsletterFilterQ,
        setNewsletterPage,
        setNewsletterSaving,
        setNewsletterSubs,
        setPartnerDateFrom,
        setPartnerDateTo,
        setPartnerEditId,
        setPartnerFilterQ,
        setPartnerForm,
        setPartnerFormOpen,
        setPartnerLogoUploading,
        setPartnerPage,
        setPartnerSaving,
        setPartnerViewMember,
        setPartnersList,
        setPostForm,
        setPostModalMode,
        setPostModalOpen,
        setPosts,
        setPublicTeamAvatarUploading,
        setPublicTeamDateFrom,
        setPublicTeamDateTo,
        setPublicTeamEditId,
        setPublicTeamFilterQ,
        setPublicTeamForm,
        setPublicTeamFormOpen,
        setPublicTeamMembers,
        setPublicTeamPage,
        setPublicTeamSaving,
        setPublicTeamViewMember,
        setQEditForm,
        setQEditId,
        setQFormData,
        setQListDateFrom,
        setQListDateTo,
        setQListFilterQ,
        setQListPage,
        setQPanelSelectedId,
        setQPreview,
        setQPreviewLoading,
        setQQuestionsModal,
        setQQuestionsSaving,
        setQSaving,
        setQuestionnairesList,
        setReactDateFrom,
        setReactDateTo,
        setReactFilterQ,
        setReactPage,
        setReactivationActionId,
        setReactivationRequests,
        setRegistrationQuestionnaire,
        setReplyBody,
        setReplyModal,
        setReplySending,
        setResourceDateFrom,
        setResourceDateTo,
        setResourceFilterQ,
        setResourceFormData,
        setResourcePage,
        setResourceUploading,
        setResources,
        setSelectedEvent,
        setSelectedPost,
        setSelectedResource,
        setShowEventForm,
        setShowQForm,
        setShowResourceForm,
        setSidebarCollapsed,
        setStaffDateFrom,
        setStaffDateTo,
        setStaffFilterQ,
        setStaffFilterQDeb,
        setStaffPage,
        setStaffRoleFilter,
        setStaffStatusFilter,
        setStaffUsers,
        setToast,
        setUpdatingRole,
        setUpdatingStatus,
        setUploading,
        setUserDateFrom,
        setUserDateTo,
        setUserDetailModal,
        setUserFilterQ,
        setUserFilterQDeb,
        setUserPage,
        setUserStatusFilter,
        setUsers,
        showEventForm,
        showQForm,
        showResourceForm,
        showToast,
        sidebarCollapsed,
        staffDateFrom,
        staffDateTo,
        staffFilterQ,
        staffFilterQDeb,
        staffPage,
        staffRoleFilter,
        staffStatusFilter,
        staffUsers,
        toLocalInput,
        toast,
        updateQDraft,
        updatingRole,
        updatingStatus,
        uploading,
        userDateFrom,
        userDateTo,
        userDetailModal,
        userFilterQ,
        userFilterQDeb,
        userPage,
        userStatusFilter,
        users,

        navItems,
        qStats,
        setQStats,
        qStatsLoading,
        setQStatsLoading,
        loadQuestionnaireStats,

    };

    return (
        <AdminPanelContext.Provider value={adminPanelValue}>
            <AdminShell />
        </AdminPanelContext.Provider>
    );
}
