import { Upload, X } from 'lucide-react';
import { Modal } from '../../components/UI';
import RichTextEditor from '../../components/RichTextEditor';
import { formatAdminTeamDateTime, adminTeamDisplayValue } from './utils/helpers';
import { useAdminPanel } from './AdminPanelContext';

export default function AdminSharedModals() {
    const p = useAdminPanel();

    return (
        <>
    <Modal
        isOpen={p.confirmModal.isOpen}
        onClose={p.closeConfirmModal}
        title={p.confirmModal.kind === 'newsletterBroadcast' ? 'Confirmer l’envoi groupé' : 'Confirmation'}
        stackOnTop
    >
        <div style={{ display: 'grid', gap: '1rem' }}>
            {p.confirmModal.kind === 'newsletterBroadcast' && p.confirmModal.payload ? (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Vous allez envoyer cet e-mail à{' '}
                        <strong>{p.newsletterSubs.length}</strong> abonné(s) via votre configuration SMTP.
                    </p>
                    <div
                        style={{
                            padding: '0.85rem 1rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-base)',
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                            Objet
                        </div>
                        <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{p.confirmModal.payload.subject}</div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Cette action ne peut pas être annulée une fois l’envoi lancé.
                    </p>
                </div>
            ) : (
                <p>{p.confirmModal.message}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button className="btn btn--ghost" onClick={p.closeConfirmModal}>Annuler</button>
                <button className="btn btn--primary" onClick={p.confirmDelete}>
                    {p.confirmModal.kind === 'newsletterBroadcast' ? 'Confirmer l’envoi' : 'Confirmer'}
                </button>
            </div>
        </div>
    </Modal>

    <Modal
        isOpen={!!p.contactDetail}
        onClose={() => p.setContactDetail(null)}
        title="Détails du message"
        contentClassName="modal__content--lg"
    >
        {p.contactDetail && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), #0ea5e9)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.6rem', fontWeight: 700, flexShrink: 0, textTransform: 'uppercase',
                    }}>
                        {(p.contactDetail.name || p.contactDetail.email || '?').charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{p.contactDetail.name?.trim() || 'Anonyme'}</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {p.contactDetail.email}
                        </p>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                            {p.contactDetail.repliedAt
                                ? <span className="badge badge--green">Répondu</span>
                                : <span className="badge badge--red">En attente</span>
                            }
                            {p.contactDetail.organization?.trim() && (
                                <span className="badge badge--blue">{p.contactDetail.organization}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Coordonnées grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                        { label: 'Nom complet', value: p.contactDetail.name?.trim() || '—' },
                        { label: 'Email', value: p.contactDetail.email || '—' },
                        { label: 'Téléphone', value: p.contactDetail.phone?.trim() || '—' },
                        { label: 'Ville', value: p.contactDetail.city?.trim() || '—' },
                        { label: 'Organisation', value: p.contactDetail.organization?.trim() || '—' },
                        { label: 'Date', value: p.contactDetail.createdAt ? new Date(p.contactDetail.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                    ].map(item => (
                        <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                {item.label}
                            </div>
                            <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                        Profil et centres d&apos;intérêt
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>Profil</div>
                            <div style={{ fontWeight: 500 }}>{p.contactDetail.profile?.trim() || '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>Intérêts</div>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {p.contactDetail.interests?.length > 0
                                    ? p.contactDetail.interests.map((interest, i) => (
                                        <span key={i} className="badge badge--purple">{interest}</span>
                                    ))
                                    : <span style={{ fontWeight: 500 }}>—</span>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sujet */}
                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Sujet</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                        {p.contactDetail.subject?.trim() || '—'}
                    </p>
                </div>

                {/* Message */}
                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Message</h4>
                    <pre style={{
                        margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                        fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                        maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem',
                    }}>
                        {p.contactDetail.message || '—'}
                    </pre>
                </div>

                {/* Métadonnées */}
                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Métadonnées</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                        {[
                            { label: 'Reçu le', value: p.contactDetail.createdAt ? new Date(p.contactDetail.createdAt).toLocaleString('fr-FR') : '—' },
                            { label: 'Répondu le', value: p.contactDetail.repliedAt ? new Date(p.contactDetail.repliedAt).toLocaleString('fr-FR') : '—' },
                        ].map(item => (
                            <div key={item.label} style={{ padding: '0.5rem 0.65rem', background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
                                    {item.label}
                                </div>
                                <div style={{ fontWeight: 500 }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
                    <button type="button" className="btn btn--outline" onClick={() => p.setContactDetail(null)}>
                        Fermer
                    </button>
                    <button type="button" className="btn btn--primary" onClick={() => { p.openReplyModal(p.contactDetail); p.setContactDetail(null); }}>
                        Répondre
                    </button>
                </div>
            </div>
        )}
    </Modal>

    <Modal
        isOpen={!!p.replyModal}
        onClose={p.closeReplyModal}
        title={p.replyModal ? `Répondre à ${p.replyModal.email}` : 'Réponse'}
    >
        {p.replyModal && (
            <form onSubmit={p.handleSendContactReply} style={{ display: 'grid', gap: '1rem' }}>
               
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label form-label--required">Message</label>
                    <textarea
                        className="form-textarea"
                        rows={6}
                        value={p.replyBody}
                        onChange={(e) => p.setReplyBody(e.target.value)}
                        required
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn--ghost" onClick={p.closeReplyModal}>Annuler</button>
                    <button type="submit" className="btn btn--primary" disabled={p.replySending}>
                        {p.replySending ? 'Envoi…' : 'Envoyer'}
                    </button>
                </div>
            </form>
        )}
    </Modal>

    <Modal
        isOpen={!!p.partnerViewMember}
        onClose={p.closePartnerViewModal}
        title={p.partnerViewMember ? `Fiche — ${p.partnerViewMember.shortName || p.partnerViewMember.name}` : 'Partenaire'}
        contentClassName="modal__content--wide-form modal__content--team-view"
    >
        {p.partnerViewMember && (() => {
            const partner = p.partnerViewMember;
            const linkOrText = (url) => {
                const u = String(url || '').trim();
                if (!u || u === '—' || u === '#') return '—';
                if (/^https?:\/\//i.test(u)) {
                    return (
                        <a href={u} target="_blank" rel="noopener noreferrer" className="admin-team-detail__link">
                            {u}
                        </a>
                    );
                }
                return u;
            };
            const pInitials = (partner.shortName || partner.name || '?').substring(0, 2).toUpperCase();
            return (
                <div className="admin-team-detail">
                    <div className="admin-team-detail__hero">
                        <div className="admin-team-detail__avatar-wrap">
                            {partner.logo ? (
                                <img src={partner.logo} alt="" className="admin-team-detail__avatar" style={{ objectFit: 'contain', background: '#fff', padding: '0.25rem' }} />
                            ) : (
                                <div className="admin-team-detail__avatar admin-team-detail__avatar--placeholder">
                                    {pInitials}
                                </div>
                            )}
                        </div>
                        <div className="admin-team-detail__hero-text">
                            <p className="admin-team-detail__hero-name">{partner.name}</p>
                            <div className="admin-team-detail__badges">
                                {partner.shortName ? (
                                    <span className="admin-team-detail__badge">{partner.shortName}</span>
                                ) : null}
                                {partner.role ? (
                                    <span className="admin-team-detail__badge admin-team-detail__badge--muted">{partner.role}</span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <p className="admin-team-detail__section-label">Informations principales</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Ordre d&apos;affichage</span>
                            <span className="admin-team-detail__field-value">{partner.sortOrder ?? '—'}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Site web</span>
                            <span className="admin-team-detail__field-value">{linkOrText(partner.website)}</span>
                        </div>
                    </div>

                    {partner.description && (
                        <>
                            <p className="admin-team-detail__section-label">Description</p>
                            <div className="admin-team-detail__field admin-team-detail__field--block">
                                <span className="admin-team-detail__field-value" style={{ lineHeight: 1.6 }}>{partner.description}</span>
                            </div>
                        </>
                    )}

                    {partner.collaboration && (
                        <>
                            <p className="admin-team-detail__section-label">Collaboration</p>
                            <div className="admin-team-detail__field admin-team-detail__field--block">
                                <span className="admin-team-detail__field-value" style={{ lineHeight: 1.6 }}>{partner.collaboration}</span>
                            </div>
                        </>
                    )}

                    <p className="admin-team-detail__section-label">Logo</p>
                    <div className="admin-team-detail__field admin-team-detail__field--block">
                        {partner.logo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <img src={partner.logo} alt="" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: '10px', background: '#fff', border: '1px solid var(--glass-border)', padding: '0.5rem' }} />
                                <span className="admin-team-detail__field-value admin-team-detail__field-value--mono" style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                                    {partner.logo}
                                </span>
                            </div>
                        ) : (
                            <span className="admin-team-detail__field-value">—</span>
                        )}
                    </div>

                    <p className="admin-team-detail__section-label">Métadonnées</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Créé le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(partner.createdAt)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Modifié le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(partner.updatedAt)}</span>
                        </div>
                    </div>

                    <div className="admin-team-detail__footer">
                        <button type="button" className="btn btn--ghost" onClick={p.closePartnerViewModal}>
                            Fermer
                        </button>
                        <button type="button" className="btn btn--primary" onClick={p.openEditFromPartnerView}>
                            Modifier
                        </button>
                    </div>
                </div>
            );
        })()}
    </Modal>

    <Modal
        isOpen={!!p.entrepreneurViewItem}
        onClose={p.closeEntrepreneurViewModal}
        title={p.entrepreneurViewItem ? `Fiche — ${p.entrepreneurViewItem.name}` : 'Entrepreneur'}
        contentClassName="modal__content--wide-form modal__content--team-view"
    >
        {p.entrepreneurViewItem && (() => {
            const row = p.entrepreneurViewItem;
            const initials = (row.name || '?').substring(0, 2).toUpperCase();
            return (
                <div className="admin-team-detail">
                    <div className="admin-team-detail__hero">
                        <div className="admin-team-detail__avatar-wrap">
                            {row.avatar ? (
                                <img src={row.avatar} alt="" className="admin-team-detail__avatar" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="admin-team-detail__avatar admin-team-detail__avatar--placeholder">{initials}</div>
                            )}
                        </div>
                        <div className="admin-team-detail__hero-text">
                            <p className="admin-team-detail__hero-name">{row.name}</p>
                            <div className="admin-team-detail__badges">
                                {row.role ? <span className="admin-team-detail__badge admin-team-detail__badge--muted">{row.role}</span> : null}
                                {row.organization ? <span className="admin-team-detail__badge">{row.organization}</span> : null}
                            </div>
                        </div>
                    </div>

                    {row.quote ? (
                        <>
                            <p className="admin-team-detail__section-label">Citation</p>
                            <div className="admin-team-detail__field admin-team-detail__field--block">
                                <span className="admin-team-detail__field-value" style={{ lineHeight: 1.6, fontStyle: 'italic' }}>
                                    {row.quote}
                                </span>
                            </div>
                        </>
                    ) : null}

                    <p className="admin-team-detail__section-label">Affichage</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Ordre</span>
                            <span className="admin-team-detail__field-value">{row.sortOrder ?? '—'}</span>
                        </div>
                    </div>

                    <p className="admin-team-detail__section-label">Métadonnées</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Créé le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(row.createdAt)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Modifié le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(row.updatedAt)}</span>
                        </div>
                    </div>

                    <div className="admin-team-detail__footer">
                        <button type="button" className="btn btn--ghost" onClick={p.closeEntrepreneurViewModal}>
                            Fermer
                        </button>
                        <button type="button" className="btn btn--primary" onClick={p.openEditFromEntrepreneurView}>
                            Modifier
                        </button>
                    </div>
                </div>
            );
        })()}
    </Modal>

    <Modal
        isOpen={!!p.publicTeamViewMember}
        onClose={p.closePublicTeamViewModal}
        title={p.publicTeamViewMember ? `Fiche — ${p.publicTeamViewMember.name}` : 'Membre'}
        contentClassName="modal__content--wide-form modal__content--team-view"
    >
        {p.publicTeamViewMember && (() => {
            const m = p.publicTeamViewMember;
            const linkOrText = (url) => {
                const u = String(url || '').trim();
                if (!u || u === '—') return '—';
                if (u === '#') return '—';
                if (/^https?:\/\//i.test(u)) {
                    return (
                        <a href={u} target="_blank" rel="noopener noreferrer" className="admin-team-detail__link">
                            {u}
                        </a>
                    );
                }
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(u)) {
                    return (
                        <a href={`mailto:${u}`} className="admin-team-detail__link">
                            {u}
                        </a>
                    );
                }
                return u;
            };
            return (
                <div className="admin-team-detail">
                    <div className="admin-team-detail__hero">
                        <div className="admin-team-detail__avatar-wrap">
                            {m.avatar ? (
                                <img src={m.avatar} alt="" className="admin-team-detail__avatar" />
                            ) : (
                                <div className="admin-team-detail__avatar admin-team-detail__avatar--placeholder">
                                    {(m.name || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="admin-team-detail__hero-text">
                            <p className="admin-team-detail__hero-name">{p.adminTeamDisplayValue(m.name)}</p>
                            <div className="admin-team-detail__badges">
                                {m.organization ? (
                                    <span className="admin-team-detail__badge">{m.organization}</span>
                                ) : null}
                                {m.role && m.role !== m.organization ? (
                                    <span className="admin-team-detail__badge admin-team-detail__badge--muted">{m.role}</span>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <p className="admin-team-detail__section-label">Informations principales</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Ordre d&apos;affichage</span>
                            <span className="admin-team-detail__field-value">{m.sortOrder ?? '—'}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">ID externe</span>
                            <span className="admin-team-detail__field-value">{m.externalId ?? '—'}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Équipe</span>
                            <span className="admin-team-detail__field-value">{p.adminTeamDisplayValue(m.organization)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Rôle / titre</span>
                            <span className="admin-team-detail__field-value">{p.adminTeamDisplayValue(m.role)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Email</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.email)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Contact (legacy)</span>
                            <span className="admin-team-detail__field-value">{p.adminTeamDisplayValue(m.contact)}</span>
                        </div>
                    </div>

                    <p className="admin-team-detail__section-label">Photo</p>
                    <div className="admin-team-detail__field admin-team-detail__field--block">
                        <span className="admin-team-detail__field-label">URL</span>
                        <span className="admin-team-detail__field-value admin-team-detail__field-value--mono">
                            {p.adminTeamDisplayValue(m.avatar)}
                        </span>
                    </div>

                    <p className="admin-team-detail__section-label">Réseaux & liens</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">LinkedIn</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.linkedin)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">GitHub</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.github)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Facebook</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.facebook)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Instagram</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.instagram)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">X (Twitter)</span>
                            <span className="admin-team-detail__field-value">{linkOrText(m.twitter)}</span>
                        </div>
                    </div>

                    <p className="admin-team-detail__section-label">Métadonnées</p>
                    <div className="admin-team-detail__grid">
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Créé le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(m.createdAt)}</span>
                        </div>
                        <div className="admin-team-detail__field">
                            <span className="admin-team-detail__field-label">Modifié le</span>
                            <span className="admin-team-detail__field-value">{p.formatAdminTeamDateTime(m.updatedAt)}</span>
                        </div>
                    </div>

                    <div className="admin-team-detail__footer">
                        <button type="button" className="btn btn--ghost" onClick={p.closePublicTeamViewModal}>
                            Fermer
                        </button>
                        <button type="button" className="btn btn--primary" onClick={p.openEditFromPublicTeamView}>
                            Modifier
                        </button>
                    </div>
                </div>
            );
        })()}
    </Modal>

    <Modal
        isOpen={p.publicTeamFormOpen}
        onClose={p.closePublicTeamModal}
        title={p.publicTeamEditId ? 'Modifier un membre' : 'Nouveau membre'}
        contentClassName="modal__content--wide-form"
    >
        <form onSubmit={p.handleSavePublicTeamMember} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label form-label--required">Nom</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.name}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, name: e.target.value }))}
                        required
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Ordre d’affichage</label>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="999"
                        value={p.publicTeamForm.sortOrder}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, sortOrder: e.target.value }))}
                    />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Équipe (carte, ex. Backend Team)</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.organization}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, organization: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Rôle / titre</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.role}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, role: e.target.value }))}
                    />
                </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email</label>
                <input
                    type="email"
                    className="form-input"
                    value={p.publicTeamForm.email}
                    onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, email: e.target.value }))}
                />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Photo (URL ou fichier)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {/* Preview */}
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        border: '2px dashed var(--border-color)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-base)', flexShrink: 0, position: 'relative',
                    }}>
                        {p.publicTeamForm.avatar?.trim() ? (
                            <>
                                <img
                                    src={p.publicTeamForm.avatar}
                                    alt="Aperçu"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                                <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                    Erreur
                                </div>
                                <button
                                    type="button"
                                    onClick={() => p.setPublicTeamForm((p) => ({ ...p, avatar: '' }))}
                                    style={{
                                        position: 'absolute', top: '-4px', right: '-4px',
                                        width: '20px', height: '20px', borderRadius: '50%',
                                        background: 'var(--color-p.error, #e53e3e)', color: '#fff',
                                        border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                    title="Supprimer la photo"
                                >
                                    <X size={12} />
                                </button>
                            </>
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.2 }}>
                                Pas de<br />photo
                            </span>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                            className="form-input"
                            placeholder="https://…"
                            value={p.publicTeamForm.avatar}
                            onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, avatar: e.target.value }))}
                        />
                        <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer', margin: 0, alignSelf: 'flex-start' }}>
                            <Upload size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            {p.publicTeamAvatarUploading ? 'Envoi…' : 'Importer une photo'}
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={p.handlePublicTeamAvatarUpload}
                                disabled={p.publicTeamAvatarUploading}
                            />
                        </label>
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">LinkedIn</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.linkedin}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, linkedin: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">GitHub</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.github}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, github: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Facebook</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.facebook}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, facebook: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Instagram</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.instagram}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, instagram: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">X (Twitter)</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.twitter}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, twitter: e.target.value }))}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">ID externe (optionnel)</label>
                    <input
                        className="form-input"
                        value={p.publicTeamForm.externalId}
                        onChange={(e) => p.setPublicTeamForm((p) => ({ ...p, externalId: e.target.value }))}
                    />
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={p.closePublicTeamModal}>
                    Annuler
                </button>
                <button type="submit" className="btn btn--primary" disabled={p.publicTeamSaving}>
                    {p.publicTeamSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </div>
        </form>
    </Modal>

    <Modal
        isOpen={p.newsletterBroadcastOpen}
        onClose={p.closeNewsletterBroadcastModal}
        title="Envoi groupé — newsletter"
        contentClassName="modal__content--wide-form"
    >
        <form onSubmit={p.handleSendNewsletterBroadcast} style={{ display: 'grid', gap: '1rem' }}>
           
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label--required">Objet</label>
                <input
                    className="form-input"
                    value={p.newsletterBroadcastSubject}
                    onChange={(e) => p.setNewsletterBroadcastSubject(e.target.value)}
                    placeholder="Ex. Actualités du mois / nouveautés plateforme"
                    maxLength={200}
                    required
                />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label form-label--required">Message</label>
                <RichTextEditor
                    content={p.newsletterBroadcastMessage}
                    onContentChange={p.setNewsletterBroadcastMessage}
                    placeholder="Rédigez le corps de l’e-mail"
                    minEditorHeight="280px"
                    uploadFolder="mahdia_bg/newsletter"
                    disabled={p.newsletterBroadcastSending}
                    onUploadingChange={p.setNewsletterBroadcastUploading}
                    onInlineImageUploadError={(msg) => p.showToast(msg, 'p.error')}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn--ghost" onClick={p.closeNewsletterBroadcastModal}>
                    Annuler
                </button>
                <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={p.newsletterBroadcastSending || p.newsletterBroadcastUploading}
                >
                    {p.newsletterBroadcastSending ? 'Envoi en cours…' : 'Envoyer à tous'}
                </button>
            </div>
        </form>
    </Modal>

    <Modal
        isOpen={!!p.newsletterEdit}
        onClose={p.closeNewsletterEditModal}
        title={p.newsletterEdit ? `Modifier — ${p.newsletterEdit.email}` : 'Modifier abonné'}
    >
        {p.newsletterEdit && (
            <form onSubmit={p.handleSaveNewsletterSub} style={{ display: 'grid', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label form-label--required">Email</label>
                    <input
                        type="email"
                        className="form-input"
                        value={p.newsletterEditEmail}
                        onChange={(e) => p.setNewsletterEditEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Source</label>
                    <input
                        className="form-input"
                        maxLength={80}
                        value={p.newsletterEditSource}
                        onChange={(e) => p.setNewsletterEditSource(e.target.value)}
                    />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Statut</label>
                    <select
                        className="form-select"
                        value={p.newsletterEditStatus}
                        onChange={(e) => p.setNewsletterEditStatus(e.target.value)}
                    >
                        <option value="active">Actif (reçoit la newsletter)</option>
                        <option value="unsubscribed">Désabonné (ne reçoit plus rien)</option>
                    </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn--ghost" onClick={p.closeNewsletterEditModal}>Annuler</button>
                    <button type="submit" className="btn btn--primary" disabled={p.newsletterSaving}>
                        {p.newsletterSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                </div>
            </form>
        )}
    </Modal>        </>
    );
}
