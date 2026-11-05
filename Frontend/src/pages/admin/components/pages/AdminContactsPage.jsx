import { Link } from 'react-router-dom';
import { Upload, X, Mail, Users, Newspaper, Handshake, Briefcase, BarChart3, Loader, CheckCircle, AlertTriangle } from 'lucide-react';
import {
    ArticlesIcon,
    EventsIcon,
    ResourcesIcon,
    UsersIcon,
    EditIcon,
    TrashIcon,
    EyeIcon,
    DownloadIcon
} from '../../../../components/Icons';
import { adminService, eventsService, articlesService, resourcesService, contactService, teamService, newsletterService, partnerService, entrepreneurService, api } from '../../../../services';
import { downloadFileResource } from '../../../../utils/cloudinaryDelivery';
import { Modal } from '../../../../components/UI';
import BlogArticleForm from '../../../../components/BlogArticleForm';
import RichTextEditor from '../../../../components/RichTextEditor';
import AdminPagination from '../../../../components/AdminPagination';
import AdminListFilters from '../../../../components/AdminListFilters';
import AdminAnalyticsDashboard from '../../../../components/AdminAnalyticsDashboard';
import { matchesCreatedAtRange, textIncludes } from '../../../../utils/adminListFilters';
import {
    getTomorrowMidnightLocalString,
    addMinutesToDatetimeLocalString,
    validateEventSchedule,
    getDatetimeLocalMinForStartEdit,
} from '../../../../utils/eventScheduling';
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
} from '../../constants';
import {
    formatAdminTeamDateTime,
    adminTeamDisplayValue,
    formatArticleStatus,
    staffRolePillClass,
    adminUserRoleSelectClass,
    adminUserStatusSelectClass,
} from '../../utils/helpers';
import DashboardIcon from '../DashboardIcon';
import StaffRolePill from '../StaffRolePill';
import { useAdminPanel } from '../../AdminPanelContext';

export default function AdminContactsPage() {
    const {
        ADMIN_PAGE_SIZE,
        canEditContacts,
        contactDateFrom,
        contactFilterQ,
        contactPage,
        contactTotalPages,
        contacts,
        fetchContacts,
        filteredContacts,
        handleDeleteContact,
        openReplyModal,
        pagedContacts,
        setContactDateFrom,
        setContactDateTo,
        setContactDetail,
        setContactFilterQ,
        setContactPage,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Messages de contact</h1>
                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            void fetchContacts();
                                            showToast('🔄 Liste actualisée', 'success');
                                        }}
                                        title="Actualiser"
                                    >
                                        🔄 Actualiser
                                    </button>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-contacts"
                                    title="Filtres contacts"
                                    searchPlaceholder="Recherche sur Contacts"
                                    searchValue={contactFilterQ}
                                    onSearchChange={setContactFilterQ}
                                    dateMode="single"
                                    singleDate={contactDateFrom}
                                    onSingleDateChange={(value) => {
                                        setContactDateFrom(value);
                                        setContactDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                />
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '72px', textAlign: 'center' }}>Initiales</th>
                                                <th style={{ width: '100px' }}>Date</th>
                                                <th>Nom</th>
                                                <th>Email</th>
                                                <th>Sujet</th>
                                                <th style={{ width: '100px' }}>Statut</th>
                                                <th style={{ width: '110px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucun message pour l’instant.
                                                    </td>
                                                </tr>
                                            ) : filteredContacts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucun résultat pour ces critères
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedContacts.map((c) => {
                                                    const initials = (c.name || c.email || '?')
                                                        .split(/\s+/)
                                                        .map((w) => w[0])
                                                        .filter(Boolean)
                                                        .join('')
                                                        .substring(0, 2)
                                                        .toUpperCase() || '?';
                                                    return (
                                                    <tr key={c._id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto',
                                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #00a5b5))',
                                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.8rem', fontWeight: 700,
                                                            }}>
                                                                {initials}
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                            {c.createdAt
                                                                ? new Date(c.createdAt).toLocaleString('fr-FR', {
                                                                    dateStyle: 'short',
                                                                    timeStyle: 'short',
                                                                })
                                                                : '—'}
                                                        </td>
                                                        <td>
                                                            <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{c.name || '—'}</span>
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{c.email || '—'}</td>
                                                        <td style={{ maxWidth: '220px', whiteSpace: 'normal', fontSize: '0.85rem' }} title={c.subject || ''}>
                                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                {c.subject || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {(() => {
                                                                const done = !!c.repliedAt;
                                                                const col = done ? '#16a34a' : '#d97706';
                                                                return (
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', color: col, background: `${col}1a`, border: `1px solid ${col}40` }}>
                                                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                                                                        {done ? 'Répondu' : 'En attente'}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn--sm btn--ghost btn--action-view"
                                                                    title="Voir le message"
                                                                    onClick={() => setContactDetail(c)}
                                                                >
                                                                    <EyeIcon size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn--sm btn--ghost btn--action-edit"
                                                                    title="Répondre par email"
                                                                    onClick={() => openReplyModal(c)}
                                                                >
                                                                    <Mail size={16} />
                                                                </button>
                                                                {canEditContacts && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn--sm btn--ghost btn--action-delete"
                                                                        title="Supprimer"
                                                                        onClick={() => handleDeleteContact(c._id)}
                                                                    >
                                                                        <TrashIcon size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={contactPage}
                                    totalPages={contactTotalPages}
                                    totalItems={filteredContacts.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setContactPage}
                                />
                            </>
    );
}
