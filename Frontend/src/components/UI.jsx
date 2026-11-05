import { Link } from 'react-router-dom';
import { categories } from '../data/mockData';
import { authService } from '../services';
import { articleTypeLabel } from '../utils/articleTypes';

/** Identifiant de l'utilisateur connecté (formats de session historiques inclus) */
function getSessionUserId() {
    const s = authService.getCurrentUser();
    const id = s?.user?._id || s?.user?.id || s?._id || s?.id;
    return id ? String(id) : '';
}

const refId = (v) => String((v && typeof v === 'object' ? v._id || v.id : v) || '');
import {
    CalendarIcon,
    ClockIcon,
    LocationIcon,
    BookOpenIcon,
    FileTextIcon,
    VideoIcon,
    LinkIcon,
    FolderIcon,
    DownloadIcon,
    getResourceTypeIcon
} from './Icons';

// Monitor/Online icon
const MonitorIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

import { useState } from 'react';
import { createPortal } from 'react-dom';

// Custom LinkedIn-style reaction icons
const LinkedInLike = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#378FE9" />
        <path d="M8 11.5C8 11.5 8.5 7 12 7C14 7 15 8.5 15 10C15 11.5 14 12 14 12H16.5C17.328 12 18 12.672 18 13.5C18 14 17.5 14.5 17.5 14.5C17.828 14.672 18 15 18 15.5C18 16 17.5 16.5 17.5 16.5C17.828 16.672 18 17 18 17.5C18 18.328 17.328 19 16.5 19H11C9.5 19 8 18 8 16V11.5Z" fill="white" />
        <path d="M6 12H7.5V19H6C5.448 19 5 18.552 5 18V13C5 12.448 5.448 12 6 12Z" fill="white" />
    </svg>
);

const LinkedInCelebrate = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#44B553" />
        <path d="M7 9L9.5 11.5M17 9L14.5 11.5M8 6L9 8M16 6L15 8M12 5V7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 13C8 13 9 17 12 17C15 17 16 13 16 13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 13L6 15M16 13L18 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="9.5" cy="11" r="1" fill="white" />
        <circle cx="14.5" cy="11" r="1" fill="white" />
    </svg>
);

const LinkedInSupport = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#7A61D1" />
        <path d="M12 17C12 17 6 13.5 6 10C6 8 7.5 6.5 9.5 6.5C10.5 6.5 11.5 7 12 8C12.5 7 13.5 6.5 14.5 6.5C16.5 6.5 18 8 18 10C18 13.5 12 17 12 17Z" fill="white" />
        <path d="M6 14C5 15 5 16 6 17C7 18 9 18 10 17" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <path d="M18 14C19 15 19 16 18 17C17 18 15 18 14 17" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

const LinkedInLove = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#DF704D" />
        <path d="M12 18C12 18 5 13 5 9C5 6.5 7 5 9 5C10.5 5 11.5 6 12 7C12.5 6 13.5 5 15 5C17 5 19 6.5 19 9C19 13 12 18 12 18Z" fill="white" />
    </svg>
);

const LinkedInInsightful = ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#F5A623" />
        <path d="M12 5C9 5 7 7 7 10C7 12 8 13 9 14V16C9 16.5 9.5 17 10 17H14C14.5 17 15 16.5 15 16V14C16 13 17 12 17 10C17 7 15 5 12 5Z" fill="white" />
        <path d="M10 18H14V19C14 19.5 13.5 20 13 20H11C10.5 20 10 19.5 10 19V18Z" fill="white" />
        <circle cx="10" cy="10" r="0.8" fill="#F5A623" />
        <circle cx="14" cy="10" r="0.8" fill="#F5A623" />
        <path d="M10.5 12C10.5 12 11 13 12 13C13 13 13.5 12 13.5 12" stroke="#F5A623" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
);

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

export function PostCard({ post, favorites = [], onToggleFavorite }) {
    const categoryTitle =
        typeof post.category === 'string'
            ? post.category
            : (post.category?.title || post.category?.name || '');

    const cat = categories.find(c => c.key === post.category);
    const badgeLabel = cat?.label || categoryTitle || '—';
    const badgeKey = (cat?.key || categoryTitle || 'default').toString().toLowerCase().replace(/\s+/g, '-');

    const postId = post._id || post.id;
    const isFav = favorites.includes(postId);

    const ratingsArr = post.ratings || [];
    const avgRating = ratingsArr.length
        ? Math.round((ratingsArr.reduce((s, r) => s + (r.value || 0), 0) / ratingsArr.length) * 10) / 10
        : 0;

    const postSlugOrId = post.slug || postId;
    const imageUrl = post.featuredImage || post.articleData?.featuredImage || '';

    const handleFav = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onToggleFavorite) onToggleFavorite(postId);
    };

    return (
        <Link to={`/article/${postSlugOrId}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}>
            <article className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>

                {/* Heart favorite button */}
                <button onClick={handleFav} title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    style={{ position: 'absolute', top: 12, right: 12, zIndex: 5, background: 'rgba(255,255,255,.85)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.12)', transition: 'transform .2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? '#e74c3c' : 'none'} stroke={isFav ? '#e74c3c' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </button>

                {imageUrl ? (
                    <img src={imageUrl} alt="" className="card__image" loading="lazy" />
                ) : (
                    <div className="card__image" style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 700, minHeight: '180px' }}>
                        {post.title?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                )}
                <div className="card__content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge--${badgeKey}`}>{badgeLabel}</span>
                        {post.articleData?.articleType && (
                            <span className="badge badge--blue" style={{ marginLeft: '0.35rem' }}>{articleTypeLabel(post.articleData.articleType)}</span>
                        )}
                        {post.createdAt && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '1px 8px', borderRadius: '10px', fontWeight: 500 }}>
                                {timeAgo(post.createdAt)}
                            </span>
                        )}
                    </div>
                    <h3 className="card__title">{post.title}</h3>
                    <p className="card__excerpt">
                        {String(post.excerpt || post.articleData?.summary || '').slice(0, 100)}
                        {((post.excerpt || post.body || post.articleData?.summary) ? '...' : '')}
                    </p>
                    <div className="card__meta" style={{ marginTop: 'auto' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <BookOpenIcon size={14} /> {post.readTimeMinutes || post.articleData?.readTime || 0} min
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CalendarIcon size={14} />
                            {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}
                            {new Date(post.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    {/* Rating + favorites bar */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                                    fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'}
                                    stroke="#f59e0b" strokeWidth="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                            ))}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                                {avgRating > 0 ? `${avgRating}/5` : '—'}
                            </span>
                        </div>
                        {ratingsArr.length > 0 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                ({ratingsArr.length} avis)
                            </span>
                        )}
                    </div>
                </div>
            </article>
        </Link>
    );
}

export function EventCard({ event }) {
    const d = event.eventData;
    const startDate = new Date(d.startDate);
    const isPastEvent = startDate < new Date();
    const imageUrl = d?.eventImage || event.featuredImage || '/images/placeholder-event.jpg';
    const badgeKey = (typeof event.category === 'string'
        ? event.category
        : (event.category?.title || 'event')).toString().toLowerCase().replace(/\s+/g, '-');

    const eventUrlId = event.eventNumber != null ? String(event.eventNumber) : (event._id || event.id || event.slug);

    // Bouton adapté à l'utilisateur : organisateur → voir l'événement, déjà inscrit → voir l'inscription
    const userId = getSessionUserId();
    const isOrganizer = !!userId && refId(event.author) === userId;
    const isRegistered = !!userId && (d.registeredUsers || []).some((u) => refId(u) === userId);

    return (
        <article className="card">
            <img src={imageUrl} alt={event.title} className="card__image" loading="lazy" style={{ background: 'linear-gradient(135deg, #1a3a4a 0%, #0d1f29 100%)' }} />
            <div className="card__content">
                <span className={`badge badge--${badgeKey}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {d.isOnline ? <><MonitorIcon size={14} /> En ligne</> : <><LocationIcon size={14} /> {(d.location || '—').toString().split(',')[0]}</>}
                </span>
                <h3 className="card__title">
                    <Link to={`/evenement/${eventUrlId}`}>{event.title}</Link>
                </h3>
                <p className="card__excerpt">{String(event.excerpt || event.body || '').slice(0, 120)}{(event.excerpt || event.body) ? '...' : ''}</p>
                <div className="card__meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CalendarIcon size={14} /> {startDate.toLocaleDateString('fr-FR')}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ClockIcon size={14} /> {startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                {isPastEvent ? (
                    <Link to={`/evenement/${eventUrlId}`} className="btn btn--outline btn--sm btn--block" style={{ marginTop: '1rem' }}>
                        Voir détails
                    </Link>
                ) : isOrganizer ? (
                    <Link to={`/evenement/${eventUrlId}`} className="btn btn--outline btn--sm btn--block" style={{ marginTop: '1rem' }}>
                        Voir l&apos;événement
                    </Link>
                ) : isRegistered ? (
                    <Link to={`/evenement/${eventUrlId}`} className="btn btn--outline btn--sm btn--block" style={{ marginTop: '1rem' }}>
                        Voir l&apos;inscription
                    </Link>
                ) : (
                    <Link to={`/evenement/${eventUrlId}`} className="btn btn--primary btn--sm btn--block" style={{ marginTop: '1rem' }}>
                        S'inscrire
                    </Link>
                )}
            </div>
        </article>
    );
}

/** Icône de format, sans texte : Excel = grille, PDF = bande rouge, Word = lignes de texte */
function FormatIcon({ format, color, size = 40 }) {
    // Même modèle que l'exemple : feuille à contour, coin replié, lignes de texte, étiquette du format
    if (format === 'DOC') {
        // Word : bloc bleu avec un W blanc, à côté d'une page rayée de bleu
        return (
            <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
                <rect x="56" y="12" width="40" height="76" rx="3" fill="#fff" stroke={color} strokeWidth="3" />
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <rect key={i} x="60" y={18 + i * 11.5} width="32" height="6" fill={color} />
                ))}
                <path d="M4 12 L58 4 V96 L4 88 Z" fill={color} />
                <text x="30" y="68" textAnchor="middle" fontSize="48" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">W</text>
            </svg>
        );
    }
    if (format === 'XLS') {
        // Excel : bloc vert avec un X blanc, à côté d'une feuille à grille
        return (
            <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
                <rect x="56" y="12" width="38" height="76" rx="3" fill="#fff" stroke={color} strokeWidth="3" />
                {[0, 1, 2, 3, 4].map((i) => (
                    <rect key={i} x="61" y={20 + i * 13} width="28" height="8" rx="1" fill={color} />
                ))}
                <path d="M4 12 L58 4 V96 L4 88 Z" fill={color} />
                <g stroke="#fff" strokeWidth="7" strokeLinecap="round">
                    <line x1="16" y1="34" x2="38" y2="66" />
                    <line x1="38" y1="34" x2="16" y2="66" />
                </g>
            </svg>
        );
    }
    if (format === 'PDF') {
        // PDF : feuille rouge pleine, coin replié, deux barres blanches, nom du format en blanc en bas
        return (
            <svg width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden="true" style={{ display: 'block' }}>
                <path d="M10 2 H64 L92 30 V110 Q92 118 84 118 H10 Q2 118 2 110 V10 Q2 2 10 2 Z" fill={color} />
                <path d="M64 2 V30 H92 Z" fill="#fff" fillOpacity="0.35" />
                <rect x="22" y="36" width="56" height="6" fill="#fff" />
                <rect x="22" y="52" width="56" height="6" fill="#fff" />
                <text x="50" y="104" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">PDF</text>
            </svg>
        );
    }
    return (
        <svg width={size} height={size * 1.2} viewBox="0 0 100 120" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M10 2 H64 L92 30 V110 Q92 118 84 118 H10 Q2 118 2 110 V10 Q2 2 10 2 Z" fill={color} />
            <path d="M64 2 V30 H92 Z" fill="#fff" fillOpacity="0.35" />
            <text x="47" y="76" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">{format}</text>
        </svg>
    );
}

/** Icône d'image (absente de Icons.jsx) */
const ImageTypeIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
    </svg>
);

/** Icône propre à chaque type de ressource */
function ResourceTypeGlyph({ type, size }) {
    switch (type) {
        case 'video': return <VideoIcon size={size} />;
        case 'link': return <LinkIcon size={size} />;
        case 'file': return <FolderIcon size={size} />;
        case 'image': return <ImageTypeIcon size={size} />;
        default: return <FileTextIcon size={size} />;
    }
}

export function ResourceCard({ resource, onDownload }) {
    const normalizedType = (() => {
        const t = String(resource?.type || '').toLowerCase();
        if (t === 'doc') return 'document';
        return t;
    })();
    const actionLabel = ['link', 'image', 'video'].includes(normalizedType) ? 'Ouvrir' : 'Télécharger';
    const TYPE_META = {
        document: { label: 'Document', color: '#2563eb', bg: 'rgba(37,99,235,.12)' },
        file: { label: 'Fichier', color: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
        video: { label: 'Vidéo', color: '#dc2626', bg: 'rgba(220,38,38,.12)' },
        link: { label: 'Lien', color: '#0d9488', bg: 'rgba(13,148,136,.12)' },
        image: { label: 'Image', color: '#d97706', bg: 'rgba(217,119,6,.12)' },
    };
    const meta0 = TYPE_META[normalizedType] || { label: 'Ressource', color: '#64748b', bg: 'rgba(100,116,139,.12)' };
    // Pour un document : le badge affiche le format réel (PDF, Excel, Word…)
    const FORMAT_META = {
        pdf: ['PDF', '#dc2626'],
        doc: ['Word', '#2563eb'], docx: ['Word', '#2563eb'],
        xls: ['Excel', '#16a34a'], xlsx: ['Excel', '#16a34a'], csv: ['Excel', '#16a34a'],
        ppt: ['PowerPoint', '#ea580c'], pptx: ['PowerPoint', '#ea580c'],
        txt: ['Texte', '#475569'],
        zip: ['Archive', '#7c3aed'], rar: ['Archive', '#7c3aed'], '7z': ['Archive', '#7c3aed'],
    };
    const fmtExt = (String(resource?.fileExtension || '').replace(/^\./, '') || ((String(resource?.url || '').split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '')).toLowerCase();
    const fmt = (['document', 'file'].includes(normalizedType) && FORMAT_META[fmtExt]) ? FORMAT_META[fmtExt] : null;
    const meta = fmt ? { label: fmt[0], color: fmt[1], bg: `${fmt[1]}1f` } : meta0;
    const downloads = Number(resource.downloadsCount) || 0;

    const open = () => onDownload && onDownload(resource._id || resource.id, resource);

    // Aperçu réel du fichier pour les images et les vidéos (le clic reste géré par la carte)
    // PDF : première page affichée directement par le navigateur (Word / Excel / liens : logo ou icône)
    const isPdfFile = /pdf/i.test(String(resource?.fileExtension || '')) || /\.pdf(\?|$)/i.test(String(resource?.url || ''));
    // Aperçus calculés par le serveur : image du site (lien) ou début du texte (Word / Excel / CSV)
    const hasLinkPreview = normalizedType === 'link' && !!resource?.previewImage;
    const hasTextPreview = ['document', 'file'].includes(normalizedType) && !isPdfFile && !!resource?.previewText;
    // Images, vidéos, liens et documents : aperçu réel (comme une image ou une vidéo)
    const isMedia = (normalizedType === 'image' || normalizedType === 'video' || (isPdfFile && ['document', 'file'].includes(normalizedType)) || hasLinkPreview || hasTextPreview) && !!(resource?.url || resource?.previewImage);
    const mediaStyle = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', border: 0, background: '#fff' };
    const mediaEl = !isMedia ? null : hasLinkPreview ? (
        <img src={resource.previewImage} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ ...mediaStyle, objectFit: 'cover' }} />
    ) : hasTextPreview ? (
        <div style={{ ...mediaStyle, padding: '14px 16px', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', background: '#fff' }}>
            <p style={{ margin: 0, marginTop: 26, fontSize: '0.78rem', lineHeight: 1.5, color: '#334155', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {resource.previewText}
            </p>
        </div>
    ) : normalizedType === 'image' ? (
        <img src={resource.url} alt="" loading="lazy" style={{ ...mediaStyle, objectFit: 'cover' }} />
    ) : normalizedType === 'video' ? (
        <video src={resource.url} muted playsInline preload="metadata" style={{ ...mediaStyle, objectFit: 'cover' }} />
    ) : (
        <iframe src={`${resource.url}#toolbar=0&navpanes=0&view=FitH`} title={resource.title} tabIndex={-1} style={mediaStyle} />
    );
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };

    // Logo de document selon le format du fichier
    // Format détecté d'après l'extension du fichier (ou celle de l'URL si l'extension manque)
    const urlExt = (String(resource?.url || '').split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '';
    const ext = (String(resource?.fileExtension || '').replace(/^\./, '') || urlExt).toLowerCase();
    const DOC_LOGOS = {
        pdf: ['PDF', '#dc2626'],
        doc: ['DOC', '#2563eb'], docx: ['DOC', '#2563eb'],
        csv: ['XLS', '#16a34a'], xls: ['XLS', '#16a34a'], xlsx: ['XLS', '#16a34a'],
        ppt: ['PPT', '#ea580c'], pptx: ['PPT', '#ea580c'],
        txt: ['TXT', '#475569'],
        zip: ['ZIP', '#7c3aed'], rar: ['RAR', '#7c3aed'], '7z': ['ZIP', '#7c3aed'],
    };
    const [docLabel, docColor] = DOC_LOGOS[ext] || ['FILE', meta.color];
    const docLogo = ['document', 'file'].includes(normalizedType) ? (
        <FormatIcon format={docLabel} color={docColor} size={40} />
    ) : null;

    return (
        <article
            className="card"
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={onKey}
            aria-label={`${actionLabel} : ${resource.title}`}
            style={{ cursor: 'pointer' }}
        >
            <div
                style={{
                    position: 'relative',
                    height: isMedia ? '170px' : (docLogo ? '160px' : '120px'),
                    flexShrink: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #007d90, #0d9488)',
                    color: '#fff',
                }}
            >
                {mediaEl}
                {isMedia && (
                    <span
                        aria-hidden="true"
                        style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.35), transparent 60%)' }}
                    />
                )}
                {!isMedia && (
                <span
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,.18)',
                        border: '1px solid rgba(255,255,255,.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {docLogo || <ResourceTypeGlyph type={normalizedType || resource.type} size={28} />}
                </span>
                )}
                {fmt && (
                    <span title={meta.label} style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }}>
                        <FormatIcon format={docLabel} color={docColor} size={26} />
                    </span>
                )}
                {!fmt && (
                <span
                    className="badge"
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'rgba(255,255,255,.92)',
                        color: meta.color,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                    }}
                >
                    <ResourceTypeGlyph type={normalizedType || resource.type} size={12} />
                    {meta.label}
                </span>
                )}
            </div>
            <div className="card__content">
                <h3 className="card__title" style={{ marginBottom: '0.4rem' }}>{resource.title}</h3>
                {resource.description && (
                    <p className="card__excerpt" style={{ margin: 0 }}>{resource.description}</p>
                )}
                <div
                    style={{
                        marginTop: 'auto',
                        paddingTop: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        borderTop: '1px solid var(--border-color)',
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <DownloadIcon size={14} />
                        <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{downloads}</strong>
                        {actionLabel === 'Ouvrir' ? 'ouvertures' : 'téléchargements'}
                    </span>
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={(e) => { e.stopPropagation(); open(); }}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </article>
    );
}

export function Toast({ message, type = 'success', show, onClose }) {
    return (
        <div className={`toast toast--${type} ${show ? 'toast--show' : ''}`} role="alert" aria-live="polite">
            {message}
        </div>
    );
}

export function Modal({ isOpen, onClose, title, children, contentClassName = '', stackOnTop = false }) {
    if (!isOpen) return null;

    // Rendu dans <body> : la fenêtre couvre tout l'écran (barre de navigation comprise),
    // quel que soit le conteneur de la page qui l'ouvre
    return createPortal(
        <div className={`modal ${isOpen ? 'modal--open' : ''} ${stackOnTop ? 'modal--stack-top' : ''}`} onClick={onClose}>
            <div
                className={`modal__content${contentClassName ? ` ${contentClassName}` : ''}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
            >
                <div className="modal__header">
                    <h3 className="modal__title">{title}</h3>
                    <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">&times;</button>
                </div>
                <div className="modal__body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

export function Badge({ type, children }) {
    return <span className={`badge badge--${type}`}>{children}</span>;
}

export function Stepper({ steps, currentStep }) {
    return (
        <div className="stepper">
            {steps.map((step, i) => (
                <div
                    key={i}
                    className={`stepper__step ${i === currentStep ? 'stepper__step--active' : ''} ${i < currentStep ? 'stepper__step--completed' : ''}`}
                >
                    <span className="stepper__indicator">{i + 1}</span>
                    <span className="stepper__label">{step}</span>
                </div>
            ))}
        </div>
    );
}

export function ProgressBar({ percent }) {
    return (
        <div className="progress">
            <div className="progress__bar" style={{ width: `${percent}%` }} />
        </div>
    );
}
