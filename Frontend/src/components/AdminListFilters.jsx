/**
 * Barre recherche + plage de dates ou une seule date + champs optionnels (children).
 */
export default function AdminListFilters({
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Rechercher…',
    dateMode = 'range',
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    singleDate,
    onSingleDateChange,
    singleDateLabel = 'Date',
    singleDateTitle,
    disabled = false,
    children = null,
    idPrefix = 'admin-filter',
    title = 'Recherche et filtres',
}) {
    const searchStyle = { width: '220px', minWidth: 'min(100%, 268px)', flex: '0 1 220px' };
    const singleDateInputStyle = dateMode === 'single' ? { width: 'auto', minWidth: '200px' } : undefined;

    return (
        <div className="admin-filters table-filters" aria-label={title}>
            <input
                id={`${idPrefix}-q`}
                type="search"
                className="form-input admin-filters__input admin-filters__input--search"
                style={searchStyle}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                disabled={disabled}
                autoComplete="off"
                aria-label="Recherche"
            />
            {dateMode === 'single' ? (
                <input
                    id={`${idPrefix}-date`}
                    type="date"
                    className="form-input admin-filters__input"
                    style={singleDateInputStyle}
                    value={singleDate ?? ''}
                    onChange={(e) => onSingleDateChange?.(e.target.value)}
                    disabled={disabled}
                    title={singleDateTitle}
                    aria-label={singleDateTitle || singleDateLabel}
                />
            ) : (
                <>
                    <input
                        id={`${idPrefix}-from`}
                        type="date"
                        className="form-input admin-filters__input"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        disabled={disabled}
                        aria-label="Date de début"
                    />
                    <input
                        id={`${idPrefix}-to`}
                        type="date"
                        className="form-input admin-filters__input"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                        disabled={disabled}
                        aria-label="Date de fin"
                    />
                </>
            )}
            {children}
        </div>
    );
}
