import { useEffect, useState } from 'react';
import { adminService, eventQuestionnaireService } from '../../../services';
import EventQuestionnaireResponses from '../../../components/EventQuestionnaireResponses';
import {
    REVIEW_STATUS_META,
    formatDateTime,
    getEventReviewStatus,
    getResponseDeadline,
    EVENT_QUESTION_TYPES,
    LEGACY_QUESTION_TYPES,
} from '../../../utils/eventQuestionnaireRules';

const TYPE_LABELS = Object.fromEntries([...EVENT_QUESTION_TYPES, ...LEGACY_QUESTION_TYPES].map((t) => [t.value, t.label]));

const boxStyle = { padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' };
const titleStyle = { margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' };

/** Saisie d'un motif de refus + confirmation (partagé avec AdminArticleReviewPanel) */
export function RejectForm({ label, onConfirm, busy }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    if (!open) {
        return (
            <button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={() => setOpen(true)}>
                {label}
            </button>
        );
    }
    return (
        <div style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
            <textarea
                className="form-textarea"
                rows={2}
                maxLength={1000}
                placeholder="Motif du refus (communiqué au créateur)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Annuler</button>
                <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => onConfirm(reason)}>
                    Confirmer le refus
                </button>
            </div>
        </div>
    );
}

function revisionChanges(event) {
    const rev = event.pendingRevision;
    if (!rev) return [];
    const live = event.eventData || {};
    const red = rev.eventData || {};
    const rows = [
        ['Titre', event.title, rev.title],
        ['Date début', formatDateTime(live.startDate), formatDateTime(red.startDate)],
        ['Date fin', formatDateTime(live.endDate), formatDateTime(red.endDate)],
        ['Lieu', live.location, red.location],
        ['Capacité', live.capacity, red.capacity],
        ['Image', live.eventImage, red.eventImage],
        ['Description', event.body, rev.body],
    ];
    return rows.filter(([, a, b]) => b != null && b !== '' && String(a ?? '') !== String(b));
}

/**
 * Validation administrative d'un événement proposé : refus motivé, modification en attente,
 * questionnaire associé (approbation / refus) et consultation des réponses.
 */
export default function AdminEventReviewPanel({ event, onEventChanged, onQuestionnaireChanged, showToast }) {
    const [busy, setBusy] = useState(false);
    const [questionnaire, setQuestionnaire] = useState(null);
    const [showResponses, setShowResponses] = useState(false);

    const eventId = event._id;
    useEffect(() => {
        let cancelled = false;
        eventQuestionnaireService.getForEvent(eventId)
            .then((res) => { if (!cancelled) setQuestionnaire(res.data || null); })
            .catch(() => { if (!cancelled) setQuestionnaire(null); });
        return () => { cancelled = true; };
    }, [eventId]);

    const run = async (fn, successMsg, after) => {
        setBusy(true);
        try {
            const res = await fn();
            showToast(res?.message || successMsg, 'success');
            after?.(res);
        } catch (err) {
            showToast(err.message || 'Action impossible', 'error');
        } finally {
            setBusy(false);
        }
    };

    const reviewStatus = getEventReviewStatus(event);
    const revision = event.pendingRevision;
    const changes = revisionChanges(event);
    const qMeta = questionnaire ? REVIEW_STATUS_META[questionnaire.reviewStatus] : null;
    const qPending = questionnaire?.pendingVersion;

    return (
        <>
            {/* Validation de l'événement */}
            <div style={boxStyle}>
                <h4 style={titleStyle}>Validation</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge badge--${REVIEW_STATUS_META[reviewStatus].badge}`}>{REVIEW_STATUS_META[reviewStatus].label}</span>
                    {reviewStatus === 'rejected' && event.moderation?.reason && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Motif : {event.moderation.reason}</span>
                    )}
                </div>
                {event.status !== 'published' && reviewStatus !== 'rejected' && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <RejectForm
                            label="Refuser l'événement"
                            busy={busy}
                            onConfirm={(reason) => run(() => adminService.rejectPost(event._id, reason), 'Événement refusé', onEventChanged)}
                        />
                    </div>
                )}
            </div>

            {/* Modification en attente d'un événement publié */}
            {revision && (
                <div style={boxStyle}>
                    <h4 style={titleStyle}>Modification proposée</h4>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Soumise le {formatDateTime(revision.submittedAt)} — la version publiée reste en ligne jusqu&apos;à la décision.
                        {revision.status === 'rejected' && ` Refusée${revision.rejectionReason ? ` : ${revision.rejectionReason}` : ''}.`}
                    </p>
                    {changes.length > 0 ? (
                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {changes.map(([label, before, after]) => (
                                <div key={label} style={{ fontSize: '0.85rem' }}>
                                    <strong>{label}</strong>
                                    <div style={{ color: 'var(--text-muted)', textDecoration: 'line-through', wordBreak: 'break-word' }}>{String(before ?? '—').slice(0, 300)}</div>
                                    <div style={{ wordBreak: 'break-word' }}>{String(after).slice(0, 300)}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucune différence détectée.</p>
                    )}
                    {revision.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                disabled={busy}
                                onClick={() => run(() => adminService.approveEventRevision(event._id), 'Modification approuvée', onEventChanged)}
                            >
                                Approuver la modification
                            </button>
                            <RejectForm
                                label="Refuser la modification"
                                busy={busy}
                                onConfirm={(reason) => run(() => adminService.rejectEventRevision(event._id, reason), 'Modification refusée', onEventChanged)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Questionnaire associé */}
            <div style={boxStyle}>
                <h4 style={titleStyle}>Questionnaire</h4>
                {!questionnaire ? (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucun questionnaire pour cet événement.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className={`badge badge--${qMeta.badge}`}>{qMeta.label}</span>
                            {questionnaire.approvedVersion && (
                                <span className="badge badge--green">En ligne : « {questionnaire.approvedVersion.title} »</span>
                            )}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{questionnaire.responseCount || 0} réponse(s)</span>
                        </div>
                        {questionnaire.reviewStatus === 'rejected' && questionnaire.rejectionReason && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Motif : {questionnaire.rejectionReason}</span>
                        )}
                        {qPending && (
                            <div>
                                <strong style={{ fontSize: '0.9rem' }}>Version soumise : {qPending.title}</strong>
                                {qPending.description && <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>{qPending.description}</p>}
                                <p style={{ margin: '0.35rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    Publication : <strong>{qPending.publishMode === 'before' ? 'avant l’événement (dès validation)' : 'après la fin de l’événement'}</strong>
                                    {' · '}Durée : <strong>{qPending.responseWindowHours || 72} h</strong>
                                    {(event.eventData?.endDate || event.eventData?.startDate) && (
                                        <> · Date limite : <strong>{formatDateTime(getResponseDeadline(event.eventData.endDate || event.eventData.startDate, qPending.responseWindowHours || 72))}</strong></>
                                    )}
                                </p>
                                <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                                    {qPending.questions.map((q) => (
                                        <li key={q._id}>
                                            {q.text}{q.isRequired ? ' *' : ''}
                                            <span style={{ color: 'var(--text-muted)' }}> ({TYPE_LABELS[q.type] || q.type})</span>
                                            {q.options?.length ? <span style={{ color: 'var(--text-muted)' }}> — {q.options.join(' / ')}</span> : null}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                        {qPending && questionnaire.reviewStatus === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <button
                                    type="button"
                                    className="btn btn--primary btn--sm"
                                    disabled={busy}
                                    onClick={() => run(
                                        () => eventQuestionnaireService.adminApprove(questionnaire._id),
                                        'Questionnaire approuvé',
                                        (res) => {
                                            setQuestionnaire({ ...res.data, responseCount: questionnaire.responseCount });
                                            onQuestionnaireChanged?.();
                                        }
                                    )}
                                >
                                    Approuver le questionnaire
                                </button>
                                <RejectForm
                                    label="Refuser le questionnaire"
                                    busy={busy}
                                    onConfirm={(reason) => run(
                                        () => eventQuestionnaireService.adminReject(questionnaire._id, reason),
                                        'Questionnaire refusé',
                                        (res) => {
                                            setQuestionnaire({ ...res.data, responseCount: questionnaire.responseCount });
                                            onQuestionnaireChanged?.();
                                        }
                                    )}
                                />
                            </div>
                        )}
                        <div>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowResponses((v) => !v)}>
                                {showResponses ? 'Masquer les réponses' : 'Voir les réponses'}
                            </button>
                            {showResponses && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <EventQuestionnaireResponses eventId={event._id} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
