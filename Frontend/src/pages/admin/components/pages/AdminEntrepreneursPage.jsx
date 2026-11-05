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

export default function AdminEntrepreneursPage() {
    const {
        ADMIN_PAGE_SIZE,
        closeEntrepreneurForm,
        entrepreneurAvatarUploading,
        entrepreneurDateFrom,
        entrepreneurEditId,
        entrepreneurFilterQ,
        entrepreneurForm,
        entrepreneurFormOpen,
        entrepreneurPage,
        entrepreneurSaving,
        entrepreneursList,
        fetchEntrepreneurs,
        filteredEntrepreneurs,
        handleDeleteEntrepreneur,
        handleEntrepreneurAvatarUpload,
        handleSaveEntrepreneur,
        openEntrepreneurForm,
        openEntrepreneurViewModal,
        pagedEntrepreneurs,
        setEntrepreneurDateFrom,
        setEntrepreneurDateTo,
        setEntrepreneurFilterQ,
        setEntrepreneurForm,
        setEntrepreneurPage,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Gestion des Entrepreneurs</h1>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={() => {
                                                void fetchEntrepreneurs();
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button type="button" className="btn btn--primary" onClick={() => openEntrepreneurForm()}>
                                            <span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Ajouter un profil</span>
                                        </button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-entrepreneurs"
                                    title="Filtres entrepreneurs"
                                    searchPlaceholder="Recherche (nom, rôle, organisation, citation)"
                                    searchValue={entrepreneurFilterQ}
                                    onSearchChange={setEntrepreneurFilterQ}
                                    dateMode="single"
                                    singleDate={entrepreneurDateFrom}
                                    onSingleDateChange={(value) => {
                                        setEntrepreneurDateFrom(value);
                                        setEntrepreneurDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                />
        
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Ordre</th>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Photo</th>
                                                <th>Profil</th>
                                                <th>Organisation</th>
                                                <th style={{ width: '100px' }}>Date</th>
                                                <th style={{ width: '110px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedEntrepreneurs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                                        {entrepreneursList.length === 0 ? 'Aucun entrepreneur enregistré' : 'Aucun résultat'}
                                                    </td>
                                                </tr>
                                            ) : pagedEntrepreneurs.map((row) => {
                                                const initials = (row.name || '?').substring(0, 2).toUpperCase();
                                                return (
                                                    <tr key={row._id}>
                                                        <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{row.sortOrder ?? '—'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div
                                                                style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    borderRadius: '50%',
                                                                    margin: '0 auto',
                                                                    background: row.avatar
                                                                        ? 'transparent'
                                                                        : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #00a5b5))',
                                                                    color: '#fff',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 700,
                                                                    overflow: 'hidden',
                                                                    border: row.avatar ? '2px solid var(--color-accent-lime)' : 'none',
                                                                }}
                                                            >
                                                                {row.avatar ? (
                                                                    <img
                                                                        src={row.avatar}
                                                                        alt={row.name}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    initials
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.name}</span>
                                                                {row.role && (
                                                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.role}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {row.organization || '—'}
                                                        </td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-FR') : '—'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn--sm btn--ghost btn--action-view"
                                                                    title="Voir la fiche"
                                                                    onClick={() => openEntrepreneurViewModal(row)}
                                                                >
                                                                    <EyeIcon size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn--sm btn--ghost btn--action-edit"
                                                                    title="Modifier"
                                                                    onClick={() => openEntrepreneurForm(row)}
                                                                >
                                                                    <EditIcon size={16} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn--sm btn--ghost btn--action-delete"
                                                                    title="Supprimer"
                                                                    onClick={() => handleDeleteEntrepreneur(row._id)}
                                                                >
                                                                    <TrashIcon size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={entrepreneurPage}
                                    totalPages={Math.max(1, Math.ceil(filteredEntrepreneurs.length / ADMIN_PAGE_SIZE))}
                                    totalItems={filteredEntrepreneurs.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setEntrepreneurPage}
                                />
        
                                <Modal
                                    isOpen={entrepreneurFormOpen}
                                    onClose={closeEntrepreneurForm}
                                    title={entrepreneurEditId ? 'Modifier le profil entrepreneur' : 'Ajouter un entrepreneur'}
                                    contentClassName="modal__content--wide-form"
                                >
                                    <form onSubmit={handleSaveEntrepreneur} style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label form-label--required">Nom</label>
                                                <input
                                                    className="form-input"
                                                    value={entrepreneurForm.name}
                                                    onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, name: ev.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Rôle / titre</label>
                                                <input
                                                    className="form-input"
                                                    value={entrepreneurForm.role}
                                                    onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, role: ev.target.value }))}
                                                    placeholder="ex: Entrepreneur"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Organisation</label>
                                            <input
                                                className="form-input"
                                                value={entrepreneurForm.organization}
                                                onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, organization: ev.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Citation / témoignage</label>
                                            <textarea
                                                className="form-input"
                                                rows={4}
                                                value={entrepreneurForm.quote}
                                                onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, quote: ev.target.value }))}
                                                placeholder="Texte affiché sur la page publique /entrepreneurs"
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Ordre d&apos;affichage</label>
                                            <input
                                                className="form-input"
                                                type="number"
                                                value={entrepreneurForm.sortOrder}
                                                onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, sortOrder: ev.target.value }))}
                                                style={{ maxWidth: '120px' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Photo (avatar)</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {entrepreneurForm.avatar ? (
                                                    <img
                                                        src={entrepreneurForm.avatar}
                                                        alt=""
                                                        style={{
                                                            width: 64,
                                                            height: 64,
                                                            objectFit: 'cover',
                                                            borderRadius: '50%',
                                                            border: '2px solid var(--color-accent-lime)',
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: '50%',
                                                            background: 'var(--bg-elevated)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '0.75rem',
                                                            border: '1px dashed var(--glass-border)',
                                                        }}
                                                    >
                                                        Aucune
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        className="form-input"
                                                        value={entrepreneurForm.avatar}
                                                        onChange={(ev) => setEntrepreneurForm((f) => ({ ...f, avatar: ev.target.value }))}
                                                        placeholder="URL ou uploader"
                                                        style={{ marginBottom: '0.5rem' }}
                                                    />
                                                    <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Upload size={14} />
                                                        {entrepreneurAvatarUploading ? 'Envoi…' : 'Importer une photo'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            hidden
                                                            onChange={handleEntrepreneurAvatarUpload}
                                                            disabled={entrepreneurAvatarUploading}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button type="button" className="btn btn--ghost" onClick={closeEntrepreneurForm}>
                                                Annuler
                                            </button>
                                            <button type="submit" className="btn btn--primary" disabled={entrepreneurSaving}>
                                                {entrepreneurSaving ? 'Enregistrement...' : entrepreneurEditId ? 'Mettre à jour' : 'Ajouter'}
                                            </button>
                                        </div>
                                    </form>
                                </Modal>
                            </>
    );
}
