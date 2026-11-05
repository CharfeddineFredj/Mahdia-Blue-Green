import { useRef } from 'react';
import { toPng } from 'html-to-image/es/index.js';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { Download, Image as ImageIcon } from 'lucide-react';
import AdminPagination from './AdminPagination';
import './AdminAnalyticsDashboard.css';

const CHART_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#ea580c', '#059669', '#db2777', '#64748b'];

const chartTooltipContent = {
    background: 'color-mix(in srgb, var(--bg-elevated) 96%, var(--bg-base))',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    fontSize: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
    padding: '10px 12px',
};

const axisTick = { fontSize: 11, fill: '#94a3b8' };
const gridStroke = 'var(--border-color)';

function downloadCsv(filename, rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

async function downloadElementPng(el, filename) {
    if (!el) return;
    const bg =
        getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim() || '#141b22';
    const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: bg,
        includeQueryParams: true,
        filter: (node) => {
            if (!(node instanceof HTMLElement)) return true;
            if (node.classList?.contains('analytics-chart-toolbar')) return false;
            return true;
        },
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function ChartToolbar({ onCsv, onPng }) {
    return (
        <div className="analytics-chart-toolbar">
            <button type="button" className="btn btn--sm btn--ghost" onClick={onCsv} title="CSV">
                <Download size={14} style={{ marginRight: 4 }} />
                CSV
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={onPng} title="PNG">
                <ImageIcon size={14} style={{ marginRight: 4 }} />
                Image
            </button>
        </div>
    );
}

function ChartBox({ height, children }) {
    const h = Number(height) > 0 ? Number(height) : 260;
    return (
        <div className="analytics-chart-wrap" style={{ width: '100%', height: h, minHeight: h }}>
            <ResponsiveContainer width="100%" height="100%" debounce={32}>
                {children}
            </ResponsiveContainer>
        </div>
    );
}

function buildExportRows(data) {
    const rows = [
        ['Questionnaire', data.questionnaire?.title || '', ''],
        ['Total réponses', String(data.totalResponses ?? 0), ''],
        ['Fenêtre courbe (jours)', String(data.chartDays ?? ''), ''],
        [],
        ['Série — soumissions par jour (date;count)', '', ''],
        ...(data.dailyResponses || []).map((p) => [p.date, String(p.count), '']),
        [],
    ];
    (data.questionStats || []).forEach((qs, qi) => {
        rows.push([`Question ${qi + 1}`, qs.text, qs.type]);
        const dist = qs.distribution || {};
        Object.entries(dist)
            .sort((a, b) => b[1] - a[1])
            .forEach(([k, v]) => rows.push([k, String(v), '']));
        if (qs.type === 'text' && (qs.textSamples || []).length) {
            rows.push(['Extraits texte', '', '']);
            qs.textSamples.forEach((t) => rows.push([t, '', '']));
        }
        rows.push([]);
    });
    return rows;
}

/**
 * Statistiques questionnaire (admin) : courbes Recharts + export CSV / PNG.
 */
export default function QuestionnaireStatsVisual({
    data,
    pageSize,
    onPageChange,
    showToast,
}) {
    const refDaily = useRef(null);
    const refQuestionBlocks = useRef(null);

    const dailyData = (data.dailyResponses || []).map((p) => ({
        ...p,
        label: p.date?.slice(5) || p.date,
    }));

    const exportAllCsv = () => {
        try {
            const base = (data.questionnaire?.title || 'questionnaire').replace(/[^\w\-]+/g, '_').slice(0, 60);
            downloadCsv(`mbg-stats-${base}.csv`, buildExportRows(data));
            showToast?.('Export CSV téléchargé', 'success');
        } catch (e) {
            showToast?.(e?.message || 'Export impossible', 'error');
        }
    };

    const pngDaily = async () => {
        try {
            await downloadElementPng(refDaily.current, `mbg-questionnaire-soumissions-jour.png`);
            showToast?.('Image téléchargée', 'success');
        } catch (e) {
            showToast?.(e?.message || 'Export PNG impossible', 'error');
        }
    };

    const pngQuestions = async () => {
        try {
            await downloadElementPng(refQuestionBlocks.current, `mbg-questionnaire-par-question.png`);
            showToast?.('Image téléchargée', 'success');
        } catch (e) {
            showToast?.(e?.message || 'Export PNG impossible', 'error');
        }
    };

    const pg = data.responsesPage;

    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
                <span
                    style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                    }}
                >
                    {data.questionnaire?.title || 'Questionnaire'}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {data.questionnaire?.isRegistrationQuestionnaire ? 'Inscription' : 'Enquête'} ·{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{data.totalResponses}</strong> réponse
                    {data.totalResponses !== 1 ? 's' : ''} au total
                </span>
                <button type="button" className="btn btn--sm btn--outline" onClick={exportAllCsv}>
                    <Download size={14} style={{ marginRight: 6 }} />
                    Tout exporter (CSV)
                </button>
            </div>

            <div
                className="analytics-panel"
                ref={refDaily}
                style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '14px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Soumissions sur {data.chartDays || 90} jours (UTC)</h4>
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Nombre de réponses enregistrées par jour pour ce questionnaire
                        </p>
                    </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('soumissions-par-jour.csv', [['date', 'count'], ...(data.dailyResponses || []).map((p) => [p.date, String(p.count)])])
                        }
                        onPng={pngDaily}
                    />
                </div>
                <ChartBox height={280}>
                    <AreaChart data={dailyData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                        <defs>
                            <linearGradient id="qstatsDailyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipContent} />
                        <Area type="monotone" dataKey="count" name="Soumissions" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#qstatsDailyGrad)" />
                    </AreaChart>
                </ChartBox>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Répartition par question</h4>
                <ChartToolbar
                    onCsv={() => {
                        const rows = [['question', 'clef', 'effectif']];
                        (data.questionStats || []).forEach((qs) => {
                            Object.entries(qs.distribution || {}).forEach(([k, v]) => {
                                rows.push([qs.text, k, String(v)]);
                            });
                        });
                        downloadCsv('repartition-par-question.csv', rows);
                    }}
                    onPng={pngQuestions}
                />
            </div>

            <div ref={refQuestionBlocks} style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                {(data.questionStats || []).map((qs, qi) => {
                    const dist = qs.distribution || {};
                    const entries = Object.entries(dist)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => ({ name: name.length > 48 ? `${name.slice(0, 48)}…` : name, full: name, count }));
                    const chartData = entries.map((e, j) => ({ ...e, fill: CHART_COLORS[j % CHART_COLORS.length] }));

                    return (
                        <div
                            key={qs.questionId || qi}
                            style={{
                                padding: '1rem',
                                background: 'var(--bg-surface)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                                <span style={{ opacity: 0.45, marginRight: '0.35rem' }}>{qi + 1}.</span>
                                {qs.text}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                                {qs.type} · {qs.answeredCount} réponse{qs.answeredCount !== 1 ? 's' : ''}
                            </div>
                            {qs.type === 'rating' && qs.ratingAvg != null && (
                                <p style={{ margin: '0 0 0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Moyenne : <strong>{qs.ratingAvg}</strong> / 5
                                </p>
                            )}
                            {qs.type === 'text' && (qs.textSamples || []).length > 0 && (
                                <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', maxHeight: '120px', overflow: 'auto' }}>
                                    {qs.textSamples.slice(0, 15).map((t, ti) => (
                                        <li key={ti} style={{ marginBottom: '0.25rem' }}>
                                            {t.length > 200 ? `${t.slice(0, 200)}…` : t}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {qs.type !== 'text' && chartData.length > 0 && (
                                <ChartBox height={Math.min(360, 120 + chartData.length * 36)}>
                                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.3} horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} />
                                        <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={chartTooltipContent} formatter={(v) => [v, 'Réponses']} />
                                        <Bar dataKey="count" name="Réponses" radius={[0, 8, 8, 0]} maxBarSize={28}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartBox>
                            )}
                            {qs.type !== 'text' && chartData.length === 0 && qs.answeredCount === 0 && (
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aucune réponse pour cette question.</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {Array.isArray(data.archivedQuestionStats) && data.archivedQuestionStats.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Réponses archivées</h4>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {data.archivedQuestionStats.map((a) => (
                            <div
                                key={a.questionText}
                                style={{
                                    padding: '0.65rem 0.85rem',
                                    background: 'var(--bg-base)',
                                    borderRadius: '10px',
                                    border: '1px dashed var(--border-color)',
                                    fontSize: '0.82rem',
                                }}
                            >
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{a.questionText}</div>
                                <div style={{ color: 'var(--text-muted)' }}>
                                    {a.answerCount} réponse{a.answerCount !== 1 ? 's' : ''} · {a.questionType}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--text-primary)' }}>Réponses par utilisateur</h4>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Une ligne = une soumission. Cliquez pour afficher le détail des réponses.
            </p>
            {(pg?.items || []).length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aucune réponse enregistrée pour ce questionnaire.</p>
            ) : (
                <>
                    <div style={{ display: 'grid', gap: '0.35rem' }}>
                        {pg.items.map((row) => {
                            const when = row.submittedAt || row.createdAt;
                            const dateStr = when ? new Date(when).toLocaleString('fr-FR') : '—';
                            const u = row.user;
                            return (
                                <details
                                    key={row._id}
                                    style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        background: 'var(--bg-surface)',
                                    }}
                                >
                                    <summary
                                        style={{
                                            cursor: 'pointer',
                                            padding: '0.65rem 0.85rem',
                                            fontSize: '0.88rem',
                                            listStyle: 'none',
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u?.displayName || u?.username || '—'}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{u?.email}</span>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem', fontSize: '0.78rem' }}>{dateStr}</span>
                                    </summary>
                                    <div style={{ padding: '0 0.85rem 0.85rem', borderTop: '1px solid var(--border-color)' }}>
                                        <dl style={{ margin: '0.5rem 0 0', display: 'grid', gap: '0.45rem' }}>
                                            {(row.answers || []).map((ans, ai) => (
                                                <div key={`${row._id}-a-${ai}`}>
                                                    <dt
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em',
                                                            color: 'var(--text-muted)',
                                                            marginBottom: '0.15rem',
                                                        }}
                                                    >
                                                        {ans.questionText}
                                                    </dt>
                                                    <dd style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{ans.display}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        {Array.isArray(row.archivedAnswers) && row.archivedAnswers.length > 0 && (
                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--border-color)' }}>
                                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Archivées</div>
                                                <dl style={{ margin: 0, display: 'grid', gap: '0.4rem' }}>
                                                    {row.archivedAnswers.map((ar, ri) => (
                                                        <div key={`${row._id}-ar-${ri}`}>
                                                            <dt style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ar.questionText}</dt>
                                                            <dd style={{ margin: 0, fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{ar.display}</dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                    {pg.totalPages > 1 && (
                        <div style={{ marginTop: '1rem' }}>
                            <AdminPagination
                                currentPage={pg.page}
                                totalPages={pg.totalPages}
                                totalItems={pg.total}
                                pageSize={pageSize}
                                onPageChange={onPageChange}
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );
}
