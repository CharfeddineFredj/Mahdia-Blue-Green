import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stepper, Toast } from '../components/UI';
import { contactService } from '../services';

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

const CHECKBOX_TICK_SVG =
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M3.5 8.5L6.5 11.5L12.5 4.5%27/%3E%3C/svg%3E")';

/** Message d’erreur pour l’étape courante, ou null si tout est valide */
function getContactStepError(step, fd) {
    switch (step) {
        case 0:
            if (!fd.profile) return 'Choisissez un profil pour continuer.';
            if (fd.profile === 'Autre' && !fd.profileOther.trim()) {
                return 'Précisez de quoi il s’agit lorsque vous choisissez « Autre ».';
            }
            return null;
        case 1:
            if (!fd.interests.length) {
                return 'Cochez au moins un domaine d’intérêt (choix multiples).';
            }
            return null;
        case 2: {
            if (!fd.fullName.trim()) return 'Le nom complet est obligatoire.';
            const em = fd.email?.trim() || '';
            if (!em) return 'L’adresse e-mail est obligatoire.';
            if (!EMAIL_OK.test(em)) return 'L’adresse e-mail n’est pas valide.';
            const phoneDigits = String(fd.phone || '').replace(/\D/g, '');
            if (!phoneDigits.length) return 'Le numéro de téléphone est obligatoire.';
            if (phoneDigits.length < PHONE_MIN_DIGITS) {
                return `Le téléphone doit contenir au moins ${PHONE_MIN_DIGITS} chiffres (saisie : chiffres uniquement).`;
            }
            if (phoneDigits.length > PHONE_MAX_DIGITS) {
                return `Le téléphone ne peut pas dépasser ${PHONE_MAX_DIGITS} chiffres.`;
            }
            if (!fd.city?.trim()) return 'La ville est obligatoire.';
            if (!fd.organization?.trim()) return 'L’organisation est obligatoire.';
            return null;
        }
        case 3:
            if (!fd.subject.trim()) return 'Le sujet est obligatoire.';
            if (!fd.message?.trim()) return 'Le message est obligatoire.';
            if (!fd.consent) {
                return 'Vous devez accepter la politique de confidentialité pour envoyer le formulaire.';
            }
            return null;
        default:
            return null;
    }
}

/** Vérifie tout le formulaire (utile à l’envoi si l’utilisateur revient en arrière). */
function getFirstContactFormError(fd) {
    for (let s = 0; s <= 3; s += 1) {
        const err = getContactStepError(s, fd);
        if (err) return err;
    }
    return null;
}

export default function Contact() {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        profile: '',
        interests: [],
        fullName: '',
        email: '',
        phone: '',
        city: '',
        organization: '',
        subject: '',
        message: '',
        consent: false,
        honeypot: '',
        profileOther: '',
    });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [submitting, setSubmitting] = useState(false);

    const steps = ['Profil', 'Intérêt', 'Coordonnées', 'Message'];

    const profiles = ['Entrepreneur', 'Étudiant', 'Institution', 'Autre'];
    const interestOptions = ['Économie bleue', 'Économie verte', 'Économie circulaire', 'Ateliers', 'Mentorat', 'Médias'];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox' && name === 'interests') {
            setFormData(prev => ({
                ...prev,
                interests: checked
                    ? [...prev.interests, value]
                    : prev.interests.filter(i => i !== value)
            }));
        } else {
            setFormData((prev) => {
                if (name === 'phone') {
                    const digitsOnly = String(value).replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
                    return { ...prev, phone: digitsOnly };
                }
                const next = {
                    ...prev,
                    [name]: type === 'checkbox' ? checked : value,
                };
                if (name === 'profile' && value !== 'Autre') {
                    next.profileOther = '';
                }
                return next;
            });
        }
    };

    const nextStep = () => {
        const err = getContactStepError(currentStep, formData);
        if (err) {
            setToast({ show: true, message: err, type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.honeypot) return;

        const submitErr = getFirstContactFormError(formData);
        if (submitErr) {
            setToast({ show: true, message: submitErr, type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
            return;
        }

        const fullName = formData.fullName.trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setSubmitting(true);
        try {
            await contactService.sendMessage({
                name: fullName,
                firstName,
                lastName,
                email: formData.email.trim(),
                subject: formData.subject.trim(),
                message: formData.message.trim(),
                phone: formData.phone.replace(/\D/g, '') || undefined,
                city: formData.city.trim() || undefined,
                organization: formData.organization.trim() || undefined,
                profile:
                    formData.profile === 'Autre' && formData.profileOther.trim()
                        ? `Autre — ${formData.profileOther.trim()}`
                        : formData.profile || undefined,
                interests: formData.interests
            });
            setToast({ show: true, message: 'Message envoyé avec succès ! Nous vous répondrons bientôt.', type: 'success' });
            setFormData({
                profile: '',
                interests: [],
                fullName: '',
                email: '',
                phone: '',
                city: '',
                organization: '',
                subject: '',
                message: '',
                consent: false,
                honeypot: '',
                profileOther: '',
            });
            setCurrentStep(0);
        } catch (err) {
            setToast({
                show: true,
                message: err.message || 'Impossible d\'envoyer le message. Réessayez plus tard.',
                type: 'error'
            });
        } finally {
            setSubmitting(false);
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        }
    };

    return (
        <section className="section">
            <div className="container container--narrow">
                <h1>Contact</h1>
                <p style={{ marginBottom: '3rem', color: 'var(--text-secondary)' }}>
                    Remplissez ce formulaire et nous vous recontacterons rapidement.
                </p>

                <Stepper steps={steps} currentStep={currentStep} />

                <form onSubmit={handleSubmit}>
                    {/* Honeypot */}
                    <input
                        type="text"
                        name="honeypot"
                        value={formData.honeypot}
                        onChange={handleInputChange}
                        style={{ display: 'none' }}
                        tabIndex="-1"
                        autoComplete="off"
                    />

                    {/* Step 0: Profile */}
                    {currentStep === 0 && (
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Quel est votre profil ?</h2>
                            <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Choix unique : sélectionnez le profil qui vous correspond. Tous les champs du formulaire sont obligatoires.
                            </p>
                            <div
                                style={{ display: 'grid', gap: '0.65rem' }}
                                role="radiogroup"
                                aria-label="Votre profil"
                            >
                                {profiles.map((profile) => {
                                    const selected = formData.profile === profile;
                                    return (
                                        <label
                                            key={profile}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.9rem',
                                                padding: '1rem 1.15rem',
                                                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                background: selected ? 'rgba(0, 150, 136, 0.1)' : 'var(--bg-base)',
                                                boxShadow: selected ? '0 0 0 1px var(--color-primary)' : 'none',
                                                transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="profile"
                                                value={profile}
                                                checked={selected}
                                                onChange={handleInputChange}
                                                style={{
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    width: '1.35rem',
                                                    height: '1.35rem',
                                                    flexShrink: 0,
                                                    margin: 0,
                                                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                    borderRadius: '50%',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'transparent',
                                                    backgroundImage: selected
                                                        ? 'radial-gradient(circle, var(--color-primary) 42%, transparent 44%)'
                                                        : 'none',
                                                    transition: 'border-color 0.2s ease, background 0.2s ease',
                                                }}
                                            />
                                            <span style={{ fontWeight: selected ? 600 : 500, lineHeight: 1.35 }}>{profile}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {formData.profile === 'Autre' && (
                                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                                    <label className="form-label form-label--required" htmlFor="contact-profile-other">
                                        De quoi s’agit-il ?
                                    </label>
                                    <textarea
                                        id="contact-profile-other"
                                        className="form-textarea"
                                        name="profileOther"
                                        rows={3}
                                        value={formData.profileOther}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Décrivez brièvement votre profil ou votre demande"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 1: Interests — choix multiples */}
                    {currentStep === 1 && (
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Domaines d'intérêt</h2>
                            <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Choix multiples obligatoire : cochez <strong>tous</strong> les thèmes qui vous concernent (au moins un).
                            </p>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                    gap: '0.75rem',
                                }}
                                role="group"
                                aria-label="Domaines d'intérêt, sélection multiple"
                            >
                                {interestOptions.map((interest) => {
                                    const selected = formData.interests.includes(interest);
                                    return (
                                        <label
                                            key={interest}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.85rem',
                                                padding: '1rem 1.1rem',
                                                minHeight: '3.25rem',
                                                border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                background: selected ? 'rgba(0, 150, 136, 0.1)' : 'var(--bg-base)',
                                                boxShadow: selected ? '0 0 0 1px var(--color-primary)' : 'none',
                                                transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                name="interests"
                                                value={interest}
                                                checked={selected}
                                                onChange={handleInputChange}
                                                style={{
                                                    appearance: 'none',
                                                    WebkitAppearance: 'none',
                                                    width: '1.35rem',
                                                    height: '1.35rem',
                                                    flexShrink: 0,
                                                    margin: 0,
                                                    border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    backgroundColor: selected ? 'var(--color-primary)' : 'transparent',
                                                    backgroundImage: selected ? CHECKBOX_TICK_SVG : 'none',
                                                    backgroundSize: '70%',
                                                    backgroundPosition: 'center',
                                                    backgroundRepeat: 'no-repeat',
                                                }}
                                            />
                                            <span style={{ fontWeight: selected ? 600 : 500, lineHeight: 1.35 }}>
                                                {interest}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact Info */}
                    {currentStep === 2 && (
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Vos coordonnées</h2>
                            <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Tous les champs sont obligatoires. Téléphone : <strong>chiffres uniquement</strong> ({PHONE_MIN_DIGITS} à {PHONE_MAX_DIGITS} chiffres).
                            </p>
                            <div className="form-group">
                                <label className="form-label form-label--required">Nom complet</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                    autoComplete="name"
                                    placeholder="Prénom et nom"
                                />
                            </div>
                            <div className="grid grid--2">
                                <div className="form-group">
                                    <label className="form-label form-label--required">Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label--required">Téléphone</label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="form-input"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        autoComplete="tel"
                                        placeholder={`${PHONE_MIN_DIGITS}–${PHONE_MAX_DIGITS} chiffres`}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid--2">
                                <div className="form-group">
                                    <label className="form-label form-label--required">Ville</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        autoComplete="address-level2"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label--required">Organisation</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="organization"
                                        value={formData.organization}
                                        onChange={handleInputChange}
                                        autoComplete="organization"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Message */}
                    {currentStep === 3 && (
                        <div>
                            <h2 style={{ marginBottom: '0.5rem' }}>Votre message</h2>
                            <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Sujet, message et acceptation de la politique sont obligatoires.
                            </p>
                            <div className="form-group">
                                <label className="form-label form-label--required">Sujet</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Objet de votre demande"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label form-label--required">Message</label>
                                <textarea
                                    className="form-textarea"
                                    name="message"
                                    rows="5"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    required
                                ></textarea>
                            </div>
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.85rem',
                                    padding: '1rem 1.15rem',
                                    marginTop: '1.25rem',
                                    minHeight: '3.25rem',
                                    border: `2px solid ${formData.consent ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: formData.consent ? 'rgba(0, 150, 136, 0.1)' : 'var(--bg-base)',
                                    boxShadow: formData.consent ? '0 0 0 1px var(--color-primary)' : 'none',
                                    transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    name="consent"
                                    checked={formData.consent}
                                    onChange={handleInputChange}
                                    style={{
                                        appearance: 'none',
                                        WebkitAppearance: 'none',
                                        width: '1.35rem',
                                        height: '1.35rem',
                                        flexShrink: 0,
                                        margin: '0.15rem 0 0',
                                        border: `2px solid ${formData.consent ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        backgroundColor: formData.consent ? 'var(--color-primary)' : 'transparent',
                                        backgroundImage: formData.consent ? CHECKBOX_TICK_SVG : 'none',
                                        backgroundSize: '70%',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                    }}
                                />
                                <span style={{ lineHeight: 1.55, color: 'var(--text-primary)', fontWeight: formData.consent ? 600 : 500 }}>
                                    J’ai lu et j’accepte la{' '}
                                    <Link
                                        to="/legal/confidentialite"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    >
                                        politique de confidentialité
                                    </Link>
                                    <span className="form-label--required" aria-hidden></span>
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        {currentStep > 0 && (
                            <button type="button" className="btn btn--outline" onClick={prevStep}>
                                Précédent
                            </button>
                        )}
                        {currentStep < 3 && (
                            <button type="button" className="btn btn--primary" onClick={nextStep}>
                                Suivant
                            </button>
                        )}
                        {currentStep === 3 && (
                            <button type="submit" className="btn btn--primary" disabled={submitting}>
                                {submitting ? 'Envoi…' : 'Envoyer'}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
