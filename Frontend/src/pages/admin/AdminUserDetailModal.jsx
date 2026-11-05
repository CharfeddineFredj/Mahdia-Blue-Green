import { Modal } from '../../components/UI';
import StaffRolePill from './components/StaffRolePill';
import { useAdminPanel } from './AdminPanelContext';
import { canDisplayProfileImage, getUserInitialsFromName } from '../../utils/userAvatar';

export default function AdminUserDetailModal() {
    const { userDetailModal, setUserDetailModal, formatArticleStatus, staffRolePillClass } = useAdminPanel();

    return (
        <>
            <Modal
                isOpen={userDetailModal.isOpen}
                onClose={() => setUserDetailModal({ isOpen: false, user: null, posts: [], loading: false })}
                title="Détails de l'utilisateur"
                contentClassName="modal__content--lg"
            >
                {userDetailModal.loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Chargement…</p>
                    </div>
                ) : userDetailModal.user ? (() => {
                    const u = userDetailModal.user;
                    const posts = userDetailModal.posts;
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
                    const initials = getUserInitialsFromName(u);
                    const articles = posts.filter(post => post.type === 'article');
                    const events = posts.filter(post => post.type === 'event');

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Header — avatar + identity */}
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: 'var(--color-primary)', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', fontWeight: 700, flexShrink: 0,
                                    overflow: 'hidden',
                                }}>
                                    {canDisplayProfileImage(u)
                                        ? <img src={u.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : initials}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{fullName || u.username}</h3>
                                    {fullName && <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{u.username}</p>}
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</p>
                                </div>
                                <span className={staffRolePillClass(u.role)}>
                                    <StaffRolePill role={u.role} />
                                </span>
                            </div>

                            {/* Info grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {[
                                    { label: 'Statut du compte', value: u.isActive ? 'Actif' : 'Inactif', badge: u.isActive ? 'green' : 'red' },
                                    { label: 'Email vérifié', value: u.isEmailVerified ? 'Oui' : 'Non', badge: u.isEmailVerified ? 'green' : 'yellow' },
                                    { label: 'Questionnaire', value: u.questionnaireStatus === 'complete' ? 'Complété' : `Incomplet (${u.pendingQuestionnaires || 0} en attente)`, badge: u.questionnaireStatus === 'complete' ? 'green' : 'red' },
                                    { label: '2FA', value: u.twoFactorEnabled ? 'Activé' : 'Désactivé', badge: u.twoFactorEnabled ? 'green' : 'gray' },
                                    { label: 'Fournisseur', value: (u.authProvider || 'local').charAt(0).toUpperCase() + (u.authProvider || 'local').slice(1) },
                                    { label: 'Inscription', value: new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
                                ].map(item => (
                                    <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                            {item.label}
                                        </div>
                                        <div style={{ fontWeight: 500 }}>
                                            {item.badge
                                                ? <span className={`badge badge--${item.badge}`}>{item.value}</span>
                                                : item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Personal info */}
                            {(() => {
                                const pi = u.personalInfo;
                                const infoItems = [
                                    { label: 'Date de naissance', value: pi?.dateOfBirth ? new Date(pi.dateOfBirth).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null },
                                    { label: 'Genre', value: pi?.gender },
                                    { label: 'Téléphone', value: pi?.phone },
                                    { label: 'Profession', value: pi?.profession },
                                    { label: 'Secteur', value: pi?.sector },
                                    { label: 'Niveau d\'études', value: pi?.educationLevel },
                                    { label: 'Institution', value: pi?.institution },
                                    { label: 'Adresse', value: [pi?.address?.street, pi?.address?.zipCode, pi?.address?.city, pi?.address?.state, pi?.address?.country].filter(Boolean).join(', ') || null },
                                    { label: 'Ville', value: !pi?.address?.city ? (u.city || null) : null },
                                ].filter(item => item.value);

                                const socialLinks = [
                                    { label: 'Site web', value: pi?.socialLinks?.website, icon: '🌐' },
                                    { label: 'LinkedIn', value: pi?.socialLinks?.linkedin, icon: '💼' },
                                    { label: 'Twitter', value: pi?.socialLinks?.twitter, icon: '🐦' },
                                    { label: 'GitHub', value: pi?.socialLinks?.github, icon: '💻' },
                                ].filter(item => item.value);

                                const bio = u.bio || pi?.bio;
                                const hasContent = infoItems.length > 0 || socialLinks.length > 0 || bio;

                                if (!hasContent) return null;

                                return (
                                    <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Informations personnelles</h4>

                                        {infoItems.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                                                {infoItems.map(item => (
                                                    <div key={item.label} style={{ padding: '0.5rem 0.65rem', background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
                                                            {item.label}
                                                        </div>
                                                        <div style={{ fontWeight: 500 }}>{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {bio && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.65rem', background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Bio</div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                    {bio}
                                                </p>
                                            </div>
                                        )}

                                        {socialLinks.length > 0 && (
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>Liens</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {socialLinks.map(link => (
                                                        <a
                                                            key={link.label}
                                                            href={link.value.startsWith('http') ? link.value : `https://${link.value}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                                padding: '0.35rem 0.65rem', fontSize: '0.8rem',
                                                                background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px',
                                                                border: '1px solid var(--border-color)', color: 'var(--color-primary)',
                                                                textDecoration: 'none', fontWeight: 500,
                                                            }}
                                                        >
                                                            <span>{link.icon}</span> {link.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Posts summary */}
                            <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                                    Publications ({posts.length})
                                </h4>
                                {posts.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucune publication.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <span className="badge badge--blue" style={{ fontSize: '0.75rem' }}>
                                                {articles.length} article{articles.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="badge badge--purple" style={{ fontSize: '0.75rem' }}>
                                                {events.length} événement{events.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="badge badge--green" style={{ fontSize: '0.75rem' }}>
                                                {posts.filter(post => post.status === 'published').length} publié{posts.filter(post => post.status === 'published').length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="badge badge--yellow" style={{ fontSize: '0.75rem' }}>
                                                {posts.filter(post => post.status === 'draft').length} brouillon{posts.filter(post => post.status === 'draft').length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {posts.map(post => (
                                                <div key={post._id} style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)',
                                                    fontSize: '0.85rem',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.8rem' }}>{post.type === 'article' ? '📄' : '📅'}</span>
                                                        <span style={{ fontWeight: 500 }}>{post.title} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({post.type === 'article' ? 'article' : 'événement'})</span></span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                                        <span className={`badge badge--${post.status === 'published' ? 'green' : post.status === 'draft' ? 'yellow' : 'gray'}`} style={{ fontSize: '0.7rem' }}>
                                                            {formatArticleStatus(post.status)}
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {new Date(post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                                <button
                                    className="btn btn--outline"
                                    onClick={() => setUserDetailModal({ isOpen: false, user: null, posts: [], loading: false })}
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    );
                })() : (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Aucune donnée disponible.</p>
                )}
            </Modal>
        </>
    );
}
