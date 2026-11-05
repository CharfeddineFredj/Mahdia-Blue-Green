import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PostCard, ResourceCard } from '../components/UI';
import { api, postsService, resourcesService } from '../services';
import { downloadFileResource } from '../utils/cloudinaryDelivery';

function resourceMatchesCategory(resource, categoryId) {
    if (!categoryId) return false;
    const c = resource.category;
    if (!c) return false;
    const id = typeof c === 'object' && c._id != null ? c._id : c;
    return String(id) === String(categoryId);
}

export default function Economy() {
    const { type } = useParams();

    const [categories, setCategories] = useState([]);
    const [category, setCategory] = useState(null);
    const [articles, setArticles] = useState([]);
    const [allResources, setAllResources] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 6;
    const resourcesPreviewLimit = 8;

    const typeToTitle = useMemo(() => ({
        bleue: 'Économie Bleue',
        verte: 'Économie Verte',
        circulaire: 'Économie Circulaire'
    }), []);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await api.get('/categories');
                if (res.success) setCategories(res.data || []);
            } catch (e) {
                console.error('Error loading categories', e);
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        const loadResources = async () => {
            try {
                const res = await resourcesService.getAll();
                if (res.success) setAllResources(res.data || []);
            } catch (e) {
                console.error('Error loading resources', e);
            }
        };
        loadResources();
    }, []);

    const resourcesForCategory = useMemo(() => {
        if (!category?._id) return [];
        return allResources.filter((r) => resourceMatchesCategory(r, category._id));
    }, [allResources, category?._id]);

    const detectResourceType = (resource) => {
        const ext = String(resource?.fileExtension || '').toLowerCase().replace(/^\./, '');
        if (ext && /^(png|jpe?g|gif|webp|svg)$/.test(ext)) return 'image';
        if (ext && /^(mp4|mov|avi|webm|mkv)$/.test(ext)) return 'video';
        if (ext && /^(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/.test(ext)) return 'file';
        const fullUrl = String(resource?.url || '').toLowerCase();
        if (fullUrl.includes('/raw/upload/')) return 'file';
        if (fullUrl.includes('/video/upload/')) return 'video';
        if (fullUrl.includes('/image/upload/')) return 'image';
        const declared = String(resource?.type || '').toLowerCase();
        if (['link', 'image', 'video', 'file', 'document'].includes(declared)) return declared;
        if (declared === 'doc') return 'document';
        const url = String(resource?.url || '').toLowerCase().split('?')[0];
        if (/\.(png|jpe?g|gif|webp|svg)$/.test(url)) return 'image';
        if (/\.(mp4|mov|avi|webm|mkv)$/.test(url)) return 'video';
        if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/.test(url)) return 'file';
        if (/^https?:\/\//.test(url)) return 'link';
        return 'file';
    };

    const handleResourceDownload = (id, inputResource) => {
        const res = inputResource || allResources.find(
            (r) => String(r._id) === String(id) || String(r.id) === String(id)
        );
        if (!res?.url) return;
        const kind = detectResourceType(res);
        if (['link', 'image', 'video'].includes(kind)) {
            window.open(res.url, '_blank', 'noopener,noreferrer');
        } else {
            const ext = String(res.fileExtension || '').trim();
            const hasExt = /\.[a-z0-9]+$/i.test(String(res.originalName || ''));
            const fallbackName = `${String(res.title || 'resource').trim() || 'resource'}${ext || ''}`;
            const downloadName = hasExt ? res.originalName : (res.originalName ? `${res.originalName}${ext || ''}` : fallbackName);
            downloadFileResource(res.url, downloadName);
        }
    };

    useEffect(() => {
        const title = typeToTitle[type] || typeToTitle.bleue;
        const found = categories.find((c) => c.title === title) || null;
        setCategory(found);
        setPage(1);
    }, [type, categories, typeToTitle]);

    useEffect(() => {
        const loadArticles = async () => {
            if (!category?._id) return;
            try {
                const res = await postsService.getAll({
                    type: 'article',
                    category: category._id,
                    page,
                    limit
                });
                if (res.success) {
                    setArticles(res.data || []);
                    setTotalPages(res.totalPages || 1);
                }
            } catch (e) {
                console.error('Error loading economy articles', e);
            }
        };
        loadArticles();
    }, [category?._id, page]);

    const colors = {
        'Économie Bleue': { primary: '#007d90', secondary: '#005f70' },
        'Économie Verte': { primary: '#b9fe1b', secondary: '#8bc500' },
        'Économie Circulaire': { primary: '#e7fe25', secondary: '#c5d400' }
    };

    // Background images for each economy type
    const backgroundImages = {
        'Économie Bleue': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80',
        'Économie Verte': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
        'Économie Circulaire': 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80&v=1'
    };

    const heroStyle = {
        backgroundColor: '#1a3a1a', // Fallback color
        background: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6)), url('${backgroundImages[category?.title || 'Économie Bleue']}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
    };

    const descriptions = {
        'Économie Bleue': "L'économie bleue à Mahdia exploite durablement les ressources marines : pêche responsable, aquaculture durable, tourisme bleu et énergies marines renouvelables.",
        'Économie Verte': "L'économie verte favorise une croissance sobre en carbone : agriculture durable, énergies renouvelables, éco-construction et emplois verts.",
        'Économie Circulaire': "L'économie circulaire minimise le gaspillage : recyclage, réemploi, éco-conception et valorisation des déchets en ressources."
    };

    // Check if background image is used
    const hasBackgroundImage = true;

    return (
        <>
            {/* Hero */}
            <section className="hero" style={heroStyle}>
                <div className="container text-center" style={{ padding: '6rem 0', position: 'relative', zIndex: 1 }}>
                    <h1 style={{
                        color: '#fff',
                        marginTop: '1.5rem',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        {category?.title || '...'}
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.95)',
                        maxWidth: '600px',
                        margin: '1.5rem auto 0',
                        fontWeight: 500,
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                        {category?.description || ''}
                    </p>
                </div>
            </section>

            {/* Why section */}
            <section className="section">
                <div className="container">
                    <div className="grid grid--2" style={{ gap: '4rem', alignItems: 'center' }}>
                        <div>
                            <h2>Pourquoi {category?.title} à Mahdia ?</h2>
                            <p style={{ marginBottom: '1.5rem' }}>{descriptions[category?.title || 'Économie Bleue']}</p>
                            <p>
                                Mahdia dispose d'atouts uniques pour développer cette économie. Découvrez les opportunités
                                et les initiatives locales qui transforment notre région.
                            </p>
                            <Link to="/contact" className="btn btn--primary" style={{ marginTop: '1.5rem' }}>
                                Nous rejoindre
                            </Link>
                        </div>
                        <div style={{
                            background: `linear-gradient(135deg, ${(colors[category?.title || 'Économie Bleue']?.primary || '#007d90')}20, ${(colors[category?.title || 'Économie Bleue']?.primary || '#007d90')}10)`,
                            padding: '3rem',
                            borderRadius: '12px',
                            border: `2px solid ${(colors[category?.title || 'Économie Bleue']?.primary || '#007d90')}30`
                        }}>
                            <h3>Chiffres clés</h3>
                            <div style={{ marginTop: '1.5rem' }}>
                                <p style={{ fontSize: '2rem', fontWeight: 700, color: (colors[category?.title || 'Économie Bleue']?.primary || '#007d90') }}>
                                    {type === 'bleue' ? '50+' : type === 'verte' ? '35+' : '25+'}
                                </p>
                                <p>Entrepreneurs accompagnés</p>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '2rem', fontWeight: 700, color: (colors[category?.title || 'Économie Bleue']?.primary || '#007d90') }}>
                                    {type === 'bleue' ? '15' : type === 'verte' ? '12' : '8'}
                                </p>
                                <p>Ateliers organisés</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Articles */}
            <section className="section section--alt">
                <div className="container">
                    <div className="section__header">
                        <h2 className="section__title">Articles sur {category?.title}</h2>
                    </div>
                    {articles.length > 0 ? (
                        <div className="grid grid--3">{/* même format de carte que /blog */}
                            {articles.map(p => (
                                <PostCard key={p._id || p.id} post={p} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-center">Aucun article disponible pour le moment.</p>
                    )}
                    {totalPages > 1 && (
                        <div className="text-center" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                            <button className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
                            <div style={{ alignSelf: 'center' }}>Page {page} / {totalPages}</div>
                            <button className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</button>
                        </div>
                    )}
                    <div className="text-center" style={{ marginTop: '2rem' }}>
                        <Link to="/blog" className="btn btn--outline">Voir tous les articles</Link>
                    </div>
                </div>
            </section>

            {/* Resources (même catégorie que la page économie : Bleue / Verte / Circulaire) */}
            <section className="section">
                <div className="container">
                    <div className="section__header">
                        <h2 className="section__title">Ressources — {category?.title || '…'}</h2>
                    </div>
                    {!category?._id ? (
                        categories.length === 0 ? (
                            <p className="text-center">Chargement des ressources…</p>
                        ) : (
                            <p className="text-center">Rubrique non trouvée — les ressources par thème ne peuvent pas être listées.</p>
                        )
                    ) : resourcesForCategory.length > 0 ? (
                        <>
                            <div className="grid grid--4">
                                {resourcesForCategory.slice(0, resourcesPreviewLimit).map((resource) => (
                                    <ResourceCard
                                        key={resource._id || resource.id}
                                        resource={resource}
                                        onDownload={handleResourceDownload}
                                    />
                                ))}
                            </div>
                            {resourcesForCategory.length > resourcesPreviewLimit && (
                                <p className="text-center" style={{ marginTop: '1rem', color: 'var(--color-text-muted, #666)' }}>
                                    +{resourcesForCategory.length - resourcesPreviewLimit} autre(s) ressource(s) sur la page Ressources.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-center">
                            Aucune ressource liée à cette thématique pour le moment. Consultez la bibliothèque complète.
                        </p>
                    )}
                    <div className="text-center" style={{ marginTop: '2rem' }}>
                        <Link to="/ressources" className="btn btn--outline">Toutes les ressources</Link>
                    </div>
                </div>
            </section>
        </>
    );
}
