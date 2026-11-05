/**
 * Pagination style « articles » (Blog / liste publique) : Précédent, indicateur Page X / Y, Suivant.
 * @param {object} props
 * @param {number} props.currentPage — 1-based
 * @param {number} props.totalPages
 * @param {number} [props.totalItems]
 * @param {number} [props.pageSize]
 * @param {(page: number) => void} props.onPageChange
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export default function AdminPagination({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    disabled = false,
    className = ''
}) {
    const safeTotal = Math.max(1, totalPages || 1);
    const page = Math.min(Math.max(1, currentPage || 1), safeTotal);

    const from = totalItems != null && pageSize != null ? Math.min((page - 1) * pageSize + 1, totalItems) : null;
    const to = totalItems != null && pageSize != null ? Math.min(page * pageSize, totalItems) : null;

    if (totalItems === 0 || (safeTotal <= 1 && totalItems == null)) {
        return null;
    }

    const summaryEl =
        from != null && to != null && totalItems != null ? (
            <p className="pagination-bar__summary">
                Affichage de <strong>{from}</strong> à <strong>{to}</strong> sur <strong>{totalItems}</strong>
            </p>
        ) : totalItems != null ? (
            <p className="pagination-bar__summary">
                <strong>{totalItems}</strong> résultat{totalItems > 1 ? 's' : ''}
            </p>
        ) : null;

    if (safeTotal <= 1) {
        return summaryEl ? (
            <div className={`pagination-bar pagination-bar--admin pagination-bar--meta ${className}`.trim()}>{summaryEl}</div>
        ) : null;
    }

    return (
        <nav className={`pagination-bar pagination-bar--admin ${className}`.trim()} aria-label="Pagination">
            {summaryEl}
            <div className="pagination-bar__controls">
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={disabled || page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    Précédent
                </button>
                <span className="pagination-bar__page-ind" aria-live="polite">
                    Page {page} / {safeTotal}
                </span>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={disabled || page >= safeTotal}
                    onClick={() => onPageChange(page + 1)}
                >
                    Suivant
                </button>
            </div>
        </nav>
    );
}
