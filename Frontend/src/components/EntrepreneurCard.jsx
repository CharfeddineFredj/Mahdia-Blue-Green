import { useState } from 'react';
import { Quote } from 'lucide-react';

const initials = (name) =>
    String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Variante de couleur stable par personne (0–3), déduite du nom */
const colorVariant = (name) => [...String(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 4;

/**
 * Carte témoignage d'entrepreneur : citation mise en avant, auteur (photo ou initiales), rôle et organisation.
 */
export default function EntrepreneurCard({ entrepreneur }) {
    const [photoFailed, setPhotoFailed] = useState(false);
    const avatar = entrepreneur.avatar?.trim();
    const meta = [entrepreneur.role, entrepreneur.organization].filter(Boolean).join(' · ');

    return (
        <article className="ecard">
            <span className="ecard__quote-icon" aria-hidden="true">
                <Quote size={20} />
            </span>

            {entrepreneur.quote ? (
                <blockquote className="ecard__quote">
                    <p>{entrepreneur.quote}</p>
                </blockquote>
            ) : (
                <p className="ecard__quote ecard__quote--empty">Membre de la communauté Mahdia Blue &amp; Green.</p>
            )}

            <footer className="ecard__author">
                {avatar && !photoFailed ? (
                    <img
                        className="ecard__avatar"
                        src={avatar}
                        alt={`Photo de ${entrepreneur.name}`}
                        loading="lazy"
                        decoding="async"
                        onError={() => setPhotoFailed(true)}
                    />
                ) : (
                    <span className={`ecard__avatar ecard__avatar--initials ecard__avatar--v${colorVariant(entrepreneur.name)}`} aria-hidden="true">
                        {initials(entrepreneur.name)}
                    </span>
                )}
                <div className="ecard__who">
                    <cite className="ecard__name">{entrepreneur.name}</cite>
                    {meta && <span className="ecard__meta">{meta}</span>}
                </div>
            </footer>
        </article>
    );
}
