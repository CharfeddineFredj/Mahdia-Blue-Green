import { useEffect, useRef, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { eventQuestionnaireService } from '../services';
import EventQuestionnaireBuilder from './EventQuestionnaireBuilder';
import EventQuestionnaireResponses from './EventQuestionnaireResponses';
import {
    QUESTIONNAIRE_GRACE_HOURS,
    REVIEW_STATUS_META,
    fromVersion,
    formatDateTime,
    getQuestionnaireDeadline,
    getDisplayOpening,
    isQuestionnaireWindowOpen,
    isEventEnded,
    EVENT_ENDED_MESSAGE,
    toQuestionnairePayload,
    validateQuestionnaireDraft,
    validateSchedule,
} from '../utils/eventQuestionnaireRules';

/**
 * Gestion du questionnaire d'un événement par son créateur (Panier Pro) :
 * statut de validation, délai de 72 h, édition (soumise à validation) et consultation des réponses.
 */
export default function EventQuestionnaireManager({ event, onChanged, onToast }) {
    const [loading, setLoading] = useState(true);
    const [questionnaire, setQuestionnaire] = useState(null);
    const [canSubmit, setCanSubmit] = useState(false);
    const [ended, setEnded] = useState(false);
    const [locked, setLocked] = useState(false);
    const [deadline, setDeadline] = useState(null);
    const [draft, setDraft] = useState(fromVersion(null));
    const [tab, setTab] = useState('edit');
    const [saving, setSaving] = useState(false);
    // Références stables : le parent re-rend (toasts, rechargement de liste) sans devoir relancer le chargement
    const eventDataRef = useRef(event.eventData);
    const onToastRef = useRef(onToast);
    useEffect(() => {
        eventDataRef.current = event.eventData;
        onToastRef.current = onToast;
    });

    const eventId = event._id;
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        eventQuestionnaireService.getForEvent(eventId)
            .then((res) => {
                if (cancelled) return;
                const q = res.data || null;
                setQuestionnaire(q);
                setCanSubmit(!!res.canSubmit);
                setLocked(!!(res.locked ?? q?.approvedVersion));
                setEnded(res.ended ?? isEventEnded(eventDataRef.current));
                setDeadline(res.deadline || getQuestionnaireDeadline(eventDataRef.current));
                setDraft(fromVersion(q?.pendingVersion || q?.approvedVersion || null));
            })
            .catch((err) => {
                if (cancelled) return;
                // Repli sur le calcul local si l'API est indisponible (le backend reste l'autorité)
                setEnded(isEventEnded(eventDataRef.current));
                setCanSubmit(false);
                setDeadline(getQuestionnaireDeadline(eventDataRef.current));
                onToastRef.current?.(err.message || 'Erreur de chargement du questionnaire', 'error');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [eventId]);

    const handleSubmit = async () => {
        const err = validateQuestionnaireDraft(draft)
            || validateSchedule(draft, event.eventData?.endDate || event.eventData?.startDate);
        if (err) {
            onToast?.(err, 'error');
            return;
        }
        if (questionnaire && isEventEnded(event.eventData)) {
            onToast?.(EVENT_ENDED_MESSAGE, 'error');
            setCanSubmit(false);
            return;
        }
        if (!isQuestionnaireWindowOpen(event.eventData)) {
            onToast?.(`Le délai de ${QUESTIONNAIRE_GRACE_HOURS} h après la fin de l'événement est dépassé.`, 'error');
            setCanSubmit(false);
            return;
        }
        setSaving(true);
        try {
            const payload = toQuestionnairePayload(draft);
            const res = questionnaire
                ? await eventQuestionnaireService.update(event._id, payload)
                : await eventQuestionnaireService.create(event._id, payload);
            setQuestionnaire(res.data);
            setDraft(fromVersion(res.data?.pendingVersion || res.data?.approvedVersion));
            onToast?.(res.message || 'Questionnaire soumis à validation', 'success');
            onChanged?.();
        } catch (e) {
            onToast?.(e.message || 'Erreur lors de l’envoi du questionnaire', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    const meta = questionnaire ? REVIEW_STATUS_META[questionnaire.reviewStatus] : null;
    const responseCount = questionnaire?.responseCount || 0;

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Statut */}
            <div style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '1px solid var(--border-color)', display: 'grid', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {meta ? (
                        <span className={`badge badge--${meta.badge}`}>{meta.label}</span>
                    ) : (
                        <span className="badge badge--gray">Aucun questionnaire</span>
                    )}
                    {questionnaire?.approvedVersion && (
                        <span className="badge badge--green">
                            <CheckCircle size={12} style={{ marginRight: '0.25rem' }} />
                            En ligne : « {questionnaire.approvedVersion.title} »
                        </span>
                    )}
                </div>
                {questionnaire?.reviewStatus === 'pending' && questionnaire?.approvedVersion && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Votre modification est en cours de validation. Les participants voient toujours la dernière version approuvée.
                    </p>
                )}
                {questionnaire?.reviewStatus === 'rejected' && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-error, #e53e3e)' }}>
                        <AlertTriangle size={13} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
                        Refusé par un administrateur{questionnaire.rejectionReason ? ` : ${questionnaire.rejectionReason}` : ' (aucun motif précisé)'}.
                        {canSubmit ? ' Corrigez puis soumettez à nouveau.' : ''}
                    </p>
                )}
                {questionnaire && (() => {
                    const displayAt = getDisplayOpening(eventDataRef.current, questionnaire.approvedVersion || questionnaire.pendingVersion);
                    if (!displayAt || displayAt.getTime() <= Date.now()) return null;
                    return (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {questionnaire.approvedVersion
                                ? `Affiché aux inscrits le ${formatDateTime(displayAt)}.`
                                : `Après validation par un administrateur, affiché aux inscrits le ${formatDateTime(displayAt)}.`}
                        </p>
                    );
                })()}
                {canSubmit && !locked && questionnaire?.approvedVersion && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Aucune réponse reçue pour le moment : toute modification sera soumise à la validation d’un administrateur.
                    </p>
                )}
                <p style={{ margin: 0, fontSize: '0.8rem', color: canSubmit || locked ? 'var(--text-muted)' : 'var(--color-error, #e53e3e)' }}>
                    <Clock size={13} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
                    {locked
                        ? 'Des participants ont déjà répondu : le questionnaire n’est plus modifiable.'
                        : canSubmit
                        ? (ended
                            ? `Événement terminé : vous pouvez encore créer le questionnaire jusqu'au ${formatDateTime(deadline)} (${QUESTIONNAIRE_GRACE_HOURS} h après la fin). Il ne sera plus modifiable ensuite.`
                            : 'Création et modification possibles jusqu’à la fin de l’événement.')
                        : ended && questionnaire
                            ? EVENT_ENDED_MESSAGE
                            : `Délai dépassé depuis le ${formatDateTime(deadline)} : la création du questionnaire n’est plus possible.`}
                </p>
            </div>

            {questionnaire && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className={`btn btn--sm ${tab === 'edit' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setTab('edit')}>
                        Questionnaire
                    </button>
                    <button type="button" className={`btn btn--sm ${tab === 'responses' ? 'btn--primary' : 'btn--outline'}`} onClick={() => setTab('responses')}>
                        Réponses ({responseCount})
                    </button>
                </div>
            )}

            {tab === 'responses' && questionnaire ? (
                <EventQuestionnaireResponses eventId={event._id} />
            ) : canSubmit && !locked ? (
                <>
                    <EventQuestionnaireBuilder value={draft} onChange={setDraft} disabled={saving} eventEnd={event.eventData?.endDate || event.eventData?.startDate || null} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn--primary" disabled={saving} onClick={handleSubmit}>
                            {saving ? 'Envoi…' : 'Soumettre pour validation'}
                        </button>
                    </div>
                </>
            ) : questionnaire ? (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                    <strong>{draft.title}</strong>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)' }}>
                        {draft.questions.map((q, i) => <li key={q._id || i}>{q.text}{q.isRequired ? ' *' : ''}</li>)}
                    </ol>
                </div>
            ) : null}
        </div>
    );
}
