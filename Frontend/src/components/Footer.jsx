import { Link } from 'react-router-dom';
import logoWhite from '../assets/logo_blanc.png';
import {
    FacebookIcon,
    LinkedInIcon,
    TwitterIcon,
    InstagramIcon,
    LocationIcon,
    EmailIcon,
    PhoneIcon
} from './Icons';

export default function Footer() {
    return (
        <footer className="footer" role="contentinfo">
            <div className="container">
                <div className="footer__grid">
                    <div className="footer__brand">
                        <Link to="/" className="footer__logo">
                            <img src={logoWhite} alt="" width="50" height="50" />

                        </Link>
                        <p className="footer__description">
                            Accompagner la transition vers une économie durable à Mahdia à travers l'économie bleue, verte et circulaire.
                        </p>
                        <div className="footer__social">
                            <a href="https://facebook.com" className="footer__social-link" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                                <FacebookIcon size={18} />
                            </a>
                            <a href="https://linkedin.com" className="footer__social-link" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                                <LinkedInIcon size={18} />
                            </a>
                            <a href="https://twitter.com" className="footer__social-link" aria-label="X (Twitter)" target="_blank" rel="noopener noreferrer">
                                <TwitterIcon size={18} />
                            </a>
                            <a href="https://instagram.com" className="footer__social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                                <InstagramIcon size={18} />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="footer__title">Navigation</h3>
                        <ul className="footer__links">
                            <li><Link to="/a-propos">À propos</Link></li>
                            <li><Link to="/blog">Blog</Link></li>
                            <li><Link to="/evenements">Événements</Link></li>
                            <li><Link to="/ressources">Ressources</Link></li>
                            <li><Link to="/chatbot">dolphinbot</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="footer__title">Économies</h3>
                        <ul className="footer__links">
                            <li><Link to="/economies/bleue">Économie Bleue</Link></li>
                            <li><Link to="/economies/verte">Économie Verte</Link></li>
                            <li><Link to="/economies/circulaire">Économie Circulaire</Link></li>
                            <li><Link to="/entrepreneurs">Entrepreneurs</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="footer__title">Contact</h3>
                        <ul className="footer__links footer__links--contact">
                            <li><Link to="/contact">Nous contacter</Link></li>
                            <li className="footer__contact-item">
                                <LocationIcon size={16} />
                                <span>Mahdia, Tunisie</span>
                            </li>
                            <li className="footer__contact-item">
                                <EmailIcon size={16} />
                                <a href="mailto:contact@mahdia-bg.tn">contact@mahdia-bg.tn</a>
                            </li>
                            <li className="footer__contact-item">
                                <PhoneIcon size={16} />
                                <span>+216 73 123 456</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="footer__copyright">© {new Date().getFullYear()} Mahdia Blue & Green. Tous droits réservés.</p>
                    <ul className="footer__legal">
                        <li><Link to="/legal/confidentialite">Confidentialité</Link></li>
                        <li><Link to="/legal/mentions-legales">Mentions légales</Link></li>
                        <li><Link to="/legal/cookies">Cookies</Link></li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
