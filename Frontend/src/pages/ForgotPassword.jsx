import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Toast } from '../components/UI';
import authService from '../services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PWD_RE   = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

function PasswordStrength({ password }) {
    const checks = [
        { label: '8 car. min.', ok: password.length >= 8 },
        { label: 'Majuscule',   ok: /[A-Z]/.test(password) },
        { label: 'Minuscule',   ok: /[a-z]/.test(password) },
        { label: 'Chiffre',     ok: /\d/.test(password) },
        { label: 'Symbole',     ok: /[\W_]/.test(password) },
    ];
    if (!password) return null;
    return (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {checks.map(c => (
                <span key={c.label} style={{
                    fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '20px',
                    background: c.ok ? '#dcfce7' : '#fee2e2',
                    color: c.ok ? '#16a34a' : '#dc2626'
                }}>
                    {c.ok ? '✓' : '✗'} {c.label}
                </span>
            ))}
        </div>
    );
}

/* ── Champ mot de passe avec bouton afficher / masquer ── */
function PasswordInput({ style, ...props }) {
    const [visible, setVisible] = useState(false);
    const label = visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
    return (
        <div style={{ position: 'relative' }}>
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                className={props.className || 'form-input'}
                style={{ ...style, paddingRight: '2.75rem' }}
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={label}
                title={label}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', padding: 0, display: 'flex' }}
            >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}

const FieldError = ({ msg }) => msg
    ? <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.3rem' }}>⚠ {msg}</p>
    : null;

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const codeRefs = useRef([]);
    const navigate = useNavigate();

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const validateEmail = (val) => {
        if (!val) return 'L\'adresse email est obligatoire.';
        if (!EMAIL_RE.test(val)) return 'Format invalide (ex: nom@domaine.com).';
        return '';
    };

    // ── Step 1 ──
    const handleSendCode = async (e) => {
        e.preventDefault();
        const err = validateEmail(email);
        if (err) { setEmailError(err); return; }
        setEmailError('');
        setLoading(true);
        try {
            await authService.forgotPassword(email);
            showToast('Code envoyé ! Vérifiez votre boîte mail.', 'success');
            setStep(2);
        } catch (apiErr) {
            if (apiErr.requiresEmailVerification) {
                setEmailError('Cet email n\'est pas encore vérifié. Vérifiez votre boîte mail d\'abord.');
            } else {
                showToast(apiErr.message || 'Erreur lors de l\'envoi');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Code boxes ──
    const handleCodeChange = (idx, val) => {
        if (!/^\d?$/.test(val)) return;
        const updated = [...code];
        updated[idx] = val;
        setCode(updated);
        setFieldErrors(p => ({ ...p, code: '' }));
        if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
    };

    const handleCodeKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
    };

    const handleCodePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) { setCode(pasted.split('')); codeRefs.current[5]?.focus(); }
    };

    // ── Step 2 ──
    const handleResetPassword = async (e) => {
        e.preventDefault();
        const errs = {};
        if (code.join('').length < 6) errs.code = 'Entrez le code à 6 chiffres.';
        if (!newPassword) errs.newPassword = 'Le mot de passe est obligatoire.';
        else if (!PWD_RE.test(newPassword)) errs.newPassword = '8 car. min. avec majuscule, minuscule, chiffre et symbole.';
        if (!confirmPassword) errs.confirmPassword = 'Confirmez votre mot de passe.';
        else if (newPassword !== confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas.';
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }
        setFieldErrors({});

        setLoading(true);
        try {
            await authService.resetPassword(email, code.join(''), newPassword);
            showToast('Mot de passe réinitialisé avec succès !', 'success');
            setTimeout(() => navigate('/auth'), 1500);
        } catch (apiErr) {
            showToast(apiErr.message || 'Code invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="section">
            <div className="container container--narrow">
                <div className="card" style={{ maxWidth: '440px', margin: '0 auto' }}>
                    <div className="card__content">

                        {/* ── Step 1 — Email ── */}
                        {step === 1 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Mot de passe oublié ?</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        Entrez votre email et nous vous enverrons un code de vérification.
                                    </p>
                                </div>
                                <form onSubmit={handleSendCode} noValidate>
                                    <div className="form-group">
                                        <label className="form-label">Adresse email *</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                            onBlur={() => setEmailError(validateEmail(email))}
                                            placeholder="votre@email.com"
                                            style={{ borderColor: emailError ? '#dc2626' : '' }}
                                            autoFocus
                                        />
                                        <FieldError msg={emailError} />
                                    </div>
                                    <button type="submit" className="btn btn--primary btn--block" disabled={loading} style={{ marginTop: '0.5rem' }}>
                                        {loading ? 'Envoi...' : 'Envoyer le code'}
                                    </button>
                                </form>
                                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem' }}>
                                    <Link to="/auth" style={{ color: 'var(--color-primary)' }}>← Retour à la connexion</Link>
                                </p>
                            </>
                        )}

                        {/* ── Step 2 — Code + new password ── */}
                        {step === 2 && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📬</div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Vérifiez votre email</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        Code envoyé à <strong>{email}</strong>
                                    </p>
                                </div>
                                <form onSubmit={handleResetPassword} noValidate>
                                    <div className="form-group">
                                        <label className="form-label">Code à 6 chiffres *</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.25rem' }}>
                                            {code.map((digit, idx) => (
                                                <input
                                                    key={idx}
                                                    ref={(el) => (codeRefs.current[idx] = el)}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                                                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                                                    onPaste={handleCodePaste}
                                                    style={{
                                                        width: '48px', height: '56px', textAlign: 'center',
                                                        fontSize: '1.5rem', fontWeight: '700',
                                                        border: `2px solid ${fieldErrors.code ? '#dc2626' : digit ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                                        borderRadius: '10px', outline: 'none',
                                                        background: 'var(--bg-surface)', color: 'var(--text-primary)',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FieldError msg={fieldErrors.code} />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Nouveau mot de passe *</label>
                                        <PasswordInput
                                            
                                            className="form-input"
                                            value={newPassword}
                                            onChange={(e) => { setNewPassword(e.target.value); setFieldErrors(p => ({ ...p, newPassword: '' })); }}
                                            placeholder="Min. 8 car. Aa1@"
                                            style={{ borderColor: fieldErrors.newPassword ? '#dc2626' : '' }}
                                        />
                                        <PasswordStrength password={newPassword} />
                                        <FieldError msg={fieldErrors.newPassword} />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Confirmer le mot de passe *</label>
                                        <PasswordInput
                                            
                                            className="form-input"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                                            placeholder="Répétez le mot de passe"
                                            style={{ borderColor: fieldErrors.confirmPassword ? '#dc2626' : '' }}
                                        />
                                        <FieldError msg={fieldErrors.confirmPassword} />
                                    </div>

                                    <button type="submit" className="btn btn--primary btn--block" disabled={loading} style={{ marginTop: '0.5rem' }}>
                                        {loading ? 'Vérification...' : 'Réinitialiser le mot de passe'}
                                    </button>
                                </form>

                                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Pas reçu ?{' '}
                                    <button
                                        onClick={() => { setStep(1); setCode(['', '', '', '', '', '']); setFieldErrors({}); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                                    >
                                        Renvoyer le code
                                    </button>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
