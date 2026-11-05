import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ProgressBar, Toast } from '../components/UI';
import { CheckCircleIcon, StarIcon } from '../components/Icons';
import { questionnaireService, authService } from '../services';
import { normalizeQuestionnairePayload } from '../utils/questionnaireNormalize';
import { getBlockingQuestionnaireIdsFromPendingList, useMandatorySurvey } from '../context/MandatorySurveyContext';

function formatFrDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * @param {{ id: string, variant?: 'page' | 'overlay' }} props
 */
export function QuestionnaireFillById({ id, variant = 'page' }) {
    const navigate = useNavigate();
    const { refreshMandatorySurveys } = useMandatorySurvey();
    const isOverlay = variant === 'overlay';

    const [questionnaire, setQuestionnaire] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setQuestionnaire(null);
        setLoadError(null);
        setAnswers({});
        setSubmitted(false);
        (async () => {
            try {
                const r = await questionnaireService.getById(id);
                if (cancelled) return;
                if (r.success && r.data) {
                    setQuestionnaire(normalizeQuestionnairePayload(r.data));
                    setLoadError(null);
                } else {
                    setLoadError('Questionnaire introuvable.');
                }
            } catch {
                if (!cancelled) setLoadError('Impossible de charger ce questionnaire.');
            }
        })();
        return () => { cancelled = true; };
    }, [id]);

    const totalQuestions = questionnaire?.questions?.length ?? 0;
    const answeredCount = Object.keys(answers).length;
    const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
    const canSubmit = questionnaire?.canSubmit === true;
    const isAuthed = authService.isAuthenticated();

    useEffect(() => {
        if (!questionnaire?._id) return;
        const key = `mbg_questionnaire_${questionnaire._id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                setAnswers(JSON.parse(saved));
            } catch {
                /* ignore */
            }
        }
    }, [questionnaire?._id]);

    useEffect(() => {
        if (!questionnaire?._id) return;
        const key = `mbg_questionnaire_${questionnaire._id}`;
        localStorage.setItem(key, JSON.stringify(answers));
    }, [answers, questionnaire?._id]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleChange = (questionId, value) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleMultipleChoice = (questionId, option, checked) => {
        setAnswers((prev) => {
            const current = prev[questionId] || [];
            return {
                ...prev,
                [questionId]: checked ? [...current, option] : current.filter((o) => o !== option)
            };
        });
    };

    const renderQuestion = (question) => {
        const qid = question._id;
        switch (question.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        className="form-input"
                        value={answers[qid] ?? ''}
                        onChange={(e) => handleChange(qid, e.target.value)}
                        required={question.isRequired}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        className="form-input"
                        value={answers[qid] ?? ''}
                        onChange={(e) => handleChange(qid, e.target.value)}
                        required={question.isRequired}
                    />
                );

            case 'rating':
                return (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="form-radio" style={{ flexDirection: 'column', textAlign: 'center' }}>
                                <input
                                    type="radio"
                                    name={qid}
                                    value={n}
                                    checked={answers[qid] === n}
                                    onChange={() => handleChange(qid, n)}
                                    required={question.isRequired}
                                />
                                <span style={{ display: 'flex', gap: '2px', color: 'var(--accent)' }}>
                                    {Array.from({ length: n }, (_, i) => (
                                        <StarIcon key={i} size={20} />
                                    ))}
                                </span>
                            </label>
                        ))}
                    </div>
                );

            case 'single_choice':
                return (
                    <div>
                        {(question.options || []).map((option) => (
                            <label key={option} className="form-radio" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name={qid}
                                    value={option}
                                    checked={answers[qid] === option}
                                    onChange={() => handleChange(qid, option)}
                                    required={question.isRequired}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );

            case 'multiple_choice':
                return (
                    <div>
                        {(question.options || []).map((option) => (
                            <label key={option} className="form-checkbox" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    value={option}
                                    checked={(answers[qid] || []).includes(option)}
                                    onChange={(e) => handleMultipleChoice(qid, option, e.target.checked)}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );

            case 'boolean':
                return (
                    <div
                        role="group"
                        aria-label="Réponse oui ou non"
                        style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}
                    >
                        <label className="form-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name={`bool-${qid}`}
                                checked={answers[qid] === true}
                                onChange={() => handleChange(qid, true)}
                                required={question.isRequired}
                            />
                            Oui
                        </label>
                        <label className="form-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name={`bool-${qid}`}
                                checked={answers[qid] === false}
                                onChange={() => handleChange(qid, false)}
                                required={question.isRequired}
                            />
                            Non
                        </label>
                    </div>
                );

            default:
                return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!questionnaire || !canSubmit) return;
        if (!isAuthed) {
            showToast('Connectez-vous pour soumettre vos réponses.', 'error');
            return;
        }

        for (const q of questionnaire.questions) {
            if (!q.isRequired) continue;
            const v = answers[q._id];
            if (q.type === 'boolean') {
                if (v !== true && v !== false) {
                    showToast('Veuillez répondre à toutes les questions obligatoires.', 'error');
                    return;
                }
                continue;
            }
            if (v === undefined || v === null || v === '') {
                showToast('Veuillez répondre à toutes les questions obligatoires.', 'error');
                return;
            }
            if (q.type === 'multiple_choice' && (!Array.isArray(v) || v.length === 0)) {
                showToast('Veuillez répondre à toutes les questions obligatoires.', 'error');
                return;
            }
        }

        const payload = [];
        for (const q of questionnaire.questions) {
            const raw = answers[q._id];
            if (q.type === 'boolean') {
                if (raw !== true && raw !== false) continue;
                payload.push({ question: q._id, value: raw });
                continue;
            }
            if (q.type === 'multiple_choice') {
                payload.push({ question: q._id, value: raw ?? [] });
                continue;
            }
            payload.push({ question: q._id, value: raw ?? '' });
        }

        setSubmitting(true);
        try {
            await questionnaireService.submitResponse(questionnaire._id, payload);
            localStorage.removeItem(`mbg_questionnaire_${questionnaire._id}`);

            if (isOverlay) {
                await refreshMandatorySurveys();
                try {
                    const pr = await questionnaireService.getPending();
                    const nextBlocking = getBlockingQuestionnaireIdsFromPendingList(pr.data || []);
                    if (nextBlocking.length > 0) {
                        showToast('Réponses enregistrées.', 'success');
                        return;
                    }
                } catch {
                    /* ignore */
                }
                showToast('Merci pour vos réponses !', 'success');
                return;
            }

            await refreshMandatorySurveys();
            try {
                const pr = await questionnaireService.getPending();
                const nextBlocking = getBlockingQuestionnaireIdsFromPendingList(pr.data || []);
                if (nextBlocking.length > 0) {
                    showToast('Réponses enregistrées. Enquête suivante…', 'success');
                    navigate(`/questionnaire/${nextBlocking[0]}`, { replace: true });
                    return;
                }
            } catch {
                /* on affiche quand même la page de remerciement */
            }
            setSubmitted(true);
            showToast('Merci pour vos réponses !', 'success');
        } catch (err) {
            showToast(err.message || 'Envoi impossible.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const innerClass = isOverlay ? 'mandatory-survey-fill' : 'container container--narrow';

    if (loadError) {
        return (
            <div className={innerClass}>
                <div className="text-center" style={{ padding: isOverlay ? '1rem 0' : undefined }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{loadError}</p>
                    {!isOverlay && <Link to="/questionnaire" className="btn btn--primary">Retour aux questionnaires</Link>}
                </div>
            </div>
        );
    }

    if (!questionnaire) {
        return (
            <div className={innerClass}>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Chargement…</p>
            </div>
        );
    }

    if (submitted && !isOverlay) {
        return (
            <section className="section">
                <div className="container container--narrow text-center">
                    <div style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}><CheckCircleIcon size={64} /></div>
                    <h1>Merci !</h1>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        Vos réponses ont été enregistrées. Vous pouvez à nouveau accéder à l’ensemble du site.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
                        <Link to="/" className="btn btn--primary">Retour à l’accueil</Link>
                        <Link to="/questionnaire" className="btn btn--outline">Autres questionnaires</Link>
                    </div>
                </div>
                <Toast message={toast.message} show={toast.show} type={toast.type} />
            </section>
        );
    }

    const scheduleNote = (() => {
        if (questionnaire.scheduleStatus === 'scheduled') {
            return questionnaire.opensAt
                ? `Ouverture prévue le ${formatFrDate(questionnaire.opensAt)}`
                : 'Ce questionnaire n’est pas encore ouvert.';
        }
        if (questionnaire.scheduleStatus === 'ended') {
            return questionnaire.closesAt
                ? `Clos le ${formatFrDate(questionnaire.closesAt)}`
                : 'Ce questionnaire est terminé.';
        }
        if (questionnaire.scheduleStatus === 'inactive') {
            return 'Ce questionnaire n’est plus disponible.';
        }
        return null;
    })();

    const formInner = (
        <>
            {isOverlay && (
                <div
                    role="alert"
                    style={{
                        marginBottom: '1.15rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 125, 144, 0.35)',
                        background: 'rgba(0, 125, 144, 0.08)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        lineHeight: 1.5
                    }}
                >
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Nouvelle enquête</strong>
                    Merci de répondre avant de poursuivre votre navigation. Le site reste visible en arrière-plan.
                </div>
            )}
            {!isOverlay && (
                <p style={{ marginBottom: '0.75rem' }}>
                    <Link to="/questionnaire" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>← Questionnaires</Link>
                </p>
            )}
            <h1 id="mandatory-survey-heading">{questionnaire.title}</h1>
            {questionnaire.description && (
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>{questionnaire.description}</p>
            )}

            {!canSubmit && scheduleNote && (
                <div
                    role="status"
                    style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: 'var(--bg-section)',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.95rem'
                    }}
                >
                    {scheduleNote}
                </div>
            )}

            {canSubmit && !isAuthed && (
                <div
                    style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}
                >
                    <Link to="/auth" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Connectez-vous</Link>
                    {' '}pour enregistrer vos réponses.
                </div>
            )}

            {canSubmit && questionnaire.closesAt && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Réponses acceptées jusqu’au {formatFrDate(questionnaire.closesAt)}
                </p>
            )}

            <ProgressBar percent={progress} />
            <p style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                {answeredCount} / {totalQuestions} questions
            </p>

            <form onSubmit={handleSubmit}>
                {questionnaire.questions.map((question, index) => (
                    <div key={question._id} className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className={`form-label ${question.isRequired ? 'form-label--required' : ''}`}>
                            {index + 1}. {question.text}
                        </label>
                        {renderQuestion(question)}
                    </div>
                ))}

                <button
                    type="submit"
                    className="btn btn--primary btn--lg"
                    disabled={!canSubmit || submitting}
                >
                    {submitting ? 'Envoi…' : 'Soumettre'}
                </button>
            </form>
        </>
    );

    if (isOverlay) {
        return (
            <>
                {formInner}
                <Toast message={toast.message} show={toast.show} type={toast.type} />
            </>
        );
    }

    return (
        <section className="section">
            <div className="container container--narrow">
                {formInner}
            </div>
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}

export default function QuestionnaireFill() {
    const { id } = useParams();
    if (!id) return null;
    return <QuestionnaireFillById id={id} variant="page" />;
}
