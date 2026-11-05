import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SafeHtml from '../components/SafeHtml';
import { Toast, Modal } from '../components/UI';
import EventQuestionnaireAnswerForm from '../components/EventQuestionnaireAnswerForm';
import { availabilityLabel, isAwaitingAnswer, isNotYetOpen, formatDateTime, EVENT_QUESTIONNAIRES_CHANGED } from '../utils/eventQuestionnaireRules';
import { CalendarIcon, ClockIcon, LocationIcon, UsersIcon } from '../components/Icons';
import { postsService, authService, eventQuestionnaireService } from '../services';

const PriceIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
);

const UserIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const CategoryIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
);

const LevelIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

/** Téléphone et adresse texte depuis le document utilisateur (profil / compte). */
function phoneAndAddressFromProfile(userDoc) {
    if (!userDoc) return { phone: '', address: '' };
    const pi = userDoc.personalInfo;
    const phone = String(pi?.phone ?? userDoc.phone ?? '').trim();
    const addr = pi?.address;
    let address = '';
    if (typeof addr === 'string') {
        address = addr.trim();
    } else if (addr && typeof addr === 'object') {
        const parts = [addr.street, addr.city, addr.state, addr.zipCode, addr.country].filter(Boolean);
        address = parts.join(', ').trim();
    }
    return { phone, address };
}

export default function Event() {
    const { idOrSlug } = useParams();
    const navigate = useNavigate();
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [event, setEvent] = useState(null);
    const [registering, setRegistering] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [participantQuestionnaire, setParticipantQuestionnaire] = useState(null);
    const [answerOpen, setAnswerOpen] = useState(false);
    const [answerSubmitting, setAnswerSubmitting] = useState(false);

    // Réponse sur place (une seule fois, non modifiable), puis redirection vers « Questionnaires de mes événements »
    const handleSubmitAnswers = async (answers) => {
        if (!event) return;
        setAnswerSubmitting(true);
        try {
            const res = await eventQuestionnaireService.submitResponse(event._id, answers);
            setAnswerOpen(false);
            setParticipantQuestionnaire((q) => (q ? { ...q, hasResponded: true } : q));
            window.dispatchEvent(new Event(EVENT_QUESTIONNAIRES_CHANGED));
            setToast({ show: true, message: res.message || 'Merci ! Vos réponses ont été enregistrées.', type: 'success' });
            setTimeout(() => navigate('/compte#mes-questionnaires'), 1300);
        } catch (err) {
            setToast({ show: true, message: err.message || 'Erreur lors de l’envoi des réponses', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        } finally {
            setAnswerSubmitting(false);
        }
    };

    const currentUser = authService.getCurrentUser();
    const currentUserId = currentUser?.user?._id || currentUser?.user?.id || currentUser?._id || currentUser?.id || '';

    useEffect(() => {
        const load = async () => {
            try {
                const res = await postsService.getByIdOrSlug(idOrSlug);
                if (res.success) {
                    const data = res.data;
                    setEvent(data);
                    const num = data?.eventNumber;
                    if (data?.type === 'event' && num != null && String(idOrSlug) !== String(num)) {
                        navigate(`/evenement/${num}`, { replace: true });
                    }
                    const regUsers = data?.eventData?.registeredUsers || [];
                    if (currentUserId) {
                        const alreadyReg = regUsers.some((u) => {
                            const uid = typeof u === 'string' ? u : u?._id || u?.id;
                            return uid === currentUserId;
                        });
                        setIsRegistered(alreadyReg);
                    }
                }
            } catch (e) {
                console.error('Error loading event:', e);
            }
        };
        load();
    }, [idOrSlug, currentUserId, navigate]);

    // Questionnaire de l'organisateur : uniquement pour les participants inscrits (l'API applique la même règle)
    const loadedEventId = event?._id;
    useEffect(() => {
        if (!loadedEventId || !isRegistered) {
            setParticipantQuestionnaire(null);
            return undefined;
        }
        let cancelled = false;
        eventQuestionnaireService.getForEvent(loadedEventId)
            .then((res) => {
                // « Après la fin de l'événement » : rien n'est affiché aux inscrits avant l'ouverture
                if (!cancelled) setParticipantQuestionnaire(res.role === 'participant' && !isNotYetOpen(res.data) ? res.data : null);
            })
            .catch(() => { if (!cancelled) setParticipantQuestionnaire(null); });
        return () => { cancelled = true; };
    }, [loadedEventId, isRegistered]);

    const d = event?.eventData;
    const remaining = d?.capacity ? (d.capacity - (d.registeredUsers?.length || 0)) : 0;
    const startDate = d?.startDate ? new Date(d.startDate) : null;
    const endDate = d?.endDate ? new Date(d.endDate) : startDate;
    const isPastEvent = startDate ? startDate < new Date() : false;

    const authorId = event?.author?._id || event?.author?.id || event?.author || '';
    const isOwner = currentUserId && authorId && String(currentUserId) === String(authorId);
    const isLoggedIn = authService.isAuthenticated();

    const handleRegister = async () => {
        if (!isLoggedIn) {
            // Page de connexion, puis retour sur cet événement pour finaliser l'inscription
            const back = `/evenement/${event?.eventNumber ?? idOrSlug}`;
            navigate(`/auth?redirect=${encodeURIComponent(back)}`);
            return;
        }
        setRegistering(true);
        try {
            const profileRes = await authService.getProfile();
            const userDoc = profileRes?.data ?? profileRes?.user;
            const { phone, address } = phoneAndAddressFromProfile(userDoc);
            if (!phone || !address) {
                setToast({
                    show: true,
                    message:
                        'Ajoutez votre téléphone et votre adresse dans votre compte (profil) avant de vous inscrire.',
                    type: 'error',
                });
                return;
            }
            await postsService.registerForEvent(event._id, { phone, address });
            setIsRegistered(true);
            setToast({ show: true, message: 'Inscription confirmée !', type: 'success' });
            const res = await postsService.getByIdOrSlug(event._id);
            if (res.success) setEvent(res.data);
        } catch (err) {
            setToast({ show: true, message: err.message || "Erreur lors de l'inscription", type: 'error' });
        } finally {
            setRegistering(false);
        }
    };

    const handleUnregister = async () => {
        setRegistering(true);
        try {
            await postsService.unregisterFromEvent(event._id);
            setIsRegistered(false);
            setToast({ show: true, message: 'Désinscription effectuée.', type: 'success' });
            const res = await postsService.getByIdOrSlug(event._id);
            if (res.success) setEvent(res.data);
        } catch (err) {
            setToast({ show: true, message: err.message || 'Erreur lors de la désinscription', type: 'error' });
        } finally {
            setRegistering(false);
        }
    };

    if (!event) {
        return (
            <section className="section">
                <div className="container container--narrow" style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Chargement de l&apos;événement...</p>
                </div>
            </section>
        );
    }

    const infoItems = [
        startDate && { icon: <CalendarIcon size={20} />, label: 'Date de début', value: startDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
        endDate && endDate.getTime() !== startDate?.getTime() && { icon: <CalendarIcon size={20} />, label: 'Date de fin', value: endDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
        startDate && { icon: <ClockIcon size={20} />, label: 'Horaire', value: `${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${endDate && endDate.getTime() !== startDate.getTime() ? ` — ${endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}` },
        d?.location && { icon: <LocationIcon size={20} />, label: 'Lieu', value: d.location },
        { icon: <UsersIcon size={20} />, label: 'Places restantes', value: `${remaining} / ${d?.capacity || '∞'}` },
        { icon: <PriceIcon size={20} />, label: 'Prix', value: 'Gratuit' },
        event.author?.username && { icon: <UserIcon size={20} />, label: 'Organisateur', value: event.author.username },
        event.category?.title && { icon: <CategoryIcon size={20} />, label: 'Catégorie', value: event.category.title },
        event.level?.name && { icon: <LevelIcon size={20} />, label: 'Niveau', value: `${event.level.name}${event.level.level != null ? ` (${event.level.level})` : ''}` },
    ].filter(Boolean);

    return (
        <>
            {/* Hero banner */}
            <div style={{
                width: '100%',
                height: '380px',
                position: 'relative',
                overflow: 'hidden',
                background: d?.eventImage
                    ? `url(${d.eventImage}) center/cover no-repeat`
                    : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary, #6366f1))',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                }} />
                <div className="container" style={{
                    position: 'relative', height: '100%',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    paddingBottom: '2.5rem',
                }}>
                    <nav aria-label="Fil d'Ariane" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                        <Link to="/" style={{ color: 'rgba(255,255,255,0.8)' }}>Accueil</Link>
                        {' / '}
                        <Link to="/evenements" style={{ color: 'rgba(255,255,255,0.8)' }}>Événements</Link>
                        {' / '}
                        <span style={{ color: '#fff' }}>{event.title}</span>
                    </nav>
                    <h1 style={{ color: '#fff', fontSize: '2.25rem', margin: 0, lineHeight: 1.2 }}>{event.title}</h1>
                    {event.author?.username && (
                        <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                            Proposé par <strong style={{ color: '#fff' }}>{event.author.username}</strong>
                            {event.createdAt && (
                                <> le {new Date(event.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                            )}
                        </p>
                    )}
                </div>
            </div>

            <section className="section" style={{ paddingTop: '2.5rem' }}>
                <div className="container" style={{ maxWidth: '1100px' }}>

                    {/* Info grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2.5rem',
                    }}>
                        {infoItems.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.25rem 1.5rem',
                                background: 'var(--bg-surface, var(--bg-section))',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                            }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '10px',
                                    background: 'var(--color-primary-light, rgba(99,102,241,0.1))',
                                    color: 'var(--color-primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    {item.icon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600, fontSize: '0.7rem',
                                        color: 'var(--text-muted)',
                                        textTransform: 'uppercase', letterSpacing: '0.05em',
                                        marginBottom: '0.2rem',
                                    }}>
                                        {item.label}
                                    </div>
                                    <div style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                        {item.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Description (avant le questionnaire et l'inscription) */}
                    {event.body && (
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Description</h2>
                            <div style={{
                                padding: '2rem',
                                background: 'var(--bg-surface, var(--bg-section))',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                                lineHeight: 1.8,
                                fontSize: '1rem',
                            }}>
                                <SafeHtml html={event.body} />
                            </div>
                        </div>
                    )}

                    {participantQuestionnaire && (
                        <div style={{
                            padding: '1.25rem 2rem',
                            background: 'var(--bg-surface, var(--bg-section))',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>Questionnaire de l&apos;organisateur : {participantQuestionnaire.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {participantQuestionnaire.hasResponded
                                        ? (participantQuestionnaire.availability === 'open' && participantQuestionnaire.closesAt
                                            ? `Merci, vous avez déjà répondu. Vous pouvez modifier vos réponses jusqu'au ${formatDateTime(participantQuestionnaire.closesAt)}.`
                                            : 'Merci, vous avez déjà répondu.')
                                        : 'Réservé aux participants inscrits. Vos réponses ne sont visibles que de l’organisateur et des administrateurs.'}
                                </div>
                                {!participantQuestionnaire.hasResponded && availabilityLabel(participantQuestionnaire) && (
                                    <span className={`eq-avail eq-avail--${availabilityLabel(participantQuestionnaire).tone}`} style={{ marginTop: '0.5rem' }}>
                                        {availabilityLabel(participantQuestionnaire).text}
                                    </span>
                                )}
                            </div>
                            {participantQuestionnaire.hasResponded ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <Link to="/compte#mes-questionnaires" className="btn btn--outline">Mes questionnaires</Link>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={`btn btn--primary${isAwaitingAnswer(participantQuestionnaire) ? ' btn--live' : ''}`}
                                    disabled={!!participantQuestionnaire.availability && participantQuestionnaire.availability !== 'open'}
                                    onClick={() => setAnswerOpen(true)}
                                >
                                    {participantQuestionnaire.availability === 'closed' ? 'Questionnaire clos'
                                        : participantQuestionnaire.availability === 'upcoming' ? 'Bientôt disponible' : 'Répondre'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Action / Inscription */}
                    <div style={{
                        padding: '1.5rem 2rem',
                        background: 'var(--bg-surface, var(--bg-section))',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                    }}>
                        {isPastEvent ? (
                            <div style={{ width: '100%', textAlign: 'center', padding: '0.5rem 0' }}>
                                <p style={{ fontWeight: 600, margin: 0, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Événement terminé</p>
                            </div>
                        ) : isOwner ? (
                            <div style={{ width: '100%', textAlign: 'center', padding: '0.5rem 0' }}>
                                <p style={{ fontWeight: 600, margin: 0, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                                    Vous êtes l&apos;organisateur de cet événement
                                </p>
                            </div>
                        ) : isRegistered ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '10px', height: '10px', borderRadius: '50%',
                                        background: '#22c55e', flexShrink: 0,
                                    }} />
                                    <span style={{ fontWeight: 600, fontSize: '1.05rem', color: '#16a34a' }}>
                                        Vous êtes inscrit(e) à cet événement
                                    </span>
                                </div>
                                <button
                                    className="btn btn--outline"
                                    onClick={handleUnregister}
                                    disabled={registering}
                                    style={{ color: '#dc2626', borderColor: '#dc2626' }}
                                >
                                    {registering ? 'Traitement…' : 'Se désinscrire'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                                        {remaining <= 0 ? 'Événement complet' : `${remaining} place${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        Inscrivez-vous pour participer
                                    </div>
                                </div>
                                <button
                                    className="btn btn--primary btn--lg"
                                    onClick={handleRegister}
                                    disabled={registering || remaining <= 0}
                                    style={{ minWidth: '240px' }}
                                >
                                    {registering ? 'Inscription en cours…' : remaining <= 0 ? 'Complet' : "S'inscrire à cet événement"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <Modal
                isOpen={answerOpen && !!participantQuestionnaire}
                onClose={() => { if (!answerSubmitting) setAnswerOpen(false); }}
                title={participantQuestionnaire ? participantQuestionnaire.title : 'Questionnaire'}
                contentClassName="modal__content--lg"
            >
                {participantQuestionnaire && answerOpen && (
                    <EventQuestionnaireAnswerForm
                        questionnaire={participantQuestionnaire}
                        onSubmit={handleSubmitAnswers}
                        submitting={answerSubmitting}
                        submitLabel="Envoyer mes réponses"
                    />
                )}
            </Modal>

            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </>
    );
}
