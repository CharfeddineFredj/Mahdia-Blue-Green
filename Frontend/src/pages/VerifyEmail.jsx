import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Toast } from '../components/UI';
import authService from '../services/auth.service';

export default function VerifyEmail() {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const codeRefs = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';

    useEffect(() => {
        if (!email) navigate('/auth');
    }, [email, navigate]);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleCodeChange = (idx, val) => {
        if (!/^\d?$/.test(val)) return;
        const updated = [...code];
        updated[idx] = val;
        setCode(updated);
        if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
    };

    const handleCodeKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !code[idx] && idx > 0) {
            codeRefs.current[idx - 1]?.focus();
        }
    };

    const handleCodePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            codeRefs.current[5]?.focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length < 6) return showToast('Entrez le code à 6 chiffres');

        setLoading(true);
        try {
            const response = await authService.verifyEmail(email, fullCode);
            showToast('Email vérifié !', 'success');

            if (response.requiresQuestionnaire && response.tempToken) {
                // Store temp token then go to questionnaire
                localStorage.setItem('mbg_temp_user', JSON.stringify(response));
                setTimeout(() => navigate('/auth/complete-profile'), 1000);
            } else if (response.token) {
                // No questionnaire — store full token and go to account
                const userData = { token: response.token, ...response.data };
                localStorage.setItem('mbg_user', JSON.stringify(userData));
                setTimeout(() => { navigate('/compte'); window.location.reload(); }, 1000);
            }
        } catch (err) {
            showToast(err.message || 'Code invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await authService.sendVerificationEmail(email);
            showToast('Nouveau code envoyé !', 'success');
            setCode(['', '', '', '', '', '']);
            codeRefs.current[0]?.focus();
        } catch (err) {
            showToast(err.message || 'Erreur lors du renvoi');
        } finally {
            setResending(false);
        }
    };

    return (
        <section className="section">
            <div className="container container--narrow">
                <div className="card" style={{ maxWidth: '440px', margin: '0 auto' }}>
                    <div className="card__content">
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✉️</div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Confirmez votre email</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
                            </p>
                        </div>

                        <form onSubmit={handleVerify}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
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
                                        autoFocus={idx === 0}
                                        style={{
                                            width: '48px', height: '56px', textAlign: 'center',
                                            fontSize: '1.5rem', fontWeight: '700',
                                            border: `2px solid ${digit ? 'var(--color-primary)' : 'var(--border-color)'}`,
                                            borderRadius: '10px', outline: 'none',
                                            background: 'var(--bg-surface)', color: 'var(--text-primary)',
                                            transition: 'border-color 0.2s'
                                        }}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                className="btn btn--primary btn--block"
                                disabled={loading || code.join('').length < 6}
                            >
                                {loading ? 'Vérification...' : 'Confirmer'}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Pas reçu ?{' '}
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                            >
                                {resending ? 'Envoi...' : 'Renvoyer le code'}
                            </button>
                        </p>
                        <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                            <Link to="/auth" style={{ color: 'var(--text-secondary)' }}>← Retour à la connexion</Link>
                        </p>
                    </div>
                </div>
            </div>
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
