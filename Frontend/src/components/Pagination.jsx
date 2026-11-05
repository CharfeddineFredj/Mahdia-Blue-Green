import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Liste des pages à afficher : 1 … 4 5 6 … 12 (toujours première, dernière et voisines de la page courante).
 * @returns {(number|'ellipsis-left'|'ellipsis-right')[]}
 */
function getPageItems(page, totalPages, siblings = 1) {
    const totalSlots = siblings * 2 + 5; // premières/dernières + courante + voisines + 2 ellipses
    if (totalPages <= totalSlots) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const left = Math.max(page - siblings, 1);
    const right = Math.min(page + siblings, totalPages);
    const showLeftDots = left > 2;
    const showRightDots = right < totalPages - 1;

    if (!showLeftDots) {
        const count = siblings * 2 + 3;
        return [...Array.from({ length: count }, (_, i) => i + 1), 'ellipsis-right', totalPages];
    }
    if (!showRightDots) {
        const count = siblings * 2 + 3;
        return [1, 'ellipsis-left', ...Array.from({ length: count }, (_, i) => totalPages - count + 1 + i)];
    }
    return [1, 'ellipsis-left', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'ellipsis-right', totalPages];
}

/**
 * Pagination numérotée (pages, flèches, ellipses) avec résumé « X–Y sur N ».
 * Ne s'affiche pas s'il n'y a qu'une page.
 */
export default function Pagination({ currentPage, totalItems, pageSize, onPageChange, itemLabel = 'éléments', className = '' }) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalPages <= 1) return null;

    const page = Math.min(Math.max(1, currentPage), totalPages);
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);

    return (
        <nav className={`pager ${className}`.trim()} aria-label="Pagination">
            <p className="pager__summary">
                <strong>{from}</strong>–<strong>{to}</strong> sur <strong>{totalItems}</strong> {itemLabel}
            </p>
            <ul className="pager__list">
                <li>
                    <button
                        type="button"
                        className="pager__btn pager__btn--nav"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        aria-label="Page précédente"
                    >
                        <ChevronLeft size={16} aria-hidden="true" />
                    </button>
                </li>
                {getPageItems(page, totalPages).map((item) =>
                    typeof item === 'number' ? (
                        <li key={item}>
                            <button
                                type="button"
                                className={`pager__btn ${item === page ? 'pager__btn--active' : ''}`}
                                onClick={() => onPageChange(item)}
                                aria-label={`Page ${item}`}
                                aria-current={item === page ? 'page' : undefined}
                            >
                                {item}
                            </button>
                        </li>
                    ) : (
                        <li key={item} className="pager__ellipsis" aria-hidden="true">…</li>
                    )
                )}
                <li>
                    <button
                        type="button"
                        className="pager__btn pager__btn--nav"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        aria-label="Page suivante"
                    >
                        <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </li>
            </ul>
        </nav>
    );
}
