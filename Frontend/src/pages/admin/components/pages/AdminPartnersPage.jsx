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

export default function AdminPartnersPage() {
    const {
        ADMIN_PAGE_SIZE,
        closePartnerForm,
        fetchPartners,
        filteredPartners,
        handleDeletePartner,
        handlePartnerLogoUpload,
        handleSavePartner,
        openPartnerForm,
        openPartnerViewModal,
        pagedPartners,
        partnerDateFrom,
        partnerEditId,
        partnerFilterQ,
        partnerForm,
        partnerFormOpen,
        partnerLogoUploading,
        partnerPage,
        partnerSaving,
        partnersList,
        setPartnerDateFrom,
        setPartnerDateTo,
        setPartnerFilterQ,
        setPartnerForm,
        setPartnerPage,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Gestion des Partenaires</h1>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={() => {
                                                void fetchPartners();
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button className="btn btn--primary" type="button" onClick={() => openPartnerForm()}>
                                            <span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Ajouter un partenaire</span>
                                        </button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-partners"
                                    title="Filtres partenaires"
                                    searchPlaceholder="Recherche sur Partenaires"
                                    searchValue={partnerFilterQ}
                                    onSearchChange={setPartnerFilterQ}
                                    dateMode="single"
                                    singleDate={partnerDateFrom}
                                    onSingleDateChange={(value) => {
                                        setPartnerDateFrom(value);
                                        setPartnerDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                />
        
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--fit">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Ordre</th>
                                                <th style={{ width: '60px', textAlign: 'center' }}>Logo</th>
                                                <th>Partenaire</th>
                                                <th>Site web</th>
                                                <th style={{ width: '100px' }}>Date</th>
                                                <th style={{ width: '110px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedPartners.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                                        {partnersList.length === 0 ? 'Aucun partenaire enregistré' : 'Aucun résultat'}
                                                    </td>
                                                </tr>
                                            ) : pagedPartners.map((p) => {
                                                const pInitials = (p.shortName || p.name || '?').substring(0, 2).toUpperCase();
                                                return (
                                                <tr key={p._id}>
                                                    <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{p.sortOrder ?? '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto',
                                                            background: p.logo ? 'transparent' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light, #00a5b5))',
                                                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden',
                                                            border: p.logo ? '2px solid var(--color-primary)' : 'none',
                                                        }}>
                                                            {p.logo
                                                                ? <img src={p.logo} alt={p.shortName || p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : pInitials}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                                {p.shortName || p.name}
                                                            </span>
                                                            {p.role && (
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                    {p.role}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {p.website ? (
                                                            <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                                                {p.website.replace(/^https?:\/\//, '').substring(0, 30)}
                                                            </a>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        <span className="btn btn--sm btn--outline" style={{ cursor: 'default', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <button className="btn btn--sm btn--ghost btn--action-view" title="Voir la fiche" onClick={() => openPartnerViewModal(p)}>
                                                                <EyeIcon size={16} />
                                                            </button>
                                                            <button className="btn btn--sm btn--ghost btn--action-edit" title="Modifier" onClick={() => openPartnerForm(p)}>
                                                                <EditIcon size={16} />
                                                            </button>
                                                            <button className="btn btn--sm btn--ghost btn--action-delete" title="Supprimer" onClick={() => handleDeletePartner(p._id)}>
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
                                    currentPage={partnerPage}
                                    totalPages={Math.max(1, Math.ceil(filteredPartners.length / ADMIN_PAGE_SIZE))}
                                    totalItems={filteredPartners.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setPartnerPage}
                                />
        
                                {partnersList.filter(p => p.logo).length > 0 && (
                                    <div style={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-lg, 12px)',
                                        padding: '2rem 1.5rem',
                                        marginTop: '1.5rem',
                                        textAlign: 'center',
                                    }}>
                                        <h2 style={{
                                            color: 'var(--text-primary)',
                                            fontWeight: 700,
                                            fontSize: '1.35rem',
                                            marginBottom: '0.5rem',
                                        }}>Aperçu — Nos Partenaires</h2>
                                        <div style={{
                                            width: '50px',
                                            height: '3px',
                                            background: 'var(--color-primary)',
                                            borderRadius: '2px',
                                            margin: '0 auto 1.5rem',
                                        }} />
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '1.5rem',
                                        }}>
                                            {partnersList
                                                .filter(p => p.logo)
                                                .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
                                                .map(p => (
                                                <a
                                                    key={p._id}
                                                    href={p.website || '#'}
                                                    target={p.website ? '_blank' : undefined}
                                                    rel="noopener noreferrer"
                                                    title={p.shortName || p.name}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '120px',
                                                        height: '90px',
                                                        background: '#fff',
                                                        borderRadius: 'var(--radius-md, 10px)',
                                                        border: '1px solid var(--glass-border)',
                                                        padding: '0.75rem',
                                                        transition: 'all 0.2s ease',
                                                        cursor: p.website ? 'pointer' : 'default',
                                                        textDecoration: 'none',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <img
                                                        src={p.logo}
                                                        alt={p.shortName || p.name}
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '100%',
                                                            objectFit: 'contain',
                                                            opacity: 0.85,
                                                        }}
                                                        onError={e => { e.target.style.display = 'none'; }}
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                        <p style={{
                                            marginTop: '1rem',
                                            fontSize: '0.78rem',
                                            color: 'var(--text-muted)',
                                            opacity: 0.7,
                                        }}>Cliquez sur un logo pour visiter le site du partenaire</p>
                                    </div>
                                )}
        
                                <Modal
                                    isOpen={partnerFormOpen}
                                    onClose={closePartnerForm}
                                    title={partnerEditId ? 'Modifier le partenaire' : 'Ajouter un partenaire'}
                                    contentClassName="modal__content--wide-form"
                                >
                                    <form onSubmit={handleSavePartner} style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label form-label--required">Nom</label>
                                                <input
                                                    className="form-input"
                                                    value={partnerForm.name}
                                                    onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Abréviation</label>
                                                <input
                                                    className="form-input"
                                                    value={partnerForm.shortName}
                                                    onChange={(e) => setPartnerForm((f) => ({ ...f, shortName: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Rôle</label>
                                                <input
                                                    className="form-input"
                                                    value={partnerForm.role}
                                                    onChange={(e) => setPartnerForm((f) => ({ ...f, role: e.target.value }))}
                                                    placeholder="ex: Partenaire technique"
                                                />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Site web</label>
                                                <input
                                                    className="form-input"
                                                    value={partnerForm.website}
                                                    onChange={(e) => setPartnerForm((f) => ({ ...f, website: e.target.value }))}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Description</label>
                                            <textarea
                                                className="form-input"
                                                rows={3}
                                                value={partnerForm.description}
                                                onChange={(e) => setPartnerForm((f) => ({ ...f, description: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Collaboration</label>
                                            <textarea
                                                className="form-input"
                                                rows={2}
                                                value={partnerForm.collaboration}
                                                onChange={(e) => setPartnerForm((f) => ({ ...f, collaboration: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Ordre d&apos;affichage</label>
                                            <input
                                                className="form-input"
                                                type="number"
                                                value={partnerForm.sortOrder}
                                                onChange={(e) => setPartnerForm((f) => ({ ...f, sortOrder: e.target.value }))}
                                                style={{ maxWidth: '120px' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Logo</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                {partnerForm.logo ? (
                                                    <img
                                                        src={partnerForm.logo}
                                                        alt="Logo"
                                                        style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 64, height: 64, borderRadius: '10px',
                                                        background: 'var(--bg-elevated)', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        color: 'var(--text-secondary)', fontSize: '0.75rem',
                                                        border: '1px dashed var(--glass-border)'
                                                    }}>
                                                        Aucun
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <input
                                                        className="form-input"
                                                        value={partnerForm.logo}
                                                        onChange={(e) => setPartnerForm((f) => ({ ...f, logo: e.target.value }))}
                                                        placeholder="URL du logo ou uploader"
                                                        style={{ marginBottom: '0.5rem' }}
                                                    />
                                                    <label className="btn btn--ghost btn--sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Upload size={14} />
                                                        {partnerLogoUploading ? 'Envoi…' : 'Importer le logo'}
                                                        <input type="file" accept="image/*" hidden onChange={handlePartnerLogoUpload} disabled={partnerLogoUploading} />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
        
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button type="button" className="btn btn--ghost" onClick={closePartnerForm}>Annuler</button>
                                            <button type="submit" className="btn btn--primary" disabled={partnerSaving}>
                                                {partnerSaving ? 'Enregistrement...' : (partnerEditId ? 'Mettre à jour' : 'Ajouter')}
                                            </button>
                                        </div>
                                    </form>
                                </Modal>
                            </>
    );
}
