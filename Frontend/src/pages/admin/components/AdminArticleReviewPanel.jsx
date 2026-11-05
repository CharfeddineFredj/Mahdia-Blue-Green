import { useState } from 'react';
import { adminService } from '../../../services';
import { RejectForm } from './AdminEventReviewPanel';
import {
    REVIEW_STATUS_META,
    formatDateTime,
    getEventReviewStatus,
} from '../../../utils/eventQuestionnaireRules';

const boxStyle = { padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' };
const titleStyle = { margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' };

const stripHtml = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

function revisionChanges(article) {
    const rev = article.pendingRevision;
    if (!rev) return [];
    const live = article.articleData || {};
    const red = rev.articleData || {};
    const rows = [
        ['Titre', article.title, rev.title],
        ['Résumé', live.summary, red.summary],
        ['Image', live.featuredImage, red.featuredImage],
        ['Contenu', stripHtml(live.content || article.body), stripHtml(red.content || rev.body)],
    ];
    return rows.filter(([, a, b]) => b != null && b !== '' && String(a ?? '') !== String(b));
}

/**
 * Validation administrative d'un article proposé : refus motivé et modification en attente
 * (même principe que AdminEventReviewPanel pour les événements).
 */
export default function AdminArticleReviewPanel({ article, onChanged, showToast }) {
    const [busy, setBusy] = useState(false);

    const run = async (fn, successMsg) => {
        setBusy(true);
        try {
            const res = await fn();
            showToast(res?.message || successMsg, 'success');
            onChanged?.();
        } catch (err) {
            showToast(err.message || 'Action impossible', 'error');
        } finally {
            setBusy(false);
        }
    };

    const reviewStatus = getEventReviewStatus(article);
    const revision = article.pendingRevision;
    const changes = revisionChanges(article);

    return (
        <>
            <div style={boxStyle}>
                <h4 style={titleStyle}>Validation</h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`badge badge--${REVIEW_STATUS_META[reviewStatus].badge}`}>{REVIEW_STATUS_META[reviewStatus].label}</span>
                    {reviewStatus === 'rejected' && article.moderation?.reason && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Motif : {article.moderation.reason}</span>
                    )}
                </div>
                {article.status !== 'published' && reviewStatus !== 'rejected' && (
                    <div style={{ marginTop: '0.75rem' }}>
                        <RejectForm
                            label="Refuser l'article"
                            busy={busy}
                            onConfirm={(reason) => run(() => adminService.rejectPost(article._id, reason), 'Article refusé')}
                        />
                    </div>
                )}
            </div>

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
                                onClick={() => run(() => adminService.approveEventRevision(article._id), 'Modification approuvée')}
                            >
                                Approuver la modification
                            </button>
                            <RejectForm
                                label="Refuser la modification"
                                busy={busy}
                                onConfirm={(reason) => run(() => adminService.rejectEventRevision(article._id, reason), 'Modification refusée')}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
