import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Key } from 'lucide-react';
import { verify2FA, useBackupCode } from '../services/oauth.service';

export default function TwoFactorVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');

  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/auth');
    }
  }, [email, navigate]);

  const handleVerify2FA = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await verify2FA(email, code);

      // Store token and user
      localStorage.setItem('mbg_user', JSON.stringify({
        token: data.token,
        user: data.user
      }));

      // Redirect based on role
      const isAdmin = data.user.role === 'superadmin' || data.user.role === 'admin' ||
        data.user.role === 'analyst' || data.user.role === 'moderator';

      setTimeout(() => {
        if (isAdmin) {
          window.location.replace('/admin');
        } else {
          window.location.replace('/compte');
        }
      }, 500);

    } catch (err) {
      setError(err.message || 'Code de vérification invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleUseBackupCode = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await useBackupCode(email, backupCode);

      // Store token and user
      localStorage.setItem('mbg_user', JSON.stringify({
        token: data.token,
        user: data.user
      }));

      // Show warning if low on backup codes
      if (data.remainingBackupCodes <= 2) {
        alert(`Attention: Il vous reste seulement ${data.remainingBackupCodes} code(s) de secours. Générez-en de nouveaux dans les paramètres de votre compte.`);
      }

      // Redirect based on role
      const isAdmin = data.user.role === 'superadmin' || data.user.role === 'admin' ||
        data.user.role === 'analyst' || data.user.role === 'moderator';

      setTimeout(() => {
        if (isAdmin) {
          window.location.replace('/admin');
        } else {
          window.location.replace('/compte');
        }
      }, 500);

    } catch (err) {
      setError(err.message || 'Code de secours invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container container--narrow">
        <div className="card">
          <div className="card__content">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(0, 125, 144, 0.1)', marginBottom: '1rem' }}>
                <Shield className="w-10 h-10" style={{ color: 'var(--color-primary)' }} strokeWidth={2} size={40} />
              </div>

              <h1 className="section__title" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Authentification à deux facteurs</h1>
              <p className="card__excerpt">
                Entrez le code de votre application d'authentification
              </p>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            {!useBackup ? (
              <form onSubmit={handleVerify2FA}>
                <div className="form-group">
                  <label className="form-label">
                    Code de vérification
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Le code change toutes les 30 secondes
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="btn btn--primary btn--block"
                  >
                    {loading ? 'Vérification...' : 'Vérifier'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setUseBackup(true)}
                  className="btn btn--ghost btn--block"
                >
                  Utiliser un code de secours
                </button>
              </form>
            ) : (
              <form onSubmit={handleUseBackupCode}>
                <div className="form-group">
                  <label className="form-label">
                    Code de secours
                  </label>
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="ABC12345"
                    maxLength={8}
                    className="form-input"
                    style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Chaque code ne peut être utilisé qu'une seule fois
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <button
                    type="submit"
                    disabled={loading || backupCode.length !== 8}
                    className="btn btn--primary btn--block"
                  >
                    {loading ? 'Vérification...' : 'Utiliser le code de secours'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setUseBackup(false)}
                  className="btn btn--ghost btn--block"
                >
                  Retour au code 2FA
                </button>
              </form>
            )}

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Vous n'avez pas accès à vos codes ?</p>
              <button
                onClick={() => navigate('/auth')}
                className="btn btn--link"
                style={{ padding: 0 }}
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
