import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Copy, Check, Key, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { enable2FA, verifySetup2FA, disable2FA, generateBackupCodes } from '../services/oauth.service';

export default function TwoFactorAuth() {
  const navigate = useNavigate();
  const [step, setStep] = useState('initial'); // initial, setup, verify, complete
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [password, setPassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('mbg_user') || '{}');
  const is2FAEnabled = user?.user?.twoFactorEnabled || false;

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await enable2FA();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'activation de 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await verifySetup2FA(verificationCode);
      setBackupCodes(data.backupCodes);
      setSuccess(data.message);
      setStep('complete');

      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem('mbg_user') || '{}');
      if (storedUser.user) {
        storedUser.user.twoFactorEnabled = true;
        localStorage.setItem('mbg_user', JSON.stringify(storedUser));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Code de vérification invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await disable2FA(password, disableCode);
      setSuccess(data.message);

      // Update user in localStorage
      const storedUser = JSON.parse(localStorage.getItem('mbg_user') || '{}');
      if (storedUser.user) {
        storedUser.user.twoFactorEnabled = false;
        localStorage.setItem('mbg_user', JSON.stringify(storedUser));
      }

      setTimeout(() => navigate('/account'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la désactivation de 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBackupCodes = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const data = await generateBackupCodes(password);
      setBackupCodes(data.backupCodes);
      setSuccess(data.message);
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la génération des codes');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (type === 'codes') {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mahdia-bluegreen-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                Sécurisez votre compte avec la validation en deux étapes
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

            {success && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#16a34a',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}>
                {success}
              </div>
            )}

            {/* Initial State */}
            {step === 'initial' && !is2FAEnabled && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.
                  </p>
                  <ul style={{ listStyle: 'disc', listStylePosition: 'inside', color: 'var(--text-secondary)', paddingLeft: '1rem' }}>
                    <li style={{ marginBottom: '0.5rem' }}>Protège votre compte même si votre mot de passe est compromis</li>
                    <li style={{ marginBottom: '0.5rem' }}>Utilisez une application d'authentification comme Google Authenticator ou Microsoft Authenticator</li>
                    <li>Recevez des codes de secours à usage unique</li>
                  </ul>
                </div>
                <button
                  onClick={handleEnable2FA}
                  disabled={loading}
                  className="btn btn--primary btn--block"
                >
                  {loading ? 'Chargement...' : 'Activer 2FA'}
                </button>
              </div>
            )}

            {/* Setup Step - Show QR Code */}
            {step === 'setup' && (
              <div>
                <h2 className="section__title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>1. Scannez le code QR</h2>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Utilisez votre application d'authentification pour scanner ce code QR :
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <img src={qrCode} alt="QR Code 2FA" style={{ display: 'block' }} />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Ou entrez manuellement cette clé :</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <code style={{
                    flex: 1,
                    background: 'var(--bg-surface)',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    border: '1px solid var(--border-color)'
                  }}>
                    {secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(secret, 'secret')}
                    className="btn btn--ghost btn--sm"
                    title="Copier"
                  >
                    {copiedSecret ? <Check className="w-5 h-5" style={{ color: '#16a34a' }} /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <h3 className="section__title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>2. Entrez le code de vérification</h3>
                <form onSubmit={handleVerifySetup}>
                  <div className="form-group">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      maxLength={6}
                      className="form-input"
                      style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontFamily: 'var(--font-mono)' }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="btn btn--primary btn--block"
                  >
                    {loading ? 'Vérification...' : 'Vérifier et activer'}
                  </button>
                </form>
              </div>
            )}

            {/* Complete Step - Show Backup Codes */}
            {step === 'complete' && backupCodes.length > 0 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'inline-flex', color: '#16a34a', marginBottom: '1rem' }}>
                    <CheckCircle size={48} />
                  </div>
                  <h2 className="section__title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#16a34a' }}>2FA activé !</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Conservez ces codes de secours en lieu sûr.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {backupCodes.map((code, index) => (
                      <code key={index} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.9rem',
                        background: 'var(--glass-bg)',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        border: '1px solid var(--border-color)'
                      }}>
                        {code}
                      </code>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
                    className="btn btn--outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {copiedCodes ? <Check className="w-4 h-4" style={{ color: '#16a34a' }} /> : <Copy className="w-4 h-4" />}
                    <span style={{ marginLeft: '0.5rem' }}>{copiedCodes ? 'Copié!' : 'Copier'}</span>
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="btn btn--outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Download className="w-4 h-4" />
                    <span style={{ marginLeft: '0.5rem' }}>Télécharger</span>
                  </button>
                </div>

                <button
                  onClick={() => navigate('/account')}
                  className="btn btn--primary btn--block"
                >
                  Terminer
                </button>
              </div>
            )}

            {/* 2FA Already Enabled */}
            {step === 'initial' && is2FAEnabled && (
              <div>
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: '#16a34a',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle size={20} />
                  <span>L'authentification à deux facteurs est activée</span>
                </div>

                {/* Generate New Backup Codes */}
                <div style={{ marginBottom: '2rem' }}>
                  <h2 className="section__title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Générer de nouveaux codes de secours</h2>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Si vous avez perdu vos codes de secours, générez-en de nouveaux.
                  </p>
                  <form onSubmit={handleGenerateBackupCodes}>
                    <div className="form-group">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Votre mot de passe actuel"
                        className="form-input"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn--primary btn--block"
                    >
                      {loading ? 'Génération...' : 'Générer nouveaux codes'}
                    </button>
                  </form>

                  {backupCodes.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                          {backupCodes.map((code, index) => (
                            <code key={index} style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.9rem',
                              background: 'var(--glass-bg)',
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              textAlign: 'center',
                              border: '1px solid var(--border-color)'
                            }}>
                              {code}
                            </code>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
                          className="btn btn--outline"
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          {copiedCodes ? <Check className="w-4 h-4" style={{ color: '#16a34a' }} /> : <Copy className="w-4 h-4" />}
                          <span style={{ marginLeft: '0.5rem' }}>{copiedCodes ? 'Copié!' : 'Copier'}</span>
                        </button>
                        <button
                          onClick={downloadBackupCodes}
                          className="btn btn--outline"
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <Download className="w-4 h-4" />
                          <span style={{ marginLeft: '0.5rem' }}>Télécharger</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Disable 2FA */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertTriangle size={24} color="#ef4444" />
                    <h2 className="section__title" style={{ fontSize: '1.25rem', marginBottom: 0, color: '#ef4444' }}>Désactiver 2FA</h2>
                  </div>
                  <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    Attention: Désactiver 2FA réduira la sécurité de votre compte.
                  </p>
                  <form onSubmit={handleDisable2FA}>
                    <div className="form-group">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Code 2FA (6 chiffres)"
                        maxLength={6}
                        className="form-input"
                        style={{ fontFamily: 'var(--font-mono)' }}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn--primary btn--block"
                      style={{ background: '#ef4444', borderColor: '#ef4444' }}
                    >
                      {loading ? 'Désactivation...' : 'Désactiver 2FA'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
