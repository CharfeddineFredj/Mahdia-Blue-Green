import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostCard } from '../components/UI';
import { PlusCircle } from 'lucide-react';
import { postsService, api } from '../services';
import { ARTICLE_TYPES } from '../utils/articleTypes';

/** Moyenne des notes 1–5, ou null si aucun avis */
function getArticleAvgRating(article) {
    const arr = article.ratings;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sum = arr.reduce((s, r) => s + (Number(r.value) || 0), 0);
    return sum / arr.length;
}

/**
 * Date calendaire locale yyyy-mm-dd (même logique que le calendrier HTML et l’affichage « 6 avril »).
 * Évite les articles du 6 qui apparaissaient pour un filtre « 7 » à cause des fuseaux / UTC.
 */
function toLocalDateKey(isoOrDate) {
    if (!isoOrDate) return null;
    const x = new Date(isoOrDate);
    if (Number.isNaN(x.getTime())) return null;
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const d = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export default function Blog() {
    const [categoryFilter, setCategoryFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [ratingFilter, setRatingFilter] = useState('');
    /** Une seule date : jour de création (comme sur la carte), vide = toutes les dates */
    const [filterDate, setFilterDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [user, setUser] = useState(null);
    const [articles, setArticles] = useState([]);
    const [categories, setCategories] = useState([]);
    const [levels, setLevels] = useState([]);
    const [page, setPage] = useState(1);
    const [favorites, setFavorites] = useState([]);
    const [showFavOnly, setShowFavOnly] = useState(false);
    const perPage = 6;
    const navigate = useNavigate();

    useEffect(() => {
        const stored = localStorage.getItem('mbg_user');
        if (stored) {
            const parsedData = JSON.parse(stored);
            if (parsedData.user) setUser(parsedData.user);
            else setUser(parsedData);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await postsService.getAll({ type: 'article', status: 'published', limit: 200 });
                if (res.success) setArticles(res.data || []);
            } catch (e) {
                console.error('Error loading articles:', e);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!user) return;
        postsService.getFavorites().then(res => {
            if (res.success) setFavorites((res.data || []).map(f => f._id));
        }).catch(() => {});
    }, [user]);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [catRes, lvlRes] = await Promise.all([
                    api.get('/categories'),
                    api.get('/levels'),
                ]);
                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);
            } catch (e) {
                console.error('Error loading blog meta:', e);
            }
        };
        loadMeta();
    }, []);

    const handleToggleFavorite = async (postId) => {
        if (!user) { navigate('/auth'); return; }
        try {
            const res = await postsService.toggleFavorite(postId);
            if (res.success) {
                setFavorites(prev =>
                    res.data.isFavorited
                        ? [...prev, postId]
                        : prev.filter(id => id !== postId)
                );
            }
        } catch (err) {
            console.error('Favorite error:', err);
        }
    };

    const filteredArticles = useMemo(() => articles.filter(article => {
        if (showFavOnly && !favorites.includes(article._id)) return false;
        const matchesCategory = !categoryFilter || article.category?._id === categoryFilter;
        const matchesType = !typeFilter || (article.articleData?.articleType || 'article') === typeFilter;
        const matchesLevel = !levelFilter || article.level?._id === levelFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q ||
            article.title.toLowerCase().includes(q) ||
            (article.excerpt || article.body || article.articleData?.summary || '').toLowerCase().includes(q);
        if (!matchesCategory || !matchesType || !matchesLevel || !matchesSearch) return false;

        if (filterDate) {
            // Même date que sur la carte (PostCard utilise createdAt)
            const articleDay = toLocalDateKey(article.createdAt || article.publishedAt);
            if (!articleDay || articleDay !== filterDate) return false;
        }

        const avg = getArticleAvgRating(article);
        if (ratingFilter === 'unrated') return avg === null;
        if (ratingFilter === 'rated') return avg !== null;
        if (ratingFilter === '4') return avg !== null && avg >= 4;
        if (ratingFilter === '3') return avg !== null && avg >= 3;
        if (ratingFilter === '2') return avg !== null && avg >= 2;
        return true;
    }), [articles, showFavOnly, favorites, categoryFilter, typeFilter, levelFilter, searchQuery, ratingFilter, filterDate]);

    /** Ordre fixe : plus récents en premier */
    const displayArticles = useMemo(() => {
        const ts = (a) => new Date(a.publishedAt || a.createdAt || 0).getTime();
        return [...filteredArticles].sort((a, b) => ts(b) - ts(a));
    }, [filteredArticles]);

    const totalPages = Math.max(1, Math.ceil(displayArticles.length / perPage));
    const paginatedArticles = displayArticles.slice((page - 1) * perPage, page * perPage);

    useEffect(() => {
        setPage(1);
    }, [categoryFilter, typeFilter, levelFilter, searchQuery, showFavOnly, ratingFilter, filterDate]);

    return (
        <section className="section">
            <div className="container">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1>Blog</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {user && (
                            <button
                                className={`btn ${showFavOnly ? 'btn--primary' : 'btn--outline'}`}
                                onClick={() => setShowFavOnly(f => !f)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={showFavOnly ? '#fff' : 'none'} stroke={showFavOnly ? '#fff' : 'currentColor'} strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                Mes favoris
                                {favorites.length > 0 && (
                                    <span style={{ background: showFavOnly ? 'rgba(255,255,255,.3)' : '#e74c3c', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                        {favorites.length}
                                    </span>
                                )}
                            </button>
                        )}
                        {/* Réservé aux utilisateurs connectés */}
                        {user && (
                            <button
                                className="btn btn--primary"
                                onClick={() => navigate('/blog/creer')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <PlusCircle size={20} />
                                Créer un article
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters — une ligne (wrap) : recherche en premier */}
                <div
                    className="table-filters"
                    style={{
                        marginBottom: '2rem',
                        display: 'flex',
                        flexWrap: 'nowrap',
                        gap: '0.5rem',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    <input
                        type="search"
                        className="form-input"
                        style={{ flex: '1 1 320px', minWidth: '220px', width: 'auto', minHeight: '46px', fontSize: '1rem' }}
                        placeholder="Rechercher…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Rechercher dans les articles"
                    />
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filtrer par catégorie">
                        <option value="">Toutes catégories</option>
                        {categories.map(c => (<option key={c._id} value={c._id}>{c.title}</option>))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrer par type d’article">
                        <option value="">Tous types</option>
                        {ARTICLE_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} aria-label="Filtrer par niveau">
                        <option value="">Tous niveaux</option>
                        {levels.map(l => (<option key={l._id} value={l._id}>{l.name}</option>))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} aria-label="Filtrer par avis">
                        <option value="">Tous les avis</option>
                        <option value="rated">Avec au moins un avis</option>
                        <option value="unrated">Sans avis</option>
                        <option value="4">Note moyenne ≥ 4 / 5</option>
                        <option value="3">Note moyenne ≥ 3 / 5</option>
                        <option value="2">Note moyenne ≥ 2 / 5</option>
                    </select>
                    <input
                        type="date"
                        className="form-input"
                        style={{
                            width: 'auto',
                            minWidth: '180px',
                            flex: '0 0 auto',
                            minHeight: '46px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '1rem',
                        }}
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        title="Jour de création affiché sur la carte (vide = toutes les dates)"
                        aria-label="Filtrer par date de création (comme sur la carte)"
                    />
                </div>

                {/* Results */}
                {displayArticles.length > 0 ? (
                    <div className="grid grid--3">
                        {paginatedArticles.map(post => (
                            <PostCard key={post._id || post.id} post={post} favorites={favorites} onToggleFavorite={handleToggleFavorite} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center" style={{ padding: '4rem' }}>
                        <p>{showFavOnly ? 'Aucun article en favoris.' : 'Aucun article trouvé avec ces critères.'}</p>
                        <button className="btn btn--outline" style={{ marginTop: '1rem' }}
                            onClick={() => {
                                setCategoryFilter('');
                                setLevelFilter('');
                                setRatingFilter('');
                                setFilterDate('');
                                setSearchQuery('');
                                setShowFavOnly(false);
                            }}>
                            Réinitialiser les filtres
                        </button>
                    </div>
                )}
                {displayArticles.length > 0 && totalPages > 1 && (
                    <nav className="pagination-bar" style={{ marginTop: '2rem' }} aria-label="Pagination des articles">
                        <div className="pagination-bar__controls">
                            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
                            <span className="pagination-bar__page-ind" aria-live="polite">Page {page} / {totalPages}</span>
                            <button type="button" className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</button>
                        </div>
                    </nav>
                )}
            </div>
        </section>
    );
}
