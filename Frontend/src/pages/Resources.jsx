import { useEffect, useMemo, useState } from 'react';
import { categories } from '../data/mockData';
import { ResourceCard, Toast } from '../components/UI';
import { resourcesService } from '../services';
import { downloadFileResource } from '../utils/cloudinaryDelivery';

export default function Resources() {
    const [typeFilter, setTypeFilter] = useState('');
    const [themeFilter, setThemeFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [resourceList, setResourceList] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [page, setPage] = useState(1);
    const perPage = 6;

    useEffect(() => {
        const load = async () => {
            try {
                const res = await resourcesService.getAll();
                if (res.success) setResourceList(res.data || []);
            } catch (e) {
                setToast({ show: true, message: 'Erreur chargement ressources' });
                setTimeout(() => setToast({ show: false, message: '' }), 3000);
            }
        };
        load();
    }, []);

    const detectResourceType = (resource) => {
        const ext = String(resource?.fileExtension || '').toLowerCase().replace(/^\./, '');
        if (ext && /^(png|jpe?g|gif|webp|svg)$/.test(ext)) return 'image';
        if (ext && /^(mp4|mov|avi|webm|mkv)$/.test(ext)) return 'video';
        if (ext && /^(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/.test(ext)) return 'file';
        const fullUrl = String(resource?.url || '').toLowerCase();
        if (fullUrl.includes('/raw/upload/')) return 'file';
        if (fullUrl.includes('/video/upload/')) return 'video';
        if (fullUrl.includes('/image/upload/')) return 'image';
        const declared = String(resource?.type || '').toLowerCase();
        if (['link', 'image', 'video', 'file', 'document'].includes(declared)) return declared;
        if (declared === 'doc') return 'document';
        const url = String(resource?.url || '').toLowerCase().split('?')[0];
        if (/\.(png|jpe?g|gif|webp|svg)$/.test(url)) return 'image';
        if (/\.(mp4|mov|avi|webm|mkv)$/.test(url)) return 'video';
        if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z)$/.test(url)) return 'file';
        if (/^https?:\/\//.test(url)) return 'link';
        return 'file';
    };

    const detectThemeKey = (resource) => {
        const fromTheme = String(resource?.theme || '').toLowerCase().trim();
        if (fromTheme) {
            if (fromTheme.includes('blue') || fromTheme.includes('bleu')) return 'blue';
            if (fromTheme.includes('green') || fromTheme.includes('vert')) return 'green';
            if (fromTheme.includes('circular') || fromTheme.includes('circul')) return 'circular';
        }
        const catTitle = String(
            resource?.category?.title ||
            resource?.category?.name ||
            ''
        ).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (catTitle.includes('bleu')) return 'blue';
        if (catTitle.includes('vert')) return 'green';
        if (catTitle.includes('circul')) return 'circular';
        return 'guide';
    };

    const filteredResources = useMemo(() => resourceList.filter(r => {
        const resolvedType = detectResourceType(r);
        const matchesType = !typeFilter || resolvedType === typeFilter;
        const resolvedTheme = detectThemeKey(r);
        const matchesTheme = !themeFilter || resolvedTheme === themeFilter;
        const q = String(searchQuery || '').trim().toLowerCase();
        const matchesSearch = !q ||
            String(r.title || '').toLowerCase().includes(q) ||
            String(r.description || '').toLowerCase().includes(q) ||
            String(r.fileKind || '').toLowerCase().includes(q) ||
            String(r.originalName || '').toLowerCase().includes(q);
        return matchesType && matchesTheme && matchesSearch;
    }), [resourceList, typeFilter, themeFilter, searchQuery]);
    const orderedResources = useMemo(() => {
        const ts = (r) => new Date(r?.createdAt || 0).getTime();
        return [...filteredResources].sort((a, b) => {
            const aGuide = detectThemeKey(a) === 'guide' ? 1 : 0;
            const bGuide = detectThemeKey(b) === 'guide' ? 1 : 0;
            if (aGuide !== bGuide) return bGuide - aGuide;
            return ts(b) - ts(a);
        });
    }, [filteredResources]);
    const totalPages = Math.max(1, Math.ceil(orderedResources.length / perPage));
    const paginatedResources = orderedResources.slice((page - 1) * perPage, page * perPage);

    // Sort by downloads for "Most Downloaded" section
    const mostDownloaded = useMemo(() => [...resourceList].slice(0, 4), [resourceList]);

    const handleDownload = (id, inputResource) => {
        const res = inputResource || resourceList.find((r) => r._id === id || r.id === id);
        if (!res?.url) return;

        // Compteur : +1 immédiatement à l'écran, puis valeur confirmée par le serveur
        const rid = res._id || res.id;
        const setCount = (count) => setResourceList((list) => list.map((r) => ((r._id || r.id) === rid ? { ...r, downloadsCount: count } : r)));
        setCount((Number(res.downloadsCount) || 0) + 1);
        resourcesService.recordClick(rid)
            .then((r) => { if (r?.success) setCount(r.downloadsCount); })
            .catch(() => { /* le compteur ne doit pas bloquer l'ouverture */ });

        const kind = detectResourceType(res);
        if (['link', 'image', 'video'].includes(kind)) {
            window.open(res.url, '_blank', 'noopener,noreferrer');
            setToast({ show: true, message: 'Ouverture de la ressource...' });
        } else {
            const ext = String(res.fileExtension || '').trim();
            const hasExt = /\.[a-z0-9]+$/i.test(String(res.originalName || ''));
            const fallbackName = `${String(res.title || 'resource').trim() || 'resource'}${ext || ''}`;
            const downloadName = hasExt ? res.originalName : (res.originalName ? `${res.originalName}${ext || ''}` : fallbackName);
            setToast({ show: true, message: 'Téléchargement…' });
            downloadFileResource(res.url, downloadName).then(() => {
                setToast({ show: true, message: 'Téléchargement lancé.' });
            });
        }
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };
    useEffect(() => {
        setPage(1);
    }, [typeFilter, themeFilter, searchQuery]);

    return (
        <>
            <section className="section">
                <div className="container">
                    <h1>Ressources</h1>

                    {/* Filters */}
                    <div className="table-filters" style={{ marginBottom: '2rem' }}>
                        <select
                            className="form-select"
                            style={{ width: 'auto' }}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            aria-label="Filtrer par type"
                        >
                            <option value="">Tous types</option>
                            <option value="document">Documents</option>
                            <option value="video">Vidéos</option>
                            <option value="link">Liens</option>
                            <option value="image">Images</option>
                            <option value="file">Fichiers</option>
                        </select>

                        <select
                            className="form-select"
                            style={{ width: 'auto' }}
                            value={themeFilter}
                            onChange={(e) => setThemeFilter(e.target.value)}
                            aria-label="Filtrer par thème"
                        >
                            <option value="guide">Guide de ressources</option>
                            <option value="">Tous thèmes</option>
                            {categories.map(c => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                        </select>

                        <input
                            type="search"
                            className="form-input"
                            style={{ width: '250px' }}
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Rechercher"
                        />
                    </div>

                    {/* Results */}
                    {filteredResources.length > 0 ? (
                        <div className="grid grid--4">
                            {paginatedResources.map(resource => (
                                <ResourceCard
                                    key={resource._id || resource.id}
                                    resource={resource}
                                    onDownload={handleDownload}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center" style={{ padding: '4rem' }}>
                            <p>Aucune ressource trouvée.</p>
                            <button
                                className="btn btn--outline"
                                style={{ marginTop: '1rem' }}
                                onClick={() => { setTypeFilter(''); setThemeFilter(''); setSearchQuery(''); }}
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    )}
                    {filteredResources.length > 0 && totalPages > 1 && (
                        <div className="text-center" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                            <button className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
                            <div style={{ alignSelf: 'center' }}>Page {page} / {totalPages}</div>
                            <button className="btn btn--outline btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Suivant</button>
                        </div>
                    )}
                </div>
            </section>

            {/* Most Downloaded */}
            <section className="section section--alt">
                <div className="container">
                    <div className="section__header">
                        <h2 className="section__title">Les plus téléchargées</h2>
                    </div>
                    <div className="grid grid--4">
                        {mostDownloaded.map(resource => (
                            <ResourceCard
                                key={resource._id || resource.id}
                                resource={resource}
                                onDownload={handleDownload}
                            />
                        ))}
                    </div>
                </div>
            </section>

            <Toast message={toast.message} show={toast.show} type="success" />
        </>
    );
}
