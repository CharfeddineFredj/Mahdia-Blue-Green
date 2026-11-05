import { Link } from 'react-router-dom';
import { articleTypeLabel } from '../../../../utils/articleTypes';
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
import AdminArticleReviewPanel from '../AdminArticleReviewPanel';
import { getEventReviewStatus } from '../../../../utils/eventQuestionnaireRules';

/** Titre raccourci pour les tableaux (le titre complet reste visible au survol) */
const shortTitle = (t, max = 22) => (t && t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t);

export default function AdminArticlesPage() {
    const {
        ADMIN_PAGE_SIZE,
        articleFilterDate,
        articleFilterQ,
        articlePage,
        articleSaving,
        articleStatusFilter,
        articleTotalPages,
        categories,
        closePostModal,
        fetchAdminPosts,
        articlesLoading,
        formatArticleStatus,
        handleAdminArticleMediaUpload,
        handleCreateArticle,
        handleDeletePost,
        handleEditPost,
        handlePublishPost,
        handleSavePostForm,
        handleViewPost,
        handleViewUser,
        levels,
        postForm,
        postModalMode,
        postModalOpen,
        posts,
        selectedPost,
        setArticleFilterDate,
        setArticleFilterQ,
        setArticlePage,
        setArticleStatusFilter,
        setPostForm,
        showToast,
        uploading
    } = useAdminPanel();

    return (
                            <>
                                <div className="admin-header">
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem' }}>Articles</h1>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={() => {
                                                void fetchAdminPosts(articlePage);
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button className="admin-create-btn" type="button" onClick={handleCreateArticle}>
                                            <span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span>
                                            <span>Nouvel article</span>
                                        </button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-articles"
                                    title="Filtres articles"
                                    searchPlaceholder="Recherche sur Articles"
                                    searchValue={articleFilterQ}
                                    onSearchChange={setArticleFilterQ}
                                    dateMode="single"
                                    singleDate={articleFilterDate}
                                    onSingleDateChange={setArticleFilterDate}
                                    singleDateTitle="Filtrer par jour de création (colonne Date, vide = toutes les dates)"
                                    disabled={articlesLoading}
                                >
                                    <div className="admin-filters__field">
                                        <label className="admin-filters__label" htmlFor="admin-articles-status">Statut</label>
                                        <select
                                            id="admin-articles-status"
                                            className="form-select admin-filters__select"
                                            value={articleStatusFilter}
                                            onChange={(e) => setArticleStatusFilter(e.target.value)}
                                            disabled={articlesLoading}
                                        >
                                            <option value="">Tous les statuts</option>
                                            <option value="draft">Brouillon</option>
                                            <option value="published">Publié</option>
                                        </select>
                                    </div>
                                </AdminListFilters>
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--content">
                                        <thead>
                                            <tr>
                                                <th>Image</th>
                                                <th>Titre</th>
                                                <th>Type</th>
                                                <th>Statut</th>
                                                <th>Auteur</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posts.data && posts.data.length > 0 ? (
                                                posts.data.map(post => (
                                                    <tr key={post._id}>
                                                        <td>
                                                            {post.articleData?.featuredImage ? (
                                                                <img src={post.articleData.featuredImage} alt="" loading="lazy" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                                                            ) : (
                                                                <div aria-label="Pas d’image" style={{ width: 56, height: 40, borderRadius: 6, background: 'var(--bg-section)', border: '1px dashed var(--border-color)' }} />
                                                            )}
                                                        </td>
                                                        <td title={post.title}>{shortTitle(post.title)}</td>
                                                        <td><span className="badge badge--blue" style={{ whiteSpace: 'nowrap' }}>{articleTypeLabel(post.articleData?.articleType)}</span></td>
                                                        <td>
                                                            <span className={`badge badge--${post.status === 'published' ? 'green' :
                                                                post.status === 'draft' ? 'yellow' :
                                                                    'gray'
                                                                }`}>
                                                                {post.status}
                                                            </span>
                                                            {post.status !== 'published' && getEventReviewStatus(post) === 'rejected' && (
                                                                <span className="badge badge--red" style={{ marginLeft: '0.35rem', fontSize: '0.72rem' }}>Refusé</span>
                                                            )}
                                                            {post.pendingRevision?.status === 'pending' && (
                                                                <span className="badge badge--yellow" style={{ marginLeft: '0.35rem', fontSize: '0.72rem' }} title="Modification de l’article en attente de validation">
                                                                    Modif. en attente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>{post.author?.username || 'N/A'}</td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', whiteSpace: 'nowrap', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center' }}>
                                                                {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                                                            </span>
                                                        </td>
                                                        <td className="table__actions">
                                                            <button className="btn btn--sm btn--ghost btn--action-view" title="Voir" onClick={() => handleViewPost(post)}><EyeIcon size={16} /></button>
                                                            <button className="btn btn--sm btn--ghost btn--action-edit" title="Modifier" onClick={() => handleEditPost(post)}><EditIcon size={16} /></button>
                                                            <button className="btn btn--sm btn--ghost btn--action-delete" title="Supprimer" onClick={() => handleDeletePost(post)}><TrashIcon size={16} /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                                                        {articlesLoading ? 'Chargement...' : 'Aucun article trouvé. Créez-en un nouveau!'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={articlePage}
                                    totalPages={articleTotalPages}
                                    totalItems={posts.total ?? 0}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setArticlePage}
                                    disabled={articlesLoading}
                                />
                                <Modal
                                    isOpen={postModalOpen}
                                    onClose={closePostModal}
                                    contentClassName={postModalMode === 'view' ? 'modal__content--lg' : 'modal__content--wide-form'}
                                    title={
                                        postModalMode === 'create'
                                            ? 'Créer un nouvel article'
                                            : postModalMode === 'edit'
                                                ? 'Modifier article'
                                                : "Détails d'un article"
                                    }
                                >
                                    {postModalMode === 'view' && selectedPost ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {/* Header — image + title + badges */}
                                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{
                                                    width: '80px', height: '80px', borderRadius: '10px',
                                                    background: 'var(--color-primary)', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.5rem', fontWeight: 700, flexShrink: 0,
                                                    overflow: 'hidden',
                                                }}>
                                                    {selectedPost.articleData?.featuredImage
                                                        ? <img src={selectedPost.articleData.featuredImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : '📄'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{selectedPost.title}</h3>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        {selectedPost.author?.username || 'N/A'}
                                                        {/* Compte existant (auteur peuplé) : accès direct à « Détails de l'utilisateur » */}
                                                        {selectedPost.author?._id && (
                                                            <button
                                                                type="button"
                                                                className="btn btn--sm btn--ghost btn--action-view"
                                                                title="Voir le profil de l'auteur"
                                                                aria-label={`Voir le profil de ${selectedPost.author.username || "l'auteur"}`}
                                                                onClick={() => handleViewUser(selectedPost.author._id)}
                                                                style={{ padding: '0.15rem 0.35rem', minHeight: 0, lineHeight: 1 }}
                                                            >
                                                                <EyeIcon size={14} />
                                                            </button>
                                                        )}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                                        <span className={`badge badge--${selectedPost.status === 'published' ? 'green' : selectedPost.status === 'draft' ? 'yellow' : 'gray'}`}>
                                                            {formatArticleStatus(selectedPost.status)}
                                                        </span>
                                                        {selectedPost.category?.title && (
                                                            <span className="badge badge--blue">{selectedPost.category.title}</span>
                                                        )}
                                                        {selectedPost.level?.name && (
                                                            <span className="badge badge--purple">
                                                                {selectedPost.level.name}{selectedPost.level.level != null ? ` (${selectedPost.level.level})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
        
                                            {/* Info grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                                {[
                                                    { label: 'Statut', value: formatArticleStatus(selectedPost.status), badge: selectedPost.status === 'published' ? 'green' : selectedPost.status === 'draft' ? 'yellow' : 'gray' },
                                                    { label: 'Type d’article', value: articleTypeLabel(selectedPost.articleData?.articleType) },
                                                    { label: 'Catégorie', value: selectedPost.category?.title || '—' },
                                                    { label: 'Niveau', value: selectedPost.level?.name != null ? `${selectedPost.level.name}${selectedPost.level.level != null ? ` (${selectedPost.level.level})` : ''}` : '—' },
                                                    { label: 'Auteur', value: selectedPost.author?.username || 'N/A' },
                                                    { label: 'Création', value: selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                                    { label: 'Publication', value: selectedPost.publishedAt ? new Date(selectedPost.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                                            {item.label}
                                                        </div>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {item.badge
                                                                ? <span className={`badge badge--${item.badge}`}>{item.value}</span>
                                                                : item.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
        
                                            {/* Image de couverture */}
                                            {selectedPost.articleData?.featuredImage && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Image de couverture</h4>
                                                    <img
                                                        src={selectedPost.articleData.featuredImage}
                                                        alt={selectedPost.title}
                                                        style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                                                    />
                                                </div>
                                            )}
        
                                            {/* Résumé */}
                                            {selectedPost.articleData?.summary && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Résumé</h4>
                                                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                                                        {selectedPost.articleData.summary}
                                                    </p>
                                                </div>
                                            )}
        
                                            {/* Contenu */}
                                            {(selectedPost.articleData?.content || selectedPost.body) && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Contenu</h4>
                                                    <div
                                                        style={{
                                                            lineHeight: 1.7,
                                                            maxHeight: '300px',
                                                            overflowY: 'auto',
                                                            fontSize: '0.88rem',
                                                            paddingRight: '0.5rem',
                                                        }}
                                                        dangerouslySetInnerHTML={{
                                                            __html: selectedPost.articleData?.content || selectedPost.body || ''
                                                        }}
                                                    />
                                                </div>
                                            )}
        
                                            {/* Vidéo */}
                                            {selectedPost.articleData?.featuredVideo && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Vidéo</h4>
                                                    <video
                                                        src={selectedPost.articleData.featuredVideo}
                                                        controls
                                                        style={{ width: '100%', maxHeight: '260px', borderRadius: '8px', display: 'block' }}
                                                    />
                                                </div>
                                            )}
        
                                            {/* Métadonnées */}
                                            <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Métadonnées</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                                                    {[
                                                        { label: 'Créé le', value: selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString('fr-FR') : '—' },
                                                        { label: 'Publié le', value: selectedPost.publishedAt ? new Date(selectedPost.publishedAt).toLocaleString('fr-FR') : '—' },
                                                        { label: 'Modifié le', value: selectedPost.updatedAt ? new Date(selectedPost.updatedAt).toLocaleString('fr-FR') : '—' },
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
        
                                            {/* Validation : refus motivé et modification en attente */}
                                            <AdminArticleReviewPanel
                                                article={selectedPost}
                                                showToast={showToast}
                                                onChanged={() => { fetchAdminPosts(articlePage); closePostModal(); }}
                                            />

                                            {/* Footer */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                                <button className="btn btn--outline" onClick={closePostModal}>
                                                    Fermer
                                                </button>
                                                {selectedPost.status !== 'published' && (
                                                    <button
                                                        className="btn btn--primary"
                                                        style={{ background: 'var(--color-success, #22c55e)' }}
                                                        onClick={() => handlePublishPost(selectedPost)}
                                                    >
                                                        Publier
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn--primary"
                                                    onClick={() => { closePostModal(); handleEditPost(selectedPost); }}
                                                >
                                                    Modifier
                                                </button>
                                            </div>
                                        </div>
                                    ) : postModalMode === 'view' ? (
                                        <p style={{ color: 'var(--text-secondary)' }}>Aucune donnée à afficher.</p>
                                    ) : (
                                        <>
                                            {postModalMode === 'edit' && (
                                                <div className="form-check form-switch">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        role="switch"
                                                        id="admin-edit-article-published"
                                                        checked={postForm.status === 'published'}
                                                        onChange={(e) =>
                                                            setPostForm((p) => ({
                                                                ...p,
                                                                status: e.target.checked ? 'published' : 'draft',
                                                            }))
                                                        }
                                                    />
                                                    <label className="form-check-label" htmlFor="admin-edit-article-published">
                                                        {postForm.status === 'published' ? 'Publié' : 'Brouillon'}
                                                    </label>
                                                </div>
                                            )}
                                            <BlogArticleForm
                                                title={postForm.title}
                                                excerpt={postForm.summary}
                                                content={postForm.body}
                                                category={postForm.category}
                                                level={postForm.level}
                                                imageUrl={postForm.featuredImage}
                                                categories={categories}
                                                levels={levels}
                                                onTitleChange={(v) => setPostForm((p) => ({ ...p, title: v }))}
                                                onExcerptChange={(v) => setPostForm((p) => ({ ...p, summary: v }))}
                                                onContentChange={(v) => setPostForm((p) => ({ ...p, body: v }))}
                                                onCategoryChange={(v) => setPostForm((p) => ({ ...p, category: v }))}
                                                onLevelChange={(v) => setPostForm((p) => ({ ...p, level: v }))}
                                                onImageUrlChange={(v) => setPostForm((p) => ({ ...p, featuredImage: v }))}
                                                onImageFileChange={handleAdminArticleMediaUpload}
                                                uploading={uploading}
                                                fileInputId="admin-article-cover-upload"
                                                onSubmit={handleSavePostForm}
                                                submitLabel={postModalMode === 'create' ? 'Envoyer en brouillon' : 'Enregistrer'}
                                                cancelLabel="Annuler"
                                                onCancel={closePostModal}
                                                cancelButtonClassName="btn btn--outline"
                                                disabledSubmit={articleSaving}
                                            />
                                        </>
                                    )}
                                </Modal>
                            </>
    );
}
