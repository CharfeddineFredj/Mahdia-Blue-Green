import { Plus, Trash2, ArrowUp, ArrowDown, CalendarClock, Clock } from 'lucide-react';
import {
    EVENT_QUESTION_TYPES, LEGACY_QUESTION_TYPES, CHOICE_TYPES, emptyQuestion,
    PUBLISH_MODES, RESPONSE_WINDOW_MAX_HOURS, RESPONSE_WINDOW_PRESETS,
    clampWindowHours, getResponseDeadline, formatDateTime,
    getOpeningBounds, getEffectiveOpening, toDateTimeLocal, validateSchedule,
} from '../utils/eventQuestionnaireRules';

/**
 * Éditeur contrôlé d'un questionnaire d'événement :
 * { title, description, questions[], publishMode, responseWindowHours }.
 * `eventEnd` (date de fin de l'événement) sert à afficher la date limite calculée.
 * `fixedPublishMode` : mode imposé (ex. « before » à la création de l'événement) ; le choix n'est plus proposé.
 */
export default function EventQuestionnaireBuilder({ value, onChange, disabled = false, eventEnd = null, fixedPublishMode = null }) {
    const questions = value.questions || [];
    const publishMode = fixedPublishMode ?? (value.publishMode === 'before' ? 'before' : 'after_end');
    const hours = clampWindowHours(value.responseWindowHours ?? RESPONSE_WINDOW_MAX_HOURS);
    const deadline = getResponseDeadline(eventEnd, hours);
    const endDate = eventEnd && !Number.isNaN(new Date(eventEnd).getTime()) ? new Date(eventEnd) : null;
    const bounds = getOpeningBounds(eventEnd);
    const opening = getEffectiveOpening(eventEnd, value.opensAt);
    const scheduleError = validateSchedule({ ...value, publishMode, responseWindowHours: hours }, eventEnd);

    const set = (patch) => onChange({ ...value, ...patch });
    const setQuestion = (index, patch) => {
        set({ questions: questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) });
    };
    const removeQuestion = (index) => set({ questions: questions.filter((_, i) => i !== index) });
    const moveQuestion = (index, dir) => {
        const target = index + dir;
        if (target < 0 || target >= questions.length) return;
        const next = questions.slice();
        [next[index], next[target]] = [next[target], next[index]];
        set({ questions: next });
    };

    const changeType = (index, type) => {
        const q = questions[index];
        const options = CHOICE_TYPES.includes(type)
            ? (q.options?.length ? q.options : ['', ''])
            : [];
        setQuestion(index, { type, options });
    };

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Titre du questionnaire *</label>
                <input
                    type="text"
                    className="form-input"
                    value={value.title}
                    maxLength={200}
                    disabled={disabled}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder="Ex. Votre avis sur l'atelier"
                />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                    className="form-textarea"
                    rows={2}
                    maxLength={2000}
                    value={value.description}
                    disabled={disabled}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder="Objectif du questionnaire (facultatif)"
                />
            </div>

            <fieldset className="eqb-schedule" disabled={disabled}>
                <legend className="eqb-schedule__title"><CalendarClock size={16} /> Publication et date limite</legend>
                {!fixedPublishMode && (
                    <div className="eqb-schedule__modes" role="radiogroup" aria-label="Moment de publication">
                        {PUBLISH_MODES.map((m) => (
                            <label key={m.value} className={`eqb-mode${publishMode === m.value ? ' is-active' : ''}`}>
                                <input
                                    type="radio"
                                    name="eq-publish-mode"
                                    value={m.value}
                                    checked={publishMode === m.value}
                                    onChange={() => set({ publishMode: m.value })}
                                />
                                <span className="eqb-mode__label">{m.label}</span>
                                <span className="eqb-mode__hint">{m.hint}</span>
                            </label>
                        ))}
                    </div>
                )}

                {publishMode === 'after_end' && (
                    <div className="eqb-schedule__window">
                        <label className="form-label" htmlFor="eq-opens-at" style={{ marginBottom: '0.35rem' }}>
                            <CalendarClock size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
                            Ouverture du questionnaire (date et heure)
                        </label>
                        <div className="eqb-schedule__row">
                            <input
                                id="eq-opens-at"
                                type="datetime-local"
                                className="form-input"
                                style={{ maxWidth: '240px' }}
                                value={value.opensAt || ''}
                                min={bounds ? toDateTimeLocal(bounds.min) : undefined}
                                max={bounds ? toDateTimeLocal(bounds.max) : undefined}
                                disabled={!bounds}
                                onChange={(e) => set({ opensAt: e.target.value })}
                            />
                            {value.opensAt && (
                                <button type="button" className="eqb-preset" onClick={() => set({ opensAt: '' })}>
                                    Dès la fin de l’événement
                                </button>
                            )}
                        </div>
                        <span className="eqb-hours" style={{ marginTop: '0.35rem' }}>
                            {bounds
                                ? `Entre le ${formatDateTime(bounds.min)} et le ${formatDateTime(bounds.max)} (72 h max après la fin). Vide = ouverture à la fin.`
                                : 'Renseignez d’abord la date de fin de l’événement.'}
                        </span>
                    </div>
                )}

                <div className="eqb-schedule__window">
                    <label className="form-label" htmlFor="eq-window-hours" style={{ marginBottom: '0.35rem' }}>
                        <Clock size={14} style={{ verticalAlign: '-2px', marginRight: '0.3rem' }} />
                        Durée pour répondre après la fin de l’événement
                    </label>
                    <div className="eqb-schedule__row">
                        <div className="eqb-presets">
                            {RESPONSE_WINDOW_PRESETS.map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    className={`eqb-preset${hours === h ? ' is-active' : ''}`}
                                    onClick={() => set({ responseWindowHours: h })}
                                >
                                    {h} h
                                </button>
                            ))}
                        </div>
                        <div className="eqb-hours">
                            <input
                                id="eq-window-hours"
                                type="number"
                                className="form-input"
                                min={1}
                                max={RESPONSE_WINDOW_MAX_HOURS}
                                step={1}
                                value={value.responseWindowHours ?? RESPONSE_WINDOW_MAX_HOURS}
                                onChange={(e) => set({ responseWindowHours: e.target.value === '' ? '' : Number(e.target.value) })}
                                onBlur={() => set({ responseWindowHours: hours })}
                            />
                            <span>heures (max. {RESPONSE_WINDOW_MAX_HOURS} h)</span>
                        </div>
                    </div>
                </div>

                <p className="eqb-schedule__summary">
                    {endDate ? (
                        <>
                            {publishMode === 'before'
                                ? <>Ouvert aux inscrits <strong>dès la validation</strong> par un administrateur</>
                                : <>Ouverture automatique le <strong>{formatDateTime(opening)}</strong>{value.opensAt ? '' : ' (fin de l’événement)'}</>}
                            {' · '}Date limite de réponse : <strong>{formatDateTime(deadline)}</strong>
                        </>
                    ) : (
                        <>La date limite sera calculée à partir de la date de fin de l’événement (fin + {hours} h).</>
                    )}
                </p>
                {scheduleError && (
                    <p className="eqb-schedule__error" role="alert">{scheduleError}</p>
                )}
            </fieldset>

            {questions.map((q, index) => (
                <div
                    key={q._id || `new-${index}`}
                    style={{
                        padding: '1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-base)',
                        display: 'grid',
                        gap: '0.75rem',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>Question {index + 1}</strong>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button type="button" className="btn btn--ghost btn--sm" title="Monter" disabled={disabled || index === 0} onClick={() => moveQuestion(index, -1)}>
                                <ArrowUp size={14} />
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" title="Descendre" disabled={disabled || index === questions.length - 1} onClick={() => moveQuestion(index, 1)}>
                                <ArrowDown size={14} />
                            </button>
                            <button type="button" className="btn btn--ghost btn--sm" title="Supprimer la question" disabled={disabled || questions.length <= 1} onClick={() => removeQuestion(index)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        className="form-input"
                        value={q.text}
                        maxLength={500}
                        disabled={disabled}
                        onChange={(e) => setQuestion(index, { text: e.target.value })}
                        placeholder="Libellé de la question"
                    />

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            className="form-select"
                            style={{ maxWidth: '220px' }}
                            value={q.type}
                            disabled={disabled}
                            onChange={(e) => changeType(index, e.target.value)}
                        >
                            {[...EVENT_QUESTION_TYPES, ...LEGACY_QUESTION_TYPES.filter((t) => t.value === q.type)].map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <label className="form-checkbox" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                                type="checkbox"
                                checked={!!q.isRequired}
                                disabled={disabled}
                                onChange={(e) => setQuestion(index, { isRequired: e.target.checked })}
                            />
                            Obligatoire
                        </label>
                    </div>

                    {CHOICE_TYPES.includes(q.type) && (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(q.options || []).map((opt, oi) => (
                                <div key={oi} style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={opt}
                                        maxLength={200}
                                        disabled={disabled}
                                        placeholder={`Option ${oi + 1}`}
                                        onChange={(e) => setQuestion(index, {
                                            options: q.options.map((o, j) => (j === oi ? e.target.value : o)),
                                        })}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--sm"
                                        title="Retirer l'option"
                                        disabled={disabled || q.options.length <= 2}
                                        onClick={() => setQuestion(index, { options: q.options.filter((_, j) => j !== oi) })}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                style={{ justifySelf: 'start' }}
                                disabled={disabled || (q.options || []).length >= 20}
                                onClick={() => setQuestion(index, { options: [...(q.options || []), ''] })}
                            >
                                <Plus size={14} style={{ marginRight: '0.25rem' }} /> Ajouter une option
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                className="btn btn--outline btn--sm"
                style={{ justifySelf: 'start' }}
                disabled={disabled || questions.length >= 50}
                onClick={() => set({ questions: [...questions, emptyQuestion()] })}
            >
                <Plus size={14} style={{ marginRight: '0.25rem' }} /> Ajouter une question
            </button>
        </div>
    );
}
