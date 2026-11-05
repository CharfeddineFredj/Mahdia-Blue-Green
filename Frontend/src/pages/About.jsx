import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { users as fallbackTeamMock } from '../data/mockData';
import { Toast } from '../components/UI';
import ScrollCarousel from '../components/ScrollCarousel';
import TeamMemberCard from '../components/TeamMemberCard';
import { teamService } from '../services';
import { normalizePublicTeamMembers } from '../utils/teamPublicDisplay';
import { Users, Target, Briefcase, Leaf, Award, Globe, Mail, Linkedin, Github, Facebook, X } from 'lucide-react';

function teamSocialHref(url) {
    const s = String(url || '').trim();
    if (!s || s === '#') return null;
    return s;
}

function getTeamDisplayFields(member) {
    if (member.equipe != null && member.jobRole != null) {
        return { equipe: member.equipe, jobRole: member.jobRole };
    }
    const org = String(member.organization || '').trim();
    const r = String(member.role || '').trim();
    const equipe = org || r;
    const jobRole =
        r && r !== equipe ? r : equipe ? 'Développeur' : '';
    return { equipe, jobRole };
}

const stats = [
    { icon: Users, value: '200+', label: 'Entrepreneurs accompagnés' },
    { icon: Award, value: '500+', label: 'Personnes formées' },
    { icon: Briefcase, value: '100+', label: 'Emplois durables créés' },
    { icon: Globe, value: '5000+', label: 'Citoyens sensibilisés' },
];

const objectives = [
    { icon: Target, title: 'Accompagnement', desc: 'Accompagner 200 entrepreneurs vers l\'économie durable avec un suivi personnalisé.' },
    { icon: Users, title: 'Formation', desc: 'Former 500 personnes aux métiers verts et bleus pour une main-d\'œuvre qualifiée.' },
    { icon: Briefcase, title: 'Emploi', desc: 'Créer 100 emplois durables d\'ici 2025 dans la région de Mahdia.' },
    { icon: Leaf, title: 'Sensibilisation', desc: 'Sensibiliser 5000 citoyens aux enjeux environnementaux et aux solutions durables.' },
];

const timeline = [
    { year: '2022', title: 'Lancement du projet', desc: 'Début de l\'initiative avec les premiers ateliers de sensibilisation et la mobilisation des acteurs locaux.' },
    { year: '2023', title: 'Premiers entrepreneurs', desc: '50 entrepreneurs accompagnés dans leur transition vers l\'économie durable avec des résultats concrets.' },
    { year: '2024', title: 'Expansion', desc: 'Lancement des programmes d\'économie verte et circulaire, élargissement du réseau de partenaires.' },
    { year: '2025', title: 'Objectifs atteints', desc: 'Atteindre 200 entrepreneurs accompagnés et 100 emplois créés dans la région.' },
];

export default function About() {
    const [team, setTeam] = useState(fallbackTeamMock);
    const [selectedMember, setSelectedMember] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const openMemberModal = (member) => {
        setSelectedMember(member);
        document.body.style.overflow = 'hidden';
    };

    const closeMemberModal = () => {
        setSelectedMember(null);
        document.body.style.overflow = '';
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await teamService.getAll();
                if (cancelled || !res?.success || !Array.isArray(res.data)) return;
                if (res.data.length === 0) return;
                setTeam(normalizePublicTeamMembers(res.data));
            } catch {
                /* garde le mock */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <>
            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
            />

            {/* Modal */}
            {selectedMember && (() => {
                const { equipe, jobRole } = getTeamDisplayFields(selectedMember);
                const liHref = teamSocialHref(selectedMember.linkedin);
                const ghHref = teamSocialHref(selectedMember.github);
                const fbHref = teamSocialHref(selectedMember.facebook);
                return (
                    <div className="team-modal-overlay" onClick={closeMemberModal}>
                        <div className="team-modal" onClick={(e) => e.stopPropagation()}>
                            <button className="team-modal__close" onClick={closeMemberModal}>×</button>
                            <div className="team-modal__content">
                                <div className="team-modal__avatar">
                                    <img src={selectedMember.avatar} alt={selectedMember.name} />
                                </div>
                                <h3 className="team-modal__name">{selectedMember.name}</h3>
                                {jobRole && <p className="team-modal__role">{jobRole}</p>}
                                {equipe && (
                                    <p className="team-modal__equipe">
                                        <span className="team-modal__equipe-value">{equipe}</span>
                                    </p>
                                )}
                                {selectedMember.email && (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
                                        {selectedMember.email}
                                    </p>
                                )}
                                <div className="team-modal__socials team-modal__socials--compact" style={{ marginTop: '1rem' }}>
                                    {selectedMember.email && (
                                        <button
                                            className="team-modal__social team-modal__social--email"
                                            title="Copier l'email"
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(selectedMember.email);
                                                showToast(`Email copié : ${selectedMember.email}`);
                                            }}
                                            style={{ cursor: 'pointer', border: 'none', outline: 'none' }}
                                        >
                                            <Mail size={20} />
                                        </button>
                                    )}
                                    {liHref && (
                                        <a href={liHref} className="team-modal__social team-modal__social--linkedin" title="LinkedIn" target="_blank" rel="noopener noreferrer">
                                            <Linkedin size={20} />
                                        </a>
                                    )}
                                    {ghHref && (
                                        <a href={ghHref} className="team-modal__social team-modal__social--github" title="GitHub" target="_blank" rel="noopener noreferrer">
                                            <Github size={20} />
                                        </a>
                                    )}
                                    {fbHref && (
                                        <a href={fbHref} className="team-modal__social team-modal__social--facebook" title="Facebook" target="_blank" rel="noopener noreferrer">
                                            <Facebook size={20} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Hero */}
            <section className="hero" style={{ minHeight: '55vh', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.06,
                    backgroundImage: 'radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 80% 50%, var(--color-accent) 0%, transparent 50%)',
                }} />
                <div className="container text-center" style={{ padding: '6rem 0 3rem', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0,125,144,0.1)', border: '1px solid rgba(0,125,144,0.2)',
                        borderRadius: '999px', padding: '0.4rem 1rem', marginBottom: '1.5rem',
                        fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600,
                    }}>
                        <Leaf size={16} /> Développement durable
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '1rem' }}>
                        À propos du projet
                    </h1>
                    <p style={{ maxWidth: '650px', margin: '0 auto 2.5rem', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7 }}>
                        Mahdia Blue & Green est une initiative de l'OIT visant à promouvoir
                        le développement durable dans la région de Mahdia.
                    </p>

                    {/* Stats bar */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '1rem', maxWidth: '700px', margin: '0 auto',
                    }}>
                        {stats.map((s, i) => (
                            <div key={i} style={{
                                padding: '1.25rem 0.75rem', borderRadius: '12px',
                                background: 'rgba(0,125,144,0.05)', border: '1px solid rgba(0,125,144,0.1)',
                                textAlign: 'center',
                            }}>
                                <s.icon size={22} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Vision & Objectives */}
            <section className="section">
                <div className="container">
                    <div className="grid grid--2" style={{ gap: '4rem', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ marginBottom: '1rem' }}>
                                <span style={{ color: 'var(--color-primary)' }}>Notre</span> Vision
                            </h2>
                            <p style={{ marginBottom: '1.5rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                Faire de Mahdia un modèle de transition vers une économie durable, créatrice d'emplois décents et respectueuse de l'environnement.
                            </p>
                            <div style={{
                                padding: '1.5rem', borderRadius: '12px',
                                background: 'var(--bg-section)', border: '1px solid var(--border-color)',
                            }}>
                                <h4 style={{ marginBottom: '0.75rem', color: 'var(--color-primary)' }}>Contexte</h4>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                                    La région de Mahdia, avec son littoral riche et son patrimoine naturel, fait face à des défis
                                    environnementaux majeurs. En partenariat avec l'Organisation Internationale du Travail et les
                                    acteurs locaux, nous développons des solutions innovantes pour une économie respectueuse de
                                    l'environnement.
                                </p>
                            </div>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '1.5rem' }}>
                                <span style={{ color: 'var(--color-primary)' }}>Nos</span> Objectifs
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {objectives.map((obj, i) => (
                                    <div key={i} style={{
                                        display: 'flex', gap: '1rem', padding: '1.25rem',
                                        borderRadius: '12px', background: 'var(--bg-section)',
                                        border: '1px solid var(--border-color)',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,125,144,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    >
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
                                            background: 'rgba(0,125,144,0.1)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <obj.icon size={22} style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{obj.title}</h4>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{obj.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="section section--alt">
                <div className="container">
                    <div className="section__header">
                        <h2 className="section__title">
                            Notre <span style={{ color: 'var(--color-primary)' }}>Parcours</span>
                        </h2>
                        <p className="section__subtitle" style={{ color: 'var(--text-secondary)' }}>
                            Les étapes clés de notre engagement pour Mahdia
                        </p>
                    </div>
                    <div style={{ maxWidth: '750px', margin: '0 auto', position: 'relative' }}>
                        {/* Vertical line */}
                        <div style={{
                            position: 'absolute', left: '39px', top: '0', bottom: '0', width: '2px',
                            background: 'linear-gradient(to bottom, var(--color-primary), var(--color-accent))',
                            opacity: 0.3, borderRadius: '1px',
                        }} />
                        {timeline.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: '1.5rem', marginBottom: '2rem',
                                position: 'relative',
                            }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0,
                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: '1.15rem',
                                    boxShadow: '0 4px 16px rgba(0,125,144,0.3)', zIndex: 1,
                                }}>
                                    {item.year}
                                </div>
                                <div style={{
                                    flex: 1, padding: '1.25rem 1.5rem', borderRadius: '12px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                >
                                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>{item.title}</h4>
                                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7, fontSize: '0.92rem' }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="section">
                <div className="container">
                    <div className="section__header">
                        <h2 className="section__title">
                            Notre <span style={{ color: 'var(--color-primary)' }}>Équipe</span>
                        </h2>
                        <p className="section__subtitle" style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                            Une équipe pluridisciplinaire engagée pour le développement durable de Mahdia
                        </p>
                    </div>
                    <ScrollCarousel label="Membres de l’équipe" className="team-carousel">
                        {team.map((member) => {
                            const { equipe, jobRole } = getTeamDisplayFields(member);
                            return (
                                <TeamMemberCard
                                    key={member.id}
                                    member={member}
                                    equipe={equipe}
                                    jobRole={jobRole}
                                    links={{
                                        linkedin: teamSocialHref(member.linkedin),
                                        github: teamSocialHref(member.github),
                                        facebook: teamSocialHref(member.facebook),
                                    }}
                                    onOpen={openMemberModal}
                                />
                            );
                        })}
                    </ScrollCarousel>
                </div>
            </section>

            {/* CTA */}
            <section className="section section--alt">
                <div className="container text-center">
                    <div style={{
                        maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem',
                        borderRadius: '16px', position: 'relative', overflow: 'hidden',
                        background: 'linear-gradient(135deg, rgba(0,125,144,0.08), rgba(185,254,27,0.06))',
                        border: '1px solid rgba(0,125,144,0.15)',
                    }}>
                        <h2 style={{ marginBottom: '0.75rem' }}>
                            Envie de rejoindre <span style={{ color: 'var(--color-primary)' }}>l'aventure</span> ?
                        </h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            Contactez notre équipe pour en savoir plus sur nos programmes et découvrir comment vous pouvez contribuer.
                        </p>
                        <Link to="/contact" className="btn btn--primary btn--lg">
                            Contacter l'équipe
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
