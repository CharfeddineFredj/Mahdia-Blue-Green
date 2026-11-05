import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../components/UI';
import { authService, questionnaireService } from '../services';
import { normalizeQuestionnairePayload, getQuestionnaireAnswerKey, buildQuestionnaireAnswersPayload } from '../utils/questionnaireNormalize';
import { validateQuestionnaireAnswer, isFirstOrLastNameField, digitsOnly, removeDigits } from '../utils/questionnaireValidation';

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

function InteractiveQuestionnaire({ questions, onComplete, loading, error: externalError }) {
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

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        if (question?.type === 'text' || question?.type === 'date') {
            setTimeout(() => inputRef.current?.focus(), 350);
        }
    }, [currentIdx, question?.type]);

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
                            <div key={idx} className={`q-opt ${answers[qId] === option ? 'selected' : ''}`} onClick={() => handleAnswer(option)}>
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
                            <div key={idx} className={`q-opt ${(answers[qId] || []).includes(option) ? 'selected' : ''}`} onClick={() => toggleMulti(option)}>
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
                        <div className={`q-bool ${answers[qId] === 'true' ? 'selected' : ''}`} onClick={() => handleAnswer('true')}>✅ Oui</div>
                        <div className={`q-bool ${answers[qId] === 'false' ? 'selected' : ''}`} onClick={() => handleAnswer('false')}>❌ Non</div>
                    </div>
                );
            case 'rating':
                return (
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                            <div key={num} className={`q-bool ${answers[qId] === String(num) ? 'selected' : ''}`} style={{ width: 56, padding: '.75rem 0' }} onClick={() => handleAnswer(String(num))}>{num}</div>
                        ))}
                    </div>
                );
            default:
                return (
                    <input ref={inputRef} type="text" className="q-input" value={answers[qId] || ''} onChange={(e) => updateAnswer(qId, e.target.value)} onKeyDown={handleKeyDown} placeholder="Tapez votre réponse..." />
                );
        }
    };

    return (
        <div className="q-overlay">
            <style>{Q_STYLES}</style>
            <div className="q-modal">
                <div className="q-header">
                    <span className="q-header-emoji">{catEmoji}</span>
                    <div className="q-header-text">
                        <h3>Complétez votre profil</h3>
                        <p>Question {currentIdx + 1} sur {total}</p>
                    </div>
                </div>

                <div className="q-progress">
                    <div className="q-progress-bar">
                        <div className="q-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="q-progress-label">
                        <span>{Math.round(progress)}% complété</span>
                        <span>{remainingAfterThis === 0 ? 'Dernière question' : `${remainingAfterThis} après celle-ci`}</span>
                    </div>
                </div>

                <div className="q-body" key={currentIdx}>
                    <div className="q-question">
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
                        <button className="q-btn q-btn-next" onClick={() => goNext()} disabled={!isValid()}>
                            {currentIdx === total - 1 ? 'Terminer ✓' : 'Suivant →'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── CompleteProfile page (for login redirect) ── */

export default function CompleteProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchingQuestionnaire, setFetchingQuestionnaire] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [questionnaire, setQuestionnaire] = useState(null);

    useEffect(() => {
        const init = async () => {
            const tempUserRaw = localStorage.getItem('mbg_temp_user');
            const storedUser = localStorage.getItem('mbg_user');
            if (!tempUserRaw && !storedUser) {
                navigate('/auth');
                return;
            }

            let qData = null;

            try {
                const response = await questionnaireService.getRegistrationQuestionnaire();
                if (response.success && response.data) {
                    qData = normalizeQuestionnairePayload(response.data);
                }
            } catch (error) {
                console.error('Error fetching questionnaire:', error);
            }

            if (!qData && tempUserRaw) {
                try {
                    const parsed = JSON.parse(tempUserRaw);
                    if (parsed.questionnaire?.questions?.length) {
                        qData = normalizeQuestionnairePayload({
                            _id: parsed.questionnaire.id,
                            title: parsed.questionnaire.title,
                            description: parsed.questionnaire.description,
                            questions: parsed.questionnaire.questions
                        });
                    }
                } catch {
                    /* ignore */
                }
            }

            if (!qData && tempUserRaw) {
                try {
                    const fin = await authService.finalizeRegistrationIfNoQuestionnaire();
                    if (fin.success) {
                        setToast({ show: true, message: 'Inscription finalisée !', type: 'success' });
                        setFetchingQuestionnaire(false);
                        setTimeout(() => {
                            navigate('/compte');
                            window.location.reload();
                        }, 900);
                        return;
                    }
                } catch (e) {
                    console.error('finalizeRegistration:', e);
                }
            }

            if (!qData) {
                setToast({
                    show: true,
                    message: 'Impossible de charger le questionnaire. Reconnectez-vous depuis la page de connexion.',
                    type: 'error'
                });
                setTimeout(() => navigate('/auth'), 2800);
                setFetchingQuestionnaire(false);
                return;
            }

            setQuestionnaire(qData);
            setFetchingQuestionnaire(false);
        };
        init();
    }, [navigate]);

    const [questionnaireError, setQuestionnaireError] = useState(null);

    const handleComplete = async (answersArray) => {
        setLoading(true);
        setQuestionnaireError(null);
        try {
            const response = await authService.completeQuestionnaire(answersArray);
            if (response.success) {
                setToast({ show: true, message: 'Profil complété avec succès ! 🎉', type: 'success' });
                setTimeout(() => {
                    navigate('/compte');
                    window.location.reload();
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

    if (fetchingQuestionnaire) {
        return (
            <section className="section">
                <div className="container" style={{ maxWidth: '650px', textAlign: 'center', padding: '3rem 1rem' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                    <p>Chargement du questionnaire...</p>
                </div>
            </section>
        );
    }

    return (
        <>
            {questionnaire?.questions?.length > 0 && (
                <InteractiveQuestionnaire
                    questions={questionnaire.questions}
                    onComplete={handleComplete}
                    loading={loading}
                    error={questionnaireError}
                />
            )}
            <Toast message={toast.message} show={toast.show} type={toast.type} />
        </>
    );
}
