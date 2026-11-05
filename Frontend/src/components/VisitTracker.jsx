import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import visitService from '../services/visit.service';

/**
 * Enregistre une visite à chaque changement de page (hors /admin).
 * Nécessaire pour alimenter POST /api/visits/track et les graphiques « Visites site ».
 */
export default function VisitTracker() {
    const location = useLocation();
    const lastSent = useRef('');

    useEffect(() => {
        if (location.pathname.startsWith('/admin')) return;

        const page = `${location.pathname}${location.search || ''}`;
        if (page === lastSent.current) return;
        lastSent.current = page;

        visitService.trackVisit(page);
    }, [location.pathname, location.search]);

    return null;
}
