import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { questionnaireService } from '../services';
import authService from '../services/auth.service';
import { normalizeQuestionnairePayload } from '../utils/questionnaireNormalize';

function formatFrRange(opensAt, closesAt) {
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    if (opensAt && closesAt) {
        const a = new Date(opensAt);
        const b = new Date(closesAt);
        if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
            return `${a.toLocaleDateString('fr-FR', opts)} → ${b.toLocaleDateString('fr-FR', opts)}`;
        }
    }
    if (opensAt) {
        const a = new Date(opensAt);
        if (!Number.isNaN(a.getTime())) return `À partir du ${a.toLocaleDateString('fr-FR', { ...opts, weekday: 'long' })}`;
    }
    if (closesAt) {
        const b = new Date(closesAt);
        if (!Number.isNaN(b.getTime())) return `Jusqu’au ${b.toLocaleDateString('fr-FR', { ...opts, weekday: 'long' })}`;
    }
    return 'Disponible en permanence';
}

const statusStyles = {
    open: { bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a', border: 'rgba(22, 163, 74, 0.35)' },
    scheduled: { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.35)' },
    ended: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b', border: 'rgba(100, 116, 139, 0.3)' },
    inactive: { bg: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' }
};

export default function Questionnaire() {
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [answeredIds, setAnsweredIds] = useState(() => new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadQuestionnaires = async (signal) => {
        setLoading(true);
        setError(null);
        try {
            const r = await questionnaireService.getAll();
            if (signal?.aborted) return;
            const list = r.success ? (r.data || []).map((q) => normalizeQuestionnairePayload(q)) : [];
            setItems(list);

            const answered = new Set();
            if (authService.isAuthenticated() && !authService.needsQuestionnaireCompletion()) {
                try {
                    const rr = await questionnaireService.getMyResponses();
                    if (rr.success && Array.isArray(rr.data)) {
                        rr.data.forEach((resp) => {
                            const qid = resp.questionnaire?._id ?? resp.questionnaire;
                            if (qid) answered.add(String(qid));
                        });
                    }
                } catch {
                    /* ignore — liste publique reste visible */
                }
            }
            if (!signal?.aborted) setAnsweredIds(answered);
        } catch {
            if (!signal?.aborted) setError('Impossible de charger les questionnaires.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    };

    useEffect(() => {
        const ac = new AbortController();
        loadQuestionnaires(ac.signal);
        return () => ac.abort();
    }, [location.key]);

    /** Les enquêtes « Terminé » (date de clôture dépassée) ne sont pas proposées aux membres */
    const notEndedItems = useMemo(
        () => items.filter((q) => q.scheduleStatus !== 'ended'),
        [items]
    );

    const visibleItems = useMemo(
        () => notEndedItems.filter((q) => !answeredIds.has(String(q._id))),
        [notEndedItems, answeredIds]
    );

    const emptyMessage = useMemo(() => {
        if (items.length === 0) return 'Aucun questionnaire public pour le moment.';
        if (notEndedItems.length === 0) {
            return 'Aucun questionnaire ouvert pour le moment. Les enquêtes dont la période est terminée ne sont plus affichées.';
        }
        return 'Vous avez répondu à tous les questionnaires disponibles.';
    }, [items.length, notEndedItems.length]);

    return (
        <section className="section">
            <div className="container" style={{ maxWidth: '960px' }}>
                <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <h1 style={{ marginBottom: '0.5rem' }}>Questionnaires</h1>
                    
                </header>

                {loading && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</p>
                )}
                {error && (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
                        <button className="btn btn--primary btn--sm" onClick={() => loadQuestionnaires()}>Réessayer</button>
                    </div>
                )}

                {!loading && !error && visibleItems.length === 0 && (
                    <div style={{
                        textAlign: 'center', padding: '3rem 1.5rem', borderRadius: '16px',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0 }}>{emptyMessage}</p>
                    </div>
                )}

                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {visibleItems.map((q) => {
                        const st = statusStyles[q.scheduleStatus] || statusStyles.inactive;
                        const open = q.canSubmit === true;
                        return (
                            <article
                                key={q._id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 1fr)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-elevated)',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'stretch',
                                        minHeight: '4px',
                                        background: `linear-gradient(90deg, ${st.color} 0%, var(--color-primary) 100%)`
                                    }}
                                />
                                <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                        <div style={{ flex: '1 1 200px' }}>
                                            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                                {q.title}
                                            </h2>
                                            {q.description && (
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                                    {q.description}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            style={{
                                                padding: '0.35rem 0.85rem',
                                                borderRadius: '999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                letterSpacing: '0.02em',
                                                textTransform: 'uppercase',
                                                background: st.bg,
                                                color: st.color,
                                                border: `1px solid ${st.border}`,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {q.scheduleLabel || '—'}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: '1.25rem',
                                            padding: '1rem 1.1rem',
                                            borderRadius: '12px',
                                            background: 'var(--bg-section)',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div
                                                aria-hidden
                                                style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '12px',
                                                    background: 'linear-gradient(135deg, var(--color-primary), #0d9488)',
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.1rem',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                }}
                                            >
                                                {q.opensAt
                                                    ? new Date(q.opensAt).getDate()
                                                    : q.closesAt
                                                        ? new Date(q.closesAt).getDate()
                                                        : '∞'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    Période
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {formatFrRange(q.opensAt, q.closesAt)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {q.questions?.length ?? 0} question{(q.questions?.length ?? 0) !== 1 ? 's' : ''}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                                        {open ? (
                                            <Link to={`/questionnaire/${q._id}`} className="btn btn--primary">
                                                Répondre
                                            </Link>
                                        ) : (
                                            <span className="btn btn--outline" style={{ opacity: 0.65, pointerEvents: 'none', cursor: 'default' }}>
                                                {q.scheduleStatus === 'scheduled' ? 'Bientôt disponible' : 'Non disponible'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
