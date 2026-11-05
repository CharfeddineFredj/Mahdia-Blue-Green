import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authService, api } from '../services';
import { articlesService } from '../services/articles.service';
import { Toast } from '../components/UI';
import BlogArticleForm from '../components/BlogArticleForm';
import { getEventReviewStatus, PUBLISHED_LOCK_MESSAGES } from '../utils/eventQuestionnaireRules';

export default function EditArticle() {
    const { id } = useParams();
    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [level, setLevel] = useState('');
    const [articleType, setArticleType] = useState('article');
    const [categories, setCategories] = useState([]);
    const [levels, setLevels] = useState([]);
    const [imageUrl, setImageUrl] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [article, setArticle] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [reviewInfo, setReviewInfo] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const toastHideTimerRef = useRef(null);
    const IMPORT_SUCCESS_TOAST_MS = 10_000;
    const navigate = useNavigate();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate('/auth');
            return;
        }

        const loadData = async () => {
            try {
                const [articleRes, catRes, lvlRes, mineRes] = await Promise.all([
                    articlesService.getBySlug(id),
                    api.get('/categories'),
                    api.get('/levels'),
                    articlesService.getMyArticles({ limit: 200 }).catch(() => null),
                ]);

                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);

                const a = articleRes?.data;
                if (!a) {
                    setToast({ show: true, message: 'Article introuvable', type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 1500);
                    return;
                }

                // Version propriétaire (contient la modification en attente éventuelle)
                const mine = (mineRes?.data || []).find((x) => String(x._id) === String(a._id));
                if (mineRes && !mine) {
                    setToast({ show: true, message: 'Vous ne pouvez pas modifier cet article.', type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 1500);
                    return;
                }
                // Validé et publié par un administrateur : plus modifiable par l'auteur
                const session = authService.getCurrentUser();
                const isStaff = ['superadmin', 'moderator', 'analyst'].includes(session?.user?.role || session?.role);
                if ((a.status === 'published' || a.publishedOnce) && !isStaff) {
                    setToast({ show: true, message: PUBLISHED_LOCK_MESSAGES.article, type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 2200);
                    return;
                }
                const revision = mine?.pendingRevision || null;
                setIsLive(a.status === 'published' || !!a.publishedOnce);
                setReviewInfo({
                    status: getEventReviewStatus(mine || a),
                    reason: (mine || a).moderation?.reason || '',
                    revision,
                });

                // Pré-remplissage : on reprend la modification en attente si elle existe
                const src = revision || a;
                const ad = { ...(a.articleData || {}), ...(revision?.articleData || {}) };
                setArticle(a);
                setTitle(src.title || a.title || '');
                setExcerpt(ad.summary || '');
                setContent(ad.content || src.body || a.body || '');
                setCategory(src.category?._id || src.category || a.category?._id || a.category || '');
                setLevel(src.level?._id || src.level || a.level?._id || a.level || '');
                setImageUrl(ad.featuredImage || '');
                setArticleType(ad.articleType || 'article');
            } catch (err) {
                setToast({ show: true, message: err.message || 'Erreur de chargement', type: 'error' });
                setTimeout(() => navigate('/compte#panier'), 1500);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate]);

    const handleImageFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setToast({ show: true, message: "L'image est trop volumineuse (max 5Mo)", type: 'error' });
            e.target.value = '';
            return;
        }
        setImageUploading(true);
        try {
            const res = await api.upload(file, 'mahdia_bg/articles');
            if (res.success) {
                setImageUrl(res.data.url);
                if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
                setToast({ show: true, message: 'Image importée avec succès', type: 'success' });
                toastHideTimerRef.current = setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                    toastHideTimerRef.current = null;
                }, IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Cette image contient du contenu inapproprié.'
                : err.message || 'Erreur upload image';
            setToast({ show: true, message: msg, type: 'error' });
            setImageUrl('');
        } finally {
            setImageUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const normalizedContent = (content || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .trim();

        if (!title.trim() || !excerpt.trim() || !normalizedContent || !category || !level || !imageUrl) {
            const missing = [];
            if (!title.trim()) missing.push('Titre');
            if (!excerpt.trim()) missing.push('Résumé');
            if (!normalizedContent) missing.push('Contenu');
            if (!category) missing.push('Catégorie');
            if (!level) missing.push('Niveau');
            if (!imageUrl) missing.push('Image de couverture');
            setToast({ show: true, message: `Champs obligatoires manquants : ${missing.join(', ')}`, type: 'error' });
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                title,
                body: content,
                content,
                summary: excerpt,
                category,
                level: level || undefined,
                featuredImage: imageUrl || '',
                articleType,
            };

            const res = await articlesService.update(article._id, payload);

            setToast({ show: true, message: res?.message || 'Modification soumise à validation.', type: 'success' });
            setTimeout(() => navigate('/compte#panier'), 1800);
        } catch (error) {
            const msg = error.status === 403
                ? error.message || 'Cet article ne peut plus être modifié.'
                : error.message || 'Erreur lors de la mise à jour';
            setToast({ show: true, message: msg, type: 'error' });
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <section className="section section--alt">
                <div className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Chargement de l'article…</p>
                </div>
            </section>
        );
    }

    return (
        <section className="section section--alt">
            <div className="container" style={{ maxWidth: '800px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/compte#panier')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem',
                    }}
                >
                    <ArrowLeft size={16} />
                    Retour au panier
                </button>

                <div className="content-card">
                    <div
                        className="card-header"
                        style={{
                            justifyContent: 'flex-start',
                            flexWrap: 'wrap',
                            alignItems: 'baseline',
                            gap: '0.5rem 2rem',
                        }}
                    >
                        <h1 className="card-title" style={{ margin: 0 }}>
                            Modifier l'article
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
                            {isLive
                                ? 'Article publié : vos modifications seront soumises à un administrateur ; la version actuelle reste en ligne jusqu’à leur validation.'
                                : 'Chaque modification est soumise à la validation d’un administrateur avant publication.'}
                        </p>
                        {reviewInfo?.revision?.status === 'pending' && (
                            <p className="badge badge--yellow" style={{ margin: 0, whiteSpace: 'normal' }}>
                                Une modification est déjà en attente de validation : le formulaire la reprend, un nouvel envoi la remplacera.
                            </p>
                        )}
                        {reviewInfo?.revision?.status === 'rejected' && (
                            <p className="badge badge--red" style={{ margin: 0, whiteSpace: 'normal' }}>
                                Votre dernière modification a été refusée{reviewInfo.revision.rejectionReason ? ` : ${reviewInfo.revision.rejectionReason}` : ''}.
                            </p>
                        )}
                        {!isLive && reviewInfo?.status === 'rejected' && (
                            <p className="badge badge--red" style={{ margin: 0, whiteSpace: 'normal' }}>
                                Article refusé{reviewInfo.reason ? ` : ${reviewInfo.reason}` : ''}. Corrigez-le puis soumettez-le à nouveau.
                            </p>
                        )}
                    </div>

                    <BlogArticleForm
                        title={title}
                        excerpt={excerpt}
                        content={content}
                        category={category}
                        level={level}
                        imageUrl={imageUrl}
                        categories={categories}
                        levels={levels}
                        onTitleChange={setTitle}
                        onExcerptChange={setExcerpt}
                        onContentChange={setContent}
                        onCategoryChange={setCategory}
                        onLevelChange={setLevel}
                        articleType={articleType}
                        onArticleTypeChange={setArticleType}
                        onImageUrlChange={setImageUrl}
                        onImageFileChange={handleImageFileChange}
                        uploading={imageUploading}
                        fileInputId="edit-cover-upload"
                        onSubmit={handleSubmit}
                        submitLabel="Soumettre pour validation"
                        cancelLabel="Annuler"
                        onCancel={() => navigate('/compte#panier')}
                        cancelButtonClassName="btn btn--outline"
                        disabledSubmit={isSubmitting}
                    />
                </div>
            </div>

            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
