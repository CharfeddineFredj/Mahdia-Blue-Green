/**
 * Fusionne les séries « articles créés » et « événements créés » pour un graphique combiné.
 * @param {Array<{ date: string, count: number }>} articlesPoints
 * @param {Array<{ date: string, count: number }>} eventsPoints
 * @param {'day' | 'month' | 'year'} granularity
 * @returns {Array<{ cle: string, periode: string, label: string, articles: number, evenements: number }>}
 */
export function mergeArticlesEventsTrend(articlesPoints, eventsPoints, granularity) {
    const art = Array.isArray(articlesPoints) ? articlesPoints : [];
    const ev = Array.isArray(eventsPoints) ? eventsPoints : [];

    if (granularity === 'day') {
        return art.map((p, i) => ({
            cle: p.date,
            periode: p.date,
            label: p.date && p.date.length >= 10 ? p.date.slice(5) : p.date,
            articles: Number(p.count) || 0,
            evenements: Number(ev[i]?.count) || 0,
        }));
    }

    const sumByBucket = (points, bucketKey) => {
        const m = new Map();
        for (const p of points) {
            const d = p.date;
            if (!d || typeof d !== 'string') continue;
            const key = bucketKey(d);
            m.set(key, (m.get(key) || 0) + (Number(p.count) || 0));
        }
        return m;
    };

    const bucket =
        granularity === 'month' ? (d) => d.slice(0, 7) : (d) => d.slice(0, 4);
    const ma = sumByBucket(art, bucket);
    const me = sumByBucket(ev, bucket);
    const keys = [...new Set([...ma.keys(), ...me.keys()])].sort();

    const formatLabel = (k) => {
        if (granularity === 'month' && k.length >= 7) {
            return `${k.slice(5, 7)}/${k.slice(0, 4)}`;
        }
        return k;
    };

    return keys.map((k) => ({
        cle: k,
        periode: k,
        label: formatLabel(k),
        articles: ma.get(k) || 0,
        evenements: me.get(k) || 0,
    }));
}
