import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Globe } from 'lucide-react';

/**
 * Lien externe sûr : http(s) uniquement (jamais « javascript: »), « https:// » ajouté si le protocole manque.
 * @returns {{ href: string, host: string } | null}
 */
function safeWebsite(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
    try {
        const url = new URL(withProtocol);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return { href: url.href, host: url.hostname.replace(/^www\./i, '') };
    } catch {
        return null;
    }
}

/**
 * Colonnes sur grand écran : 4, ou 3 si la dernière ligne est mieux remplie
 * (ex. 9 partenaires → 3 × 3 plutôt que 4 + 4 + 1).
 */
function desktopColumns(count) {
    const fill = (cols) => (count % cols === 0 ? 1 : (count % cols) / cols);
    return count > 4 && fill(3) > fill(4) ? 3 : 4;
}

/** Initiales affichées si le logo est absent ou ne se charge pas */
function monogram(text) {
    const t = String(text || '').trim();
    if (t.length <= 5) return t.toUpperCase();
    return t.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Apparition progressive au défilement : chaque élément [data-reveal] du conteneur apparaît
 * quand il entre dans le viewport, avec un décalage (stagger) entre les éléments révélés ensemble.
 * Sans IntersectionObserver ou avec « mouvement réduit », tout est affiché immédiatement.
 */
function useScrollReveal(rootRef, revealKey) {
    // useLayoutEffect : l'état « masqué » est posé avant l'affichage (pas de clignotement)
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const items = Array.from(root.querySelectorAll('[data-reveal]:not(.is-revealed)'));
        if (items.length === 0) return undefined;

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || typeof IntersectionObserver === 'undefined') {
            items.forEach((el) => el.classList.add('is-revealed'));
            return undefined;
        }

        root.classList.add('is-reveal-armed');
        const order = new Map(items.map((el, i) => [el, i]));
        const observer = new IntersectionObserver(
            (entries) => {
                entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => order.get(a.target) - order.get(b.target))
                    .forEach((entry, i) => {
                        entry.target.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 90}ms`);
                        entry.target.classList.add('is-revealed');
                        observer.unobserve(entry.target);
                    });
            },
            { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
        );
        items.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [rootRef, revealKey]);
}

function PartnerCard({ partner }) {
    const [logoFailed, setLogoFailed] = useState(false);
    const title = partner.shortName || partner.name;
    const fullName = partner.shortName && partner.name && partner.shortName !== partner.name ? partner.name : '';
    const site = safeWebsite(partner.website);

    return (
        <li className="pshow__item" data-reveal>
            <article className={`pcard${site ? ' pcard--link' : ''}`}>
                <div className="pcard__logo">
                    {partner.logo && !logoFailed ? (
                        <img
                            src={partner.logo}
                            alt={`Logo ${title}`}
                            loading="lazy"
                            decoding="async"
                            onError={() => setLogoFailed(true)}
                        />
                    ) : (
                        <span className="pcard__monogram" aria-hidden="true">{monogram(title)}</span>
                    )}
                </div>

                <div className="pcard__body">
                    {partner.role && <span className="pcard__role">{partner.role}</span>}
                    <h3 className="pcard__title">{title}</h3>
                    {fullName && <p className="pcard__fullname">{fullName}</p>}
                    {partner.description && <p className="pcard__desc">{partner.description}</p>}
                </div>

                {/* Lien « étiré » : toute la carte est cliquable, le texte reste lisible par les lecteurs d'écran */}
                {site && (
                    <a className="pcard__link" href={site.href} target="_blank" rel="noopener noreferrer">
                        <Globe size={14} aria-hidden="true" />
                        <span className="pcard__host">{site.host}</span>
                        <span className="sr-only"> — site de {title} (nouvel onglet)</span>
                        <ArrowUpRight size={16} className="pcard__arrow" aria-hidden="true" />
                    </a>
                )}
            </article>
        </li>
    );
}

/**
 * Section « Nos Partenaires » de l'accueil : grille de cartes, apparition progressive au défilement.
 */
export default function PartnersShowcase({ partners = [] }) {
    const sectionRef = useRef(null);
    useScrollReveal(sectionRef, partners.map((p) => p.id).join('|'));

    if (partners.length === 0) return null;

    return (
        <section ref={sectionRef} className="section section--alt pshow" aria-labelledby="partners-title">
            <div className="container">
                <div className="section__header" data-reveal>
                    <h2 id="partners-title" className="section__title">Nos Partenaires</h2>
                    <p className="section__subtitle">
                        Institutions, établissements universitaires et entreprises qui accompagnent la dynamique Mahdia Blue &amp; Green.
                    </p>
                </div>
                <ul className={`pshow__grid${desktopColumns(partners.length) === 3 ? ' pshow__grid--3-cols' : ''}`}>
                    {partners.map((p) => (
                        <PartnerCard key={p.id} partner={p} />
                    ))}
                </ul>
            </div>
        </section>
    );
}
