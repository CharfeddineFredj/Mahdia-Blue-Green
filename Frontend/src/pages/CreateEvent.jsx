import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Upload, X, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { authService, postsService, api } from '../services';
import { Toast } from '../components/UI';
import EventQuestionnaireBuilder from '../components/EventQuestionnaireBuilder';
import {
    emptyQuestionnaire,
    toQuestionnairePayload,
    validateQuestionnaireDraft,
    validateSchedule,
} from '../utils/eventQuestionnaireRules';
import {
    getTomorrowMidnightLocalString,
    addMinutesToDatetimeLocalString,
    validateEventSchedule,
} from '../utils/eventScheduling';

export default function CreateEvent() {
    const navigate = useNavigate();
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
    // Questionnaire facultatif : aucun / créé maintenant (publié avant l'événement) / créé après la fin (depuis le panier)
    const [questionnaireTiming, setQuestionnaireTiming] = useState('none');
    const withQuestionnaire = questionnaireTiming === 'now';
    const [questionnaire, setQuestionnaire] = useState(() => ({ ...emptyQuestionnaire(), publishMode: 'before' }));
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const imageCheckTimer = useRef(null);
    const toastHideTimerRef = useRef(null);
    const IMPORT_SUCCESS_TOAST_MS = 10_000;

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            setToast({ show: true, message: 'Veuillez vous connecter pour proposer un événement', type: 'info' });
            const t = setTimeout(() => navigate('/auth'), 1200);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [navigate]);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [catRes, lvlRes] = await Promise.all([api.get('/categories'), api.get('/levels')]);
                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);
            } catch (e) {
                console.error(e);
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
        if (!trimmed) { setImageCheckStatus(''); return; }
        if (!/^https?:\/\/.+\..+/i.test(trimmed)) { setImageCheckStatus(''); return; }

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
        if (!authService.isAuthenticated()) {
            navigate('/auth');
            return;
        }

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

        const scheduleErrors = validateEventSchedule(startDate, endDate);
        if (scheduleErrors.length) {
            setToast({ show: true, message: scheduleErrors[0], type: 'error' });
            return;
        }

        if (withQuestionnaire) {
            const qError = validateQuestionnaireDraft(questionnaire) || validateSchedule(questionnaire, endDate);
            if (qError) {
                setToast({ show: true, message: `Questionnaire : ${qError}`, type: 'error' });
                return;
            }
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        setIsSubmitting(true);
        try {
            const res = await postsService.createEvent({
                title: title.trim(),
                body: body.trim(),
                status: 'draft',
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
                ...(withQuestionnaire ? { questionnaire: toQuestionnairePayload(questionnaire) } : {}),
            });
            const qInfo = res?.questionnaire;
            const message = qInfo && !qInfo.created
                ? `Événement soumis, mais le questionnaire n’a pas pu être enregistré (${qInfo.message}). Vous pourrez l’ajouter depuis votre panier professionnel.`
                : withQuestionnaire
                    ? 'Événement et questionnaire soumis ! Ils seront publiés après validation par un administrateur. Retrouvez-les dans votre panier professionnel.'
                    : questionnaireTiming === 'later'
                        ? 'Événement soumis ! Après la fin de l’événement, créez votre questionnaire depuis votre panier professionnel (72 h maximum).'
                        : 'Événement soumis ! Il sera publié après validation par un administrateur. Retrouvez-le dans votre panier professionnel.';
            setToast({ show: true, message, type: qInfo && !qInfo.created ? 'info' : 'success' });
            setTimeout(() => navigate('/compte#panier'), 1500);
        } catch (err) {
            const msg = err.status === 403
                ? err.message || 'Le contenu de cet événement contient du langage inapproprié et a été rejeté.'
                : err.message || 'Erreur lors de la création';
            setToast({ show: true, message: msg, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
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

    const imagePreview = eventImage?.trim() ? eventImage : '';

    const tomorrowMin = getTomorrowMidnightLocalString();
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

    return (
        <section className="section section--alt">
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div className="container" style={{ maxWidth: '800px' }}>
                <button
                    type="button"
                    onClick={() => navigate('/evenements')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        border: 'none', background: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem',
                    }}
                >
                    <ArrowLeft size={16} />
                    Retour aux événements
                </button>

                <div className="content-card">
                    <div className="card-header">
                        <h1 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CalendarPlus size={28} style={{ color: 'var(--color-primary)' }} />
                            Créer un événement
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Proposez un événement. Il sera créé en brouillon et publié après validation d&apos;un administrateur.
                        </p>
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
                                onClick={() => !imagePreview && document.getElementById('event-cover-upload')?.click()}
                                onKeyDown={(ev) => {
                                    if (!imagePreview && (ev.key === 'Enter' || ev.key === ' ')) {
                                        ev.preventDefault();
                                        document.getElementById('event-cover-upload')?.click();
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
                                    id="event-cover-upload"
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
                                    min={tomorrowMin}
                                    onChange={handleStartDateChange}
                                    required
                                />
                                <p className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                    À partir de demain uniquement (passé et aujourd’hui désactivés dans le calendrier).
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

                        <fieldset className="form-group" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} disabled={isSubmitting}>
                            <legend style={{ fontWeight: 500, padding: '0 0.25rem' }}>Questionnaire (facultatif)</legend>
                            <div role="radiogroup" aria-label="Questionnaire" style={{ display: 'grid', gap: '0.5rem' }}>
                                {[
                                    { value: 'none', label: 'Pas de questionnaire', hint: 'Vous pourrez en ajouter un plus tard, jusqu’à 72 h après la fin de l’événement.' },
                                    { value: 'now', label: 'Créer le questionnaire maintenant', hint: 'Soumis avec l’événement. Il sera visible des inscrits après validation par un administrateur.' },
                                    { value: 'later', label: 'Créer après la fin de l’événement', hint: 'Vous le créerez depuis votre panier professionnel, jusqu’à 72 h après la fin. Il devra être validé par un administrateur avant publication.' },
                                ].map((opt) => (
                                    <label key={opt.value} className="form-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <input
                                            type="radio"
                                            name="questionnaire-timing"
                                            value={opt.value}
                                            checked={questionnaireTiming === opt.value}
                                            onChange={() => setQuestionnaireTiming(opt.value)}
                                        />
                                        <div>
                                            <span style={{ display: 'block', fontWeight: 500 }}>{opt.label}</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{opt.hint}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {withQuestionnaire && (
                                <div style={{ marginTop: '1rem' }}>
                                    <EventQuestionnaireBuilder value={questionnaire} onChange={setQuestionnaire} disabled={isSubmitting} eventEnd={endDate || null} fixedPublishMode="before" />
                                </div>
                            )}
                        </fieldset>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button type="button" className="btn btn--outline" onClick={() => navigate('/evenements')}>
                                Annuler
                            </button>
                            <button type="submit" className="btn btn--primary" disabled={isSubmitting || imageUploading || imageCheckStatus === 'checking' || imageCheckStatus === 'blocked'}>
                                {isSubmitting ? 'Envoi en cours…' : 'Soumettre pour validation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
