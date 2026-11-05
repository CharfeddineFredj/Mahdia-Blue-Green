import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toast } from '../components/UI';
import { authService, questionnaireService } from '../services';
import { getGoogleLoginUrl } from '../services/oauth.service';
import { normalizeQuestionnairePayload, getQuestionnaireAnswerKey, buildQuestionnaireAnswersPayload } from '../utils/questionnaireNormalize';
import { validateQuestionnaireAnswer, isFirstOrLastNameField, digitsOnly, removeDigits } from '../utils/questionnaireValidation';
import { Eye, EyeOff } from 'lucide-react';

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

/* ── LinkedIn-style interactive questionnaire ── */

const CATEGORY_EMOJIS = {
    personal: '👤', profession: '💼', education: '🎓', location: '📍',
    contact: '📞', discovery: '🔍', interests: '💡', entrepreneurship: '🚀',
    preferences: '⚙️', general: '📝',
};

const Q_STYLES = `
.q-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);animation:q-fadeIn .3s}
.q-modal{background:var(--bg-surface,#fff);border-radius:20px;width:95%;max-width:520px;max-height:90vh;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;animation:q-slideUp .4s cubic-bezier(.16,1,.3,1)}
.q-header{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border-color,#e5e7eb);display:flex;align-items:center;gap:.75rem}
.q-header-emoji{font-size:1.5rem}
.q-header-text h3{margin:0;font-size:1rem;font-weight:600}
.q-header-text p{margin:.15rem 0 0;font-size:.78rem;opacity:.55}
.q-progress{padding:0 1.5rem;padding-top:1rem}
.q-progress-bar{height:4px;border-radius:2px;background:var(--border-color,#e5e7eb);overflow:hidden}
.q-progress-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#2563eb,#10b981);transition:width .5s cubic-bezier(.16,1,.3,1)}
.q-progress-label{display:flex;justify-content:space-between;font-size:.72rem;opacity:.5;margin-top:.35rem}
.q-body{padding:1.5rem;overflow-y:auto;flex:1}
.q-question{animation:q-cardIn .35s cubic-bezier(.16,1,.3,1)}
.q-question-label{font-size:1.05rem;font-weight:600;margin-bottom:1.25rem;line-height:1.4}
.q-question-label span{color:#ef4444}
.q-skip{font-size:.75rem;opacity:.45;margin-top:.25rem;font-weight:400}
.q-opt{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;border-radius:12px;border:2px solid var(--border-color,#e5e7eb);cursor:pointer;transition:all .2s;margin-bottom:.5rem;user-select:none}
.q-opt:hover{border-color:#2563eb;background:rgba(37,99,235,.04)}
.q-opt.selected{border-color:#2563eb;background:rgba(37,99,235,.08);transform:scale(1.01)}
.q-opt input{display:none}
.q-opt-dot{width:20px;height:20px;border-radius:50%;border:2px solid var(--border-color,#ccc);transition:all .2s;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.q-opt.selected .q-opt-dot{border-color:#2563eb;background:#2563eb}
.q-opt.selected .q-opt-dot::after{content:'';width:8px;height:8px;border-radius:50%;background:#fff}
.q-opt-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--border-color,#ccc);transition:all .2s;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.7rem}
.q-opt.selected .q-opt-check{border-color:#2563eb;background:#2563eb;color:#fff}
.q-opt-label{font-size:.92rem}
.q-input{width:100%;padding:.85rem 1rem;border:2px solid var(--border-color,#e5e7eb);border-radius:12px;font-size:1rem;outline:none;transition:border-color .2s;background:transparent;color:inherit;font-family:inherit}
.q-input:focus{border-color:#2563eb}
.q-bool-row{display:flex;gap:.75rem}
.q-bool{flex:1;padding:1rem;text-align:center;border-radius:12px;border:2px solid var(--border-color,#e5e7eb);cursor:pointer;transition:all .2s;font-size:1.1rem;user-select:none}
.q-bool:hover{border-color:#2563eb}
.q-bool.selected{border-color:#2563eb;background:rgba(37,99,235,.08);transform:scale(1.03)}
.q-footer{padding:1rem 1.5rem;border-top:1px solid var(--border-color,#e5e7eb);display:flex;gap:.75rem;align-items:center}
.q-footer .q-dots{display:flex;gap:4px;flex:1}
.q-dot{width:6px;height:6px;border-radius:3px;background:var(--border-color,#d1d5db);transition:all .3s}
.q-dot.active{width:18px;background:#2563eb}
.q-dot.done{background:#10b981}
.q-btn{padding:.65rem 1.5rem;border-radius:12px;font-size:.88rem;font-weight:600;border:none;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:.4rem}
.q-btn-next{background:#2563eb;color:#fff}
.q-btn-next:hover{background:#1d4ed8;transform:translateY(-1px)}
.q-btn-next:disabled{opacity:.4;cursor:not-allowed;transform:none}
.q-btn-back{background:transparent;color:inherit;opacity:.6}
.q-btn-back:hover{opacity:1}
.q-btn-skip{background:transparent;color:inherit;opacity:.4;font-size:.8rem;margin-left:auto}
.q-btn-skip:hover{opacity:.7}
.q-done{text-align:center;padding:2rem 1rem;animation:q-cardIn .5s}
.q-done-emoji{font-size:3rem;margin-bottom:1rem}
.q-done h3{font-size:1.3rem;margin-bottom:.5rem}
.q-done p{opacity:.6;font-size:.9rem}
@keyframes q-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes q-slideUp{from{opacity:0;transform:translateY(30px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes q-cardIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
`;

function InteractiveQuestionnaire({ questions, onComplete, onSkipAll, loading, error: externalError }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const answersRef = useRef({});
    const [animDir, setAnimDir] = useState('next');
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [qError, setQError] = useState('');
    const inputRef = useRef(null);

    const allQuestions = questions || [];
    const total = allQuestions.length;
    const question = allQuestions[currentIdx];
    const qId = getQuestionnaireAnswerKey(question, currentIdx);

    // Keep ref in sync with state so goNext always has latest answers
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        if (question?.type === 'text' || question?.type === 'date') {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    }, [currentIdx, question?.type]);

    // If parent reports an error, reset done state so user can retry
    useEffect(() => {
        if (externalError) {
            setDone(false);
            setSubmitting(false);
        }
    }, [externalError]);

    const updateAnswer = (questionId, value) => {
        setAnswers(prev => {
            const updated = { ...prev, [questionId]: value };
            answersRef.current = updated;
            return updated;
        });
        setQError('');
    };

    const handleAnswer = (value) => {
        updateAnswer(qId, value);
        // Auto-advance for single_choice and boolean after a short delay
        if (question.type === 'single_choice' || question.type === 'boolean') {
            setTimeout(() => goNext(value), 350);
        }
    };

    const toggleMulti = (option) => {
        const current = answers[qId] || [];
        const updated = current.includes(option)
            ? current.filter(v => v !== option)
            : [...current, option];
        updateAnswer(qId, updated);
    };

    const isValid = (overrideVal) => {
        const val = overrideVal !== undefined ? overrideVal : answersRef.current[qId];
        return validateQuestionnaireAnswer(question, val).ok;
    };

    const goNext = (overrideVal) => {
        let val = overrideVal !== undefined ? overrideVal : answersRef.current[qId];
        if (question?.type === 'text' && typeof val === 'string') {
            let normalized = val;
            if (question.personalInfoField === 'phone') {
                normalized = digitsOnly(val);
            } else if (isFirstOrLastNameField(question.personalInfoField)) {
                normalized = removeDigits(val).trim();
            } else {
                normalized = val.trim();
            }
            if (normalized !== val) {
                updateAnswer(qId, normalized);
                val = normalized;
            }
        }

        const { ok, message } = validateQuestionnaireAnswer(question, val);
        if (!ok) {
            if (message) setQError(message);
            return;
        }
        setQError('');
        if (currentIdx < total - 1) {
            setAnimDir('next');
            setCurrentIdx(prev => prev + 1);
        } else {
            setDone(true);
            setSubmitting(true);
            const finalAnswers = { ...answersRef.current, [qId]: val };
            const answersArray = buildQuestionnaireAnswersPayload(finalAnswers, allQuestions);
            onComplete(answersArray);
        }
    };

    const goBack = () => {
        if (currentIdx > 0) {
            setAnimDir('back');
            setCurrentIdx(prev => prev - 1);
        }
    };

    const skipQuestion = () => {
        if (!question.isRequired) {
            if (currentIdx < total - 1) {
                setAnimDir('next');
                setCurrentIdx(prev => prev + 1);
            } else {
                const emptyVal = question.type === 'multiple_choice' ? [] : '';
                updateAnswer(qId, emptyVal);
                goNext(emptyVal);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (question.type === 'text' || question.type === 'date')) {
            e.preventDefault();
            goNext();
        }
    };

    const handleRetry = () => {
        setSubmitting(true);
        const answersArray = buildQuestionnaireAnswersPayload(answersRef.current, allQuestions);
        onComplete(answersArray);
    };

    if (done) {
        return (
            <div className="q-overlay">
                <style>{Q_STYLES}</style>
                <div className="q-modal">
                    <div className="q-body">
                        <div className="q-done">
                            {externalError ? (
                                <>
                                    <div className="q-done-emoji">⚠️</div>
                                    <h3>Erreur</h3>
                                    <p style={{ marginBottom: '1rem' }}>{externalError}</p>
                                    <button className="q-btn q-btn-next" onClick={handleRetry} disabled={submitting} style={{ margin: '0 auto' }}>
                                        {submitting ? 'Envoi...' : '🔄 Réessayer'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="q-done-emoji">🎉</div>
                                    <h3>{loading || submitting ? 'Envoi en cours...' : 'Merci !'}</h3>
                                    <p>{loading || submitting ? 'Veuillez patienter...' : 'Votre profil est en cours de traitement'}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!question) return null;

    const progress = total > 0 ? ((currentIdx + 1) / total) * 100 : 0;
    const remainingAfterThis = Math.max(0, total - currentIdx - 1);
    const catEmoji = CATEGORY_EMOJIS[question.category] || '📝';

    const renderInput = () => {
        switch (question.type) {
            case 'text':
                return (
                    <input
                        ref={inputRef}
                        type={
                            question.personalInfoField === 'phone' ? 'tel'
                            : question.category === 'contact' && question.text.toLowerCase().includes('email') ? 'email'
                            : 'text'
                        }
                        inputMode={question.personalInfoField === 'phone' ? 'numeric' : 'text'}
                        className="q-input"
                        value={answers[qId] || ''}
                        onChange={(e) => {
                            let val = e.target.value;
                            if (question.personalInfoField === 'phone') {
                                val = digitsOnly(val);
                            } else if (isFirstOrLastNameField(question.personalInfoField)) {
                                val = removeDigits(val);
                            }
                            updateAnswer(qId, val);
                        }}
                        onKeyDown={(e) => {
                            if (question.personalInfoField === 'phone') {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    goNext();
                                    return;
                                }
                                // Chiffres uniquement + touches de navigation
                                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                }
                            } else if (isFirstOrLastNameField(question.personalInfoField)) {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    goNext();
                                    return;
                                }
                                if (/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                    return;
                                }
                                handleKeyDown(e);
                            } else {
                                handleKeyDown(e);
                            }
                        }}
                        onPaste={(e) => {
                            if (question.personalInfoField === 'phone') {
                                e.preventDefault();
                                const pasted = digitsOnly(e.clipboardData.getData('text'));
                                updateAnswer(qId, (answers[qId] || '') + pasted);
                            } else if (isFirstOrLastNameField(question.personalInfoField)) {
                                e.preventDefault();
                                const pasted = removeDigits(e.clipboardData.getData('text'));
                                updateAnswer(qId, (answers[qId] || '') + pasted);
                            }
                        }}
                        placeholder={question.placeholder || 'Tapez votre réponse...'}
                        autoFocus
                    />
                );
            case 'date':
                return (
                    <input
                        ref={inputRef}
                        type="date"
                        className="q-input"
                        value={answers[qId] || ''}
                        onChange={(e) => updateAnswer(qId, e.target.value)}
                        onKeyDown={handleKeyDown}
                        max={(() => {
                            const d = new Date();
                            d.setFullYear(d.getFullYear() - 18);
                            return d.toISOString().split('T')[0];
                        })()}
                    />
                );
            case 'single_choice':
                return (
                    <div>
                        {question.options?.map((option, idx) => (
                            <div
                                key={idx}
                                className={`q-opt ${answers[qId] === option ? 'selected' : ''}`}
                                onClick={() => handleAnswer(option)}
                            >
                                <div className="q-opt-dot" />
                                <span className="q-opt-label">{option}</span>
                            </div>
                        ))}
                    </div>
                );
            case 'multiple_choice':
                return (
                    <div>
                        {question.options?.map((option, idx) => (
                            <div
                                key={idx}
                                className={`q-opt ${(answers[qId] || []).includes(option) ? 'selected' : ''}`}
                                onClick={() => toggleMulti(option)}
                            >
                                <div className="q-opt-check">{(answers[qId] || []).includes(option) ? '✓' : ''}</div>
                                <span className="q-opt-label">{option}</span>
                            </div>
                        ))}
                        <p style={{ fontSize: '.75rem', opacity: .5, marginTop: '.5rem' }}>Sélectionnez une ou plusieurs options</p>
                    </div>
                );
            case 'boolean':
                return (
                    <div className="q-bool-row">
                        <div
                            className={`q-bool ${answers[qId] === 'true' ? 'selected' : ''}`}
                            onClick={() => handleAnswer('true')}
                        >
                            ✅ Oui
                        </div>
                        <div
                            className={`q-bool ${answers[qId] === 'false' ? 'selected' : ''}`}
                            onClick={() => handleAnswer('false')}
                        >
                            ❌ Non
                        </div>
                    </div>
                );
            case 'rating':
                return (
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                            <div
                                key={num}
                                className={`q-bool ${answers[qId] === String(num) ? 'selected' : ''}`}
                                style={{ width: 56, padding: '.75rem 0' }}
                                onClick={() => handleAnswer(String(num))}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                );
            default:
                return (
                    <input
                        ref={inputRef}
                        type="text"
                        className="q-input"
                        value={answers[qId] || ''}
                        onChange={(e) => updateAnswer(qId, e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={question.placeholder || 'Tapez votre réponse...'}
                    />
                );
        }
    };

    return (
        <div className="q-overlay">
            <style>{Q_STYLES}</style>
            <div className="q-modal">
                {/* Header */}
                <div className="q-header">
                    <span className="q-header-emoji">{catEmoji}</span>
                    <div className="q-header-text">
                        <h3>Complétez votre profil</h3>
                        <p>Question {currentIdx + 1} sur {total}</p>
                    </div>
                    {onSkipAll && (
                        <button className="q-btn q-btn-skip" onClick={onSkipAll} style={{ marginLeft: 'auto' }}>
                            Passer tout ✕
                        </button>
                    )}
                </div>

                {/* Progress */}
                <div className="q-progress">
                    <div className="q-progress-bar">
                        <div className="q-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="q-progress-label">
                        <span>{Math.round(progress)}% complété</span>
                        <span>{remainingAfterThis === 0 ? 'Dernière question' : `${remainingAfterThis} après celle-ci`}</span>
                    </div>
                </div>

                {/* Question */}
                <div className="q-body" key={currentIdx}>
                    <div className="q-question" style={{ animation: `q-cardIn .35s cubic-bezier(.16,1,.3,1)` }}>
                        <div className="q-question-label">
                            {question.text}
                            {question.isRequired && <span> *</span>}
                            {!question.isRequired && <div className="q-skip">Optionnel — vous pouvez passer</div>}
                        </div>
                        {renderInput()}
                        {qError && (
                            <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.5rem' }}>⚠ {qError}</p>
                        )}
                    </div>
                </div>

                {/* Footer with dots + navigation */}
                <div className="q-footer">
                    {currentIdx > 0 ? (
                        <button className="q-btn q-btn-back" onClick={goBack}>← Retour</button>
                    ) : <div />}

                    <div className="q-dots">
                        {allQuestions.map((q, i) => (
                            <div
                                key={getQuestionnaireAnswerKey(q, i)}
                                className={`q-dot ${i === currentIdx ? 'active' : ''} ${i < currentIdx || answers[getQuestionnaireAnswerKey(q, i)] !== undefined ? 'done' : ''}`}
                            />
                        ))}
                    </div>

                    {!question.isRequired && question.type !== 'single_choice' && question.type !== 'boolean' && (
                        <button className="q-btn q-btn-skip" onClick={skipQuestion}>Passer</button>
                    )}

                    {(question.type === 'text' || question.type === 'date' || question.type === 'multiple_choice' || question.type === 'rating') && (
                        <button
                            className="q-btn q-btn-next"
                            onClick={() => goNext()}
                            disabled={!isValid()}
                        >
                            {currentIdx === total - 1 ? 'Terminer ✓' : 'Suivant →'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Main Auth page ── */

// Password strength indicator (shared)
function PasswordStrength({ password }) {
    const checks = [
        { label: '8 car. min.', ok: password.length >= 8 },
        { label: 'Majuscule', ok: /[A-Z]/.test(password) },
        { label: 'Minuscule', ok: /[a-z]/.test(password) },
        { label: 'Chiffre', ok: /\d/.test(password) },
        { label: 'Symbole', ok: /[\W_]/.test(password) },
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

const FieldError = ({ msg }) => msg
    ? <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.3rem' }}>⚠ {msg}</p>
    : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PWD_RE   = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
// Aligné sur Backend/utils/userIdentifier.js : le nom d'utilisateur sert aussi à se connecter
const USERNAME_RE = /^[\p{L}\p{N}._-]+$/u;

export default function Auth() {
    const [activeTab, setActiveTab] = useState('login');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [loading, setLoading] = useState(false);
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerErrors, setRegisterErrors] = useState({});
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [showReactivationPanel, setShowReactivationPanel] = useState(false);
    const [reactivationEmail, setReactivationEmail] = useState('');
    const [reactivationPassword, setReactivationPassword] = useState('');
    const [oauthReactivationEmail, setOauthReactivationEmail] = useState('');
    const [reactivationBusy, setReactivationBusy] = useState(false);

    // Multi-step registration
    const [registrationStep, setRegistrationStep] = useState(1);
    const [questionnaire, setQuestionnaire] = useState(null);
    const [registrationData, setRegistrationData] = useState(null);

    // Retour après connexion (ex. inscription à un événement) — chemins internes uniquement,
    // jamais « //domaine » ni URL absolue (pas de redirection vers un site externe)
    const rawRedirect = searchParams.get('redirect') || '';
    const safeRedirect = /^\/(?![/\\])/.test(rawRedirect) && !rawRedirect.startsWith('/auth') ? rawRedirect : '';

    useEffect(() => {
        if (authService.needsQuestionnaireCompletion()) return;
        if (authService.isAuthenticated()) {
            navigate(safeRedirect || '/home', { replace: true });
        }
    }, [navigate, safeRedirect]);

    useEffect(() => {
        if (!safeRedirect.startsWith('/evenement/')) return;
        setToast({ show: true, message: 'Connectez-vous pour vous inscrire à cet événement.', type: 'info' });
        const t = setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        return () => clearTimeout(t);
    }, [safeRedirect]);

    useEffect(() => {
        const err = searchParams.get('error');
        const reason = searchParams.get('reason');
        if (err === 'account_deactivated') {
            setShowReactivationPanel(true);
            setToast({
                show: true,
                message: 'Ce compte est désactivé. Demandez une réactivation aux administrateurs ci-dessous.',
                type: 'info'
            });
        }
        if (reason === 'account_deactivated') {
            setToast({
                show: true,
                message: 'Votre session a été fermée : compte désactivé. Après réactivation par un admin, vous pourrez vous reconnecter.',
                type: 'error'
            });
        }
        if (reason === 'account_removed') {
            setToast({
                show: true,
                message: 'Votre session a été fermée : ce compte n’existe plus.',
                type: 'error'
            });
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchQuestionnaire = async () => {
            try {
                const response = await questionnaireService.getRegistrationQuestionnaire();
                if (response.success && response.data) {
                    setQuestionnaire(normalizeQuestionnairePayload(response.data));
                }
            } catch (error) {
                console.log('No registration questionnaire found');
            }
        };
        fetchQuestionnaire();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        const identifier = (formData.get('identifier') || '').toString().trim();
        const credentials = {
            identifier,
            password: (formData.get('password') || '').toString()
        };
        // E-mail réel du compte (renvoyé par l'API) ; à défaut, l'identifiant s'il s'agit d'un e-mail
        const accountEmail = (error) => error?.email || (identifier.includes('@') ? identifier : '');

        if (!identifier || !credentials.password) {
            setToast({ show: true, message: 'Saisissez votre e-mail ou nom d’utilisateur et votre mot de passe.', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
            setLoading(false);
            return;
        }

        try {
            const response = await authService.login(credentials);

            if (response.success) {
                if (response.requires2FA) {
                    setToast({ show: true, message: 'Code 2FA requis', type: 'info' });
                    setTimeout(() => {
                        navigate(`/auth/2fa?email=${encodeURIComponent(response.email)}`);
                    }, 1000);
                } else if (response.requiresQuestionnaire || response.data?.tempToken) {
                    setToast({ show: true, message: 'Veuillez compléter le questionnaire', type: 'info' });
                    setTimeout(() => {
                        navigate('/auth/complete-profile');
                    }, 1000);
                } else {
                    const userRole = response.data?.role || response.data?.user?.role;
                    const isAdmin = userRole === 'superadmin' || userRole === 'admin' || userRole === 'analyst' || userRole === 'moderator';

                    setToast({ show: true, message: 'Connexion réussie !', type: 'success' });
                    setTimeout(() => {
                        navigate(isAdmin ? '/admin' : (safeRedirect || '/compte'));
                        window.location.reload();
                    }, 1000);
                }
            }
        } catch (error) {
            if (error.code === 'ACCOUNT_DEACTIVATED' || error.canRequestReactivation) {
                setReactivationEmail(accountEmail(error));
                setShowReactivationPanel(true);
                setToast({
                    show: true,
                    message: error.message || 'Compte désactivé — vous pouvez demander une réactivation.',
                    type: 'info'
                });
                setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
                return;
            }
            // Handle unverified email — redirect to verify page
            if (error.requiresEmailVerification || (error.status === 403 && !error.code)) {
                const emailVal = accountEmail(error);
                setToast({ show: true, message: 'Vérifiez votre email avant de vous connecter.', type: 'error' });
                setTimeout(() => navigate('/verifier-email', { state: { email: emailVal } }), 1500);
            } else {
                setToast({ show: true, message: error.message || 'Erreur de connexion', type: 'error' });
                setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        const errs = {};
        const nameVal = formData.get('name')?.trim();
        const emailVal = formData.get('email')?.trim();
        const pwdVal   = formData.get('password');
        const cpwdVal  = formData.get('confirmPassword');

        if (!nameVal) errs.name = 'Le nom d’utilisateur est obligatoire.';
        else if (nameVal.length < 3 || nameVal.length > 30) errs.name = 'Entre 3 et 30 caractères.';
        else if (!USERNAME_RE.test(nameVal)) errs.name = 'Lettres, chiffres, « . », « - » et « _ » uniquement (sans espace ni « @ »).';
        if (!emailVal) errs.email = 'L\'email est obligatoire.';
        else if (!EMAIL_RE.test(emailVal)) errs.email = 'Format invalide (ex: nom@domaine.com).';
        if (!pwdVal) errs.password = 'Le mot de passe est obligatoire.';
        else if (!PWD_RE.test(pwdVal)) errs.password = '8 car. min. avec majuscule, minuscule, chiffre et symbole.';
        if (!cpwdVal) errs.confirmPassword = 'Confirmez votre mot de passe.';
        else if (pwdVal !== cpwdVal) errs.confirmPassword = 'Les mots de passe ne correspondent pas.';

        if (Object.keys(errs).length) {
            setRegisterErrors(errs);
            setLoading(false);
            return;
        }
        setRegisterErrors({});

        const userData = {
            username: nameVal,
            email: emailVal.toLowerCase(),
            password: formData.get('password')
        };        try {
            const response = await authService.register(userData);

            if (response.success) {
                setRegistrationData(response);
                // Always redirect to email verification first
                setToast({ show: true, message: 'Compte créé ! Vérifiez votre email.', type: 'success' });
                setTimeout(() => {
                    navigate('/verifier-email', { state: { email: userData.email } });
                }, 1000);
            }
        } catch (error) {
            setToast({ show: true, message: error.message || 'Erreur lors de la création du compte', type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
        } finally {
            setLoading(false);
        }
    };

    const [questionnaireError, setQuestionnaireError] = useState(null);

    const handleQuestionnaireComplete = async (answersArray) => {
        setLoading(true);
        setQuestionnaireError(null);
        try {
            const response = await authService.completeQuestionnaire(answersArray);
            if (response.success) {
                setToast({ show: true, message: 'Bienvenue ! 🎉', type: 'success' });
                setTimeout(() => {
                    // Redirect to email verification if email not yet verified
                    const storedEmail = registrationData?.data?.email;
                    if (storedEmail) {
                        navigate('/verifier-email', { state: { email: storedEmail } });
                    } else {
                        navigate('/compte');
                        window.location.reload();
                    }
                }, 1500);
            }
        } catch (error) {
            const errMsg = error.message || 'Erreur lors de la soumission';
            setQuestionnaireError(errMsg);
            setToast({ show: true, message: errMsg, type: 'error' });
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setRegistrationStep(1);
    };

    const handleReactivationLocal = async (e) => {
        e.preventDefault();
        setReactivationBusy(true);
        try {
            const res = await authService.requestReactivation(reactivationEmail.trim(), reactivationPassword);
            if (res.success) {
                setToast({ show: true, message: res.message, type: 'success' });
                setReactivationPassword('');
            }
        } catch (err) {
            setToast({ show: true, message: err.message || 'Erreur', type: 'error' });
        } finally {
            setReactivationBusy(false);
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
        }
    };

    const handleReactivationOAuth = async (e) => {
        e.preventDefault();
        setReactivationBusy(true);
        try {
            const res = await authService.requestReactivationOAuth(oauthReactivationEmail.trim());
            if (res.success) {
                setToast({ show: true, message: res.message, type: 'success' });
            }
        } catch (err) {
            setToast({ show: true, message: err.message || 'Erreur', type: 'error' });
        } finally {
            setReactivationBusy(false);
            setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
        }
    };

    return (
        <section className="section">
            <div className="container container--narrow">
                <div className="tabs">
                    <ul className="tabs__list" role="tablist">
                        <li>
                            <button
                                className={`tabs__tab ${activeTab === 'login' ? 'tabs__tab--active' : ''}`}
                                onClick={() => handleTabChange('login')}
                                role="tab"
                            >
                                Connexion
                            </button>
                        </li>
                        <li>
                            <button
                                className={`tabs__tab ${activeTab === 'register' ? 'tabs__tab--active' : ''}`}
                                onClick={() => handleTabChange('register')}
                                role="tab"
                            >
                                Créer un compte
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Login Form */}
                {activeTab === 'login' && (
                    <div className="card">
                        <div className="card__content">
                            <div style={{ marginBottom: '1.5rem' }}>
                                <a
                                    href={getGoogleLoginUrl()}
                                    className="btn btn--block btn--oauth"
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18">
                                        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                                        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
                                        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
                                        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
                                    </svg>
                                    Continuer avec Google
                                </a>
                            </div>

                            <div className="auth-divider">
                                <span className="auth-divider__text">OU</span>
                            </div>

                            <form onSubmit={handleLogin}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="login-identifier">E-mail ou nom d’utilisateur</label>
                                    <input
                                        id="login-identifier"
                                        type="text"
                                        className="form-input"
                                        name="identifier"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        placeholder="Adresse e-mail ou nom d’utilisateur"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mot de passe</label>
                                    <PasswordInput  className="form-input" name="password" autoComplete="current-password" required />
                                </div>
                                <label className="form-checkbox" style={{ marginBottom: '1.5rem' }}>
                                    <input type="checkbox" name="remember" />
                                    <span>Se souvenir de moi</span>
                                </label>
                                <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </button>
                                <p className="text-center" style={{ marginTop: '1rem' }}>
                                    <a href="/mot-de-passe-oublie" style={{ fontSize: '0.875rem' }}>Mot de passe oublié ?</a>
                                </p>
                            </form>

                            {(showReactivationPanel || searchParams.get('error') === 'account_deactivated') && (
                                <div
                                    style={{
                                        marginTop: '1.75rem',
                                        paddingTop: '1.5rem',
                                        borderTop: '1px solid var(--border-color, #e5e7eb)'
                                    }}
                                >
                                    <h3 className="section__title" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                                        Compte désactivé — demande de réactivation
                                    </h3>
                                    <p style={{ fontSize: '0.88rem', opacity: 0.75, marginBottom: '1rem' }}>
                                    Si vous avez un mot de passe, remplissez ce formulaire pour confirmer votre identité. Sinon, utilisez Google et indiquez votre e-mail.
                                    </p>
                                    <form onSubmit={handleReactivationLocal} style={{ marginBottom: '1.25rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={reactivationEmail}
                                                onChange={(e) => setReactivationEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mot de passe</label>
                                            <PasswordInput
                                                
                                                className="form-input"
                                                value={reactivationPassword}
                                                onChange={(e) => setReactivationPassword(e.target.value)}
                                                placeholder="Pour vérifier que vous êtes le titulaire"
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn--secondary btn--block" disabled={reactivationBusy}>
                                            {reactivationBusy ? 'Envoi…' : 'Envoyer la demande (compte email / mot de passe)'}
                                        </button>
                                    </form>
                                    <form onSubmit={handleReactivationOAuth}>
                                        <div className="form-group">
                                            <label className="form-label">Email du compte Google</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={oauthReactivationEmail}
                                                onChange={(e) => setOauthReactivationEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn--ghost btn--block" disabled={reactivationBusy}>
                                            {reactivationBusy ? 'Envoi…' : 'Demander la réactivation (OAuth)'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Register Form - Step 1: Credentials */}
                {activeTab === 'register' && registrationStep === 1 && (
                    <div className="card">
                        <div className="card__content">
                            <form onSubmit={handleCredentialsSubmit} noValidate>
                                <div className="form-group">
                                    <label className="form-label">Nom d'utilisateur *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="name"
                                        onChange={() => setRegisterErrors(p => ({ ...p, name: '' }))}
                                        style={{ borderColor: registerErrors.name ? '#dc2626' : '' }}
                                        placeholder="Votre nom d'utilisateur"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        maxLength={30}
                                    />
                                    <FieldError msg={registerErrors.name} />
                                    {!registerErrors.name && (
                                        <p className="form-help">Vous pourrez vous connecter avec ce nom ou avec votre e-mail.</p>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        name="email"
                                        onChange={() => setRegisterErrors(p => ({ ...p, email: '' }))}
                                        style={{ borderColor: registerErrors.email ? '#dc2626' : '' }}
                                        placeholder="votre@email.com"
                                    />
                                    <FieldError msg={registerErrors.email} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mot de passe *</label>
                                    <PasswordInput
                                        
                                        className="form-input"
                                        name="password"
                                        value={registerPassword}
                                        onChange={e => { setRegisterPassword(e.target.value); setRegisterErrors(p => ({ ...p, password: '' })); }}
                                        placeholder="Min. 8 car. Aa1@"
                                        style={{ borderColor: registerErrors.password ? '#dc2626' : '' }}
                                    />
                                    <PasswordStrength password={registerPassword} />
                                    <FieldError msg={registerErrors.password} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmer le mot de passe *</label>
                                    <PasswordInput
                                        
                                        className="form-input"
                                        name="confirmPassword"
                                        onChange={() => setRegisterErrors(p => ({ ...p, confirmPassword: '' }))}
                                        style={{ borderColor: registerErrors.confirmPassword ? '#dc2626' : '' }}
                                        placeholder="Répétez le mot de passe"
                                    />
                                    <FieldError msg={registerErrors.confirmPassword} />
                                </div>
                                <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                                    {loading ? 'Création...' : 'Continuer'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Interactive questionnaire modal overlay (LinkedIn-style) */}
            {registrationStep === 2 && questionnaire?.questions?.length > 0 && (
                <InteractiveQuestionnaire
                    questions={questionnaire.questions}
                    onComplete={handleQuestionnaireComplete}
                    loading={loading}
                    error={questionnaireError}
                />
            )}

            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </section>
    );
}
