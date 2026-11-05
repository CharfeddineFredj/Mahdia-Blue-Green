import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, CalendarDays, ArrowRight } from 'lucide-react';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function localDateKey(d) {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function eventUrlId(event) {
    return event.eventNumber != null ? String(event.eventNumber) : String(event._id || event.id || event.slug || '');
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const timeFr = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Fin effective d'un événement (fin, sinon début) */
const endTime = (ev) => new Date(ev.eventData?.endDate || ev.eventData?.startDate).getTime();

/**
 * Calendrier mensuel des événements : grille avec indicateurs, navigation, et agenda du jour sélectionné.
 */
export default function EventsCalendar({ events = [] }) {
    // Instant de référence figé au montage (rendu pur)
    const [now] = useState(() => Date.now());
    const todayKey = localDateKey(now);
    const [month, setMonth] = useState(() => new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1));
    const [selectedKey, setSelectedKey] = useState(todayKey);

    const eventsByDay = useMemo(() => {
        const map = new Map();
        for (const e of events) {
            const key = e?.eventData?.startDate ? localDateKey(e.eventData.startDate) : null;
            if (!key) continue;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(e);
        }
        for (const list of map.values()) {
            list.sort((a, b) => new Date(a.eventData.startDate) - new Date(b.eventData.startDate));
        }
        return map;
    }, [events]);

    // 6 semaines complètes (lundi → dimanche), jours des mois voisins inclus
    const days = useMemo(() => {
        const y = month.getFullYear();
        const m = month.getMonth();
        const firstDow = new Date(y, m, 1).getDay();
        const offset = firstDow === 0 ? 6 : firstDow - 1;
        const start = new Date(y, m, 1 - offset);
        return Array.from({ length: 42 }, (_, i) => {
            const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const key = localDateKey(date);
            return { date, key, inMonth: date.getMonth() === m, dayEvents: eventsByDay.get(key) || [] };
        });
    }, [month, eventsByDay]);

    const monthCount = useMemo(
        () => days.filter((d) => d.inMonth).reduce((n, d) => n + d.dayEvents.length, 0),
        [days]
    );

    const selectedEvents = eventsByDay.get(selectedKey) || [];
    // Premier événement à venir hors du jour sélectionné (liste triée par date)
    const nextEvent = events
        .filter((e) => e.eventData?.startDate && new Date(e.eventData.startDate).getTime() > now)
        .sort((a, b) => new Date(a.eventData.startDate) - new Date(b.eventData.startDate))
        .find((e) => localDateKey(e.eventData.startDate) !== selectedKey);

    const selectDay = (date) => {
        const key = localDateKey(date);
        setSelectedKey(key);
        if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
            setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }
    };

    const goToday = () => selectDay(new Date());
    const shiftMonth = (delta) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

    const selectedDate = new Date(`${selectedKey}T12:00:00`);
    const selectedLabel = capitalize(selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));

    return (
        <aside className="ecal" aria-label="Calendrier des événements">
            <div className="ecal__header">
                <div className="ecal__title-wrap">
                    <h2 className="ecal__title">{capitalize(month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</h2>
                    <span className="ecal__subtitle">
                        {monthCount === 0 ? 'Aucun événement ce mois-ci' : `${monthCount} événement${monthCount > 1 ? 's' : ''} ce mois-ci`}
                    </span>
                </div>
                <div className="ecal__nav">
                    <button type="button" className="ecal__nav-btn" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
                        <ChevronLeft size={18} />
                    </button>
                    <button type="button" className="ecal__today-btn" onClick={goToday}>Aujourd&apos;hui</button>
                    <button type="button" className="ecal__nav-btn" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="ecal__grid" role="grid">
                {WEEKDAYS.map((d) => (
                    <div key={d} className="ecal__weekday" role="columnheader">{d}</div>
                ))}
                {days.map(({ date, key, inMonth, dayEvents }) => {
                    const count = dayEvents.length;
                    const isSelected = key === selectedKey;
                    const isToday = key === todayKey;
                    const upcoming = dayEvents.filter((e) => endTime(e) >= now).length;
                    const label = `${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${count ? `, ${count} événement${count > 1 ? 's' : ''}` : ''}`;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="gridcell"
                            className={[
                                'ecal__day',
                                !inMonth && 'ecal__day--outside',
                                isToday && 'ecal__day--today',
                                isSelected && 'ecal__day--selected',
                                count > 0 && 'ecal__day--has-events',
                            ].filter(Boolean).join(' ')}
                            onClick={() => selectDay(date)}
                            aria-pressed={isSelected}
                            aria-label={label}
                        >
                            <span className="ecal__day-num">{date.getDate()}</span>
                            {count > 0 && (
                                <span className="ecal__dots" aria-hidden="true">
                                    {dayEvents.slice(0, 3).map((e, i) => (
                                        <span key={i} className={`ecal__dot ${endTime(e) >= now ? 'ecal__dot--upcoming' : 'ecal__dot--past'}`} />
                                    ))}
                                    {count > 3 && <span className="ecal__more">+{count - 3}</span>}
                                </span>
                            )}
                            {upcoming > 0 && <span className="sr-only">{upcoming} à venir</span>}
                        </button>
                    );
                })}
            </div>

            <div className="ecal__legend" aria-hidden="true">
                <span><span className="ecal__dot ecal__dot--upcoming" /> À venir</span>
                <span><span className="ecal__dot ecal__dot--past" /> Passé</span>
                <span><span className="ecal__legend-today" /> Aujourd&apos;hui</span>
            </div>

            {/* Agenda du jour sélectionné */}
            <div className="ecal__agenda" aria-live="polite">
                <div className="ecal__agenda-head">
                    <CalendarDays size={16} aria-hidden="true" />
                    <span>{selectedLabel}</span>
                    {selectedEvents.length > 0 && <span className="ecal__agenda-count">{selectedEvents.length}</span>}
                </div>

                {selectedEvents.length === 0 ? (
                    <div className="ecal__empty">
                        <p>Aucun événement ce jour-là.</p>
                        {nextEvent && (
                            <button type="button" className="ecal__next" onClick={() => selectDay(new Date(nextEvent.eventData.startDate))}>
                                Prochain événement : {new Date(nextEvent.eventData.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                <ArrowRight size={14} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="ecal__list">
                        {selectedEvents.map((ev) => {
                            const st = ev.eventData.startDate;
                            const en = ev.eventData.endDate;
                            const past = endTime(ev) < now;
                            return (
                                <li key={ev._id || ev.id}>
                                    <Link to={`/evenement/${eventUrlId(ev)}`} className={`ecal__item ${past ? 'ecal__item--past' : ''}`}>
                                        <span className="ecal__item-bar" aria-hidden="true" />
                                        <span className="ecal__item-body">
                                            <span className="ecal__item-time">
                                                <Clock size={12} aria-hidden="true" />
                                                {timeFr(st)}{en && new Date(en).getTime() !== new Date(st).getTime() ? ` – ${timeFr(en)}` : ''}
                                                {past && <span className="ecal__item-badge">Terminé</span>}
                                            </span>
                                            <span className="ecal__item-title">{ev.title}</span>
                                            {ev.eventData?.location && (
                                                <span className="ecal__item-loc">
                                                    <MapPin size={12} aria-hidden="true" />
                                                    {ev.eventData.location}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </aside>
    );
}
