import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, RotateCcw } from 'lucide-react';
import { EventCard } from '../components/UI';
import EventsCalendar from '../components/EventsCalendar';
import { postsService, api } from '../services';

/** Jour local AAAA-MM-JJ (même date que celle affichée sur la carte) */
function toLocalDateKey(isoOrDate) {
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, ' ');

const EMPTY_FILTERS = { q: '', category: '', level: '', places: '', date: '' };

export default function Events() {
    const [events, setEvents] = useState([]);
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [pastPage, setPastPage] = useState(1);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [categories, setCategories] = useState([]);
    const [levels, setLevels] = useState([]);
    const perPage = 6;
    const navigate = useNavigate();
    const location = useLocation();

    // Session relue à chaque changement de page
    const user = useMemo(() => {
        const stored = localStorage.getItem('mbg_user');
        if (!stored) return null;
        try {
            const parsedData = JSON.parse(stored);
            return parsedData.user || parsedData;
        } catch {
            return null;
        }
    }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const loadAll = async () => {
            try {
                const merged = [];
                let page = 1;
                const limit = 100;
                while (true) {
                    const res = await postsService.getAll({ type: 'event', status: 'published', limit, page });
                    if (!res.success) break;
                    const chunk = res.data || [];
                    merged.push(...chunk);
                    if (chunk.length < limit) break;
                    page += 1;
                    if (page > 20) break;
                }
                merged.sort((a, b) => {
                    const ta = new Date(a?.eventData?.startDate || 0).getTime();
                    const tb = new Date(b?.eventData?.startDate || 0).getTime();
                    return ta - tb;
                });
                setEvents(merged);
            } catch (e) {
                console.error('Error loading events:', e);
            }
        };
        loadAll();
    }, []);

    useEffect(() => {
        Promise.all([api.get('/categories'), api.get('/levels')])
            .then(([catRes, lvlRes]) => {
                if (catRes?.success) setCategories(catRes.data || []);
                if (lvlRes?.success) setLevels(lvlRes.data || []);
            })
            .catch((e) => console.error('Error loading events meta:', e));
    }, []);

    // Tout changement de filtre ramène à la première page des deux listes
    const updateFilter = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value }));
        setUpcomingPage(1);
        setPastPage(1);
    };
    const resetFilters = () => {
        setFilters(EMPTY_FILTERS);
        setUpcomingPage(1);
        setPastPage(1);
    };
    const hasFilters = Object.values(filters).some(Boolean);

    const filteredEvents = useMemo(() => {
        const q = filters.q.trim().toLowerCase();
        return events.filter((e) => {
            const ed = e.eventData || {};
            if (q) {
                const haystack = [e.title, stripHtml(e.body), ed.location, ed.venue, e.author?.username]
                    .filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (filters.category && (e.category?._id || e.category) !== filters.category) return false;
            if (filters.level && (e.level?._id || e.level) !== filters.level) return false;
            if (filters.places) {
                const full = !!ed.capacity && (ed.registeredUsers?.length || 0) >= ed.capacity;
                if (filters.places === 'available' && full) return false;
                if (filters.places === 'full' && !full) return false;
            }
            if (filters.date && toLocalDateKey(ed.startDate) !== filters.date) return false;
            return true;
        });
    }, [events, filters]);

    const upcomingEvents = filteredEvents.filter((e) => {
        const startDate = e.eventData?.startDate;
        return startDate && new Date(startDate) > new Date();
    });

    const pastEvents = filteredEvents.filter((e) => {
        const startDate = e.eventData?.startDate;
        return startDate && new Date(startDate) <= new Date();
    });
    const upcomingTotalPages = Math.max(1, Math.ceil(upcomingEvents.length / perPage));
    const pastTotalPages = Math.max(1, Math.ceil(pastEvents.length / perPage));
    const paginatedUpcoming = upcomingEvents.slice((upcomingPage - 1) * perPage, upcomingPage * perPage);
    const paginatedPast = pastEvents.slice((pastPage - 1) * perPage, pastPage * perPage);

    return (
        <section className="section">
            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ marginBottom: '0.35rem' }}>Événements</h1>
                        <p className="section__subtitle" style={{ marginBottom: 0, textAlign: 'left' }}>

                        </p>
                    </div>
                    {/* Réservé aux utilisateurs connectés */}
                    {user && (
                        <button
                            type="button"
                            className="btn btn--primary"
                            onClick={() => navigate('/evenements/creer')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <PlusCircle size={20} />
                            Créer un événement
                        </button>
                    )}
                </div>

                {/* Filtres — même présentation que /blog : recherche en premier */}
                <div
                    className="table-filters"
                    style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', alignItems: 'center', width: '100%' }}
                >
                    <input
                        type="search"
                        className="form-input"
                        style={{ flex: '0 1 300px', minWidth: '200px', width: 'min(100%, 300px)', minHeight: '46px', fontSize: '1rem' }}
                        placeholder="Rechercher…"
                        value={filters.q}
                        onChange={(e) => updateFilter('q', e.target.value)}
                        aria-label="Rechercher dans les événements (titre, description, lieu, organisateur)"
                    />
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} aria-label="Filtrer par catégorie">
                        <option value="">Toutes catégories</option>
                        {categories.map((c) => (<option key={c._id} value={c._id}>{c.title}</option>))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={filters.level} onChange={(e) => updateFilter('level', e.target.value)} aria-label="Filtrer par niveau">
                        <option value="">Tous niveaux</option>
                        {levels.map((l) => (<option key={l._id} value={l._id}>{l.name}</option>))}
                    </select>
                    <select className="form-select" style={{ width: 'auto', minWidth: 0, flex: '0 1 auto', fontSize: '0.9rem' }} value={filters.places} onChange={(e) => updateFilter('places', e.target.value)} aria-label="Filtrer par places disponibles">
                        <option value="">Toutes les places</option>
                        <option value="available">Places disponibles</option>
                        <option value="full">Complet</option>
                    </select>
                    <input
                        type="date"
                        className="form-input"
                        style={{ width: 'auto', minWidth: '180px', flex: '0 0 auto', minHeight: '46px', padding: '0.5rem 0.75rem', fontSize: '1rem' }}
                        value={filters.date}
                        onChange={(e) => updateFilter('date', e.target.value)}
                        title="Jour de l'événement (vide = toutes les dates)"
                        aria-label="Filtrer par date de l'événement"
                    />
                    {hasFilters && (
                        <>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <RotateCcw size={14} aria-hidden="true" /> Réinitialiser
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} aria-live="polite">
                                {filteredEvents.length} résultat{filteredEvents.length > 1 ? 's' : ''}
                            </span>
                        </>
                    )}
                </div>

                <div className="events-layout">
                    <EventsCalendar events={events} />

                    <div className="events-content">
                        <h2>À venir</h2>
                        {upcomingEvents.length > 0 ? (
                            <div className="events-grid" style={{ marginBottom: '3rem', marginTop: '1rem' }}>
                                {paginatedUpcoming.map((event) => (
                                    <EventCard key={event._id || event.id} event={event} />
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '3rem' }}>
                                {hasFilters
                                    ? 'Aucun événement à venir ne correspond à votre recherche.'
                                    : 'Aucun événement à venir pour le moment.'}
                            </p>
                        )}
                        {upcomingEvents.length > 0 && upcomingTotalPages > 1 && (
                            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                <button className="btn btn--outline btn--sm" disabled={upcomingPage <= 1} onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}>
                                    Précédent
                                </button>
                                <div style={{ alignSelf: 'center' }}>
                                    Page {upcomingPage} / {upcomingTotalPages}
                                </div>
                                <button className="btn btn--outline btn--sm" disabled={upcomingPage >= upcomingTotalPages} onClick={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}>
                                    Suivant
                                </button>
                            </div>
                        )}

                        {pastEvents.length > 0 && (
                            <>
                                <h2>Archives</h2>
                                <div className="events-grid" style={{ marginTop: '1rem' }}>
                                    {paginatedPast.map((event) => (
                                        <EventCard key={event._id || event.id} event={event} />
                                    ))}
                                </div>
                                {pastTotalPages > 1 && (
                                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                        <button className="btn btn--outline btn--sm" disabled={pastPage <= 1} onClick={() => setPastPage((p) => Math.max(1, p - 1))}>
                                            Précédent
                                        </button>
                                        <div style={{ alignSelf: 'center' }}>
                                            Page {pastPage} / {pastTotalPages}
                                        </div>
                                        <button className="btn btn--outline btn--sm" disabled={pastPage >= pastTotalPages} onClick={() => setPastPage((p) => Math.min(pastTotalPages, p + 1))}>
                                            Suivant
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
