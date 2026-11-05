import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Area,
    AreaChart,
    ComposedChart,
} from 'recharts';
import { toPng } from 'html-to-image/es/index.js';
import {
    BarChart3,
    Building2,
    Calendar,
    ClipboardList,
    Download,
    Eye,
    Fingerprint,
    Image as ImageIcon,
    Layers,
    LayoutGrid,
    List,
    Mail,
    MessageSquare,
    RefreshCw,
    Star,
    Users,
} from 'lucide-react';
import { adminService } from '../services';
import AdminAnalyticsStudio, {
    STUDIO_PRESETS,
    loadStudioState,
    saveStudioState,
} from './AdminAnalyticsStudio';
import { mergeArticlesEventsTrend } from '../utils/analyticsArticlesEventsTrend';
import './AdminAnalyticsDashboard.css';

const COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#ea580c', '#059669', '#db2777', '#64748b'];

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

/**
 * Export PNG via html-to-image (SVG/Recharts-friendly); évite les anciennes libs canvas qui ne parsent pas les couleurs CSS modernes.
 */
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
            /* Boutons CSV/PNG : inutiles sur la capture */
            if (node.classList?.contains('analytics-chart-toolbar')) return false;
            if (node.classList?.contains('analytics-studio__drag-handle')) return false;
            if (node.classList?.contains('analytics-studio__remove')) return false;
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

function roleLabel(role) {
    const m = {
        user: 'Utilisateur',
        moderator: 'Modérateur',
        analyst: 'Analyste',
        superadmin: 'Super admin',
    };
    return m[role] || role || '—';
}

function ChartToolbar({ onCsv, onPng, csvLabel = 'CSV', pngLabel = 'Image', showPng = true }) {
    return (
        <div className="analytics-chart-toolbar">
            <button type="button" className="btn btn--sm btn--ghost" onClick={onCsv} title="Télécharger en CSV">
                <Download size={14} style={{ marginRight: 4 }} />
                {csvLabel}
            </button>
            {showPng && onPng ? (
                <button type="button" className="btn btn--sm btn--ghost" onClick={onPng} title="Exporter le graphique en PNG">
                    <ImageIcon size={14} style={{ marginRight: 4 }} />
                    {pngLabel}
                </button>
            ) : null}
        </div>
    );
}

const KPI_VARIANTS = ['teal', 'blue', 'violet', 'amber', 'rose', 'emerald', 'cyan', 'indigo', 'slate'];

function Kpi({ label, value, sub, variant = 'teal', icon: Icon }) {
    const v = KPI_VARIANTS.includes(variant) ? variant : 'teal';
    return (
        <div className={`analytics-kpi analytics-kpi--${v}`}>
            {Icon ? (
                <div className="analytics-kpi__icon" aria-hidden>
                    <Icon size={22} strokeWidth={2} />
                </div>
            ) : null}
            <div className="analytics-kpi__label">{label}</div>
            <div className="analytics-kpi__value">{value}</div>
            {sub != null && sub !== '' && <div className="analytics-kpi__sub">{sub}</div>}
        </div>
    );
}

/** Série journalière : tous les jours à 0 */
function seriesAllCountsZero(points) {
    if (!Array.isArray(points) || points.length === 0) return true;
    return points.every((p) => (Number(p.count) || 0) === 0);
}

/** Échelle Y lisible quand tout est à 0 (sinon la courbe est confondue avec l’axe) */
function yDomainFromMax(max) {
    const m = Number(max) || 0;
    if (m <= 0) return [0, 1];
    return [0, Math.max(1, Math.ceil(m * 1.08))];
}

function maxCountSeries(points) {
    if (!Array.isArray(points) || points.length === 0) return 0;
    return Math.max(0, ...points.map((p) => Number(p.count) || 0));
}

function activityComboMax(combo) {
    if (!Array.isArray(combo) || combo.length === 0) return 0;
    return Math.max(
        0,
        ...combo.flatMap((r) => [r.utilisateurs, r.articles, r.evenements].map((x) => Number(x) || 0))
    );
}

/** Conteneur à hauteur fixe : Recharts 3 ne rend pas le graphique si le parent flex a hauteur 0 ou largeur 0 */
function AnalyticsChartBox({ height, children }) {
    const h = Number(height) > 0 ? Number(height) : 280;
    return (
        <div className="analytics-chart-wrap" style={{ width: '100%', height: h, minHeight: h }}>
            <ResponsiveContainer width="100%" height="100%" debounce={32}>
                {children}
            </ResponsiveContainer>
        </div>
    );
}

/**
 * Tableau d’analyse (analyste / superadmin) — graphiques + export CSV / PNG.
 */
export default function AdminAnalyticsDashboard({ showToast }) {
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [payload, setPayload] = useState(null);

    const refUsers = useRef(null);
    const refActivity = useRef(null);
    const refRoles = useRef(null);
    const refRatings = useRef(null);
    const refVisits = useRef(null);
    const refArticlesStatus = useRef(null);
    const refEventsStatus = useRef(null);
    const refContactsFlow = useRef(null);
    const refArticlesEventsTrend = useRef(null);
    const classicViewRef = useRef(null);
    const studioRootRef = useRef(null);

    const [vizCompare, setVizCompare] = useState(false);
    const [viewMode, setViewMode] = useState(() => {
        try {
            const v = localStorage.getItem('mbg_analytics_view_mode');
            return v === 'classic' ? 'classic' : 'studio';
        } catch {
            return 'studio';
        }
    });
    const [studioLayout, setStudioLayout] = useState(() => {
        const s = loadStudioState();
        return s?.layout?.length ? s.layout : STUDIO_PRESETS[0].layout;
    });
    const [activePresetId, setActivePresetId] = useState(() => loadStudioState()?.presetId ?? 'direction');
    const [noteTexts, setNoteTexts] = useState(() => loadStudioState()?.noteTexts || {});
    const [visitsAlertBelow, setVisitsAlertBelow] = useState(() => loadStudioState()?.visitsAlertBelow ?? '');
    const [gridWidth, setGridWidth] = useState(1200);
    const [trendGranularity, setTrendGranularity] = useState(() => {
        try {
            const g = localStorage.getItem('mbg_analytics_trend_granularity');
            if (g === 'month' || g === 'year' || g === 'day') return g;
        } catch {
            /* ignore */
        }
        return 'day';
    });

    useEffect(() => {
        try {
            localStorage.setItem('mbg_analytics_trend_granularity', trendGranularity);
        } catch {
            /* ignore */
        }
    }, [trendGranularity]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getAnalytics({ days, compare: vizCompare ? 1 : undefined });
            if (res?.success && res?.data) {
                setPayload(res.data);
            } else {
                throw new Error(res?.message || 'Réponse invalide');
            }
        } catch (e) {
            showToast?.(e.message || 'Impossible de charger les statistiques', 'error');
        } finally {
            setLoading(false);
        }
    }, [days, showToast, vizCompare]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        try {
            localStorage.setItem('mbg_analytics_view_mode', viewMode);
        } catch {
            /* ignore */
        }
    }, [viewMode]);

    useEffect(() => {
        saveStudioState({
            layout: studioLayout,
            presetId: activePresetId,
            noteTexts,
            visitsAlertBelow,
        });
    }, [studioLayout, activePresetId, noteTexts, visitsAlertBelow]);

    useLayoutEffect(() => {
        const el = studioRootRef.current;
        if (!el || viewMode !== 'studio') return undefined;
        const measure = () => setGridWidth(Math.max(320, Math.floor(el.getBoundingClientRect().width)));
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [viewMode, loading, payload]);

    const exportPanelPng = useCallback(
        async (ref, filename) => {
            const el = ref?.current;
            if (!el) {
                showToast?.('Impossible de capturer le graphique.', 'error');
                return;
            }
            try {
                await downloadElementPng(el, filename);
                showToast?.('Image téléchargée', 'success');
            } catch (e) {
                console.error('exportPanelPng', e);
                showToast?.(e?.message || 'Export PNG impossible. Réessayez ou utilisez le CSV.', 'error');
            }
        },
        [showToast]
    );

    const exportFullCsv = () => {
        if (!payload) return;
        const { summary, series, generatedAt, periodDays } = payload;
        const visitsForCsv = Array.isArray(series.visits) ? series.visits : [];
        const rows = [
            ['Mahdia Blue & Green — export analytique', '', ''],
            ['Généré le', generatedAt, ''],
            ['Période (jours)', String(periodDays), ''],
            [],
            ['Indicateur', 'Valeur', ''],
            ['Utilisateurs (total)', String(summary.users.total), ''],
            ['Utilisateurs actifs', String(summary.users.active), ''],
            ['Posts (total)', String(summary.posts.total), ''],
            ['Commentaires', String(summary.comments.total), ''],
            ['Commentaires avec note (sur le commentaire)', String(summary.comments.withRating), ''],
            ['Note moyenne (commentaires notés)', summary.comments.avgRating != null ? String(summary.comments.avgRating) : '—', ''],
            ['Avis articles & événements (nombre de votes)', String(summary.avisPosts?.totalVotes ?? 0), ''],
            ['Note moyenne (avis articles & événements)', summary.avisPosts?.avgRating != null ? String(summary.avisPosts.avgRating) : '—', ''],
            [],
            ['Répartition avis (étoiles 1–5 sur articles & événements)', '', ''],
            ['note', 'nombre_de_votes'],
            ...(summary.avisPosts?.distribution || summary.ratingsDistribution || []).map((r) => [String(r.rating), String(r.count)]),
            ['Messages contact', String(summary.contacts.total), ''],
            ['Partenaires', String(summary.partners.total), ''],
            ['Questionnaires actifs', String(summary.questionnaires.active), ''],
            ['Réponses questionnaires', String(summary.responses.total), ''],
            ['Visites (total)', String(summary.visits.total), ''],
            ['Visites aujourd’hui', String(summary.visits.today), ''],
            ['Visites 30 jours', String(summary.visits.last30Days), ''],
            ['Visiteurs uniques (IDs)', String(summary.visits.uniqueVisitors), ''],
            [],
            ['Articles par catégorie', '', ''],
            ['categorie', 'count'],
            ...(summary.posts?.articlesByCategory || []).map((x) => [String(x.category), String(x.count)]),
            [],
            ['Événements par catégorie', '', ''],
            ['categorie', 'count'],
            ...(summary.posts?.eventsByCategory || []).map((x) => [String(x.category), String(x.count)]),
            [],
            ['Série — nouveaux utilisateurs (date;count)', '', ''],
            ...series.users.map((p) => [p.date, String(p.count), '']),
            [],
            ['Série — articles créés (date;count)', '', ''],
            ...series.articles.map((p) => [p.date, String(p.count), '']),
            [],
            ['Série — événements créés (date;count)', '', ''],
            ...series.events.map((p) => [p.date, String(p.count), '']),
            [],
            ['Série — contacts (date;count)', '', ''],
            ...series.contacts.map((p) => [p.date, String(p.count), '']),
            [],
            ['Série — visites (date;count)', '', ''],
            ...visitsForCsv.map((p) => [p.date, String(p.count), '']),
        ];
        downloadCsv(`mbg-analytique-${new Date().toISOString().slice(0, 10)}.csv`, rows);
        showToast?.('Export CSV téléchargé', 'success');
    };

    const applyStudioPreset = useCallback((presetId) => {
        const p = STUDIO_PRESETS.find((x) => x.id === presetId);
        if (!p) return;
        setStudioLayout(p.layout.map((item) => ({ ...item })));
        setActivePresetId(presetId);
    }, []);

    const removeStudioWidget = useCallback((widgetId) => {
        setStudioLayout((prev) => prev.filter((l) => l.i !== widgetId));
        setActivePresetId('custom');
    }, []);

    const addStudioNote = useCallback(() => {
        const id = `note-${crypto.randomUUID?.() || `${Date.now()}`}`;
        setStudioLayout((prev) => {
            const maxY = prev.length ? Math.max(...prev.map((l) => l.y + l.h)) : 0;
            return [...prev, { i: id, x: 0, y: maxY, w: 4, h: 5, minW: 2, minH: 3 }];
        });
        setActivePresetId('custom');
    }, []);

    const removeStudioNote = useCallback((noteId) => {
        setStudioLayout((prev) => prev.filter((l) => l.i !== noteId));
        setNoteTexts((prev) => {
            const next = { ...prev };
            delete next[noteId];
            return next;
        });
        setActivePresetId('custom');
    }, []);

    const exportAnalyticsViewPng = useCallback(async () => {
        const el = viewMode === 'studio' ? studioRootRef.current : classicViewRef.current;
        if (!el) {
            showToast?.('Aucune vue à capturer.', 'error');
            return;
        }
        const slug = viewMode === 'studio' ? 'studio' : 'classique';
        try {
            await downloadElementPng(el, `mbg-analytique-vue-${slug}-${new Date().toISOString().slice(0, 10)}.png`);
            showToast?.('Vue exportée (PNG)', 'success');
        } catch (e) {
            console.error(e);
            showToast?.(e?.message || 'Export PNG impossible.', 'error');
        }
    }, [viewMode, showToast]);

    const studioRenderWidget = useCallback(
        (id) => {
            if (!payload) return null;
            const { summary, series } = payload;
            const seriesPrevious = payload.seriesPrevious || null;
            const visitsSeriesLocal = Array.isArray(series.visits) ? series.visits : [];
            const visitsSumPeriodLocal = visitsSeriesLocal.reduce((s, p) => s + (p.count || 0), 0);
            const rolePieDataLocal = (summary.users.byRole || []).map((r) => ({
                name: roleLabel(r.role),
                value: r.count,
            }));
            const ratingBarDataLocal = (summary.avisPosts?.distribution || summary.ratingsDistribution || []).map((r) => ({
                note: `${r.rating} ★`,
                count: r.count,
            }));
            const activityComboLocal = series.users.map((u, i) => ({
                date: u.date.slice(5),
                utilisateurs: u.count,
                articles: series.articles[i]?.count ?? 0,
                evenements: series.events[i]?.count ?? 0,
            }));
            const activityComboPrev =
                vizCompare && seriesPrevious
                    ? seriesPrevious.users.map((u, i) => ({
                          date: u.date.slice(5),
                          utilisateurs: u.count,
                          articles: seriesPrevious.articles[i]?.count ?? 0,
                          evenements: seriesPrevious.events[i]?.count ?? 0,
                      }))
                    : null;
            const contactsSeriesLocal = Array.isArray(series.contacts) ? series.contacts : [];
            const contactsFlowDataLocal = contactsSeriesLocal.map((c) => ({
                date: c.date.slice(5),
                count: c.count,
            }));
            const contactsFlowMergedLocal =
                vizCompare && seriesPrevious
                    ? contactsSeriesLocal.map((p, i) => ({
                          date: p.date.slice(5),
                          actuel: p.count,
                          precedent: seriesPrevious.contacts[i]?.count ?? 0,
                      }))
                    : null;
            const usersMerged =
                vizCompare && seriesPrevious
                    ? series.users.map((p, i) => ({
                          date: p.date.slice(5),
                          actuel: p.count,
                          precedent: seriesPrevious.users[i]?.count ?? 0,
                      }))
                    : null;
            const visitsMerged =
                vizCompare && seriesPrevious
                    ? visitsSeriesLocal.map((p, i) => ({
                          date: p.date.slice(5),
                          actuel: p.count,
                          precedent: seriesPrevious.visits[i]?.count ?? 0,
                      }))
                    : null;

            const newUsersSeriesEmptyLocal = seriesAllCountsZero(series.users);
            const newUsersMaxLocal = maxCountSeries(series.users);
            const activityMaxLocal = activityComboMax(activityComboLocal);
            const activityEmptyLocal = activityMaxLocal === 0;
            const contactsFlowMaxLocal = maxCountSeries(contactsSeriesLocal);
            const contactsFlowEmptyLocal = contactsFlowMaxLocal === 0;
            const visitsMaxLocal = maxCountSeries(visitsSeriesLocal);

            const thr = visitsAlertBelow !== '' ? Number(visitsAlertBelow) : null;
            const visitsWarn = thr != null && !Number.isNaN(thr) && visitsSumPeriodLocal < thr;

            switch (id) {
                case 'kpis':
                    return (
                        <div className={`analytics-kpi-grid analytics-kpi-grid--studio${visitsWarn ? ' analytics-kpi-grid--studio-alert' : ''}`}>
                            <Kpi variant="teal" icon={Users} label="Utilisateurs" value={summary.users.total} sub={`${summary.users.active} actifs`} />
                            <Kpi variant="blue" icon={Layers} label="Articles & événements" value={summary.posts.total} sub="posts non supprimés" />
                            <Kpi variant="violet" icon={MessageSquare} label="Commentaires" value={summary.comments.total} sub={`${summary.comments.withRating} avec note sur le texte`} />
                            <Kpi
                                variant="amber"
                                icon={Star}
                                label="Avis (articles & événements)"
                                value={summary.avisPosts?.avgRating != null ? `${summary.avisPosts.avgRating} / 5` : '—'}
                                sub={`${summary.avisPosts?.totalVotes ?? 0} vote(s) · étoiles sur articles & événements`}
                            />
                            <Kpi variant="rose" icon={Mail} label="Contacts" value={summary.contacts.total} sub="messages reçus" />
                            <Kpi variant="emerald" icon={Building2} label="Partenaires" value={summary.partners.total} sub="fiches" />
                            <Kpi variant="cyan" icon={ClipboardList} label="Réponses (questionnaires)" value={summary.responses.total} sub={`${summary.questionnaires.active} questionnaires actifs`} />
                            <Kpi variant="indigo" icon={Eye} label="Visites (total)" value={summary.visits.total} sub={`${summary.visits.today} aujourd’hui`} />
                            <Kpi variant="slate" icon={Fingerprint} label="Visiteurs uniques" value={summary.visits.uniqueVisitors} sub="IDs anonymisés" />
                            {visitsWarn && (
                                <p className="analytics-studio-inline-hint" role="status">
                                    Alerte : total visites sur la période ({visitsSumPeriodLocal}) sous le seuil ({thr}).
                                </p>
                            )}
                        </div>
                    );
                case 'users':
                    return (
                        <div className="analytics-panel studio-embed" ref={refUsers}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Nouveaux utilisateurs</h3>
                                    <p className="analytics-panel__subtitle">
                                        {vizCompare && seriesPrevious ? 'Période actuelle vs N jours précédents (alignement par index)' : 'Comptage par jour (UTC)'}
                                    </p>
                                </div>
                                <ChartToolbar
                                    onCsv={() =>
                                        downloadCsv('utilisateurs-par-jour.csv', [['date', 'count'], ...series.users.map((p) => [p.date, String(p.count)])])
                                    }
                                    onPng={() => exportPanelPng(refUsers, `utilisateurs-${days}j.png`)}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {newUsersSeriesEmptyLocal && (
                                    <p className="analytics-series-hint">Série à 0 sur la fenêtre — comptage des <em>nouveaux</em> comptes créés par jour.</p>
                                )}
                                <AnalyticsChartBox height={260}>
                                    {vizCompare && seriesPrevious && usersMerged ? (
                                        <ComposedChart data={usersMerged} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(Math.max(newUsersMaxLocal, maxCountSeries(seriesPrevious.users)))} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Legend wrapperStyle={{ paddingTop: 4 }} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
                                            <Area type="monotone" dataKey="actuel" name="Période actuelle" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.2} strokeWidth={2} />
                                            <Line type="monotone" dataKey="precedent" name="Période précédente" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    ) : (
                                        <AreaChart data={series.users} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <defs>
                                                <linearGradient id="gUserStudio" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                                                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} tickFormatter={(v) => v.slice(5)} />
                                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(newUsersMaxLocal)} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Area type="monotone" dataKey="count" name="Nouveaux" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#gUserStudio)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#0d9488' }} />
                                        </AreaChart>
                                    )}
                                </AnalyticsChartBox>
                            </div>
                        </div>
                    );
                case 'activity':
                    return (
                        <div className="analytics-panel studio-embed" ref={refActivity}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Activité contenus</h3>
                                    <p className="analytics-panel__subtitle">Utilisateurs, articles, événements créés par jour</p>
                                </div>
                                <ChartToolbar
                                    onCsv={() =>
                                        downloadCsv('activite-contenus.csv', [
                                            ['date', 'utilisateurs', 'articles', 'evenements'],
                                            ...activityComboLocal.map((r) => [r.date, String(r.utilisateurs), String(r.articles), String(r.evenements)]),
                                        ])
                                    }
                                    onPng={() => exportPanelPng(refActivity, `activite-contenus-${days}j.png`)}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {activityEmptyLocal && <p className="analytics-series-hint">Aucune création sur la fenêtre affichée.</p>}
                                <AnalyticsChartBox height={260}>
                                    <LineChart data={activityComboLocal} margin={{ top: 12, right: 8, left: 2, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                        <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(activityMaxLocal)} />
                                        <Tooltip contentStyle={chartTooltipContent} />
                                        <Legend wrapperStyle={{ paddingTop: 4 }} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>} />
                                        <Line type="monotone" dataKey="utilisateurs" name="Utilisateurs" stroke="#0d9488" strokeLinecap="round" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="articles" name="Articles" stroke="#3b82f6" strokeLinecap="round" dot={false} strokeWidth={2} />
                                        <Line type="monotone" dataKey="evenements" name="Événements" stroke="#f59e0b" strokeLinecap="round" dot={false} strokeWidth={2} />
                                    </LineChart>
                                </AnalyticsChartBox>
                                {vizCompare && activityComboPrev && (
                                    <div className="analytics-studio-compare-strip">
                                        <span className="analytics-studio-compare-strip__label">Période précédente (pointillés)</span>
                                        <AnalyticsChartBox height={140}>
                                            <LineChart data={activityComboPrev} margin={{ top: 4, right: 8, left: 2, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="2 6" stroke={gridStroke} strokeOpacity={0.25} vertical={false} />
                                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                                <YAxis hide />
                                                <Tooltip contentStyle={chartTooltipContent} />
                                                <Line type="monotone" dataKey="utilisateurs" name="Utilisateurs" stroke="#0d9488" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                                                <Line type="monotone" dataKey="articles" name="Articles" stroke="#3b82f6" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                                                <Line type="monotone" dataKey="evenements" name="Événements" stroke="#f59e0b" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
                                            </LineChart>
                                        </AnalyticsChartBox>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                case 'roles':
                    return (
                        <div className="analytics-panel studio-embed" ref={refRoles}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Utilisateurs par rôle</h3>
                                    <p className="analytics-panel__subtitle">Répartition globale (hors période)</p>
                                </div>
                                <ChartToolbar
                                    onCsv={() => downloadCsv('roles.csv', [['role', 'count'], ...rolePieDataLocal.map((r) => [r.name, String(r.value)])])}
                                    onPng={() => exportPanelPng(refRoles, 'repartition-roles.png')}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {rolePieDataLocal.length === 0 ? (
                                    <p className="analytics-empty">Aucune donnée de rôle.</p>
                                ) : (
                                    <AnalyticsChartBox height={260}>
                                        <PieChart>
                                            <Pie data={rolePieDataLocal} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={48} outerRadius={82} paddingAngle={3} stroke="var(--bg-elevated)" strokeWidth={2}>
                                                {rolePieDataLocal.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend verticalAlign="bottom" height={40} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                        </PieChart>
                                    </AnalyticsChartBox>
                                )}
                            </div>
                        </div>
                    );
                case 'visits':
                    return (
                        <div className="analytics-panel studio-embed" ref={refVisits}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Visites site</h3>
                                    <p className="analytics-panel__subtitle">Total période : {visitsSumPeriodLocal}</p>
                                </div>
                                <ChartToolbar
                                    onCsv={() => downloadCsv('visites-par-jour.csv', [['date', 'count'], ...visitsSeriesLocal.map((p) => [p.date, String(p.count)])])}
                                    onPng={() => exportPanelPng(refVisits, `visites-${days}j.png`)}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                <AnalyticsChartBox height={260}>
                                    {vizCompare && seriesPrevious && visitsMerged ? (
                                        <ComposedChart data={visitsMerged} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(Math.max(visitsMaxLocal, maxCountSeries(seriesPrevious.visits)))} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Legend wrapperStyle={{ paddingTop: 4 }} />
                                            <Area type="monotone" dataKey="actuel" name="Période actuelle" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                                            <Line type="monotone" dataKey="precedent" name="Période précédente" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    ) : (
                                        <LineChart data={visitsSeriesLocal} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} tickFormatter={(v) => (v && v.length >= 10 ? v.slice(5) : v)} />
                                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(visitsMaxLocal)} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Line type="monotone" dataKey="count" name="Pages vues" stroke="#6366f1" strokeLinecap="round" strokeWidth={2.5} dot={false} />
                                        </LineChart>
                                    )}
                                </AnalyticsChartBox>
                            </div>
                        </div>
                    );
                case 'articlesEventsTrend': {
                    const trendRows = mergeArticlesEventsTrend(series.articles, series.events, trendGranularity);
                    const trendMax = Math.max(0, ...trendRows.flatMap((r) => [r.articles, r.evenements]));
                    const trendEmpty = trendMax === 0;
                    return (
                        <div className="analytics-panel studio-embed" ref={refArticlesEventsTrend}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Articles & événements (courbes)</h3>
                                    <p className="analytics-panel__subtitle">Créations sur la période — agrégation au choix</p>
                                </div>
                                <div className="analytics-panel__header-end">
                                    <div className="analytics-panel__controls">
                                        <label className="analytics-granularity-label" htmlFor="studio-articles-events-gran">
                                            Agrégation
                                        </label>
                                        <select
                                            id="studio-articles-events-gran"
                                            className="form-select analytics-granularity-select"
                                            value={trendGranularity}
                                            onChange={(e) => setTrendGranularity(e.target.value)}
                                        >
                                            <option value="day">Par jour</option>
                                            <option value="month">Par mois (total)</option>
                                            <option value="year">Par année (total)</option>
                                        </select>
                                    </div>
                                    <ChartToolbar
                                        onCsv={() =>
                                            downloadCsv('articles-evenements-tendance.csv', [
                                                ['periode', 'articles_crees', 'evenements_crees'],
                                                ...trendRows.map((r) => [r.periode, String(r.articles), String(r.evenements)]),
                                            ])
                                        }
                                        onPng={() => exportPanelPng(refArticlesEventsTrend, `articles-evenements-${trendGranularity}-${days}j.png`)}
                                    />
                                </div>
                            </div>
                            <div className="analytics-panel__chart">
                                {trendEmpty && (
                                    <p className="analytics-series-hint">Aucune création sur cette fenêtre pour l’agrégation choisie.</p>
                                )}
                                <AnalyticsChartBox height={260}>
                                    <LineChart data={trendRows} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(trendMax)} />
                                        <Tooltip contentStyle={chartTooltipContent} />
                                        <Legend wrapperStyle={{ paddingTop: 6 }} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>} />
                                        <Line type="monotone" dataKey="articles" name="Articles créés" stroke="#3b82f6" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                        <Line type="monotone" dataKey="evenements" name="Événements créés" stroke="#f59e0b" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                    </LineChart>
                                </AnalyticsChartBox>
                            </div>
                        </div>
                    );
                }
                case 'articlesCat':
                    return (
                        <div className="analytics-panel studio-embed" ref={refArticlesStatus}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Articles par catégorie</h3>
                                </div>
                                <ChartToolbar
                                    onCsv={() =>
                                        downloadCsv('articles-par-categorie.csv', [
                                            ['categorie', 'count'],
                                            ...((summary.posts?.articlesByCategory || []).map((x) => [x.category, String(x.count)])),
                                        ])
                                    }
                                    onPng={() => exportPanelPng(refArticlesStatus, 'articles-par-categorie.png')}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {(summary.posts?.articlesByCategory || []).length === 0 ? (
                                    <p className="analytics-empty">Aucun article.</p>
                                ) : (
                                    <AnalyticsChartBox height={200}>
                                        <BarChart data={(summary.posts.articlesByCategory || []).map((x) => ({ categorie: x.category, count: x.count }))} layout="vertical" margin={{ top: 6, right: 12, left: 4, bottom: 6 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.3} horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis type="category" dataKey="categorie" width={120} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Bar dataKey="count" fill="#059669" radius={[0, 6, 6, 0]} maxBarSize={22} />
                                        </BarChart>
                                    </AnalyticsChartBox>
                                )}
                            </div>
                        </div>
                    );
                case 'eventsCat':
                    return (
                        <div className="analytics-panel studio-embed" ref={refEventsStatus}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Événements par catégorie</h3>
                                </div>
                                <ChartToolbar
                                    onCsv={() =>
                                        downloadCsv('evenements-par-categorie.csv', [
                                            ['categorie', 'count'],
                                            ...((summary.posts?.eventsByCategory || []).map((x) => [x.category, String(x.count)])),
                                        ])
                                    }
                                    onPng={() => exportPanelPng(refEventsStatus, 'evenements-par-categorie.png')}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {(summary.posts?.eventsByCategory || []).length === 0 ? (
                                    <p className="analytics-empty">Aucun événement.</p>
                                ) : (
                                    <AnalyticsChartBox height={200}>
                                        <BarChart data={(summary.posts.eventsByCategory || []).map((x) => ({ categorie: x.category, count: x.count }))} layout="vertical" margin={{ top: 6, right: 12, left: 4, bottom: 6 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.3} horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis type="category" dataKey="categorie" width={120} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={22} />
                                        </BarChart>
                                    </AnalyticsChartBox>
                                )}
                            </div>
                        </div>
                    );
                case 'ratings':
                    return (
                        <div className="analytics-panel studio-embed" ref={refRatings}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Avis (1–5)</h3>
                                </div>
                                <ChartToolbar
                                    onCsv={() => downloadCsv('repartition-notes.csv', [['note', 'count'], ...ratingBarDataLocal.map((r) => [r.note, String(r.count)])])}
                                    onPng={() => exportPanelPng(refRatings, 'repartition-avis.png')}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                <AnalyticsChartBox height={240}>
                                    <BarChart data={ratingBarDataLocal.length ? ratingBarDataLocal : [1, 2, 3, 4, 5].map((n) => ({ note: `${n} ★`, count: 0 }))} margin={{ top: 8, right: 8, left: 2, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                        <XAxis dataKey="note" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                                        <Tooltip contentStyle={chartTooltipContent} />
                                        <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 2, 2]} maxBarSize={48} />
                                    </BarChart>
                                </AnalyticsChartBox>
                            </div>
                        </div>
                    );
                case 'contactsFlow':
                    return (
                        <div className="analytics-panel studio-embed" ref={refContactsFlow}>
                            <div className="analytics-panel__header">
                                <div className="analytics-panel__titles">
                                    <h3 className="analytics-panel__title">Contacts (messages)</h3>
                                    <p className="analytics-panel__subtitle">Messages formulaire contact reçus par jour (UTC)</p>
                                </div>
                                <ChartToolbar
                                    onCsv={() =>
                                        downloadCsv('contacts-par-jour.csv', [['date', 'count'], ...contactsSeriesLocal.map((c) => [c.date, String(c.count)])])
                                    }
                                    onPng={() => exportPanelPng(refContactsFlow, `contacts-${days}j.png`)}
                                />
                            </div>
                            <div className="analytics-panel__chart">
                                {contactsFlowEmptyLocal && <p className="analytics-series-hint">Aucun message contact sur la fenêtre.</p>}
                                <AnalyticsChartBox height={240}>
                                    {vizCompare && seriesPrevious && contactsFlowMergedLocal ? (
                                        <ComposedChart data={contactsFlowMergedLocal} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={axisTick}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={yDomainFromMax(
                                                    Math.max(contactsFlowMaxLocal, maxCountSeries(seriesPrevious.contacts || []))
                                                )}
                                            />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Legend wrapperStyle={{ paddingTop: 4 }} />
                                            <Area
                                                type="monotone"
                                                dataKey="actuel"
                                                name="Période actuelle"
                                                stroke="#ec4899"
                                                fill="#ec4899"
                                                fillOpacity={0.12}
                                                strokeWidth={2}
                                            />
                                            <Line type="monotone" dataKey="precedent" name="Période précédente" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    ) : (
                                        <LineChart data={contactsFlowDataLocal} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(contactsFlowMaxLocal)} />
                                            <Tooltip contentStyle={chartTooltipContent} />
                                            <Line type="monotone" dataKey="count" name="Contacts" stroke="#ec4899" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                        </LineChart>
                                    )}
                                </AnalyticsChartBox>
                            </div>
                        </div>
                    );
                default:
                    return null;
            }
        },
        [payload, vizCompare, days, exportPanelPng, visitsAlertBelow, showToast, trendGranularity]
    );

    if (loading && !payload) {
        return (
            <div className="analytics-page">
                <div className="analytics-loading">
                    <div className="analytics-loading__box" aria-hidden />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Chargement des statistiques…</p>
                </div>
            </div>
        );
    }

    if (!payload) {
        return (
            <div className="analytics-page">
                <div className="analytics-error">
                    <p className="analytics-error__title">Données indisponibles</p>
                    <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem' }}>Vérifiez votre connexion ou réessayez.</p>
                    <button type="button" className="btn btn--primary" onClick={load}>
                        <RefreshCw size={16} style={{ marginRight: 6 }} />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    const { summary, series, generatedAt } = payload;
    const generatedLabel = generatedAt
        ? new Date(generatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
        : '—';
    const rolePieData = (summary.users.byRole || []).map((r) => ({
        name: roleLabel(r.role),
        value: r.count,
    }));

    /** Avis = Post.ratings (articles / événements), toujours 1..5 pour affichage du graphique */
    const ratingBarData = (summary.avisPosts?.distribution || summary.ratingsDistribution || []).map((r) => ({
        note: `${r.rating} ★`,
        count: r.count,
    }));

    const activityCombo = series.users.map((u, i) => ({
        date: u.date.slice(5),
        utilisateurs: u.count,
        articles: series.articles[i]?.count ?? 0,
        evenements: series.events[i]?.count ?? 0,
    }));

    const visitsSeries = Array.isArray(series.visits) ? series.visits : [];
    const visitsSumPeriod = visitsSeries.reduce((s, p) => s + (p.count || 0), 0);
    const visitsMax = maxCountSeries(visitsSeries);

    const contactsSeriesClassic = Array.isArray(series.contacts) ? series.contacts : [];
    const contactsFlowData = contactsSeriesClassic.map((c) => ({
        date: c.date.slice(5),
        count: c.count,
    }));
    const contactsFlowMax = maxCountSeries(contactsSeriesClassic);

    const newUsersSeriesEmpty = seriesAllCountsZero(series.users);
    const newUsersMax = maxCountSeries(series.users);
    const activityMax = activityComboMax(activityCombo);
    const activityEmpty = activityMax === 0;
    const contactsFlowEmpty = contactsFlowMax === 0;

    const articlesEventsTrendData = mergeArticlesEventsTrend(series.articles, series.events, trendGranularity);
    const articlesEventsTrendMax = Math.max(0, ...articlesEventsTrendData.flatMap((r) => [r.articles, r.evenements]));
    const articlesEventsTrendEmpty = articlesEventsTrendMax === 0;

    return (
        <div className="admin-analytics analytics-page">
            <header className="analytics-hero">
                <div className="analytics-hero__row">
                    <div>
                        <div className="analytics-hero__eyebrow">
                            <BarChart3 size={14} strokeWidth={2} aria-hidden />
                            Tableau analytique
                        </div>
                        <h1 className="analytics-hero__title">Analyse & rapports</h1>
                        <p className="analytics-hero__desc">
                            Indicateurs clés, séries temporelles et répartitions pour piloter l’activité du site. Export CSV global et capture
                            PNG de la vue (classique ou studio) depuis la barre d’outils ; exports CSV/PNG aussi par graphique.
                        </p>
                    </div>
                    <div className="analytics-toolbar">
                        <div className="analytics-toolbar__group">
                            <label className="analytics-period">
                                <span>Période</span>
                                <select className="form-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                                    <option value={7}>7 jours</option>
                                    <option value={30}>30 jours</option>
                                    <option value={90}>90 jours</option>
                                    <option value={180}>180 jours</option>
                                    <option value={365}>365 jours</option>
                                </select>
                            </label>
                            <button type="button" className="btn btn--outline" onClick={load} disabled={loading}>
                                <RefreshCw size={16} style={{ marginRight: 6, opacity: loading ? 0.5 : 1 }} />
                                Actualiser
                            </button>
                            <div className="analytics-toolbar__exports">
                                <button type="button" className="btn btn--primary" onClick={exportFullCsv}>
                                    <Download size={16} style={{ marginRight: 6 }} />
                                    Tout exporter (CSV)
                                </button>
                                <button type="button" className="btn btn--outline" onClick={exportAnalyticsViewPng} title="Capture PNG de la vue affichée (classique ou studio)">
                                    <ImageIcon size={16} style={{ marginRight: 6 }} aria-hidden />
                                    Vue (PNG)
                                </button>
                            </div>
                            <label className="analytics-toolbar-check">
                                <input
                                    type="checkbox"
                                    checked={vizCompare}
                                    onChange={(e) => setVizCompare(e.target.checked)}
                                />
                                <span>Comparer période précédente</span>
                            </label>
                            <div className="analytics-view-toggle" role="group" aria-label="Mode d’affichage">
                                <button
                                    type="button"
                                    className={`analytics-view-toggle__btn ${viewMode === 'studio' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('studio')}
                                >
                                    <LayoutGrid size={16} aria-hidden />
                                    Studio
                                </button>
                                <button
                                    type="button"
                                    className={`analytics-view-toggle__btn ${viewMode === 'classic' ? 'is-active' : ''}`}
                                    onClick={() => setViewMode('classic')}
                                >
                                    <List size={16} aria-hidden />
                                    Classique
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="analytics-hero__meta">
                    <span className="analytics-meta-pill">
                        <Calendar size={14} strokeWidth={2} aria-hidden />
                        Généré le {generatedLabel}
                    </span>
                    <span className="analytics-meta-pill">
                        Fenêtre des graphiques : <strong>{days} jours</strong>
                    </span>
                    {vizCompare && (
                        <span className="analytics-meta-pill analytics-meta-pill--accent">
                            Comparaison : <strong>N jours précédents</strong> (séries alignées par index)
                        </span>
                    )}
                </div>
            </header>

            {viewMode === 'classic' ? (
                <div ref={classicViewRef} className="analytics-classic-root">
            <section className="analytics-section analytics-section--overview" aria-labelledby="analytics-kpi-heading">
                <div className="analytics-section__head analytics-section__head--overview">
                    <div className="analytics-overview-title">
                        <span className="analytics-overview-title__badge" aria-hidden />
                        <div>
                            <h2 id="analytics-kpi-heading" className="analytics-section__title analytics-section__title--overview">
                                Vue d’ensemble
                            </h2>
                            <p className="analytics-section__hint analytics-section__hint--overview">Aperçu instantané des volumes principaux</p>
                        </div>
                    </div>
                </div>
                <div className="analytics-kpi-grid">
                    <Kpi variant="teal" icon={Users} label="Utilisateurs" value={summary.users.total} sub={`${summary.users.active} actifs`} />
                    <Kpi variant="blue" icon={Layers} label="Articles & événements" value={summary.posts.total} sub="posts non supprimés" />
                    <Kpi variant="violet" icon={MessageSquare} label="Commentaires" value={summary.comments.total} sub={`${summary.comments.withRating} avec note sur le texte`} />
                    <Kpi
                        variant="amber"
                        icon={Star}
                        label="Avis (articles & événements)"
                        value={summary.avisPosts?.avgRating != null ? `${summary.avisPosts.avgRating} / 5` : '—'}
                        sub={`${summary.avisPosts?.totalVotes ?? 0} vote(s) · étoiles sur articles & événements`}
                    />
                    <Kpi variant="rose" icon={Mail} label="Contacts" value={summary.contacts.total} sub="messages reçus" />
                    <Kpi variant="emerald" icon={Building2} label="Partenaires" value={summary.partners.total} sub="fiches" />
                    <Kpi variant="cyan" icon={ClipboardList} label="Réponses (questionnaires)" value={summary.responses.total} sub={`${summary.questionnaires.active} questionnaires actifs`} />
                    <Kpi variant="indigo" icon={Eye} label="Visites (total)" value={summary.visits.total} sub={`${summary.visits.today} aujourd’hui`} />
                    <Kpi variant="slate" icon={Fingerprint} label="Visiteurs uniques" value={summary.visits.uniqueVisitors} sub="IDs anonymisés" />
                </div>
            </section>

            <section className="analytics-section" aria-labelledby="analytics-audience-heading">
                <div className="analytics-section__head">
                    <h2 id="analytics-audience-heading" className="analytics-section__title">
                        Audience & utilisateurs
                    </h2>
                    <p className="analytics-section__hint">Inscriptions, rôles et fréquentation</p>
                </div>
                <div className="analytics-grid">
                <div className="analytics-panel" ref={refUsers}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Nouveaux utilisateurs</h3>
                            <p className="analytics-panel__subtitle">Comptage par jour sur la période sélectionnée</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('utilisateurs-par-jour.csv', [['date', 'count'], ...series.users.map((p) => [p.date, String(p.count)])])
                        }
                        onPng={() => exportPanelPng(refUsers, `utilisateurs-${days}j.png`)}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {newUsersSeriesEmpty && (
                            <p className="analytics-series-hint">
                                Aucune inscription sur les {days} derniers jours (dates en UTC). Le graphique affiche quand même un point par jour
                                à <strong>0</strong> : il compte les <em>nouveaux</em> comptes créés chaque jour, pas le total utilisateurs en base.
                            </p>
                        )}
                        <AnalyticsChartBox height={280}>
                            <AreaChart data={series.users} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <defs>
                                    <linearGradient id="gUser" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                                        <stop offset="55%" stopColor="#0d9488" stopOpacity={0.12} />
                                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} tickFormatter={(v) => v.slice(5)} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(newUsersMax)} />
                                <Tooltip contentStyle={chartTooltipContent} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    name="Nouveaux"
                                    stroke="#14b8a6"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#gUser)"
                                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: '#0d9488' }}
                                />
                            </AreaChart>
                        </AnalyticsChartBox>
                    </div>
                </div>

                <div className="analytics-panel" ref={refActivity}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Activité contenus (journalière)</h3>
                            <p className="analytics-panel__subtitle">Nouveaux utilisateurs, articles et événements créés par jour</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('activite-contenus.csv', [
                                ['date', 'utilisateurs', 'articles', 'evenements'],
                                ...activityCombo.map((r) => [r.date, String(r.utilisateurs), String(r.articles), String(r.evenements)]),
                            ])
                        }
                        onPng={() => exportPanelPng(refActivity, `activite-contenus-${days}j.png`)}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {activityEmpty && (
                            <p className="analytics-series-hint">
                                Aucun utilisateur inscrit, aucun article ni événement <strong>créés</strong> sur cette fenêtre (UTC). Les courbes sont
                                donc à 0 — ce n’est pas un bug : il n’y a tout simplement pas eu de création ce jour-là.
                            </p>
                        )}
                        <AnalyticsChartBox height={280}>
                            <LineChart data={activityCombo} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(activityMax)} />
                                <Tooltip contentStyle={chartTooltipContent} />
                                <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
                                <Line type="monotone" dataKey="utilisateurs" name="Utilisateurs" stroke="#0d9488" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                <Line type="monotone" dataKey="articles" name="Articles" stroke="#3b82f6" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                <Line type="monotone" dataKey="evenements" name="Événements" stroke="#f59e0b" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                            </LineChart>
                        </AnalyticsChartBox>
                    </div>
                </div>

                <div className="analytics-panel" ref={refArticlesEventsTrend}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Articles & événements créés (courbes)</h3>
                            <p className="analytics-panel__subtitle">
                                Comptage des <strong>créations</strong> sur la période (UTC). Choisissez l’agrégation : par jour, par mois (somme) ou par année (somme).
                            </p>
                        </div>
                        <div className="analytics-panel__header-end">
                            <div className="analytics-panel__controls">
                                <label className="analytics-granularity-label" htmlFor="analytics-articles-events-gran">
                                    Agrégation
                                </label>
                                <select
                                    id="analytics-articles-events-gran"
                                    className="form-select analytics-granularity-select"
                                    value={trendGranularity}
                                    onChange={(e) => setTrendGranularity(e.target.value)}
                                >
                                    <option value="day">Par jour</option>
                                    <option value="month">Par mois (total)</option>
                                    <option value="year">Par année (total)</option>
                                </select>
                            </div>
                            <ChartToolbar
                                onCsv={() =>
                                    downloadCsv('articles-evenements-tendance.csv', [
                                        ['periode', 'articles_crees', 'evenements_crees'],
                                        ...articlesEventsTrendData.map((r) => [r.periode, String(r.articles), String(r.evenements)]),
                                    ])
                                }
                                onPng={() => exportPanelPng(refArticlesEventsTrend, `articles-evenements-${trendGranularity}-${days}j.png`)}
                            />
                        </div>
                    </div>
                    <div className="analytics-panel__chart">
                        {articlesEventsTrendEmpty && (
                            <p className="analytics-series-hint">
                                Aucune création d’article ni d’événement sur cette fenêtre pour l’agrégation choisie.
                            </p>
                        )}
                        <AnalyticsChartBox height={280}>
                            <LineChart data={articlesEventsTrendData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(articlesEventsTrendMax)} />
                                <Tooltip contentStyle={chartTooltipContent} />
                                <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
                                <Line type="monotone" dataKey="articles" name="Articles créés" stroke="#3b82f6" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                                <Line type="monotone" dataKey="evenements" name="Événements créés" stroke="#f59e0b" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                            </LineChart>
                        </AnalyticsChartBox>
                    </div>
                </div>

                <div className="analytics-panel" ref={refRoles}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Utilisateurs par rôle</h3>
                            <p className="analytics-panel__subtitle">Répartition des comptes selon le rôle assigné</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('roles.csv', [['role', 'count'], ...rolePieData.map((r) => [r.name, String(r.value)])])
                        }
                        onPng={() => exportPanelPng(refRoles, 'repartition-roles.png')}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {rolePieData.length === 0 ? (
                            <p className="analytics-empty">Aucune donnée de rôle à afficher.</p>
                        ) : (
                            <AnalyticsChartBox height={300}>
                                <PieChart>
                                    <Pie
                                        data={rolePieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="48%"
                                        innerRadius={54}
                                        outerRadius={92}
                                        paddingAngle={3}
                                        stroke="var(--bg-elevated)"
                                        strokeWidth={2}
                                        label={false}
                                        cornerRadius={4}
                                    >
                                        {rolePieData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        verticalAlign="bottom"
                                        height={44}
                                        formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>}
                                    />
                                    <Tooltip contentStyle={chartTooltipContent} />
                                </PieChart>
                            </AnalyticsChartBox>
                        )}
                    </div>
                </div>

                <div className="analytics-panel" ref={refVisits}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Visites site (journalier)</h3>
                            <p className="analytics-panel__subtitle">
                                Pages vues enregistrées par le tracking (UTC), aligné sur la période.
                                {visitsSumPeriod > 0 && <span> Total période : {visitsSumPeriod}.</span>}
                            </p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('visites-par-jour.csv', [['date', 'count'], ...visitsSeries.map((p) => [p.date, String(p.count)])])
                        }
                        onPng={() => exportPanelPng(refVisits, `visites-${days}j.png`)}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {visitsSumPeriod === 0 && (
                            <p className="analytics-empty">
                                Aucune page vue enregistrée sur cette plage : le graphique montre tout de même la série à 0 pour chaque jour (UTC).
                                Si vous attendiez du trafic, vérifiez que le front envoie bien des événements vers{' '}
                                <code>POST /api/visits/track</code> (site public, hors admin).
                            </p>
                        )}
                        <AnalyticsChartBox height={280}>
                            <LineChart data={visitsSeries} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <defs>
                                    <linearGradient id="lineVisits" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} tickFormatter={(v) => (v && v.length >= 10 ? v.slice(5) : v)} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(visitsMax)} />
                                <Tooltip
                                    contentStyle={chartTooltipContent}
                                    formatter={(value) => [value, 'Visites']}
                                    labelFormatter={(label) => `Date ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    name="Pages vues"
                                    stroke="url(#lineVisits)"
                                    strokeLinecap="round"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: '#6366f1' }}
                                />
                            </LineChart>
                        </AnalyticsChartBox>
                    </div>
                </div>
                </div>
            </section>

            <section className="analytics-section" aria-labelledby="analytics-content-heading">
                <div className="analytics-section__head">
                    <h2 id="analytics-content-heading" className="analytics-section__title">
                        Contenu
                    </h2>
                    <p className="analytics-section__hint">Répartition par catégorie éditoriale</p>
                </div>
                <div className="analytics-grid">
                <div className="analytics-panel" ref={refArticlesStatus}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Articles par catégorie</h3>
                            <p className="analytics-panel__subtitle">Publications de type « article », groupées par catégorie</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('articles-par-categorie.csv', [
                                ['categorie', 'count'],
                                ...((summary.posts?.articlesByCategory || []).map((x) => [x.category, String(x.count)])),
                            ])
                        }
                        onPng={() => exportPanelPng(refArticlesStatus, 'articles-par-categorie.png')}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {(summary.posts?.articlesByCategory || []).length === 0 ? (
                            <p className="analytics-empty">Aucun article à afficher.</p>
                        ) : (
                            <AnalyticsChartBox height={220}>
                                <BarChart
                                    data={(summary.posts.articlesByCategory || []).map((x) => ({ categorie: x.category, count: x.count }))}
                                    layout="vertical"
                                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                                >
                                    <defs>
                                        <linearGradient id="gradArticlesBar" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#34d399" />
                                            <stop offset="100%" stopColor="#059669" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.3} horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                    <YAxis type="category" dataKey="categorie" width={140} tick={axisTick} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={chartTooltipContent} cursor={{ fill: 'rgba(5, 150, 105, 0.12)' }} />
                                    <Bar dataKey="count" name="Articles" fill="url(#gradArticlesBar)" radius={[0, 8, 8, 0]} maxBarSize={28} />
                                </BarChart>
                            </AnalyticsChartBox>
                        )}
                    </div>
                </div>

                <div className="analytics-panel" ref={refEventsStatus}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Événements par catégorie</h3>
                            <p className="analytics-panel__subtitle">Publications de type « événement », groupées par catégorie</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('evenements-par-categorie.csv', [
                                ['categorie', 'count'],
                                ...((summary.posts?.eventsByCategory || []).map((x) => [x.category, String(x.count)])),
                            ])
                        }
                        onPng={() => exportPanelPng(refEventsStatus, 'evenements-par-categorie.png')}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {(summary.posts?.eventsByCategory || []).length === 0 ? (
                            <p className="analytics-empty">Aucun événement à afficher.</p>
                        ) : (
                            <AnalyticsChartBox height={220}>
                                <BarChart
                                    data={(summary.posts.eventsByCategory || []).map((x) => ({ categorie: x.category, count: x.count }))}
                                    layout="vertical"
                                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                                >
                                    <defs>
                                        <linearGradient id="gradEventsBar" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#60a5fa" />
                                            <stop offset="100%" stopColor="#2563eb" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.3} horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                    <YAxis type="category" dataKey="categorie" width={140} tick={axisTick} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={chartTooltipContent} cursor={{ fill: 'rgba(37, 99, 235, 0.12)' }} />
                                    <Bar dataKey="count" name="Événements" fill="url(#gradEventsBar)" radius={[0, 8, 8, 0]} maxBarSize={28} />
                                </BarChart>
                            </AnalyticsChartBox>
                        )}
                    </div>
                </div>
                </div>
            </section>

            <section className="analytics-section" aria-labelledby="analytics-engagement-heading">
                <div className="analytics-section__head">
                    <h2 id="analytics-engagement-heading" className="analytics-section__title">
                        Engagement
                    </h2>
                    <p className="analytics-section__hint">Avis, contacts et questionnaires</p>
                </div>
                <div className="analytics-grid">
                <div className="analytics-panel" ref={refRatings}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Avis (notes 1–5)</h3>
                            <p className="analytics-panel__subtitle">Notes sur articles & événements (une note par utilisateur et par publication)</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('repartition-notes.csv', [['note', 'count'], ...ratingBarData.map((r) => [r.note, String(r.count)])])
                        }
                        onPng={() => exportPanelPng(refRatings, 'repartition-avis.png')}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {(summary.avisPosts?.totalVotes ?? 0) === 0 && (
                            <p className="analytics-empty">
                                Aucun vote pour l’instant : les barres affichent 0 pour chaque étoile. Les avis apparaissent lorsque des utilisateurs notent un article ou un événement sur le site.
                            </p>
                        )}
                        <AnalyticsChartBox height={280}>
                            <BarChart data={ratingBarData.length ? ratingBarData : [1, 2, 3, 4, 5].map((n) => ({ note: `${n} ★`, count: 0 }))} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <defs>
                                    <linearGradient id="gradStarsBar" x1="0" y1="1" x2="0" y2="0">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#c084fc" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="note" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                                <Tooltip contentStyle={chartTooltipContent} cursor={{ fill: 'rgba(124, 58, 237, 0.1)' }} />
                                <Bar dataKey="count" name="Nombre de votes" fill="url(#gradStarsBar)" radius={[8, 8, 4, 4]} maxBarSize={56} />
                            </BarChart>
                        </AnalyticsChartBox>
                    </div>
                </div>

                <div className="analytics-panel" ref={refContactsFlow}>
                    <div className="analytics-panel__header">
                        <div className="analytics-panel__titles">
                            <h3 className="analytics-panel__title">Contacts (flux journalier)</h3>
                            <p className="analytics-panel__subtitle">Messages reçus via le formulaire contact par jour (UTC)</p>
                        </div>
                    <ChartToolbar
                        onCsv={() =>
                            downloadCsv('contacts-par-jour.csv', [['date', 'count'], ...contactsSeriesClassic.map((c) => [c.date, String(c.count)])])
                        }
                        onPng={() => exportPanelPng(refContactsFlow, `contacts-${days}j.png`)}
                    />
                    </div>
                    <div className="analytics-panel__chart">
                        {contactsFlowEmpty && (
                            <p className="analytics-series-hint">
                                Aucun message contact sur les {days} jours affichés (UTC). La courbe peut rester à 0 si aucun envoi ce jour-là.
                            </p>
                        )}
                        <AnalyticsChartBox height={260}>
                            <LineChart data={contactsFlowData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="4 8" stroke={gridStroke} strokeOpacity={0.35} vertical={false} />
                                <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={{ stroke: gridStroke, strokeOpacity: 0.5 }} />
                                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} domain={yDomainFromMax(contactsFlowMax)} />
                                <Tooltip contentStyle={chartTooltipContent} />
                                <Legend wrapperStyle={{ paddingTop: 6 }} formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{value}</span>} />
                                <Line type="monotone" dataKey="count" name="Messages contact" stroke="#ec4899" strokeLinecap="round" dot={false} strokeWidth={2.5} />
                            </LineChart>
                        </AnalyticsChartBox>
                    </div>
                </div>
                </div>
            </section>

            <p className="analytics-footnote">
                Les graphiques journaliers incluent <strong>tous les jours</strong> de la période (UTC) : si une courbe est plate à 0, c’est qu’il n’y a
                pas eu d’événement ce jour-là (inscription, création de contenu, visite enregistrée, etc.), pas une absence de données côté API. Les
                visites sont agrégées par jour ; les avis sur le graphique en barres utilisent les notes sur les publications (articles / événements),
                pas les notes optionnelles sur le texte d’un commentaire.
            </p>
                </div>
            ) : (
                <div ref={studioRootRef} className="analytics-studio-root">
                    <AdminAnalyticsStudio
                        gridWidth={gridWidth}
                        layout={studioLayout}
                        onLayoutChange={(next) => {
                            setStudioLayout(next);
                            setActivePresetId('custom');
                        }}
                        noteTexts={noteTexts}
                        onNoteTextChange={(noteId, text) => setNoteTexts((prev) => ({ ...prev, [noteId]: text }))}
                        onAddNote={addStudioNote}
                        onRemoveNote={removeStudioNote}
                        onRemoveWidget={removeStudioWidget}
                        activePresetId={activePresetId}
                        onApplyPreset={applyStudioPreset}
                        visitsAlertBelow={visitsAlertBelow}
                        onVisitsAlertBelowChange={setVisitsAlertBelow}
                        visitsSumPeriod={visitsSumPeriod}
                        renderWidget={studioRenderWidget}
                    />
                </div>
            )}
        </div>
    );
}
