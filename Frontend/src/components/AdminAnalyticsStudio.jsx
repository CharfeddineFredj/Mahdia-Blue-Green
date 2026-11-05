import { useCallback, useMemo } from 'react';
import ReactGridLayout from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
    LayoutGrid,
    Plus,
    Pin,
    Trash2,
    GripVertical,
    Bookmark,
    AlertTriangle,
} from 'lucide-react';

export const STUDIO_STORAGE_KEY = 'mbg_analytics_studio_v1';

export const STUDIO_WIDGET_IDS = [
    { id: 'kpis', title: 'Indicateurs clés', desc: 'Vue synthèse (totaux)' },
    { id: 'users', title: 'Nouveaux utilisateurs', desc: 'Série journalière' },
    { id: 'articlesEventsTrend', title: 'Articles & événements (courbes)', desc: 'Jour / mois / année' },
    { id: 'activity', title: 'Activité contenus', desc: 'Utilisateurs, articles, événements' },
    { id: 'roles', title: 'Utilisateurs par rôle', desc: 'Répartition' },
    { id: 'visits', title: 'Visites site', desc: 'Pages vues / jour' },
    { id: 'articlesCat', title: 'Articles par catégorie', desc: 'Barres horizontales' },
    { id: 'eventsCat', title: 'Événements par catégorie', desc: 'Barres horizontales' },
    { id: 'ratings', title: 'Avis (1–5)', desc: 'Votes sur publications' },
    { id: 'contactsFlow', title: 'Contacts (messages)', desc: 'Formulaire contact par jour' },
];

export const STUDIO_PRESETS = [
    {
        id: 'direction',
        name: 'Vue direction',
        layout: [
            { i: 'kpis', x: 0, y: 0, w: 12, h: 5, minW: 6, minH: 3 },
            { i: 'visits', x: 0, y: 5, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'users', x: 6, y: 5, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'articlesEventsTrend', x: 0, y: 14, w: 12, h: 9, minW: 6, minH: 6 },
            { i: 'activity', x: 0, y: 23, w: 12, h: 9, minW: 6, minH: 6 },
            { i: 'ratings', x: 0, y: 32, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'contactsFlow', x: 6, y: 32, w: 6, h: 9, minW: 4, minH: 6 },
        ],
    },
    {
        id: 'operation',
        name: 'Vue opérationnelle',
        layout: [
            { i: 'kpis', x: 0, y: 0, w: 12, h: 5, minW: 6, minH: 3 },
            { i: 'users', x: 0, y: 5, w: 4, h: 9, minW: 3, minH: 6 },
            { i: 'activity', x: 4, y: 5, w: 4, h: 9, minW: 3, minH: 6 },
            { i: 'articlesEventsTrend', x: 8, y: 5, w: 4, h: 9, minW: 3, minH: 6 },
            { i: 'visits', x: 0, y: 14, w: 12, h: 8, minW: 4, minH: 6 },
            { i: 'contactsFlow', x: 0, y: 22, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'roles', x: 6, y: 22, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'articlesCat', x: 0, y: 31, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'eventsCat', x: 6, y: 31, w: 6, h: 8, minW: 4, minH: 6 },
        ],
    },
    {
        id: 'evenements',
        name: 'Vue événements & contenu',
        layout: [
            { i: 'kpis', x: 0, y: 0, w: 12, h: 4, minW: 6, minH: 3 },
            { i: 'eventsCat', x: 0, y: 4, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'articlesCat', x: 6, y: 4, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'articlesEventsTrend', x: 0, y: 13, w: 12, h: 9, minW: 6, minH: 6 },
            { i: 'activity', x: 0, y: 22, w: 12, h: 9, minW: 6, minH: 6 },
            { i: 'ratings', x: 0, y: 31, w: 6, h: 9, minW: 4, minH: 6 },
            { i: 'users', x: 6, y: 31, w: 6, h: 9, minW: 4, minH: 6 },
        ],
    },
    {
        id: 'full',
        name: 'Tout afficher',
        layout: [
            { i: 'kpis', x: 0, y: 0, w: 12, h: 5, minW: 6, minH: 3 },
            { i: 'users', x: 0, y: 5, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'activity', x: 6, y: 5, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'articlesEventsTrend', x: 0, y: 13, w: 12, h: 8, minW: 6, minH: 6 },
            { i: 'roles', x: 0, y: 21, w: 4, h: 8, minW: 3, minH: 6 },
            { i: 'visits', x: 4, y: 21, w: 4, h: 8, minW: 3, minH: 6 },
            { i: 'articlesCat', x: 8, y: 21, w: 4, h: 8, minW: 3, minH: 6 },
            { i: 'eventsCat', x: 0, y: 29, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'ratings', x: 6, y: 29, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'contactsFlow', x: 0, y: 37, w: 12, h: 8, minW: 6, minH: 6 },
        ],
    },
];

export function loadStudioState() {
    try {
        const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || o.version !== 1) return null;
        return o;
    } catch {
        return null;
    }
}

export function saveStudioState(data) {
    try {
        localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ version: 1, ...data }));
    } catch {
        /* ignore quota */
    }
}

/**
 * Studio modulaire : grille drag & resize, palette, presets, annotations.
 */
export default function AdminAnalyticsStudio({
    gridWidth,
    layout,
    onLayoutChange,
    noteTexts,
    onNoteTextChange,
    onAddNote,
    onRemoveNote,
    onRemoveWidget,
    activePresetId,
    onApplyPreset,
    visitsAlertBelow,
    onVisitsAlertBelowChange,
    visitsSumPeriod,
    renderWidget,
}) {
    const onLayout = useCallback(
        (next) => {
            onLayoutChange(next);
        },
        [onLayoutChange]
    );

    const paletteEntries = useMemo(() => {
        const onCanvas = new Set(layout.map((l) => l.i));
        return STUDIO_WIDGET_IDS.filter((w) => !onCanvas.has(w.id));
    }, [layout]);

    const addWidget = (id) => {
        const maxY = layout.length ? Math.max(...layout.map((l) => l.y + l.h)) : 0;
        const defaults = { w: 6, h: 8, minW: 4, minH: 6 };
        onLayoutChange([
            ...layout,
            {
                i: id,
                x: 0,
                y: maxY,
                w: defaults.w,
                h: defaults.h,
                minW: defaults.minW,
                minH: defaults.minH,
            },
        ]);
    };

    return (
        <div className="analytics-studio">
            <div className="analytics-studio__toolbar">
                <div className="analytics-studio__toolbar-row">
                    <span className="analytics-studio__label">
                        <LayoutGrid size={16} aria-hidden />
                        Disposition
                    </span>
                    <div className="analytics-studio__presets">
                        {STUDIO_PRESETS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className={`btn btn--sm ${activePresetId === p.id ? 'btn--primary' : 'btn--outline'}`}
                                onClick={() => onApplyPreset(p.id)}
                            >
                                <Bookmark size={14} style={{ marginRight: 4 }} aria-hidden />
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="analytics-studio__toolbar-row analytics-studio__toolbar-row--secondary">
                    <label className="analytics-studio__alert">
                        <AlertTriangle size={16} aria-hidden />
                        Alerte visites (période) si total &lt;
                        <input
                            type="number"
                            min={0}
                            className="form-input analytics-studio__alert-input"
                            placeholder="ex. 50"
                            value={visitsAlertBelow}
                            onChange={(e) => onVisitsAlertBelowChange(e.target.value)}
                        />
                        {visitsAlertBelow !== '' &&
                            Number(visitsSumPeriod) < Number(visitsAlertBelow) && (
                                <span className="analytics-studio__alert-live">Sous le seuil</span>
                            )}
                    </label>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={onAddNote}>
                        <Pin size={14} style={{ marginRight: 4 }} aria-hidden />
                        Annotation
                    </button>
                </div>
            </div>

            <div className="analytics-studio__main">
                <aside className="analytics-studio__palette" aria-label="Bibliothèque de blocs">
                    <h3 className="analytics-studio__palette-title">Bibliothèque</h3>
                    <p className="analytics-studio__palette-hint">
                        Glissez l’ordre sur la grille ; ajoutez un bloc ci-dessous. Poignée ⋮⋮ pour déplacer, coin pour redimensionner.
                    </p>
                    {paletteEntries.length === 0 ? (
                        <p className="analytics-studio__palette-empty">Tous les blocs sont sur le canevas.</p>
                    ) : (
                        <ul className="analytics-studio__palette-list">
                            {paletteEntries.map((w) => (
                                <li key={w.id}>
                                    <button type="button" className="analytics-studio__palette-add" onClick={() => addWidget(w.id)}>
                                        <Plus size={16} aria-hidden />
                                        <span>
                                            <strong>{w.title}</strong>
                                            <small>{w.desc}</small>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <div className="analytics-studio__canvas-wrap">
                    <ReactGridLayout
                        className="analytics-studio__grid"
                        width={gridWidth}
                        cols={12}
                        rowHeight={36}
                        margin={[12, 12]}
                        layout={layout}
                        onLayoutChange={onLayout}
                        draggableHandle=".analytics-studio__drag-handle"
                        compactType="vertical"
                        isBounded={false}
                    >
                        {layout.map((item) => {
                            if (item.i.startsWith('note-')) {
                                return (
                                    <div key={item.i} className="analytics-studio__item analytics-studio__item--note">
                                        <div className="analytics-studio__item-head">
                                            <span className="analytics-studio__drag-handle" title="Déplacer">
                                                <GripVertical size={18} aria-hidden />
                                            </span>
                                            <span className="analytics-studio__item-title">Annotation</span>
                                            <button
                                                type="button"
                                                className="btn btn--ghost btn--sm analytics-studio__remove"
                                                onClick={() => onRemoveNote(item.i)}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={16} aria-hidden />
                                            </button>
                                        </div>
                                        <textarea
                                            className="form-input analytics-studio__note-area"
                                            rows={4}
                                            placeholder="Ex. pic le 12/04 = campagne newsletter…"
                                            value={noteTexts[item.i] || ''}
                                            onChange={(e) => onNoteTextChange(item.i, e.target.value)}
                                        />
                                    </div>
                                );
                            }
                            return (
                                <div key={item.i} className="analytics-studio__item">
                                    <div className="analytics-studio__item-head">
                                        <span className="analytics-studio__drag-handle" title="Déplacer">
                                            <GripVertical size={18} aria-hidden />
                                        </span>
                                        <span className="analytics-studio__item-title">
                                            {STUDIO_WIDGET_IDS.find((w) => w.id === item.i)?.title || item.i}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn btn--ghost btn--sm analytics-studio__remove"
                                            onClick={() => onRemoveWidget(item.i)}
                                            title="Retirer du canevas"
                                        >
                                            <Trash2 size={16} aria-hidden />
                                        </button>
                                    </div>
                                    <div className="analytics-studio__item-body">{renderWidget(item.i)}</div>
                                </div>
                            );
                        })}
                    </ReactGridLayout>
                </div>
            </div>
        </div>
    );
}
