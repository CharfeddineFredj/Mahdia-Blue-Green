import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Carrousel horizontal à défilement manuel (aucun défilement automatique) :
 * flèches, glisser à la souris, tactile, clavier (← →), aimantation des cartes et barre de progression.
 * Les enfants directs deviennent les éléments du carrousel.
 */
export default function ScrollCarousel({ children, label = 'Carrousel', className = '' }) {
    const trackRef = useRef(null);
    const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
    const [state, setState] = useState({ canPrev: false, canNext: false, thumb: 100, offset: 0, scrollable: false });

    const update = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        // Tolérance de quelques pixels : arrondis et aimantation ne doivent pas faire croire à un défilement
        const EDGE = 8;
        const scrollable = max > EDGE;
        setState({
            scrollable,
            canPrev: el.scrollLeft > EDGE,
            canNext: el.scrollLeft < max - EDGE,
            thumb: scrollable ? (el.clientWidth / el.scrollWidth) * 100 : 100,
            offset: scrollable ? (el.scrollLeft / el.scrollWidth) * 100 : 0,
        });
    }, []);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return undefined;
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, [update, children]);

    const page = (dir) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
    };

    // Glisser à la souris (le tactile utilise le défilement natif)
    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        const el = trackRef.current;
        drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
    };
    const onPointerMove = (e) => {
        const d = drag.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX;
        if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true;
            trackRef.current.classList.add('hscroll__track--dragging');
            trackRef.current.setPointerCapture?.(e.pointerId);
        }
        if (d.moved) trackRef.current.scrollLeft = d.startLeft - dx;
    };
    const endDrag = () => {
        if (!drag.current.active) return;
        drag.current.active = false;
        trackRef.current?.classList.remove('hscroll__track--dragging');
    };
    // Un glisser ne doit pas déclencher le clic sur la carte (ouverture de la fiche)
    const onClickCapture = (e) => {
        if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
    };

    return (
        <div className={`hscroll ${className}`.trim()} role="region" aria-roledescription="carrousel" aria-label={label}>
            {state.scrollable && (
                <div className="hscroll__controls">
                    <button type="button" className="hscroll__btn" onClick={() => page(-1)} disabled={!state.canPrev} aria-label="Précédent">
                        <ChevronLeft size={20} />
                    </button>
                    <button type="button" className="hscroll__btn" onClick={() => page(1)} disabled={!state.canNext} aria-label="Suivant">
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            <div className="hscroll__viewport">
                <span className={`hscroll__fade hscroll__fade--left ${state.canPrev ? 'is-visible' : ''}`} aria-hidden="true" />
                <div
                    ref={trackRef}
                    className="hscroll__track"
                    tabIndex={state.scrollable ? 0 : -1}
                    onKeyDown={onKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerLeave={endDrag}
                    onClickCapture={onClickCapture}
                    onDragStart={(e) => e.preventDefault()}
                >
                    {children}
                </div>
                <span className={`hscroll__fade hscroll__fade--right ${state.canNext ? 'is-visible' : ''}`} aria-hidden="true" />
            </div>

            {state.scrollable && (
                <div className="hscroll__progress" aria-hidden="true">
                    <span className="hscroll__progress-thumb" style={{ width: `${state.thumb}%`, left: `${state.offset}%` }} />
                </div>
            )}
        </div>
    );
}
