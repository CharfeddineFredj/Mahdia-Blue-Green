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
import { canDisplayProfileImage, getUserInitialsFromName } from '../../../../utils/userAvatar';
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

export default function AdminUsersPage() {
    const {
        ADMIN_PAGE_SIZE,
        adminUserRoleSelectClass,
        adminUserStatusSelectClass,
        currentUserRole,
        deletingUser,
        fetchUsersList,
        handleDeleteUser,
        handleRoleChange,
        handleStatusChange,
        handleViewUser,
        loading,
        setUserDateFrom,
        setUserDateTo,
        setUserFilterQ,
        setUserPage,
        setUserStatusFilter,
        staffRolePillClass,
        updatingRole,
        updatingStatus,
        userDateFrom,
        userFilterQ,
        userPage,
        userStatusFilter,
        users,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Utilisateurs</h1>
                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            void fetchUsersList();
                                            showToast('🔄 Liste actualisée', 'success');
                                        }}
                                        title="Actualiser"
                                    >
                                        🔄 Actualiser
                                    </button>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-users"
                                    title="Filtres utilisateurs"
                                    searchPlaceholder="Recherche sur Utilisateurs"
                                    searchValue={userFilterQ}
                                    onSearchChange={setUserFilterQ}
                                    dateMode="single"
                                    singleDate={userDateFrom}
                                    onSingleDateChange={(value) => {
                                        setUserDateFrom(value);
                                        setUserDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                >
                                    <div className="admin-filters__field">
                                        <label className="admin-filters__label" htmlFor="admin-users-status">Statut</label>
                                        <select
                                            id="admin-users-status"
                                            className="form-select admin-filters__select"
                                            value={userStatusFilter}
                                            onChange={(e) => setUserStatusFilter(e.target.value)}
                                        >
                                            <option value="">Tous les statuts</option>
                                            <option value="active">Actif</option>
                                            <option value="inactive">Inactif</option>
                                        </select>
                                    </div>
                                </AdminListFilters>
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Photo</th>
                                                <th>Utilisateur</th>
                                                <th>Rôle</th>
                                                <th style={{ width: '100px' }}>Statut</th>
                                                <th style={{ width: '110px' }}>Questionnaire</th>
                                                <th style={{ width: '100px' }}>Date</th>
                                                <th style={{ width: '80px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.data && users.data.length > 0 ? (
                                                users.data.map(user => {
                                                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
                                                    const uInitials = getUserInitialsFromName(user);
                                                    const showPhoto = canDisplayProfileImage(user);
                                                    return (
                                                    <tr key={user._id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div style={{
                                                                width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto',
                                                                background: showPhoto ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #00a5b5))',
                                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden',
                                                                border: showPhoto ? '2px solid var(--color-primary)' : 'none',
                                                            }}>
                                                                {showPhoto
                                                                    ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    : uInitials}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                                    {fullName || user.username}
                                                                </span>
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                    {user.email}
                                                                </span>
                                                                {fullName && (
                                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                                                        @{user.username}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {user.role === 'superadmin' ? (
                                                                <span
                                                                    className={`${staffRolePillClass('superadmin')} staff-role-pill--static`}
                                                                    title="Rôle non modifiable depuis le tableau de bord"
                                                                >
                                                                    <StaffRolePill role="superadmin" />
                                                                </span>
                                                            ) : currentUserRole === 'moderator' ? (
                                                                <span
                                                                    className={`${staffRolePillClass(user.role)} staff-role-pill--static`}
                                                                    title="Seul le super administrateur peut modifier les rôles"
                                                                >
                                                                    <StaffRolePill role={user.role} />
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    className={adminUserRoleSelectClass(user.role)}
                                                                    value={user.role}
                                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                                    disabled={currentUserRole !== 'superadmin' || updatingRole === user._id}
                                                                >
                                                                    <option value="user">Utilisateur</option>
                                                                    <option value="moderator">Modérateur</option>
                                                                    <option value="analyst">Analyste</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <select
                                                                className={adminUserStatusSelectClass(user.isActive)}
                                                                value={user.isActive ? 'active' : 'inactive'}
                                                                onChange={(e) => handleStatusChange(user._id, e.target.value === 'active')}
                                                                disabled={
                                                                    user.role === 'superadmin'
                                                                    || (currentUserRole !== 'superadmin' && currentUserRole !== 'moderator')
                                                                    || updatingStatus === user._id
                                                                }
                                                                title={user.role === 'superadmin' ? 'Statut non modifiable pour le super administrateur' : undefined}
                                                            >
                                                                <option value="active">Actif</option>
                                                                <option value="inactive">Inactif</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {(() => {
                                                                const done = user.questionnaireStatus === 'complete';
                                                                const col = done ? '#16a34a' : '#dc2626';
                                                                return (
                                                                    <span
                                                                        title={done ? undefined : `${user.pendingQuestionnaires || 0} questionnaire(s) en attente`}
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', color: col, background: `${col}1a`, border: `1px solid ${col}40` }}
                                                                    >
                                                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: col }} />
                                                                        {done ? 'Complété' : 'Incomplet'}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                                <button className="btn btn--sm btn--ghost btn--action-view" title="Voir détails" onClick={() => handleViewUser(user._id)}><EyeIcon size={16} /></button>
                                                                <button
                                                                    className="btn btn--sm btn--ghost btn--action-delete"
                                                                    title={user.role === 'superadmin' ? 'Suppression non autorisée pour le super administrateur' : 'Supprimer'}
                                                                    disabled={
                                                                        user.role === 'superadmin'
                                                                        || (currentUserRole !== 'superadmin' && currentUserRole !== 'moderator')
                                                                        || deletingUser === user._id
                                                                    }
                                                                    onClick={() => handleDeleteUser(user._id)}
                                                                >
                                                                    <TrashIcon size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                                        {loading ? 'Chargement...' : 'Aucun utilisateur trouvé'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={userPage}
                                    totalPages={Math.max(1, users.totalPages || 1)}
                                    totalItems={users.total ?? 0}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setUserPage}
                                />
                            </>
    );
}
