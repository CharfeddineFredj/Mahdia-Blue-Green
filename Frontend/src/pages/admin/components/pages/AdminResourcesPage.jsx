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

/** Format affiché (PDF, Excel, Word, Vidéo, Image, Lien…) et sa couleur, d'après l'extension ou le type */
const RESOURCE_FORMATS = {
    pdf: ['PDF', '#dc2626'],
    doc: ['Word', '#2563eb'], docx: ['Word', '#2563eb'],
    xls: ['Excel', '#16a34a'], xlsx: ['Excel', '#16a34a'], csv: ['Excel', '#16a34a'],
    ppt: ['PowerPoint', '#ea580c'], pptx: ['PowerPoint', '#ea580c'],
    txt: ['Texte', '#475569'],
    zip: ['Archive', '#7c3aed'], rar: ['Archive', '#7c3aed'], '7z': ['Archive', '#7c3aed'],
};
const TYPE_FORMATS = { link: ['Lien', '#0d9488'], image: ['Image', '#d97706'], video: ['Vidéo', '#dc2626'] };
function resourceFormat(resource) {
    const ext = (String(resource.fileExtension || '').replace(/^\./, '') || ((String(resource.url || '').split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '')).toLowerCase();
    const type = String(resource.type || '').toLowerCase();
    if (['document', 'file'].includes(type) && RESOURCE_FORMATS[ext]) return RESOURCE_FORMATS[ext];
    if (TYPE_FORMATS[type]) return TYPE_FORMATS[type];
    return ['Fichier', '#64748b'];
}

export default function AdminResourcesPage() {
    const {
        ADMIN_PAGE_SIZE,
        categories,
        editResourceForm,
        editResourceUploading,
        editingResource,
        fetchResources,
        filteredResources,
        handleAdminResourceMediaUpload,
        handleCreateResource,
        handleDeleteResource,
        handleEditResource,
        handleEditResourceMediaUpload,
        handleSaveEditResource,
        pagedResources,
        removeEditResourceFile,
        removeResourceImage,
        resourceCategoryOptions,
        resourceDateFrom,
        resourceFilterQ,
        resourceFormData,
        resourcePage,
        resourceTotalPages,
        resourceUploading,
        resources,
        selectedResource,
        setEditResourceForm,
        setEditingResource,
        setResourceDateFrom,
        setResourceDateTo,
        setResourceFilterQ,
        setResourceFormData,
        setResourcePage,
        setSelectedResource,
        setShowResourceForm,
        showResourceForm,
        showToast
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Ressources</h1>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={() => {
                                                void fetchResources();
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button type="button" className="btn btn--primary" onClick={() => setShowResourceForm(true)}><span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Nouvelle ressource</span></button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-resources"
                                    title="Filtres ressources"
                                    searchPlaceholder="Recherche sur Ressources"
                                    searchValue={resourceFilterQ}
                                    onSearchChange={setResourceFilterQ}
                                    dateMode="single"
                                    singleDate={resourceDateFrom}
                                    onSingleDateChange={(value) => {
                                        setResourceDateFrom(value);
                                        setResourceDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                />
                                {showResourceForm && (
                                    <div className="table-container" style={{ marginBottom: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                        <form onSubmit={handleCreateResource} style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                                            <input className="form-input" placeholder="Titre" value={resourceFormData.title} onChange={(e) => setResourceFormData({ ...resourceFormData, title: e.target.value })} required />
                                            <select
                                                className="form-select"
                                                value={resourceFormData.category}
                                                onChange={(e) => setResourceFormData({ ...resourceFormData, category: e.target.value })}
                                            >
                                                {resourceCategoryOptions.map((opt) => (
                                                    <option key={`${opt.label}-${opt.value || 'normal'}`} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <select className="form-input" value={resourceFormData.type} onChange={(e) => setResourceFormData({ ...resourceFormData, type: e.target.value })}>
                                                <option value="document">Document</option>
                                                <option value="video">Vidéo</option>
                                                <option value="link">Lien</option>
                                                <option value="image">Image</option>
                                            </select>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Image / URL ressource *</label>
                                                <input
                                                    className="form-input"
                                                    placeholder="Ou collez une URL d'image ou ressource..."
                                                    value={resourceFormData.url}
                                                    onChange={(e) => setResourceFormData({ ...resourceFormData, url: e.target.value })}
                                                    style={{ marginBottom: '0.75rem' }}
                                                    required
                                                />
                                                <div
                                                    style={{
                                                        border: '2px dashed var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        background: 'var(--bg-base)',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        minHeight: '200px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'column',
                                                    }}
                                                    onClick={() => !resourceFormData.url?.trim() && document.getElementById('admin-resource-image-upload')?.click()}
                                                    onKeyDown={(e) => {
                                                        if (!resourceFormData.url?.trim() && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault();
                                                            document.getElementById('admin-resource-image-upload')?.click();
                                                        }
                                                    }}
                                                    role={!resourceFormData.url?.trim() ? 'button' : undefined}
                                                    tabIndex={!resourceFormData.url?.trim() ? 0 : undefined}
                                                >
                                                    {resourceFormData.url?.trim() && resourceFormData.type === 'image' ? (
                                                        <>
                                                            <img
                                                                src={resourceFormData.url}
                                                                alt="Preview"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                }}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeResourceImage();
                                                                }}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '1rem',
                                                                    right: '1rem',
                                                                    background: 'rgba(0,0,0,0.5)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '50%',
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                }}
                                                                title="Supprimer l'image"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : resourceFormData.url?.trim() ? (
                                                        <>
                                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                                                {resourceFormData.type === 'document'
                                                                    ? 'Document prêt'
                                                                    : `Ressource prête · type ${resourceFormData.type}`}
                                                            </p>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                                                URL générée automatiquement après upload.
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeResourceImage();
                                                                }}
                                                                className="btn btn--outline btn--sm"
                                                            >
                                                                Supprimer le fichier
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                                Cliquez ou glissez une image, vidéo ou fichier ici
                                                            </p>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image, vidéo, PDF, DOC... (max 50Mo)</p>
                                                        </>
                                                    )}
                                                    <input
                                                        id="admin-resource-image-upload"
                                                        type="file"
                                                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                                        onChange={handleAdminResourceMediaUpload}
                                                        disabled={resourceUploading}
                                                        style={{ display: 'none' }}
                                                    />
                                                </div>
                                                {resourceUploading && (
                                                    <p style={{ color: 'var(--primary-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                                        Import en cours…
                                                    </p>
                                                )}
                                            </div>
                                            <textarea className="form-input" placeholder="Description" value={resourceFormData.description} onChange={(e) => setResourceFormData({ ...resourceFormData, description: e.target.value })} />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button type="submit" className="btn btn--primary">Ajouter</button>
                                                <button type="button" className="btn btn--ghost" onClick={() => setShowResourceForm(false)}>Annuler</button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Ressource</th>
                                                <th style={{ width: '120px' }}>Format</th>
                                                <th style={{ width: '90px', textAlign: 'center' }}>Clics</th>
                                                <th style={{ width: '150px' }}>Accès</th>
                                                <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resources.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Aucune ressource. Ajoutez-en une ci-dessus.
                                                    </td>
                                                </tr>
                                            ) : filteredResources.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Aucun résultat pour ces critères
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedResources.map(resource => (
                                                    <tr key={resource._id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                                                {(() => {
                                                                    const [label, color] = resourceFormat(resource);
                                                                    const thumb = resource.type === 'image' || (resource.type === 'link' && resource.previewImage) ? (resource.type === 'link' ? resource.previewImage : resource.url) : null;
                                                                    return thumb ? (
                                                                        <img src={thumb} alt="" loading="lazy" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                                                                    ) : (
                                                                        <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${color}1f`, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem' }}>
                                                                            {label.slice(0, 3).toUpperCase()}
                                                                        </span>
                                                                    );
                                                                })()}
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{resource.title}</div>
                                                                    {resource.description && (
                                                                        <div title={resource.description} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>
                                                                            {resource.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {(() => {
                                                                const [label, color] = resourceFormat(resource);
                                                                return (
                                                                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>
                                                                        {label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{resource.downloadsCount || 0}</span>
                                                        </td>
                                                        <td>
                                                            {['link', 'image', 'video'].includes(String(resource.type || '').toLowerCase())
                                                                ? (
                                                                    <button
                                                                        className="btn btn--primary btn--sm"
                                                                        onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: 999, padding: '0.35rem 0.9rem', whiteSpace: 'nowrap', fontWeight: 600 }}
                                                                    >
                                                                        <EyeIcon size={14} /> Ouvrir
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        className="btn btn--primary btn--sm"
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: 999, padding: '0.35rem 0.9rem', whiteSpace: 'nowrap', fontWeight: 600 }}
                                                                        onClick={() => {
                                                                            const ext = String(resource.fileExtension || '').trim();
                                                                            const hasExt = /\.[a-z0-9]+$/i.test(String(resource.originalName || ''));
                                                                            const fallback = `${String(resource.title || 'resource').trim()}${ext || ''}`;
                                                                            const name = hasExt ? resource.originalName : (resource.originalName ? `${resource.originalName}${ext || ''}` : fallback);
                                                                            downloadFileResource(resource.url, name);
                                                                        }}
                                                                    >
                                                                        <DownloadIcon size={14} /> Télécharger
                                                                    </button>
                                                                )
                                                            }
                                                        </td>
                                                        <td className="table__actions">
                                                            <button className="btn btn--sm btn--ghost btn--action-view" title="Voir les détails" onClick={() => setSelectedResource(resource)}><EyeIcon size={16} /></button>
                                                            <button className="btn btn--sm btn--ghost btn--action-edit" title="Modifier" onClick={() => handleEditResource(resource)}><EditIcon size={16} /></button>
                                                            <button className="btn btn--sm btn--ghost btn--action-delete" title="Supprimer" onClick={() => handleDeleteResource(resource._id)}><TrashIcon size={16} /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={resourcePage}
                                    totalPages={resourceTotalPages}
                                    totalItems={filteredResources.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setResourcePage}
                                />
        
                                {selectedResource && (
                                    <Modal
                                        isOpen
                                        onClose={() => setSelectedResource(null)}
                                        contentClassName="modal__content--lg"
                                        title="Détails de la ressource"
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{
                                                    width: '80px', height: '80px', borderRadius: '10px',
                                                    background: selectedResource.type === 'image'
                                                        ? 'transparent'
                                                        : selectedResource.type === 'video'
                                                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                                            : 'linear-gradient(135deg, var(--color-primary), #0ea5e9)',
                                                    color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.5rem', fontWeight: 700, flexShrink: 0,
                                                    overflow: 'hidden',
                                                }}>
                                                    {selectedResource.type === 'image' && selectedResource.url
                                                        ? <img src={selectedResource.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : selectedResource.type === 'video' ? '🎬'
                                                        : selectedResource.type === 'link' ? '🔗'
                                                        : '📄'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{selectedResource.title || 'Sans titre'}</h3>
                                                    {selectedResource.originalName && (
                                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                            {selectedResource.originalName}
                                                        </p>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                        <span className="badge badge--blue" style={{ textTransform: 'capitalize' }}>{selectedResource.type || 'document'}</span>
                                                        {selectedResource.fileExtension && (
                                                            <span className="badge badge--purple">.{selectedResource.fileExtension}</span>
                                                        )}
                                                        {selectedResource.category?.title && (
                                                            <span className="badge badge--green">{selectedResource.category.title}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
        
                                            {/* Info grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                                {[
                                                    { label: 'Type', value: selectedResource.type || 'document' },
                                                    { label: 'Extension', value: selectedResource.fileExtension ? `.${selectedResource.fileExtension}` : '—' },
                                                    { label: 'Catégorie', value: selectedResource.category?.title || '—' },
                                                    { label: 'Création', value: selectedResource.createdAt ? new Date(selectedResource.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                                            {item.label}
                                                        </div>
                                                        <div style={{ fontWeight: 500 }}>{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
        
                                            {/* Aperçu image */}
                                            {selectedResource.type === 'image' && selectedResource.url && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Aperçu</h4>
                                                    <img
                                                        src={selectedResource.url}
                                                        alt={selectedResource.title}
                                                        style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '8px', display: 'block', background: 'var(--bg-elevated)' }}
                                                    />
                                                </div>
                                            )}
        
                                            {/* Aperçu vidéo */}
                                            {selectedResource.type === 'video' && selectedResource.url && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Aperçu vidéo</h4>
                                                    <video
                                                        src={selectedResource.url}
                                                        controls
                                                        style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', display: 'block' }}
                                                    />
                                                </div>
                                            )}
        
                                            {/* Description */}
                                            {selectedResource.description && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Description</h4>
                                                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                        {selectedResource.description}
                                                    </p>
                                                </div>
                                            )}
        
                                            {/* URL */}
                                            <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Lien de la ressource</h4>
                                                <a
                                                    href={selectedResource.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ fontSize: '0.88rem', color: 'var(--color-primary)', wordBreak: 'break-all' }}
                                                >
                                                    {selectedResource.url}
                                                </a>
                                            </div>
        
                                            {/* Métadonnées */}
                                            <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Métadonnées</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                                                    {[
                                                        { label: 'Créé le', value: selectedResource.createdAt ? new Date(selectedResource.createdAt).toLocaleString('fr-FR') : '—' },
                                                        { label: 'Modifié le', value: selectedResource.updatedAt ? new Date(selectedResource.updatedAt).toLocaleString('fr-FR') : '—' },
                                                        { label: 'Type MIME', value: selectedResource.mimeType || '—' },
                                                    ].map(item => (
                                                        <div key={item.label} style={{ padding: '0.5rem 0.65rem', background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
                                                                {item.label}
                                                            </div>
                                                            <div style={{ fontWeight: 500 }}>{item.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
        
                                            {/* Footer */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                                <button className="btn btn--outline" onClick={() => setSelectedResource(null)}>
                                                    Fermer
                                                </button>
                                                <button
                                                    className="btn btn--primary"
                                                    onClick={() => window.open(selectedResource.url, '_blank')}
                                                >
                                                    Ouvrir la ressource
                                                </button>
                                            </div>
                                        </div>
                                    </Modal>
                                )}
        
                                {editingResource && (
                                    <Modal
                                        isOpen
                                        onClose={() => setEditingResource(null)}
                                        contentClassName="modal__content--lg"
                                        title="Modifier la ressource"
                                    >
                                        <form onSubmit={handleSaveEditResource} style={{ display: 'grid', gap: '0.75rem' }}>
                                            <input
                                                className="form-input"
                                                placeholder="Titre"
                                                value={editResourceForm.title}
                                                onChange={(e) => setEditResourceForm((f) => ({ ...f, title: e.target.value }))}
                                                required
                                            />
                                            <select
                                                className="form-select"
                                                value={editResourceForm.category}
                                                onChange={(e) => setEditResourceForm((f) => ({ ...f, category: e.target.value }))}
                                            >
                                                {resourceCategoryOptions.map((opt) => (
                                                    <option key={`edit-${opt.label}-${opt.value || 'x'}`} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                                {editResourceForm.category && !resourceCategoryOptions.some((o) => o.value === editResourceForm.category) && (
                                                    <option value={editResourceForm.category}>
                                                        {categories.find((c) => c._id === editResourceForm.category)?.title || editResourceForm.category}
                                                    </option>
                                                )}
                                            </select>
                                            <select
                                                className="form-input"
                                                value={editResourceForm.type}
                                                onChange={(e) => setEditResourceForm((f) => ({ ...f, type: e.target.value }))}
                                            >
                                                <option value="document">Document</option>
                                                <option value="video">Vidéo</option>
                                                <option value="link">Lien</option>
                                                <option value="image">Image</option>
                                            </select>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Image / URL ressource *</label>
                                                <input
                                                    className="form-input"
                                                    placeholder="Ou collez une URL d'image ou ressource..."
                                                    value={editResourceForm.url}
                                                    onChange={(e) => setEditResourceForm((f) => ({ ...f, url: e.target.value }))}
                                                    style={{ marginBottom: '0.75rem' }}
                                                    required
                                                />
                                                <div
                                                    style={{
                                                        border: '2px dashed var(--border-color)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '2rem',
                                                        textAlign: 'center',
                                                        background: 'var(--bg-base)',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        minHeight: '200px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexDirection: 'column',
                                                    }}
                                                    onClick={() => !editResourceForm.url?.trim() && document.getElementById('admin-edit-resource-upload')?.click()}
                                                    onKeyDown={(e) => {
                                                        if (!editResourceForm.url?.trim() && (e.key === 'Enter' || e.key === ' ')) {
                                                            e.preventDefault();
                                                            document.getElementById('admin-edit-resource-upload')?.click();
                                                        }
                                                    }}
                                                    role={!editResourceForm.url?.trim() ? 'button' : undefined}
                                                    tabIndex={!editResourceForm.url?.trim() ? 0 : undefined}
                                                >
                                                    {editResourceForm.url?.trim() && editResourceForm.type === 'image' ? (
                                                        <>
                                                            <img
                                                                src={editResourceForm.url}
                                                                alt="Preview"
                                                                style={{
                                                                    position: 'absolute', top: 0, left: 0,
                                                                    width: '100%', height: '100%', objectFit: 'cover',
                                                                }}
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeEditResourceFile(); }}
                                                                style={{
                                                                    position: 'absolute', top: '1rem', right: '1rem',
                                                                    background: 'rgba(0,0,0,0.5)', color: 'white',
                                                                    border: 'none', borderRadius: '50%',
                                                                    width: '32px', height: '32px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    cursor: 'pointer',
                                                                }}
                                                                title="Supprimer l'image"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : editResourceForm.url?.trim() ? (
                                                        <>
                                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                                                {editResourceForm.type === 'document'
                                                                    ? 'Document prêt'
                                                                    : `Ressource prête · type ${editResourceForm.type}`}
                                                            </p>
                                                            {editResourceForm.originalName && (
                                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                                                    {editResourceForm.originalName}
                                                                </p>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); removeEditResourceFile(); }}
                                                                className="btn btn--outline btn--sm"
                                                            >
                                                                Supprimer le fichier
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                                Cliquez ou glissez une image, vidéo ou fichier ici
                                                            </p>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image, vidéo, PDF, DOC... (max 50Mo)</p>
                                                        </>
                                                    )}
                                                    <input
                                                        id="admin-edit-resource-upload"
                                                        type="file"
                                                        accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                                                        onChange={handleEditResourceMediaUpload}
                                                        disabled={editResourceUploading}
                                                        style={{ display: 'none' }}
                                                    />
                                                </div>
                                                {editResourceUploading && (
                                                    <p style={{ color: 'var(--primary-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                                        Import en cours…
                                                    </p>
                                                )}
                                            </div>
                                            <textarea
                                                className="form-input"
                                                placeholder="Description"
                                                value={editResourceForm.description}
                                                onChange={(e) => setEditResourceForm((f) => ({ ...f, description: e.target.value }))}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button type="submit" className="btn btn--primary" disabled={editResourceUploading}>
                                                    {editResourceUploading ? 'Import en cours…' : 'Enregistrer'}
                                                </button>
                                                <button type="button" className="btn btn--ghost" onClick={() => setEditingResource(null)}>Annuler</button>
                                            </div>
                                        </form>
                                    </Modal>
                                )}
                            </>
    );
}
