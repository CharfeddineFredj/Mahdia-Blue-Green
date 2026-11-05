import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, Upload, X, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { authService, postsService, eventsService, api } from '../services';
import { Toast } from '../components/UI';
import {
    getTomorrowMidnightLocalString,
    addMinutesToDatetimeLocalString,
    validateEventSchedule,
    getDatetimeLocalMinForStartEdit,
    toDatetimeLocalString,
} from '../utils/eventScheduling';
import { getEventReviewStatus, isEventEnded, EVENT_ENDED_MESSAGE, PUBLISHED_LOCK_MESSAGES } from '../utils/eventQuestionnaireRules';

/** Valeur pour input datetime-local en heure locale (toISOString décalerait l'heure en UTC) */
function toDatetimeLocalValue(d) {
    if (!d) return '';
    return toDatetimeLocalString(new Date(d));
}

export default function EditEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [postId, setPostId] = useState(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState('');
    const [level, setLevel] = useState('');
    const [categories, setCategories] = useState([]);
    const [levels, setLevels] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [locationText, setLocationText] = useState('');
    const [capacity, setCapacity] = useState('50');
    const [eventImage, setEventImage] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const [imageCheckStatus, setImageCheckStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [reviewInfo, setReviewInfo] = useState(null);
    const [originalDates, setOriginalDates] = useState({ start: '', end: '' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const imageCheckTimer = useRef(null);
    const toastHideTimerRef = useRef(null);
    const IMPORT_SUCCESS_TOAST_MS = 10_000;

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate('/auth');
            return;
        }

        const load = async () => {
            try {
                const [postRes, catRes, lvlRes, mineRes] = await Promise.all([
                    postsService.getByIdOrSlug(id),
                    api.get('/categories'),
                    api.get('/levels'),
                    eventsService.getMyEvents({ limit: 200 }).catch(() => null),
                ]);

                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);

                const ev = postRes?.data;
                if (!ev || ev.type !== 'event') {
                    setToast({ show: true, message: 'Événement introuvable', type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 1500);
                    return;
                }

                const session = authService.getCurrentUser();
                const uid = session?.user?._id || session?.user?.id || session?._id || session?.id;
                const authorId = ev.author?._id || ev.author;
                if (uid && authorId && String(uid) !== String(authorId)) {
                    setToast({ show: true, message: 'Vous ne pouvez pas modifier cet événement.', type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 1500);
                    return;
                }

                // Événement terminé : plus aucune modification possible
                if (isEventEnded(ev.eventData)) {
                    setToast({ show: true, message: EVENT_ENDED_MESSAGE, type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 2200);
                    return;
                }

                // Validé et publié par un administrateur : plus modifiable par le créateur
                const live = ev.status === 'published' || !!ev.publishedOnce;
                const isStaff = ['superadmin', 'moderator'].includes(session?.user?.role || session?.role);
                if (live && !isStaff) {
                    setToast({ show: true, message: PUBLISHED_LOCK_MESSAGES.event, type: 'error' });
                    setTimeout(() => navigate('/compte#panier'), 2200);
                    return;
                }

                // Version propriétaire (contient la modification en attente éventuelle)
                const mine = (mineRes?.data || []).find((e) => String(e._id) === String(ev._id));
                const revision = mine?.pendingRevision || null;
                setIsLive(live);
                setReviewInfo({
                    status: getEventReviewStatus(mine || ev),
                    reason: (mine || ev).moderation?.reason || '',
                    revision,
                });

                // Pré-remplissage : on reprend la modification en attente si elle existe
                const src = revision || ev;
                const ed = { ...(ev.eventData || {}), ...(revision?.eventData || {}) };
                setPostId(ev._id);
                setTitle(src.title || ev.title || '');
                setBody(src.body || ev.body || '');
                setCategory(src.category?._id || src.category || ev.category?._id || ev.category || '');
                setLevel(src.level?._id || src.level || ev.level?._id || ev.level || '');
                setStartDate(toDatetimeLocalValue(ed.startDate));
                setEndDate(toDatetimeLocalValue(ed.endDate || ed.startDate));
                setOriginalDates({
                    start: toDatetimeLocalValue(ev.eventData?.startDate),
                    end: toDatetimeLocalValue(ev.eventData?.endDate || ev.eventData?.startDate),
                });
                setLocationText(ed.location || '');
                setCapacity(ed.capacity != null ? String(ed.capacity) : '50');
                setEventImage(ed.eventImage || '');
            } catch (err) {
                setToast({ show: true, message: err.message || 'Erreur de chargement', type: 'error' });
                setTimeout(() => navigate('/compte#panier'), 1500);
            } finally {
                setLoading(false);
            }
        };

        load();
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
            const res = await api.upload(file, 'mahdia_bg/events');
            if (res.success) {
                setEventImage(res.data.url);
                if (toastHideTimerRef.current) clearTimeout(toastHideTimerRef.current);
                setToast({ show: true, message: 'Image importée avec succès', type: 'success' });
                toastHideTimerRef.current = setTimeout(() => {
                    setToast({ show: false, message: '', type: 'success' });
                    toastHideTimerRef.current = null;
                }, IMPORT_SUCCESS_TOAST_MS);
            }
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Cette image contient du contenu inapproprié et a été rejetée.'
                : err.message || 'Erreur upload image';
            setToast({ show: true, message: msg, type: 'error' });
            setEventImage('');
        } finally {
            setImageUploading(false);
            e.target.value = '';
        }
    };

    const removeImage = (e) => {
        e.stopPropagation();
        setEventImage('');
        setImageCheckStatus('');
    };

    const checkImageUrl = (url) => {
        if (imageCheckTimer.current) clearTimeout(imageCheckTimer.current);
        const trimmed = url.trim();
        if (!trimmed) {
            setImageCheckStatus('');
            return;
        }
        if (!/^https?:\/\/.+\..+/i.test(trimmed)) {
            setImageCheckStatus('');
            return;
        }

        setImageCheckStatus('checking');
        imageCheckTimer.current = setTimeout(async () => {
            try {
                await api.post('/upload/check-image', { url: trimmed });
                setImageCheckStatus('ok');
            } catch (err) {
                setImageCheckStatus('blocked');
                setEventImage('');
                const msg = err.message || "Cette image contient du contenu inapproprié et a été rejetée.";
                setToast({ show: true, message: msg, type: 'error' });
            }
        }, 800);
    };

    const handleImageUrlChange = (e) => {
        const val = e.target.value;
        setEventImage(val);
        checkImageUrl(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!postId) return;

        const missing = [];
        if (!title.trim()) missing.push('Titre');
        if (!body.trim()) missing.push('Description');
        if (!startDate) missing.push('Date de début');
        if (!endDate) missing.push('Date de fin');
        if (!locationText.trim()) missing.push('Lieu');
        if (!capacity) missing.push('Capacité');
        if (!category) missing.push('Catégorie');
        if (!level) missing.push('Niveau');
        if (!eventImage) missing.push('Image de couverture');
        if (missing.length) {
            setToast({ show: true, message: `Champs obligatoires manquants : ${missing.join(', ')}`, type: 'error' });
            return;
        }

        // Les règles de date ne s'appliquent que si les dates changent (comme côté serveur)
        const datesChanged = startDate !== originalDates.start || endDate !== originalDates.end;
        const scheduleErrors = datesChanged ? validateEventSchedule(startDate, endDate) : [];
        if (scheduleErrors.length) {
            setToast({ show: true, message: scheduleErrors[0], type: 'error' });
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        setIsSubmitting(true);
        try {
            const res = await postsService.update(postId, {
                title: title.trim(),
                body: body.trim(),
                category,
                level,
                eventData: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString(),
                    location: locationText.trim(),
                    capacity: parseInt(capacity, 10) || 50,
                    eventImage: eventImage.trim(),
                    isOnline: false,
                },
            });
            setToast({ show: true, message: res?.message || 'Modification soumise à validation.', type: 'success' });
            setTimeout(() => navigate('/compte#panier'), 1800);
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Le contenu de cet événement contient du langage inapproprié et a été rejeté.'
                : err.message || 'Erreur lors de l’enregistrement';
            setToast({ show: true, message: msg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const imagePreview = eventImage?.trim() ? eventImage : '';
    const tomorrowMin = getTomorrowMidnightLocalString();
    const startInputMin = getDatetimeLocalMinForStartEdit(startDate);
    const endInputMin = startDate
        ? addMinutesToDatetimeLocalString(startDate, 90)
        : addMinutesToDatetimeLocalString(tomorrowMin, 90);

    const handleStartDateChange = (e) => {
        const v = e.target.value;
        setStartDate(v);
        if (!v) return;
        const minEnd = addMinutesToDatetimeLocalString(v, 90);
        setEndDate((prev) => {
            if (!prev || new Date(prev) < new Date(minEnd)) return minEnd;
            return prev;
        });
    };

    if (!authService.isAuthenticated()) {
        return (
            <section className="section section--alt">
                <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>Redirection vers la connexion…</p>
                </div>
                <Toast message={toast.message} show={toast.show} type={toast.type} />
            </section>
        );
    }

    if (loading) {
        return (
            <section className="section section--alt">
                <div className="container" style={{ maxWidth: '800px', textAlign: 'center', padding: '4rem 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Chargement de l&apos;événement…</p>
                </div>
                <Toast message={toast.message} show={toast.show} type={toast.type} />
            </section>
        );
    }

    return (
        <section className="section section--alt">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div className="container" style={{ maxWidth: '800px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/compte#panier')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: 'none', background: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem',
                    }}
                >
                    <ArrowLeft size={16} />
                    Retour au panier professionnel
                </button>

                <div className="content-card">
                    <div className="card-header">
                        <h1 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Edit3 size={28} style={{ color: 'var(--color-primary)' }} />
                            Modifier votre événement
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {isLive
                                ? 'Cet événement est publié. Vos modifications seront soumises à un administrateur ; la version actuelle reste en ligne jusqu’à leur validation.'
                                : 'Chaque modification est soumise à la validation d’un administrateur avant publication.'}
                        </p>
                        {reviewInfo?.revision?.status === 'pending' && (
                            <p className="badge badge--yellow" style={{ marginTop: '0.75rem', whiteSpace: 'normal' }}>
                                Une modification est déjà en attente de validation : le formulaire la reprend, un nouvel envoi la remplacera.
                            </p>
                        )}
                        {reviewInfo?.revision?.status === 'rejected' && (
                            <p className="badge badge--red" style={{ marginTop: '0.75rem', whiteSpace: 'normal' }}>
                                Votre dernière modification a été refusée{reviewInfo.revision.rejectionReason ? ` : ${reviewInfo.revision.rejectionReason}` : ''}.
                            </p>
                        )}
                        {!isLive && reviewInfo?.status === 'rejected' && (
                            <p className="badge badge--red" style={{ marginTop: '0.75rem', whiteSpace: 'normal' }}>
                                Événement refusé{reviewInfo.reason ? ` : ${reviewInfo.reason}` : ''}. Corrigez-le puis soumettez-le à nouveau.
                            </p>
                        )}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Titre de l&apos;événement *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Ex. Atelier économie circulaire"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Image de couverture *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="url"
                                    className="form-input"
                                    value={eventImage}
                                    onChange={handleImageUrlChange}
                                    placeholder="Ou collez une URL d'image..."
                                    style={{
                                        marginBottom: '0.75rem',
                                        paddingRight: '2.5rem',
                                        borderColor: imageCheckStatus === 'blocked' ? '#e53e3e' : imageCheckStatus === 'ok' ? '#38a169' : undefined,
                                    }}
                                />
                                {imageCheckStatus === 'checking' && (
                                    <Loader size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                                )}
                                {imageCheckStatus === 'ok' && (
                                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: '#38a169' }} />
                                )}
                                {imageCheckStatus === 'blocked' && (
                                    <AlertTriangle size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: '#e53e3e' }} />
                                )}
                            </div>
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
                                onClick={() => !imagePreview && document.getElementById('event-edit-cover-upload')?.click()}
                                onKeyDown={(ev) => {
                                    if (!imagePreview && (ev.key === 'Enter' || ev.key === ' ')) {
                                        ev.preventDefault();
                                        document.getElementById('event-edit-cover-upload')?.click();
                                    }
                                }}
                                role={imagePreview ? undefined : 'button'}
                                tabIndex={imagePreview ? undefined : 0}
                            >
                                {imagePreview ? (
                                    <>
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            style={{
                                                position: 'absolute', top: '1rem', right: '1rem',
                                                background: 'rgba(0,0,0,0.5)', color: 'white',
                                                border: 'none', borderRadius: '50%',
                                                width: '32px', height: '32px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            Cliquez ou glissez une image ici
                                        </p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PNG, JPG (max 5Mo)</p>
                                    </>
                                )}
                                <input
                                    id="event-edit-cover-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>
                            {imageUploading && (
                                <p style={{ color: 'var(--primary-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    Import en cours…
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description *</label>
                            <textarea
                                className="form-textarea"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={6}
                                required
                                placeholder="Détails, programme, public visé…"
                            />
                        </div>

                        <div className="grid grid--2" style={{ gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Date et heure de début *</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={startDate}
                                    min={startInputMin}
                                    onChange={handleStartDateChange}
                                    required
                                />
                                <p className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    À partir de demain (sauf brouillon déjà planifié avant cette règle).
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date et heure de fin *</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={endDate}
                                    min={endInputMin}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                                <p className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    Au moins 1 h 30 après le début.
                                </p>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Lieu *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={locationText}
                                onChange={(e) => setLocationText(e.target.value)}
                                placeholder="Adresse ou ville"
                                required
                            />
                        </div>

                        <div className="grid grid--2" style={{ gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Capacité (places) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Catégorie *</label>
                                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
                                    <option value="">Sélectionner une catégorie</option>
                                    {categories.map((c) => (
                                        <option key={c._id} value={c._id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Niveau *</label>
                            <select className="form-select" value={level} onChange={(e) => setLevel(e.target.value)} required>
                                <option value="">Sélectionner un niveau</option>
                                {levels.map((l) => (
                                    <option key={l._id} value={l._id}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" className="btn btn--outline" onClick={() => navigate('/compte#panier')}>
                                Annuler
                            </button>
                            <button type="submit" className="btn btn--primary" disabled={isSubmitting || imageUploading || imageCheckStatus === 'checking' || imageCheckStatus === 'blocked'}>
                                {isSubmitting ? 'Envoi…' : 'Soumettre pour validation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
