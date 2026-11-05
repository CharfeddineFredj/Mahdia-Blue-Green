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

export default function AdminReactivationPage() {
    const {
        ADMIN_PAGE_SIZE,
        fetchReactivationRequests,
        filteredReactivation,
        handleApproveReactivation,
        handleRejectReactivation,
        pagedReactivation,
        reactDateFrom,
        reactFilterQ,
        reactPage,
        reactTotalPages,
        reactivationActionId,
        reactivationRequests,
        setReactDateFrom,
        setReactDateTo,
        setReactFilterQ,
        setReactPage,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Demandes de réactivation</h1>
                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            void fetchReactivationRequests();
                                            showToast('🔄 Liste actualisée', 'success');
                                        }}
                                        title="Actualiser"
                                    >
                                        🔄 Actualiser
                                    </button>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-react"
                                    title="Filtres demandes de réactivation"
                                    searchPlaceholder="Recherche sur Réactivations"
                                    searchValue={reactFilterQ}
                                    onSearchChange={setReactFilterQ}
                                    dateMode="single"
                                    singleDate={reactDateFrom}
                                    onSingleDateChange={(value) => {
                                        setReactDateFrom(value);
                                        setReactDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                />
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th>Utilisateur</th>
                                                <th>Email</th>
                                                <th>Fournisseur</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reactivationRequests.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucune demande en attente
                                                    </td>
                                                </tr>
                                            ) : filteredReactivation.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                                                        Aucun résultat pour ces critères
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedReactivation.map((req) => (
                                                    <tr key={req._id}>
                                                        <td>{req.user?.username || '—'}</td>
                                                        <td>{req.user?.email || '—'}</td>
                                                        <td>{req.user?.authProvider || '—'}</td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '150px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {req.createdAt ? new Date(req.createdAt).toLocaleString('fr-FR') : '—'}
                                                            </span>
                                                        </td>
                                                        <td className="table__actions">
                                                            <button
                                                                type="button"
                                                                className="btn btn--sm btn--primary"
                                                                style={{ borderRadius: 999, padding: '0.35rem 0.9rem', fontWeight: 600 }}
                                                                disabled={!!reactivationActionId}
                                                                onClick={() => handleApproveReactivation(req._id)}
                                                            >
                                                                {reactivationActionId === `${req._id}-approve` ? '…' : 'Accepter'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn--sm btn--outline"
                                                                style={{ borderRadius: 999, padding: '0.35rem 0.9rem', fontWeight: 600 }}
                                                                disabled={!!reactivationActionId}
                                                                onClick={() => handleRejectReactivation(req._id)}
                                                            >
                                                                {reactivationActionId === `${req._id}-reject` ? '…' : 'Refuser'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={reactPage}
                                    totalPages={reactTotalPages}
                                    totalItems={filteredReactivation.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setReactPage}
                                />
                            </>
    );
}
