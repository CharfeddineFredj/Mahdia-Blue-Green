import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search, FileSpreadsheet, FileText, Users } from 'lucide-react';
import { eventQuestionnaireService } from '../services';
import { formatAnswerValue, formatDateTime } from '../utils/eventQuestionnaireRules';
import { buildResponsesCsv, downloadCsv, printResponsesPdf, safeFileName } from '../utils/responseExport';

/**
 * Réponses au questionnaire d'un événement (coordonnées, recherche, export CSV / PDF).
 * Accessible uniquement au créateur et aux administrateurs autorisés (contrôlé par l'API).
 */
export default function EventQuestionnaireResponses({ eventId }) {
    const [state, setState] = useState({ loading: true, error: '', data: [], questions: [], eventTitle: '', questionnaireTitle: '' });
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        eventQuestionnaireService.getResponses(eventId)
            .then((res) => {
                if (cancelled) return;
                setState({
                    loading: false,
                    error: '',
                    data: res.data || [],
                    questions: res.questions || [],
                    eventTitle: res.eventTitle || '',
                    questionnaireTitle: res.questionnaireTitle || '',
                });
            })
            .catch((err) => {
                if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message || 'Erreur de chargement', data: [] }));
            });
        return () => { cancelled = true; };
    }, [eventId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return state.data;
        return state.data.filter((r) =>
            [r.user?.username, r.user?.email, r.user?.phone].some((v) => String(v || '').toLowerCase().includes(q))
        );
    }, [state.data, query]);

    // Export de toutes les réponses affichées (filtre de recherche appliqué)
    const exportCsv = () => {
        downloadCsv(safeFileName('reponses', state.eventTitle), buildResponsesCsv(state.questions, filtered));
    };

    const exportPdf = () => {
        printResponsesPdf({
            questionnaireTitle: state.questionnaireTitle || 'Réponses au questionnaire',
            eventTitle: state.eventTitle,
            questions: state.questions,
            responses: filtered,
            total: state.data.length,
        });
    };

    if (state.loading) {
        return (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }
    if (state.error) {
        return <p style={{ color: 'var(--color-error, #e53e3e)' }}>{state.error}</p>;
    }
    if (state.data.length === 0) {
        return <p style={{ color: 'var(--text-muted)', margin: 0 }}>Aucune réponse pour le moment.</p>;
    }

    return (
        <div className="eqr">
            {/* Barre d'outils : compteur, recherche, export de toutes les réponses */}
            <div className="eqr__toolbar">
                <span className="eqr__count">
                    <Users size={15} aria-hidden="true" />
                    {state.data.length} réponse{state.data.length > 1 ? 's' : ''}
                </span>
                {state.data.length > 3 && (
                    <label className="eqr__search">
                        <Search size={14} aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Nom, e-mail ou téléphone…"
                            aria-label="Rechercher un participant"
                        />
                    </label>
                )}
                <div className="eqr__export">
                    <button type="button" className="eqr__btn" onClick={exportCsv} disabled={filtered.length === 0} title="Toutes les réponses en CSV (Excel)">
                        <FileSpreadsheet size={14} aria-hidden="true" /> CSV
                    </button>
                    <button type="button" className="eqr__btn" onClick={exportPdf} disabled={filtered.length === 0} title="Toutes les réponses dans un tableau PDF">
                        <FileText size={14} aria-hidden="true" /> PDF
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>Aucun participant ne correspond à la recherche.</p>
            ) : (
                <ul className="eqr__list">
                    {filtered.map((r) => {
                        const name = r.user?.username || 'Utilisateur supprimé';
                        return (
                            <li key={r._id} className="eqr__card">
                                <div className="eqr__head">
                                    <span className="eqr__avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                                    <div className="eqr__who">
                                        <strong>{name}</strong>
                                        <div className="eqr__contact">
                                            {r.user?.email && (
                                                <a href={`mailto:${r.user.email}`}><Mail size={12} aria-hidden="true" />{r.user.email}</a>
                                            )}
                                            {r.user?.phone ? (
                                                <a href={`tel:${r.user.phone}`}><Phone size={12} aria-hidden="true" />{r.user.phone}</a>
                                            ) : (
                                                <span className="eqr__muted"><Phone size={12} aria-hidden="true" />Non renseigné</span>
                                            )}
                                        </div>
                                        <span className="eqr__date">Envoyé le {formatDateTime(r.submittedAt)}</span>
                                    </div>
                                </div>
                                <dl className="eqr__answers">
                                    {(r.answers || []).map((a) => (
                                        <div key={a.questionId} className="eqr__answer">
                                            <dt>{a.questionText}</dt>
                                            <dd>{formatAnswerValue(a.value, a.questionType)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
