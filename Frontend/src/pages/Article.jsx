import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PostCard, Badge, Toast } from '../components/UI';
import { CalendarIcon, ClockIcon } from '../components/Icons';
import SafeHtml from '../components/SafeHtml';
import { postsService } from '../services';
import { articleTypeLabel } from '../utils/articleTypes';

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'à l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `il y a ${weeks} sem.`;
    const months = Math.floor(days / 30);
    if (months < 12) return `il y a ${months} mois`;
    const years = Math.floor(days / 365);
    return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function StarRating({ value, onChange, readonly = false, size = 24 }) {
    const [hover, setHover] = useState(0);
    return (
        <div style={{ display: 'inline-flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} width={size} height={size} viewBox="0 0 24 24"
                    fill={s <= (hover || value) ? '#f59e0b' : 'none'}
                    stroke="#f59e0b" strokeWidth="2"
                    style={{ cursor: readonly ? 'default' : 'pointer', transition: 'transform .15s' }}
                    onMouseEnter={() => !readonly && setHover(s)}
                    onMouseLeave={() => !readonly && setHover(0)}
                    onClick={() => !readonly && onChange && onChange(s)}
                >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            ))}
        </div>
    );
}

const COMMENTS_PER_PAGE = 3;

/** ID parent pour un commentaire (réponse) — null si commentaire racine */
function getParentCommentId(c) {
    if (c == null || typeof c !== 'object') return null;
    const p = c.parentComment;
    if (p == null || p === '') return null;
    if (typeof p === 'object' && p._id != null) return String(p._id);
    return String(p);
}

function ReplyIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
    );
}

export default function Article() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [comments, setComments] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [post, setPost] = useState(null);
    const [related, setRelated] = useState([]);
    const [relatedSameCategory, setRelatedSameCategory] = useState(true);
    const [userRating, setUserRating] = useState(0);
    const [avgRating, setAvgRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);
    const [isFav, setIsFav] = useState(false);
    const [favBusy, setFavBusy] = useState(false);
    const [favPulse, setFavPulse] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const [replyTo, setReplyTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [expandedReplies, setExpandedReplies] = useState({});
    const [moderationAlert, setModerationAlert] = useState(null);
    const [commentsPage, setCommentsPage] = useState(1);

    const getUser = () => {
        try {
            const userData = localStorage.getItem('mbg_user');
            if (!userData) return null;
            const parsed = JSON.parse(userData);
            return parsed.user || parsed;
        } catch { return null; }
    };
    const currentUser = getUser();

    const showToast = useCallback((message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 4000);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await postsService.getByIdOrSlug(slug);
                if (res.success) {
                    const p = res.data;
                    setPost(p);

                    const rats = p.ratings || [];
                    if (rats.length) {
                        setAvgRating(Math.round((rats.reduce((s, r) => s + r.value, 0) / rats.length) * 10) / 10);
                        setTotalRatings(rats.length);
                    }
                    if (currentUser) {
                        const mine = rats.find(r => (r.user?._id || r.user) === currentUser._id);
                        if (mine) setUserRating(mine.value);
                    }

                    const categoryId = p.category?._id || p.category;
                    const relParams = { type: 'article', status: 'published', limit: 24 };
                    if (categoryId) relParams.category = categoryId;
                    const rel = await postsService.getAll(relParams);
                    if (rel.success) {
                        const sameCat = (rel.data || []).filter(rp => String(rp._id) !== String(p._id));
                        if (sameCat.length > 0) {
                            setRelatedSameCategory(!!categoryId);
                            setRelated(sameCat.slice(0, 6));
                        } else if (categoryId) {
                            const fallback = await postsService.getAll({ type: 'article', status: 'published', limit: 12 });
                            if (fallback.success) {
                                setRelatedSameCategory(false);
                                setRelated((fallback.data || []).filter(rp => String(rp._id) !== String(p._id)).slice(0, 3));
                            } else {
                                setRelated([]);
                                setRelatedSameCategory(true);
                            }
                        } else {
                            setRelatedSameCategory(false);
                            setRelated(sameCat.slice(0, 6));
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading article:', e);
            }
        };
        load();
    }, [slug]);

    useEffect(() => {
        if (!currentUser) return;
        postsService.getFavorites().then(res => {
            if (res.success) {
                const ids = (res.data || []).map(f => f._id);
                setFavorites(ids);
                if (post) setIsFav(ids.includes(post._id));
            }
        }).catch(() => {});
    }, [post?._id]);

    useEffect(() => {
        if (!post?._id) return;
        setCommentsPage(1);
        postsService.getComments(post._id).then(res => {
            if (res?.success) {
                const raw = res.data;
                setComments(Array.isArray(raw) ? raw : []);
            } else {
                setComments([]);
            }
        }).catch(() => setComments([]));
    }, [post?._id]);

    /** Commentaires racines triés par date (pagination = 10 fils par page ; réponses imbriquées sous chaque fil) */
    const rootCommentsSorted = useMemo(
        () =>
            comments
                .filter((c) => !getParentCommentId(c))
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        [comments]
    );

    const commentsTotalPages = Math.max(1, Math.ceil(rootCommentsSorted.length / COMMENTS_PER_PAGE));

    const paginatedComments = useMemo(() => {
        const start = (commentsPage - 1) * COMMENTS_PER_PAGE;
        return rootCommentsSorted.slice(start, start + COMMENTS_PER_PAGE);
    }, [rootCommentsSorted, commentsPage]);

    useEffect(() => {
        if (commentsPage > commentsTotalPages) {
            setCommentsPage(commentsTotalPages);
        }
    }, [commentsPage, commentsTotalPages]);

    const handleRate = async (val) => {
        if (!currentUser) { navigate('/auth'); return; }
        setUserRating(val);
        try {
            const res = await postsService.ratePost(post._id, val);
            if (res.success) {
                setAvgRating(res.data.averageRating);
                setTotalRatings(res.data.totalRatings);
                showToast('Merci pour votre note !');
            }
        } catch (err) {
            console.error('Rating error:', err);
        }
    };

    const handleToggleFav = async () => {
        if (!currentUser) { navigate('/auth'); return; }
        if (favBusy) return;
        setFavBusy(true);
        try {
            const res = await postsService.toggleFavorite(post._id);
            if (res.success) {
                setIsFav(res.data.isFavorited);
                if (res.data.isFavorited) setFavPulse((n) => n + 1); // relance l'animation du cœur
                showToast(res.data.isFavorited ? 'Ajouté aux favoris' : 'Retiré des favoris');
            }
        } catch (err) {
            console.error('Favorite error:', err);
        } finally {
            setFavBusy(false);
        }
    };

    const handleToggleFavCard = async (postId) => {
        if (!currentUser) { navigate('/auth'); return; }
        try {
            await postsService.toggleFavorite(postId);
            setFavorites(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
        } catch (err) { console.error(err); }
    };

    const handleModerationError = (err) => {
        if (err.status === 403 && err.message) {
            setModerationAlert(err.message);
            setTimeout(() => setModerationAlert(null), 8000);
            return true;
        }
        return false;
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;
        if (!currentUser) { navigate('/auth'); return; }

        setSubmitting(true);
        try {
            const response = await postsService.addComment(post._id, { content: commentText });
            if (response?.success) {
                setComments(prev => {
                    const next = [...prev, response.data];
                    const roots = next
                        .filter((c) => !getParentCommentId(c))
                        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    const idx = roots.findIndex((x) => String(x._id) === String(response.data._id));
                    if (idx >= 0) {
                        setCommentsPage(Math.floor(idx / COMMENTS_PER_PAGE) + 1);
                    }
                    return next;
                });
                setCommentText('');
                showToast('Commentaire publié !');
            } else {
                showToast('Erreur lors de la publication du commentaire');
            }
        } catch (err) {
            console.error('Comment error:', err);
            if (!handleModerationError(err)) {
                const msg = err.requiresQuestionnaire
                    ? 'Veuillez compléter le questionnaire d\'inscription d\'abord'
                    : err.message || 'Erreur lors de la publication du commentaire';
                showToast(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || replySubmitting) return;
        if (!currentUser) { navigate('/auth'); return; }

        setReplySubmitting(true);
        try {
            const response = await postsService.addComment(post._id, {
                content: replyText,
                parentComment: replyTo
            });
            if (response?.success) {
                setComments(prev => [...prev, response.data]);
                setExpandedReplies(prev => ({ ...prev, [replyTo]: true }));
                setReplyText('');
                setReplyTo(null);
                showToast('Réponse publiée !');
            } else {
                showToast('Erreur lors de la publication de la réponse');
            }
        } catch (err) {
            console.error('Reply error:', err);
            if (!handleModerationError(err)) {
                showToast(err.message || 'Erreur lors de la publication de la réponse');
            }
        } finally {
            setReplySubmitting(false);
        }
    };

    const getReplies = (commentId) => {
        const sid = String(commentId);
        return comments.filter(c => getParentCommentId(c) === sid);
    };

    if (!post) {
        return (
            <section className="section">
                <div className="container container--narrow" style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Chargement de l'article…</p>
                </div>
            </section>
        );
    }

    const renderComment = (c, isReply = false) => {
        const name = c.author?.username || c.name || 'Utilisateur';
        const authorJoinDate = c.author?.createdAt;
        const replies = getReplies(c._id);
        const isReplyingToThis = replyTo != null && String(replyTo) === String(c._id || c.id);
        const avatarSize = isReply ? 32 : 40;
        const cardStyle = {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: isReply ? '12px' : '14px',
            padding: isReply ? '1rem 1.15rem' : '1.25rem 1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        };

        return (
            <div key={c._id || c.id} style={{ marginBottom: isReply ? '0.65rem' : '1rem', marginLeft: isReply ? '0.5rem' : 0 }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{
                            width: avatarSize, height: avatarSize, borderRadius: '50%',
                            background: `hsl(${(name.charCodeAt(0) * 37) % 360}, 55%, 55%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: isReply ? '0.75rem' : '0.9rem', flexShrink: 0
                        }}>
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: '#1e293b', fontSize: isReply ? '0.82rem' : '0.9rem' }}>{name}</strong>
                                {authorJoinDate && !isReply && (
                                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                        · Membre depuis {new Date(authorJoinDate).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: '0.35rem 0 0', color: '#334155', fontSize: isReply ? '0.875rem' : '0.925rem', lineHeight: 1.55, wordBreak: 'break-word' }}>{c.content}</p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: isReply ? '0.85rem' : '0.8rem', color: '#64748b' }}>
                                    {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ fontSize: isReply ? '0.85rem' : '0.75rem', color: '#64748b', fontWeight: 600 }}>
                                    {timeAgo(c.createdAt)}
                                </span>
                                {currentUser && !isReply && (
                                    <button
                                        onClick={() => { setReplyTo(isReplyingToThis ? null : c._id); setReplyText(''); }}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: isReplyingToThis ? '#007d90' : '#64748b',
                                            fontSize: '0.75rem', fontWeight: 700, padding: 0,
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                        }}>
                                        <ReplyIcon size={19} /> Répondre
                                    </button>
                                )}
                            </div>

                            {isReplyingToThis && (
                                <div style={{
                                    marginTop: '0.85rem', paddingTop: '0.85rem',
                                    borderTop: '1px solid #f1f5f9'
                                }}>
                                    <div style={{
                                        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.06em', color: '#007d90', marginBottom: '0.5rem'
                                    }}>Votre commentaire</div>
                                    <form onSubmit={handleReplySubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                            background: 'linear-gradient(135deg, #007d90, #00a5b8)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 700, fontSize: '0.65rem'
                                        }}>
                                            {currentUser?.username?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder={`Répondre à ${name}…`}
                                                disabled={replySubmitting}
                                                maxLength={500}
                                                style={{
                                                    width: '100%', padding: '0.55rem 2.5rem 0.55rem 0.9rem',
                                                    borderRadius: '10px', border: '1px solid #e2e8f0',
                                                    background: '#f8fafc', color: '#1e293b',
                                                    fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
                                                    transition: 'border-color .2s'
                                                }}
                                                onFocus={(e) => { e.target.style.borderColor = '#007d90'; }}
                                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                                                autoFocus
                                            />
                                            <button type="submit" disabled={replySubmitting || !replyText.trim()}
                                                style={{
                                                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', padding: '4px',
                                                    cursor: replyText.trim() ? 'pointer' : 'default',
                                                    color: replyText.trim() ? '#007d90' : '#94a3b8',
                                                    opacity: replyText.trim() ? 1 : 0.4,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'color .2s, opacity .2s'
                                                }}>
                                                {replySubmitting ? (
                                                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #e2e8f0', borderTopColor: '#007d90', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {replies.length > 0 && !isReply && (() => {
                    const isOpen = expandedReplies[c._id];
                    const toggleReplies = () => setExpandedReplies(prev => ({ ...prev, [c._id]: !prev[c._id] }));
                    return (
                        <div style={{ marginTop: '0.65rem' }}>
                            <button type="button" onClick={toggleReplies} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                                color: '#007d90', fontSize: '0.78rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '5px'
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    style={{ transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                {isOpen
                                    ? 'Masquer les réponses'
                                    : `Voir ${replies.length} réponse${replies.length > 1 ? 's' : ''}`
                                }
                            </button>
                            {isOpen && (
                                <div style={{ marginTop: '0.5rem', paddingLeft: '0.75rem', borderLeft: '3px solid #e2e8f0', animation: 'fadeSlideUp .2s ease-out' }}>
                                    {replies.map(r => renderComment(r, true))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        );
    };

    const summaryText = post.articleData?.summary || post.excerpt || '';
    const fieldLabel = (text) => (
        <div style={{
            fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: '#007d90', marginBottom: '0.5rem'
        }}>{text}</div>
    );
    const sep = <div style={{ borderBottom: '1px solid #f1f5f9', margin: '1.25rem 0' }} />;

    return (
        <>
            <article className="section" style={{ background: 'var(--bg-base)' }}>
                <div className="container" style={{ maxWidth: '920px' }}>

                    <nav aria-label="Fil d'Ariane" style={{ marginBottom: '1.5rem' }}>
                        <Link to="/">Accueil</Link> / <Link to="/blog">Blog</Link> / <span>{post.title}</span>
                    </nav>

                    {/* ── Formulaire blanc unique ── */}
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                        color: '#1e293b'
                    }}>

                        {/* Titre de l'article */}
                        {fieldLabel("Titre de l'article")}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0, flex: 1, fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 700, lineHeight: 1.25, color: '#0f172a' }}>{post.title}</h1>
                            <button
                                type="button"
                                onClick={handleToggleFav}
                                disabled={favBusy}
                                className={`fav-btn${isFav ? ' fav-btn--active' : ''}`}
                                aria-pressed={isFav}
                                title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            >
                                <span className="fav-btn__icon" key={favPulse} aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                    </svg>
                                </span>
                                <span className="fav-btn__label">{isFav ? 'Dans vos favoris' : 'Ajouter aux favoris'}</span>
                            </button>
                        </div>

                        {sep}

                        {/* Catégorie & Niveau */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                {fieldLabel("Catégorie")}
                                <Badge type="default">{post.category?.title || '—'}</Badge>
                            </div>
                            <div>
                                {fieldLabel("Type d’article")}
                                <Badge type="default">{articleTypeLabel(post.articleData?.articleType)}</Badge>
                            </div>
                            <div>
                                {fieldLabel("Niveau")}
                                <Badge type="default">{post.level?.name || '—'}</Badge>
                            </div>
                        </div>

                        {sep}

                        {/* Auteur & Date */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                {fieldLabel("Auteur")}
                                {post.author?.username ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: `hsl(${(post.author.username.charCodeAt(0) * 37) % 360}, 50%, 50%)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                        }}>
                                            {post.author.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{post.author.username}</div>
                                            {post.author.createdAt && (
                                                <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                                                    Membre depuis {new Date(post.author.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </div>
                            <div>
                                {fieldLabel("Date de publication")}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: '#334155' }}>
                                        <CalendarIcon size={15} />
                                        {formatDateTime(post.createdAt)}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{timeAgo(post.createdAt)}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                            <ClockIcon size={13} /> {post.articleData?.readTime || 0} min de lecture
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {sep}

                        {/* Court résumé */}
                        {summaryText && (
                            <>
                                {fieldLabel("Court résumé")}
                                <div style={{
                                    padding: '1rem 1.25rem', background: '#f0fdfa', borderRadius: '10px',
                                    borderLeft: '4px solid #007d90',
                                    fontSize: '0.95rem', lineHeight: 1.7, color: '#334155', fontStyle: 'italic'
                                }}>
                                    {summaryText}
                                </div>
                                {sep}
                            </>
                        )}

                        {/* Image de l'article */}
                        {post.articleData?.featuredImage && (
                            <>
                                {fieldLabel("Image de l'article")}
                                <img src={post.articleData.featuredImage} alt="" style={{
                                    width: '100%', borderRadius: '10px', display: 'block',
                                    border: '1px solid #e2e8f0'
                                }} />
                                {sep}
                            </>
                        )}

                        {/* Vidéo */}
                        {post.articleData?.featuredVideo && (
                            <>
                                {fieldLabel("Vidéo")}
                                <video src={post.articleData.featuredVideo} controls style={{
                                    width: '100%', borderRadius: '10px', display: 'block',
                                    border: '1px solid #e2e8f0'
                                }} />
                                {sep}
                            </>
                        )}

                        {/* Contenu de l'article */}
                        {fieldLabel("Contenu de l'article")}
                        <SafeHtml className="article-content" html={post.articleData?.content || post.body} style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#334155' }} />

                        {/* Tags */}
                        {(post.articleData?.tags || []).length > 0 && (
                            <>
                                {sep}
                                {fieldLabel("Tags")}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {post.articleData.tags.map(tag => (
                                        <span key={tag} style={{
                                            padding: '5px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 500,
                                            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0'
                                        }}>{tag}</span>
                                    ))}
                                </div>
                            </>
                        )}

                        {sep}

                        {/* Évaluation */}
                        {fieldLabel("Évaluation")}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                                Note moyenne : <strong style={{ color: '#f59e0b' }}>{avgRating > 0 ? `${avgRating}/5` : '—'}</strong>
                                {totalRatings > 0 && <span> ({totalRatings} avis)</span>}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <StarRating value={userRating} onChange={handleRate} size={28} />
                                {userRating > 0 && (
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Votre note : {userRating}/5</span>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </article>

            {/* Comments — même formulaire blanc que l’article */}
            <section className="section" style={{ background: 'var(--bg-base)', paddingTop: 0 }}>
                <div className="container" style={{ maxWidth: '920px', paddingBottom: '3rem' }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                        padding: 'clamp(1.5rem, 4vw, 2.25rem)',
                        color: '#1e293b'
                    }}>
                        <div style={{
                            fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: '#007d90', marginBottom: '0.35rem'
                        }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a' }}>Commentaires</h2>
                            <span style={{ background: '#007d90', color: '#fff', borderRadius: '20px', padding: '3px 12px', fontSize: '0.85rem', fontWeight: 700 }}>
                                {comments.length} commentaire{comments.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <p style={{ margin: '0 0 1.1rem', fontSize: '0.9rem', lineHeight: 1.55, color: '#64748b', maxWidth: '38rem' }}>
                            Consultez les commentaires et partagez le vôtre ci-dessous.
                        </p>
                        <div style={{ borderBottom: '1px solid #f1f5f9', marginBottom: '1.25rem' }} />

                    {/* Alert for non-connected users */}
                    {!currentUser && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: 'linear-gradient(135deg, rgba(0,125,144,.06), rgba(0,165,184,.04))',
                            border: '1px solid rgba(0,125,144,.15)',
                            borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem'
                        }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007d90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1a1a2e', fontWeight: 600 }}>Vous n'êtes pas connecté</p>
                                <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#475569' }}>
                                    Vous devez être connecté pour publier un commentaire.{' '}
                                    <Link to="/auth" style={{ color: '#007d90', fontWeight: 600, textDecoration: 'underline' }}>Se connecter</Link>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Moderation Alert */}
                    {moderationAlert && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                            background: 'linear-gradient(135deg, rgba(220,38,38,.08), rgba(239,68,68,.05))',
                            border: '1px solid rgba(220,38,38,.25)',
                            borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                            animation: 'fadeSlideUp .3s ease-out'
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.92rem', color: '#dc2626', fontWeight: 700 }}>Commentaire rejeté</p>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#1e293b' }}>{moderationAlert}</p>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Merci de respecter les règles de la communauté.</p>
                            </div>
                            <button onClick={() => setModerationAlert(null)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                                color: '#dc2626', opacity: 0.6, flexShrink: 0
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Comment Form — only for connected users */}
                    {currentUser && (
                        <div style={{
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '1.25rem 1.35rem',
                            marginBottom: '1.5rem',
                            background: '#fafbfc'
                        }}>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: '#007d90', marginBottom: '0.65rem'
                            }}>Nouveau commentaire</div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #007d90, #00a5b8)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0,125,144,.2)'
                                }}>
                                    {currentUser.username?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <form onSubmit={handleCommentSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>
                                        {currentUser.username}
                                        <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                            — Laissez un commentaire
                                        </span>
                                    </div>
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Écrivez votre commentaire ici…"
                                        disabled={submitting}
                                        rows={5}
                                        maxLength={500}
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1.25rem',
                                            borderRadius: '14px',
                                            border: '2px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: '#1e293b',
                                            fontSize: '0.95rem',
                                            lineHeight: 1.6,
                                            outline: 'none',
                                            resize: 'vertical',
                                            minHeight: '130px',
                                            fontFamily: 'inherit',
                                            transition: 'border-color .25s, box-shadow .25s'
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = '#007d90'; e.target.style.boxShadow = '0 0 0 3px rgba(0,125,144,.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '40px' }}>
                                        <span style={{ fontSize: '0.8rem', color: commentText.length > 450 ? '#e74c3c' : '#64748b' }}>
                                            {commentText.length > 0 ? `${commentText.length}/500` : ''}
                                        </span>

                                        {commentText.trim().length > 0 && (
                                            <button type="submit" disabled={submitting}
                                                style={{
                                                    background: '#007d90',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    padding: '0.7rem 1.75rem',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all .25s',
                                                    opacity: submitting ? 0.7 : 1,
                                                    pointerEvents: submitting ? 'none' : 'auto',
                                                    boxShadow: '0 3px 12px rgba(0,125,144,.3)',
                                                    animation: 'fadeSlideUp .25s ease-out'
                                                }}>
                                                {submitting ? (
                                                    <>
                                                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .6s linear infinite' }} />
                                                        Envoi…
                                                    </>
                                                ) : (
                                                    <>
                                                        Publier
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                        </svg>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Comments List */}
                    <div>
                        <div style={{
                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.06em', color: '#007d90', marginBottom: '0.75rem'
                        }}>Liste des commentaires</div>
                        {comments.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '2rem 1rem',
                                background: '#ffffff', borderRadius: '14px',
                                border: '1px dashed #cbd5e1'
                            }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '0.5rem' }}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <p style={{ color: '#475569', margin: 0 }}>Aucun commentaire pour le moment.</p>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>Soyez le premier à laisser un commentaire !</p>
                            </div>
                        ) : (
                            <>
                                {commentsTotalPages > 1 && (
                                    <p style={{
                                        margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b',
                                        textAlign: 'center'
                                    }}>
                                        Affichage des commentaires {(commentsPage - 1) * COMMENTS_PER_PAGE + 1}
                                        {' – '}
                                        {Math.min(commentsPage * COMMENTS_PER_PAGE, rootCommentsSorted.length)}
                                        {' sur '}
                                        {rootCommentsSorted.length}
                                        {' · '}
                                        {COMMENTS_PER_PAGE} par page
                                    </p>
                                )}
                                {paginatedComments.map((c) => renderComment(c, false))}
                                {commentsTotalPages > 1 && (
                                    <nav
                                        aria-label="Pagination des commentaires"
                                        style={{
                                            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
                                            gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1.25rem',
                                            borderTop: '1px solid #f1f5f9'
                                        }}
                                    >
                                        <button
                                            type="button"
                                            disabled={commentsPage <= 1}
                                            onClick={() => setCommentsPage(p => Math.max(1, p - 1))}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                                                background: commentsPage <= 1 ? '#f1f5f9' : '#ffffff',
                                                color: commentsPage <= 1 ? '#94a3b8' : '#334155',
                                                fontWeight: 600, fontSize: '0.85rem', cursor: commentsPage <= 1 ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Précédent
                                        </button>
                                        <span style={{ fontSize: '0.85rem', color: '#475569', padding: '0 0.5rem' }}>
                                            Page {commentsPage} / {commentsTotalPages}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={commentsPage >= commentsTotalPages}
                                            onClick={() => setCommentsPage(p => Math.min(commentsTotalPages, p + 1))}
                                            style={{
                                                padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                                                background: commentsPage >= commentsTotalPages ? '#f1f5f9' : '#ffffff',
                                                color: commentsPage >= commentsTotalPages ? '#94a3b8' : '#334155',
                                                fontWeight: 600, fontSize: '0.85rem', cursor: commentsPage >= commentsTotalPages ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            Suivant
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}
                    </div>
                    </div>
                </div>
            </section>

            {related.length > 0 && (
                <section className="section" style={{ marginTop: -120 }}>
                    <div className="container" style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0 }}>Articles similaires</h2>
                        <p style={{
                            margin: '0.7rem auto 0',
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem',
                            maxWidth: '42rem',
                            lineHeight: 1.5
                        }}>
                            {relatedSameCategory && post.category?.title
                                ? `Autres articles sur  ${post.category.title}`
                                : 'Autres articles que vous pourriez consulter'}
                        </p>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'clamp(1.25rem, 3vw, 2rem)',
                            justifyContent: 'center',
                            alignItems: 'stretch',
                            marginTop: '2rem',
                            textAlign: 'left'
                        }}>
                            {related.map(p => (
                                <div key={p._id || p.id} style={{ flex: '1 1 280px', maxWidth: '380px', width: '100%' }}>
                                    <PostCard post={p} favorites={favorites} onToggleFavorite={handleToggleFavCard} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <Toast message={toast.message} show={toast.show} type="success" />
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
