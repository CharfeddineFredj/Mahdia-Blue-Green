import { EditIcon, TrashIcon } from '../../../../components/Icons';
import AdminPagination from '../../../../components/AdminPagination';
import AdminListFilters from '../../../../components/AdminListFilters';
import { ADMIN_PAGE_SIZE } from '../../constants';
import { staffRolePillClass } from '../../utils/helpers';
import StaffRolePill from '../StaffRolePill';
import { useAdminPanel } from '../../AdminPanelContext';

export default function AdminStaffPage() {
    const {
        ADMIN_PAGE_SIZE,
        currentUserRole,
        deletingUser,
        fetchStaffUsersList,
        handleDeleteUser,
        handleRoleChange,
        handleStatusChange,
        loading,
        setStaffDateFrom,
        setStaffDateTo,
        setStaffFilterQ,
        setStaffPage,
        setStaffRoleFilter,
        setStaffStatusFilter,
        staffDateFrom,
        staffFilterQ,
        staffPage,
        staffRoleFilter,
        staffRolePillClass,
        staffStatusFilter,
        staffUsers,
        updatingRole,
        updatingStatus,
        showToast,
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Équipe Administrative</h1>
                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        onClick={() => {
                                            void fetchStaffUsersList();
                                            showToast('🔄 Liste actualisée', 'success');
                                        }}
                                        title="Actualiser"
                                    >
                                        🔄 Actualiser
                                    </button>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-staff"
                                    title="Filtres équipe administrative"
                                    searchPlaceholder="Recherche sur Équipe"
                                    searchValue={staffFilterQ}
                                    onSearchChange={setStaffFilterQ}
                                    dateMode="single"
                                    singleDate={staffDateFrom}
                                    onSingleDateChange={(value) => {
                                        setStaffDateFrom(value);
                                        setStaffDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                >
                                    <div className="admin-filters__field">
                                        <label className="admin-filters__label" htmlFor="admin-staff-role">Rôle</label>
                                        <select
                                            id="admin-staff-role"
                                            className="form-select admin-filters__select"
                                            value={staffRoleFilter}
                                            onChange={(e) => setStaffRoleFilter(e.target.value)}
                                        >
                                            <option value="">Tous les rôles</option>
                                            <option value="superadmin">Super administrateur</option>
                                            <option value="analyst">Analyste</option>
                                            <option value="moderator">Modérateur</option>
                                        </select>
                                    </div>
                                    <div className="admin-filters__field">
                                        <label className="admin-filters__label" htmlFor="admin-staff-status">Statut</label>
                                        <select
                                            id="admin-staff-status"
                                            className="form-select admin-filters__select"
                                            value={staffStatusFilter}
                                            onChange={(e) => setStaffStatusFilter(e.target.value)}
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
                                                <th>Nom d'utilisateur</th>
                                                <th>Email</th>
                                                <th>Rôle actuel</th>
                                                <th>Changer le rôle</th>
                                                <th>Statut</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffUsers.data && staffUsers.data.length > 0 ? (
                                                staffUsers.data.map(user => (
                                                    <tr key={user._id}>
                                                        <td>{user.username}</td>
                                                        <td>{user.email}</td>
                                                        <td>
                                                            <span className={staffRolePillClass(user.role)}><StaffRolePill role={user.role} /></span>
                                                        </td>
                                                        <td>
                                                            {user.role === 'superadmin' ? (
                                                                <span className={`${staffRolePillClass('superadmin')} staff-role-pill--static`} title="Rôle non modifiable depuis le tableau de bord">
                                                                    <StaffRolePill role="superadmin" />
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    value={user.role}
                                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                                    disabled={currentUserRole !== 'superadmin' || updatingRole === user._id}
                                                                    style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                                >
                                                                    <option value="user">Utilisateur</option>
                                                                    <option value="moderator">Modérateur</option>
                                                                    <option value="analyst">Analyste</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <select
                                                                value={user.isActive ? 'active' : 'inactive'}
                                                                onChange={(e) => handleStatusChange(user._id, e.target.value === 'active')}
                                                                disabled={
                                                                    user.role === 'superadmin'
                                                                    || currentUserRole !== 'superadmin'
                                                                    || updatingStatus === user._id
                                                                }
                                                                style={{ padding: '0.4rem', borderRadius: '6px' }}
                                                                title={user.role === 'superadmin' ? 'Statut non modifiable pour le super administrateur' : undefined}
                                                            >
                                                                <option value="active">Actif</option>
                                                                <option value="inactive">Inactif</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="table__actions">
                                                                <button
                                                                    className="btn btn--sm btn--ghost btn--action-delete"
                                                                    title={user.role === 'superadmin' ? 'Suppression non autorisée pour le super administrateur' : 'Supprimer'}
                                                                    disabled={
                                                                        user.role === 'superadmin'
                                                                        || currentUserRole !== 'superadmin'
                                                                        || deletingUser === user._id
                                                                    }
                                                                    onClick={() => handleDeleteUser(user._id)}
                                                                >
                                                                    <TrashIcon size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        {loading ? 'Chargement...' : 'Aucun membre de l\'équipe administrative'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={staffPage}
                                    totalPages={Math.max(1, staffUsers.totalPages || 1)}
                                    totalItems={staffUsers.total ?? 0}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setStaffPage}
                                />
                            </>
    );
}
