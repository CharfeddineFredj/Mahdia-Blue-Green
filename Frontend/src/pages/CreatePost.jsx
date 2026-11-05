import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { authService, postsService, api } from '../services';
import { Toast } from '../components/UI';
import BlogArticleForm from '../components/BlogArticleForm';

export default function CreatePost() {
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
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const toastHideTimerRef = useRef(null);
    const IMPORT_SUCCESS_TOAST_MS = 10_000;
    const navigate = useNavigate();

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            setToast({ show: true, message: 'Veuillez vous connecter pour rédiger un article', type: 'info' });
            setTimeout(() => {
                navigate('/auth');
            }, 1500);
        }
    }, [navigate]);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [catRes, lvlRes] = await Promise.all([api.get('/categories'), api.get('/levels')]);
                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);
            } catch (e) {
                console.error('Error loading categories/levels', e);
            }
        };
        loadMeta();
    }, []);

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
            const msg =
                err.status === 403
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
                status: 'draft',
                category,
                level: level || undefined,
                articleData: {
                    summary: excerpt,
                    content,
                    featuredImage: imageUrl || '',
                    articleType,
                },
            };

            await postsService.createArticle(payload);

            setToast({ show: true, message: 'Article soumis ! Il sera publié après validation par un administrateur. Retrouvez-le dans votre panier professionnel.', type: 'success' });
            setTimeout(() => {
                navigate('/compte#panier');
            }, 1500);
        } catch (error) {
            const msg =
                error.status === 403
                    ? error.message || 'Votre article contient du contenu inapproprié.'
                    : error.message || 'Une erreur est survenue lors de la création';
            setToast({ show: true, message: msg, type: 'error' });
            setIsSubmitting(false);
        }
    };

    return (
        <section className="section section--alt">
            <div className="container" style={{ maxWidth: '800px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/blog')}
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
                    Retour au blog
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
                            Créer un nouvel article
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
                            Partagez vos connaissances avec la communauté
                        </p>
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
                        fileInputId="cover-upload"
                        onSubmit={handleSubmit}
                        submitLabel="Envoyer en brouillon"
                        cancelLabel="Annuler"
                        onCancel={() => navigate('/blog')}
                        cancelButtonClassName="btn btn--outline"
                        disabledSubmit={isSubmitting}
                    />
                </div>
            </div>

            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
