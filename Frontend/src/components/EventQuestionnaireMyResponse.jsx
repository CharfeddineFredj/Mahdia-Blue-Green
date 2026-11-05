import { useEffect, useState } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { eventQuestionnaireService } from '../services';
import { formatAnswerValue, formatDateTime } from '../utils/eventQuestionnaireRules';

/**
 * Réponses du participant à un questionnaire d'événement : lecture seule, une réponse est définitive.
 */
export default function EventQuestionnaireMyResponse({ eventId }) {
    const [state, setState] = useState({ loading: true, error: '', data: null });

    useEffect(() => {
        let cancelled = false;
        eventQuestionnaireService.getMyResponse(eventId)
            .then((res) => { if (!cancelled) setState({ loading: false, error: '', data: res.data }); })
            .catch((err) => { if (!cancelled) setState({ loading: false, error: err.message || 'Erreur de chargement', data: null }); });
        return () => { cancelled = true; };
    }, [eventId]);

    if (state.loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }
    if (state.error) {
        return <p style={{ color: 'var(--color-error, #e53e3e)', margin: 0 }}>{state.error}</p>;
    }

    const { answers = [], submittedAt } = state.data || {};

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
                    <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />
                    Envoyé le {formatDateTime(submittedAt)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Lock size={13} aria-hidden="true" />
                    Réponse définitive — elle ne peut plus être modifiée.
                </span>
            </div>

            {answers.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Aucune réponse aux questions facultatives.</p>
            ) : (
                <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
                    {answers.map((a) => (
                        <div
                            key={a.questionId}
                            style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)' }}
                        >
                            <dt style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{a.questionText}</dt>
                            <dd style={{ margin: 0, fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {formatAnswerValue(a.value, a.questionType)}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}

            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Seuls vous, l&apos;organisateur et les administrateurs autorisés pouvez consulter ces réponses.
            </p>
        </div>
    );
}
