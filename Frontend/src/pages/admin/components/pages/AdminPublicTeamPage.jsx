import { Link } from 'react-router-dom';
import { Upload, X, Mail, Users, Newspaper, Handshake, Briefcase, BarChart3, Loader, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
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

export default function AdminPublicTeamPage() {
    const {
        ADMIN_PAGE_SIZE,
        fetchPublicTeamMembers,
        filteredPublicTeamMembers,
        handleDeletePublicTeamMember,
        openPublicTeamModalCreate,
        openPublicTeamModalEdit,
        openPublicTeamViewModal,
        pagedPublicTeamMembers,
        publicTeamDateFrom,
        publicTeamFilterQ,
        publicTeamMembers,
        publicTeamPage,
        publicTeamTotalPages,
        setPublicTeamDateFrom,
        setPublicTeamDateTo,
        setPublicTeamFilterQ,
        setPublicTeamPage,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div
                                    className="admin-header"
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '1rem',
                                    }}
                                >
                                    <div>
                                        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>
                                            {"Gestion d'équipe"}
                                        </h1>
                                      
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={() => {
                                                void fetchPublicTeamMembers();
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button type="button" className="btn btn--primary" onClick={openPublicTeamModalCreate}>
                                            <span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Ajouter un membre</span>
                                        </button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-public-team"
                                    title="Filtres équipe"
                                    searchPlaceholder="Recherche sur équipe"
                                    searchValue={publicTeamFilterQ}
                                    onSearchChange={setPublicTeamFilterQ}
                                    dateMode="single"
                                    singleDate={publicTeamDateFrom}
                                    onSingleDateChange={(value) => {
                                        setPublicTeamDateFrom(value);
                                        setPublicTeamDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date d’ajout)"
                                />
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Ordre</th>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Photo</th>
                                                <th>Membre</th>
                                                <th style={{ width: '100px' }}>Équipe</th>
                                                <th style={{ width: '100px' }}>Date</th>
                                                <th style={{ width: '80px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {publicTeamMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucun membre en base. Lancez le seed backend (
                                                        <code style={{ fontSize: '0.85em' }}>node scripts/seedFromDataFolder.js</code>
                                                        ) ou ajoutez un membre.
                                                    </td>
                                                </tr>
                                            ) : filteredPublicTeamMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucun résultat pour ces critères
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedPublicTeamMembers.map((m) => {
                                                    const mInitials = m.name
                                                        ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                                        : '?';
                                                    return (
                                                    <tr key={m._id}>
                                                        <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{m.sortOrder ?? '—'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto',
                                                                background: m.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #00a5b5))',
                                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden',
                                                                border: m.avatar ? '2px solid var(--color-primary)' : 'none',
                                                            }}>
                                                                {m.avatar
                                                                    ? <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    : mInitials}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                                    {m.name || '—'}
                                                                </span>
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                    {m.email || m.contact || '—'}
                                                                </span>
                                                                {m.jobTitle && (
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                                                        {m.jobTitle}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', color: '#0d9488', background: 'rgba(13,148,136,.12)', border: '1px solid rgba(13,148,136,.3)' }}>
                                                                {m.organization || m.role || '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {m.createdAt ? new Date(m.createdAt).toLocaleDateString('fr-FR') : '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                                <button className="btn btn--sm btn--ghost btn--action-view" title="Voir la fiche" onClick={() => openPublicTeamViewModal(m)}>
                                                                    <EyeIcon size={16} />
                                                                </button>
                                                                <button className="btn btn--sm btn--ghost btn--action-edit" title="Modifier" onClick={() => openPublicTeamModalEdit(m)}>
                                                                    <EditIcon size={16} />
                                                                </button>
                                                                <button className="btn btn--sm btn--ghost btn--action-delete" title="Supprimer" onClick={() => handleDeletePublicTeamMember(m._id)}>
                                                                    <TrashIcon size={16} />
                                                                </button>
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
                                    currentPage={publicTeamPage}
                                    totalPages={publicTeamTotalPages}
                                    totalItems={filteredPublicTeamMembers.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setPublicTeamPage}
                                />
                            </>
    );
}
