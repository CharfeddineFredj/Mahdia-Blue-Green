import { useState } from 'react';
import { StarIcon } from './Icons';

/**
 * Formulaire de réponse d'un participant (rendu aligné sur QuestionnaireFill).
 * onSubmit reçoit [{ questionId, value }].
 * initialAnswers ([{ questionId, value }]) pré-remplit le formulaire pour modifier une réponse déjà envoyée.
 */
export default function EventQuestionnaireAnswerForm({ questionnaire, onSubmit, submitting = false, initialAnswers = null, submitLabel = 'Envoyer mes réponses' }) {
    const [answers, setAnswers] = useState(() => Object.fromEntries(
        (initialAnswers || []).map((a) => [String(a.questionId), a.value])
    ));
    const [error, setError] = useState('');

    const setAnswer = (qid, v) => setAnswers((prev) => ({ ...prev, [qid]: v }));
    const toggleOption = (qid, option, checked) => {
        setAnswers((prev) => {
            const current = Array.isArray(prev[qid]) ? prev[qid] : [];
            return { ...prev, [qid]: checked ? [...current, option] : current.filter((o) => o !== option) };
        });
    };

    const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        const missing = (questionnaire.questions || []).find((q) => q.isRequired && isEmpty(answers[q._id]));
        if (missing) {
            setError(`La question « ${missing.text} » est obligatoire.`);
            return;
        }
        setError('');
        const payload = (questionnaire.questions || [])
            .filter((q) => !isEmpty(answers[q._id]))
            .map((q) => ({ questionId: q._id, value: answers[q._id] }));
        onSubmit(payload);
    };

    const renderInput = (q) => {
        const qid = q._id;
        switch (q.type) {
            case 'text':
                return (
                    <input type="text" className="form-input" maxLength={500} placeholder="Votre réponse" value={answers[qid] ?? ''} onChange={(e) => setAnswer(qid, e.target.value)} />
                );
            case 'long_text':
                return (
                    <textarea className="form-textarea" rows={5} maxLength={5000} placeholder="Votre réponse détaillée" value={answers[qid] ?? ''} onChange={(e) => setAnswer(qid, e.target.value)} />
                );
            case 'date':
                return (
                    <input type="date" className="form-input" value={answers[qid] ?? ''} onChange={(e) => setAnswer(qid, e.target.value)} />
                );
            case 'rating':
                return (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="form-radio" style={{ flexDirection: 'column', textAlign: 'center' }}>
                                <input type="radio" name={`r-${qid}`} checked={answers[qid] === n} onChange={() => setAnswer(qid, n)} />
                                <span style={{ display: 'flex', gap: '2px', color: 'var(--accent)' }}>
                                    {Array.from({ length: n }, (_, i) => <StarIcon key={i} size={18} />)}
                                </span>
                            </label>
                        ))}
                    </div>
                );
            case 'single_choice':
                return (
                    <div>
                        {(q.options || []).map((option) => (
                            <label key={option} className="form-radio" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                <input type="radio" name={`s-${qid}`} checked={answers[qid] === option} onChange={() => setAnswer(qid, option)} />
                                {option}
                            </label>
                        ))}
                    </div>
                );
            case 'multiple_choice':
                return (
                    <div>
                        {(q.options || []).map((option) => (
                            <label key={option} className="form-checkbox" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={(answers[qid] || []).includes(option)}
                                    onChange={(e) => toggleOption(qid, option, e.target.checked)}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );
            case 'boolean':
                return (
                    <div role="group" aria-label="Réponse oui ou non" style={{ display: 'flex', gap: '1.25rem' }}>
                        <label className="form-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="radio" name={`b-${qid}`} checked={answers[qid] === true} onChange={() => setAnswer(qid, true)} />
                            Oui
                        </label>
                        <label className="form-radio" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="radio" name={`b-${qid}`} checked={answers[qid] === false} onChange={() => setAnswer(qid, false)} />
                            Non
                        </label>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {questionnaire.description && (
                <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>{questionnaire.description}</p>
            )}
            {(questionnaire.questions || []).map((q) => (
                <div key={q._id} className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className={`form-label ${q.isRequired ? 'form-label--required' : ''}`}>
                        {q.text}{q.isRequired ? ' *' : ''}
                    </label>
                    {renderInput(q)}
                </div>
            ))}
            {error && (
                <p style={{ color: 'var(--color-error, #e53e3e)', fontSize: '0.85rem' }}>{error}</p>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Vos réponses sont confidentielles : seuls l&apos;organisateur et les administrateurs autorisés peuvent les consulter.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                    {submitting ? 'Envoi…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
