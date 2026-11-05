import { useState } from 'react';
import { Linkedin, Github, Facebook, Mail, ArrowUpRight } from 'lucide-react';

const initials = (name) =>
    String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/**
 * Carte membre de l'équipe (page À propos) : photo, équipe, nom, poste et liens directs.
 * Toute la carte ouvre la fiche détaillée ; les liens sociaux restent cliquables séparément.
 */
export default function TeamMemberCard({ member, equipe, jobRole, links = {}, onOpen }) {
    const [photoFailed, setPhotoFailed] = useState(false);

    const socials = [
        links.linkedin && { href: links.linkedin, label: 'LinkedIn', Icon: Linkedin },
        links.github && { href: links.github, label: 'GitHub', Icon: Github },
        links.facebook && { href: links.facebook, label: 'Facebook', Icon: Facebook },
        member.email && { href: `mailto:${member.email}`, label: 'E-mail', Icon: Mail, internal: true },
    ].filter(Boolean);

    return (
        <article className="tmember">
            <div className="tmember__photo">
                {member.avatar && !photoFailed ? (
                    <img
                        src={member.avatar}
                        alt={`Photo de ${member.name}`}
                        loading="lazy"
                        decoding="async"
                        draggable="false"
                        onError={() => setPhotoFailed(true)}
                    />
                ) : (
                    <span className="tmember__initials" aria-hidden="true">{initials(member.name)}</span>
                )}
                {equipe && <span className="tmember__team">{equipe}</span>}
            </div>

            <div className="tmember__body">
                <h3 className="tmember__name">
                    {/* Bouton « étiré » sur toute la carte : ouvre la fiche détaillée */}
                    <button type="button" className="tmember__open" onClick={() => onOpen(member)}>
                        {member.name}
                        <span className="sr-only"> — voir la fiche</span>
                    </button>
                </h3>
                {jobRole && <p className="tmember__role">{jobRole}</p>}
            </div>

            <div className="tmember__footer">
                {socials.length > 0 ? (
                    <ul className="tmember__socials" aria-label={`Liens de ${member.name}`}>
                        {socials.map((s) => {
                            const SocialIcon = s.Icon;
                            return (
                                <li key={s.label}>
                                    <a
                                        className="tmember__social"
                                        href={s.href}
                                        title={s.label}
                                        aria-label={`${s.label} de ${member.name}`}
                                        draggable="false"
                                        {...(s.internal ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                                    >
                                        <SocialIcon size={15} aria-hidden="true" />
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <span />
                )}
                <span className="tmember__more" aria-hidden="true">
                    Profil <ArrowUpRight size={14} />
                </span>
            </div>
        </article>
    );
}
