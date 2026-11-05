import { useParams, Link } from 'react-router-dom';
import SafeHtml from '../components/SafeHtml';

export default function Legal() {
    const { page } = useParams();

    const pages = {
        'confidentialite': {
            title: 'Politique de confidentialité',
            icon: '🔒',
            content: `
        <h2>1. Collecte des données</h2>
        <p>Nous collectons les informations que vous nous fournissez directement, notamment lorsque vous vous inscrivez à notre newsletter, participez à un événement, ou nous contactez via le formulaire.</p>
        <p>Les données collectées peuvent inclure : nom, prénom, adresse email, numéro de téléphone, ville, organisation.</p>
        
        <h2>2. Utilisation des données</h2>
        <p>Vos données personnelles sont utilisées pour :</p>
        <ul>
          <li>Vous informer sur nos événements et actualités</li>
          <li>Gérer votre inscription aux événements</li>
          <li>Améliorer nos services</li>
          <li>Répondre à vos demandes de contact</li>
        </ul>
        
        <h2>3. Protection des données</h2>
        <p>Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données personnelles contre tout accès, modification, divulgation ou destruction non autorisée.</p>
        
        <h2>4. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li>Droit d'accès à vos données</li>
          <li>Droit de rectification</li>
          <li>Droit à l'effacement</li>
          <li>Droit à la portabilité</li>
          <li>Droit d'opposition</li>
        </ul>
        <p>Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@mahdia-bg.tn">contact@mahdia-bg.tn</a></p>
        
        <h2>5. Durée de conservation</h2>
        <p>Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées, et au maximum 3 ans après votre dernière interaction avec nous.</p>
      `
        },
        'mentions-legales': {
            title: 'Mentions légales',
            icon: '📋',
            content: `
        <h2>Éditeur du site</h2>
        <p><strong>Mahdia Blue & Green</strong></p>
        <p>Initiative de l'Organisation Internationale du Travail (OIT)</p>
        <p>Adresse : Avenue Habib Bourguiba, Mahdia, Tunisie</p>
        <p>Email : <a href="mailto:contact@mahdia-bg.tn">contact@mahdia-bg.tn</a></p>
        <p>Téléphone : <a href="tel:+21673123456">+216 73 123 456</a></p>
        
        <h2>Directeur de la publication</h2>
        <p>Dr. Amira Ben Salem</p>
        
        <h2>Hébergement</h2>
        <p>Ce site est hébergé par :</p>
        <p>Nom de l'hébergeur</p>
        <p>Adresse de l'hébergeur</p>
        
        <h2>Propriété intellectuelle</h2>
        <p>L'ensemble du contenu de ce site (textes, images, vidéos, logos) est protégé par le droit d'auteur. Toute reproduction sans autorisation préalable est interdite.</p>
        
        <h2>Limitation de responsabilité</h2>
        <p>Mahdia Blue & Green s'efforce d'assurer l'exactitude des informations diffusées sur ce site. Toutefois, elle ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.</p>
      `
        },
        'cookies': {
            title: 'Politique de cookies',
            icon: '🍪',
            content: `
        <h2>Qu'est-ce qu'un cookie ?</h2>
        <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web.</p>
        
        <h2>Cookies utilisés sur ce site</h2>
        <h3>Cookies essentiels</h3>
        <p>Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés. Ils sont généralement établis en réponse à des actions que vous effectuez, comme la connexion à votre compte.</p>
        
        <h3>Cookies de performance</h3>
        <p>Ces cookies nous permettent de compter les visites et les sources de trafic afin d'améliorer les performances de notre site.</p>
        
        <h3>Cookies fonctionnels</h3>
        <p>Ces cookies permettent d'améliorer la fonctionnalité et la personnalisation, comme le stockage de vos préférences.</p>
        
        <h2>Gestion des cookies</h2>
        <p>Vous pouvez à tout moment modifier vos préférences en matière de cookies via les paramètres de votre navigateur.</p>
        <p>Pour plus d'informations sur la gestion des cookies, consultez l'aide de votre navigateur.</p>
        
        <h2>Durée de conservation</h2>
        <p>Les cookies sont conservés pour une durée maximale de 13 mois.</p>
      `
        }
    };

    const currentPage = pages[page] || pages['confidentialite'];

    const legalLinks = [
        { key: 'confidentialite', title: 'Confidentialité', icon: '🔒' },
        { key: 'mentions-legales', title: 'Mentions légales', icon: '📋' },
        { key: 'cookies', title: 'Cookies', icon: '🍪' }
    ].filter(item => item.key !== page);

    return (
        <section className="section">
            <div className="container container--narrow">
                {/* Fil d'Ariane moderne */}
                <nav
                    aria-label="Fil d'Ariane"
                    style={{
                        marginBottom: '2rem',
                        padding: '0.75rem 1rem',
                        background: 'var(--glass-bg)',
                        borderRadius: 'var(--radius-lg)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--glass-border)',
                        fontSize: '0.875rem'
                    }}
                >
                    <Link to="/" style={{ color: 'var(--color-primary)' }}>Accueil</Link>
                    <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>/</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{currentPage.title}</span>
                </nav>

                {/* En-tête avec icône */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '3rem',
                    padding: '2rem',
                    background: 'linear-gradient(135deg, rgba(0, 125, 144, 0.1) 0%, rgba(185, 254, 27, 0.05) 100%)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--glass-border)'
                }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>
                        {currentPage.icon}
                    </span>
                    <h1 style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem'
                    }}>
                        {currentPage.title}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Dernière mise à jour : Décembre 2025
                    </p>
                </div>

                {/* Contenu principal */}
                <SafeHtml
                    className="legal-content"
                    html={currentPage.content}
                    style={{
                        background: 'var(--glass-bg)',
                        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--glass-border)',
                        backdropFilter: 'blur(10px)'
                    }}
                />

                {/* Autres pages légales */}
                <div style={{
                    marginTop: '3rem',
                    padding: '1.5rem',
                    background: 'var(--glass-bg)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--glass-border)'
                }}>
                    <h3 style={{
                        fontSize: '1.125rem',
                        marginBottom: '1rem',
                        color: 'var(--text-primary)'
                    }}>
                        Autres pages légales
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        {legalLinks.map(item => (
                            <Link
                                key={item.key}
                                to={`/legal/${item.key}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--glass-border)',
                                    textDecoration: 'none',
                                    color: 'var(--text-primary)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                <span style={{ fontWeight: 500 }}>{item.title}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Bouton retour */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Link
                        to="/"
                        className="btn btn--outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Retour à l'accueil
                    </Link>
                </div>
            </div>

            {/* Styles pour le contenu HTML */}
            <style>{`
                .legal-content h2 {
                    font-size: 1.25rem;
                    color: var(--text-primary);
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--color-primary);
                    display: inline-block;
                }
                .legal-content h2:first-child {
                    margin-top: 0;
                }
                .legal-content h3 {
                    font-size: 1.1rem;
                    color: var(--text-primary);
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }
                .legal-content p {
                    color: var(--text-secondary);
                    line-height: 1.7;
                    margin-bottom: 1rem;
                }
                .legal-content ul {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                }
                .legal-content li {
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    line-height: 1.6;
                }
                .legal-content li::marker {
                    color: var(--color-primary);
                }
                .legal-content a {
                    color: var(--color-primary);
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }
                .legal-content a:hover {
                    color: var(--color-primary-light);
                }
                .legal-content strong {
                    color: var(--text-primary);
                    font-weight: 600;
                }
            `}</style>
        </section>
    );
}
