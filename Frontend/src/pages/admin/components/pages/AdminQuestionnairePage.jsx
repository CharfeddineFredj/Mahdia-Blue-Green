import { Link } from 'react-router-dom';
import { Upload, X, Mail, Users, Newspaper, Handshake, Briefcase, BarChart3, Loader, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import {
    ArticlesIcon,
    EventsIcon,
    ResourcesIcon,
    UsersIcon,
    EditIcon,
    TrashIcon,
    EyeIcon,
    DownloadIcon
} from '../../../../components/Icons';
import { adminService, eventsService, articlesService, resourcesService, contactService, teamService, newsletterService, partnerService, entrepreneurService, api } from '../../../../services';
import { downloadFileResource } from '../../../../utils/cloudinaryDelivery';
import { Modal } from '../../../../components/UI';
import BlogArticleForm from '../../../../components/BlogArticleForm';
import RichTextEditor from '../../../../components/RichTextEditor';
import AdminPagination from '../../../../components/AdminPagination';
import AdminListFilters from '../../../../components/AdminListFilters';
import AdminAnalyticsDashboard from '../../../../components/AdminAnalyticsDashboard';
import { matchesCreatedAtRange, textIncludes } from '../../../../utils/adminListFilters';
import {
    getTomorrowMidnightLocalString,
    addMinutesToDatetimeLocalString,
    validateEventSchedule,
    getDatetimeLocalMinForStartEdit,
} from '../../../../utils/eventScheduling';
import {
    ADMIN_PAGE_SIZE,
    Q_STATS_PAGE_SIZE,
    EMPTY_PARTNER_FORM,
    EMPTY_PUBLIC_TEAM_FORM,
    EMPTY_ENTREPRENEUR_FORM,
    DEFAULT_ADMIN_ARTICLE_FORM,
    emptyPaginated,
    QUESTION_CATEGORY_OPTIONS,
    SIDEBAR_COLLAPSED_KEY,
    PERSONAL_INFO_FIELD_VALUES,
    QUESTIONNAIRE_PREVIEW_FALLBACK_DESC,
} from '../../constants';
import {
    formatAdminTeamDateTime,
    adminTeamDisplayValue,
    formatArticleStatus,
    staffRolePillClass,
    adminUserRoleSelectClass,
    adminUserStatusSelectClass,
} from '../../utils/helpers';
import DashboardIcon from '../DashboardIcon';
import StaffRolePill from '../StaffRolePill';
import QuestionnaireStatsVisual from '../../../../components/QuestionnaireStatsVisual';
import { useAdminPanel } from '../../AdminPanelContext';

export default function AdminQuestionnairePage() {
    const {
        ADMIN_PAGE_SIZE,
        PERSONAL_INFO_FIELD_VALUES,
        PROFESSION_OPTIONS,
        QUESTIONNAIRE_PREVIEW_FALLBACK_DESC,
        QUESTION_CATEGORY_OPTIONS,
        addQDraft,
        askDeleteConfirmation,
        closeQEdit,
        closeQQuestionsModal,
        filteredQuestionnairesList,
        handleAddQuestion,
        handleCreateQuestionnaire,
        handleRemoveQuestion,
        handleRestoreDefaultQuestions,
        handleSaveQEdit,
        handleSaveQQuestions,
        loadQuestionnaireSectionData,
        loadQuestionnaireStats,
        location,
        moveQDraft,
        newQuestion,
        openQEdit,
        openQQuestionsModal,
        pagedQuestionnairesList,
        qEditForm,
        qEditId,
        qFormData,
        qListDateFrom,
        qListFilterQ,
        qListPage,
        qListTotalPages,
        qPanelSelectedId,
        qPreview,
        qPreviewLoading,
        qStats,
        qStatsLoading,
        qQuestionsModal,
        qQuestionsSaving,
        qSaving,
        questionnairesList,
        removeQDraft,
        selectQuestionnaireForPanel,
        setNewQuestion,
        setQEditForm,
        setQFormData,
        setQListDateFrom,
        setQListDateTo,
        setQListFilterQ,
        setQListPage,
        setShowQForm,
        showQForm,
        showToast,
        updateQDraft
    } = useAdminPanel();

    return (
                            <>
                                <Modal isOpen={!!qEditId} onClose={closeQEdit} title="Modifier le questionnaire">
                                    <form onSubmit={handleSaveQEdit}>
                                        <div className="form-group">
                                            <label className="form-label">Titre *</label>
                                            <input
                                                className="form-input"
                                                value={qEditForm.title}
                                                onChange={(e) => setQEditForm((p) => ({ ...p, title: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <input
                                                className="form-input"
                                                value={qEditForm.description}
                                                onChange={(e) => setQEditForm((p) => ({ ...p, description: e.target.value }))}
                                            />
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={qEditForm.isActive}
                                                onChange={(e) => setQEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                                            />
                                            Questionnaire actif (visible selon les règles publiques)
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={qEditForm.isRegistrationQuestionnaire}
                                                onChange={(e) => setQEditForm((p) => ({ ...p, isRegistrationQuestionnaire: e.target.checked }))}
                                            />
                                            Définir comme questionnaire d’inscription (unique)
                                        </label>
                                        {!qEditForm.isRegistrationQuestionnaire && (<>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Ouverture (optionnel)</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input"
                                                        value={qEditForm.opensAt}
                                                        onChange={(e) => setQEditForm((p) => ({ ...p, opensAt: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Clôture (optionnel)</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input"
                                                        value={qEditForm.closesAt}
                                                        onChange={(e) => setQEditForm((p) => ({ ...p, closesAt: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ margin: '0 0 1rem' }}>
                                                <label className="form-label">Cibler par profession <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>(vide = tous)</span></label>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {PROFESSION_OPTIONS.map(prof => {
                                                        const selected = (qEditForm.targetProfessions || []).includes(prof);
                                                        return (
                                                            <button
                                                                key={prof}
                                                                type="button"
                                                                onClick={() => setQEditForm(p => ({
                                                                    ...p,
                                                                    targetProfessions: selected
                                                                        ? (p.targetProfessions || []).filter(x => x !== prof)
                                                                        : [...(p.targetProfessions || []), prof]
                                                                }))}
                                                                style={{
                                                                    padding: '0.35rem 0.75rem',
                                                                    borderRadius: '20px',
                                                                    border: selected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                                                    background: selected ? 'rgba(0, 150, 136, 0.12)' : 'var(--bg-surface)',
                                                                    color: selected ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                                    fontSize: '0.82rem',
                                                                    fontWeight: selected ? '600' : '400',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {selected ? '✓ ' : ''}{prof}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(qEditForm.targetProfessions || []).length > 0 && (
                                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-primary)', margin: '0.4rem 0 0' }}>
                                                        {qEditForm.targetProfessions.length} profession(s) sélectionnée(s)
                                                    </p>
                                                )}
                                            </div>
                                        </>)}
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                            <button type="button" className="btn btn--ghost" onClick={closeQEdit}>Annuler</button>
                                            <button type="submit" className="btn btn--primary" disabled={qSaving}>{qSaving ? '…' : 'Enregistrer'}</button>
                                        </div>
                                    </form>
                                </Modal>
        
                                <Modal
                                    isOpen={!!qQuestionsModal}
                                    onClose={closeQQuestionsModal}
                                    title={qQuestionsModal ? `Questions — ${qQuestionsModal.title}` : 'Questions'}
                                >
                                    {qQuestionsModal && (
                                        <div style={{ display: 'grid', gap: '1rem', maxHeight: 'min(72vh, 640px)', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Ajoutez, modifiez ou supprimez des questions. L’ordre correspond à l’affichage pour les utilisateurs.
                                                {qQuestionsModal.isRegistration && (
                                                    <span> Pour l’inscription, le champ « Profil » relie la réponse au profil membre.</span>
                                                )}
                                            </p>
                                            {qQuestionsModal.questionsDraft.map((q, index) => (
                                                <div
                                                    key={q.localKey}
                                                    style={{
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '12px',
                                                        padding: '0.875rem',
                                                        background: 'var(--bg-surface)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{index + 1}</span>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => moveQDraft(index, -1)} disabled={index === 0}>↑</button>
                                                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => moveQDraft(index, 1)} disabled={index === qQuestionsModal.questionsDraft.length - 1}>↓</button>
                                                            <button type="button" className="btn btn--sm btn--ghost" style={{ color: '#ef4444' }} onClick={() => removeQDraft(index)}>Retirer</button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        className="form-input"
                                                        style={{ marginBottom: '0.5rem', width: '100%' }}
                                                        placeholder="Texte de la question *"
                                                        value={q.text}
                                                        onChange={(e) => updateQDraft(index, { text: e.target.value })}
                                                    />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <select
                                                            className="form-input"
                                                            value={q.type}
                                                            onChange={(e) => updateQDraft(index, { type: e.target.value })}
                                                        >
                                                            <option value="text">Texte</option>
                                                            <option value="single_choice">Choix unique</option>
                                                            <option value="multiple_choice">Choix multiple</option>
                                                            <option value="boolean">Oui / Non</option>
                                                            <option value="date">Date</option>
                                                            <option value="rating">Note 1–5</option>
                                                        </select>
                                                        <select
                                                            className="form-input"
                                                            value={q.category}
                                                            onChange={(e) => updateQDraft(index, { category: e.target.value })}
                                                        >
                                                            {QUESTION_CATEGORY_OPTIONS.map((c) => (
                                                                <option key={c} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {qQuestionsModal.isRegistration && (
                                                        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Lier au profil (optionnel)</label>
                                                            <select
                                                                className="form-input"
                                                                value={q.personalInfoField}
                                                                onChange={(e) => updateQDraft(index, { personalInfoField: e.target.value })}
                                                            >
                                                                {PERSONAL_INFO_FIELD_VALUES.map((v) => (
                                                                    <option key={v || 'none'} value={v}>{v || '— Aucun —'}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {['single_choice', 'multiple_choice'].includes(q.type) && (
                                                        <textarea
                                                            className="form-input"
                                                            rows={3}
                                                            placeholder="Options (une par ligne)"
                                                            value={q.optionsStr}
                                                            onChange={(e) => updateQDraft(index, { optionsStr: e.target.value })}
                                                            style={{ width: '100%', marginBottom: '0.5rem' }}
                                                        />
                                                    )}
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={q.isRequired}
                                                            onChange={(e) => updateQDraft(index, { isRequired: e.target.checked })}
                                                        />
                                                        Obligatoire
                                                    </label>
                                                </div>
                                            ))}
                                            <button type="button" className="btn btn--outline btn--sm" onClick={addQDraft}><span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Ajouter une question</span></button>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                                <button type="button" className="btn btn--ghost" onClick={closeQQuestionsModal}>Annuler</button>
                                                {qQuestionsModal.isRegistration && (
                                                    <button
                                                        type="button"
                                                        className="btn btn--outline"
                                                        onClick={handleRestoreDefaultQuestions}
                                                        disabled={qQuestionsSaving}
                                                    >
                                                        Restaurer le jeu par défaut
                                                    </button>
                                                )}
                                                <button type="button" className="btn btn--primary" onClick={handleSaveQQuestions} disabled={qQuestionsSaving}>
                                                    {qQuestionsSaving ? '…' : 'Enregistrer les questions'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Modal>
        
                                <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div>
                                        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', margin: 0 }}>Gestion des questionnaires</h1>
                                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem', marginBottom: 0 }}>
                                            Création, édition, planification et questionnaire d’inscription unique.
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            onClick={async () => {
                                                await loadQuestionnaireSectionData();
                                                if (qPanelSelectedId) await loadQuestionnaireStats(qPanelSelectedId, 1);
                                                showToast('🔄 Données actualisées', 'success');
                                            }}
                                            title="Actualiser la liste et les statistiques du panneau"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button type="button" className="btn btn--primary" onClick={() => setShowQForm(v => !v)}>
                                            {showQForm ? <><X size={18} strokeWidth={2.25} aria-hidden /><span>Annuler</span></> : <><span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Nouveau questionnaire</span></>}
                                        </button>
                                    </div>
                                </div>
        
                                {/* Create form */}
                                {showQForm && (
                                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Créer un questionnaire</h3>
                                        <form onSubmit={handleCreateQuestionnaire}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Titre *</label>
                                                    <input className="form-input" value={qFormData.title} onChange={e => setQFormData(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Complétez votre profil" />
                                                </div>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Description</label>
                                                    <input className="form-input" value={qFormData.description} onChange={e => setQFormData(p => ({ ...p, description: e.target.value }))} placeholder="Description optionnelle" />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <label className="form-label">Date / heure d’ouverture</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="form-input"
                                                            value={qFormData.opensAt}
                                                            onChange={(e) => setQFormData((p) => ({ ...p, opensAt: e.target.value }))}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ margin: 0 }}>
                                                        <label className="form-label">Date / heure de clôture</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="form-input"
                                                            value={qFormData.closesAt}
                                                            onChange={(e) => setQFormData((p) => ({ ...p, closesAt: e.target.value }))}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group" style={{ margin: '0 0 1.25rem' }}>
                                                    <label className="form-label">Cibler par profession <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>(vide = tous les utilisateurs)</span></label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {PROFESSION_OPTIONS.map(prof => {
                                                            const selected = qFormData.targetProfessions.includes(prof);
                                                            return (
                                                                <button
                                                                    key={prof}
                                                                    type="button"
                                                                    onClick={() => setQFormData(p => ({
                                                                        ...p,
                                                                        targetProfessions: selected
                                                                            ? p.targetProfessions.filter(x => x !== prof)
                                                                            : [...p.targetProfessions, prof]
                                                                    }))}
                                                                    style={{
                                                                        padding: '0.35rem 0.75rem',
                                                                        borderRadius: '20px',
                                                                        border: selected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                                                                        background: selected ? 'rgba(0, 150, 136, 0.12)' : 'var(--bg-surface)',
                                                                        color: selected ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                                        fontSize: '0.82rem',
                                                                        fontWeight: selected ? '600' : '400',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {selected ? '✓ ' : ''}{prof}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {qFormData.targetProfessions.length > 0 && (
                                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-primary)', margin: '0.4rem 0 0' }}>
                                                            {qFormData.targetProfessions.length} profession(s) sélectionnée(s)
                                                        </p>
                                                    )}
                                                </div>

                                            {/* Add question */}
                                            <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                                                <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Ajouter une question</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                    <input className="form-input" placeholder="Texte de la question *" value={newQuestion.text} onChange={e => setNewQuestion(p => ({ ...p, text: e.target.value }))} />
                                                    <select className="form-input" value={newQuestion.type} onChange={e => setNewQuestion(p => ({ ...p, type: e.target.value }))}>
                                                        <option value="text">Texte libre</option>
                                                        <option value="single_choice">Choix unique</option>
                                                        <option value="multiple_choice">Choix multiple</option>
                                                        <option value="boolean">Oui / Non</option>
                                                        <option value="date">Date</option>
                                                        <option value="rating">Note (1-5)</option>
                                                    </select>
                                                    <select className="form-input" value={newQuestion.category} onChange={e => setNewQuestion(p => ({ ...p, category: e.target.value }))}>
                                                        {['personal','profession','education','location','contact','discovery','interests','entrepreneurship','preferences','general'].map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {['single_choice', 'multiple_choice'].includes(newQuestion.type) && (
                                                    <textarea className="form-input" rows={3} placeholder="Options (une par ligne)" value={newQuestion.options} onChange={e => setNewQuestion(p => ({ ...p, options: e.target.value }))} style={{ marginBottom: '0.75rem', width: '100%' }} />
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                        <input type="checkbox" checked={newQuestion.isRequired} onChange={e => setNewQuestion(p => ({ ...p, isRequired: e.target.checked }))} />
                                                        Obligatoire
                                                    </label>
                                                    <button type="button" className="btn btn--sm btn--outline" onClick={handleAddQuestion}><span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Ajouter</span></button>
                                                </div>
                                            </div>
        
                                            {/* Questions list */}
                                            {qFormData.questions.length > 0 && (
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {qFormData.questions.length} question(s) ajoutée(s)
                                                    </p>
                                                    {qFormData.questions.map((q, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.875rem', background: 'var(--bg-base)', borderRadius: '8px', marginBottom: '0.4rem', border: '1px solid var(--border-color)' }}>
                                                            <span style={{ fontSize: '0.875rem' }}>
                                                                <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>#{i + 1}</span>
                                                                {q.text}
                                                                {q.isRequired && <span style={{ color: '#ef4444', marginLeft: '0.3rem' }}>*</span>}
                                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>({q.type})</span>
                                                            </span>
                                                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => handleRemoveQuestion(i)} style={{ color: '#ef4444' }}>✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
        
                                            <button type="submit" className="btn btn--primary">Créer le questionnaire</button>
                                        </form>
                                    </div>
                                )}
        
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
                                    <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Tous les questionnaires</h3>
                                    {questionnairesList.length === 0 ? (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Aucun questionnaire en base.</p>
                                    ) : (
                                        <>
                                        <AdminListFilters
                                            idPrefix="admin-qlist"
                                            title="Filtres questionnaires"
                                            searchPlaceholder="Recherche sur Questionnaires"
                                            searchValue={qListFilterQ}
                                            onSearchChange={setQListFilterQ}
                                            dateMode="single"
                                            singleDate={qListDateFrom}
                                            onSingleDateChange={(value) => {
                                                setQListDateFrom(value);
                                                setQListDateTo(value);
                                            }}
                                            singleDateTitle="Filtrer par jour (date exacte)"
                                        />
                                        {filteredQuestionnairesList.length === 0 ? (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>Aucun résultat pour ces critères.</p>
                                        ) : (
                                        <>
                                        <table className="table table--fit" style={{ width: '100%', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr>
                                                    <th>Titre</th>
                                                    <th>Type</th>
                                                    <th>Période</th>
                                                    <th>Statut</th>
                                                    <th>Actif</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedQuestionnairesList.map((row) => {
                                                    const st = row.scheduleStatus || 'inactive';
                                                    const badgeMap = {
                                                        registration: { bg: '#dcfce7', color: '#16a34a' },
                                                        open: { bg: '#dcfce7', color: '#16a34a' },
                                                        scheduled: { bg: '#dbeafe', color: '#2563eb' },
                                                        ended: { bg: '#f1f5f9', color: '#64748b' },
                                                        inactive: { bg: '#fee2e2', color: '#dc2626' }
                                                    };
                                                    const b = badgeMap[st] || badgeMap.inactive;
                                                    const periodLabel = row.isRegistrationQuestionnaire
                                                        ? '—'
                                                        : [
                                                            row.opensAt ? `Début : ${new Date(row.opensAt).toLocaleString('fr-FR')}` : null,
                                                            row.closesAt ? `Fin : ${new Date(row.closesAt).toLocaleString('fr-FR')}` : null
                                                        ].filter(Boolean).join(' · ') || 'Sans limite de dates';
                                                    return (
                                                        <tr
                                                            key={row._id}
                                                            onClick={() => selectQuestionnaireForPanel(row)}
                                                            style={{
                                                                cursor: 'pointer',
                                                                backgroundColor:
                                                                    row._id === qPanelSelectedId
                                                                        ? 'rgba(0, 125, 144, 0.09)'
                                                                        : undefined
                                                            }}
                                                            title="Cliquer pour afficher ce formulaire dans l’aperçu ci-dessous"
                                                        >
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: row.isRegistrationQuestionnaire ? 'rgba(37,99,235,.12)' : 'rgba(124,58,237,.12)', color: row.isRegistrationQuestionnaire ? '#2563eb' : '#7c3aed', fontWeight: 800, fontSize: '0.7rem' }}>
                                                                        {row.isRegistrationQuestionnaire ? 'INS' : 'ENQ'}
                                                                    </span>
                                                                    <div style={{ minWidth: 0 }}>
                                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{row.title}</div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem', fontFamily: 'monospace' }}>{String(row._id).slice(-8)}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', color: row.isRegistrationQuestionnaire ? '#2563eb' : '#7c3aed', background: row.isRegistrationQuestionnaire ? 'rgba(37,99,235,.1)' : 'rgba(124,58,237,.1)' }}>
                                                                    {row.isRegistrationQuestionnaire ? 'Inscription' : 'Enquête'}
                                                                </span>
                                                            </td>
                                                            <td style={{ maxWidth: '240px', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.4 }}>{periodLabel}</td>
                                                            <td>
                                                                <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: b.bg, color: b.color }}>
                                                                    {row.scheduleLabel || st}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: row.isActive ? '#16a34a' : '#dc2626' }}>
                                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.isActive ? '#16a34a' : '#dc2626' }} />
                                                                    {row.isActive ? 'Oui' : 'Non'}
                                                                </span>
                                                            </td>
                                                            <td style={{ textAlign: 'right', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexWrap: 'wrap',
                                                                        justifyContent: 'flex-end',
                                                                        gap: '0.35rem',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    <button type="button" className="btn btn--sm btn--outline" style={{ borderRadius: 999 }} onClick={() => openQQuestionsModal(row)} title="Gérer les questions">
                                                                        Questions
                                                                    </button>
                                                                    <button type="button" className="btn btn--sm btn--ghost btn--action-edit" onClick={() => openQEdit(row)} title="Modifier">
                                                                        <EditIcon size={16} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn--sm btn--ghost btn--action-delete"
                                                                        onClick={() => askDeleteConfirmation('questionnaire', row._id, `Supprimer le questionnaire « ${row.title} » ?`)}
                                                                        title="Supprimer"
                                                                    >
                                                                        <TrashIcon size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <AdminPagination
                                            currentPage={qListPage}
                                            totalPages={qListTotalPages}
                                            totalItems={filteredQuestionnairesList.length}
                                            pageSize={ADMIN_PAGE_SIZE}
                                            onPageChange={setQListPage}
                                        />
                                        </>
                                        )}
                                        </>
                                    )}
                                </div>
        
                                {/* Aperçu dynamique (même présentation que côté membre — ex. Complétez votre profil) */}
                                <div style={{ marginTop: '0.25rem' }}>
                                    
                                    
                                    {questionnairesList.length === 0 ? (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                padding: '3rem 1.5rem',
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '16px',
                                                border: '1px solid var(--glass-border)'
                                            }}
                                        >
                                            Aucun questionnaire en base. Créez-en un ci-dessus.
                                        </div>
                                    ) : qPreviewLoading && !qPreview ? (
                                        <div
                                            style={{
                                                padding: '2.5rem',
                                                textAlign: 'center',
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '16px',
                                                border: '1px solid var(--glass-border)'
                                            }}
                                        >
                                            Chargement de l’aperçu…
                                        </div>
                                    ) : qPreview ? (
                                        <div
                                            style={{
                                                position: 'relative',
                                                background: 'var(--bg-elevated)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '16px',
                                                padding: '1.5rem',
                                                opacity: qPreviewLoading ? 0.65 : 1,
                                                transition: 'opacity 0.2s ease'
                                            }}
                                        >
                                            {qPreviewLoading && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(0,0,0,0.04)',
                                                        borderRadius: '16px',
                                                        fontSize: '0.9rem',
                                                        color: 'var(--text-secondary)',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    Mise à jour…
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                                <div>
                                                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                                                        {qPreview.isRegistrationQuestionnaire ? 'Complétez votre profil' : qPreview.title}
                                                    </h3>
                                                    <p
                                                        style={{
                                                            color: 'var(--text-secondary)',
                                                            fontSize: '0.875rem',
                                                            marginTop: '0.35rem',
                                                            lineHeight: 1.55,
                                                            maxWidth: '40rem'
                                                        }}
                                                    >
                                                        {(qPreview.description || '').trim() || QUESTIONNAIRE_PREVIEW_FALLBACK_DESC}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                    <span
                                                        style={{
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            background: qPreview.isActive ? '#dcfce7' : '#fee2e2',
                                                            color: qPreview.isActive ? '#16a34a' : '#dc2626'
                                                        }}
                                                    >
                                                        {qPreview.isRegistrationQuestionnaire ? 'Inscription' : 'Enquête'} · {qPreview.isActive ? '✓ Actif' : 'Inactif'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn--sm btn--primary"
                                                        onClick={() => openQQuestionsModal(qPreview)}
                                                        disabled={qPreviewLoading}
                                                    >
                                                        Gérer les questions
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                {qPreview.questions?.map((q, i) => (
                                                    <div
                                                        key={q._id || i}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem 1rem',
                                                            background: 'var(--bg-surface)',
                                                            borderRadius: '10px',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: 'var(--color-primary)',
                                                                color: '#fff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.72rem',
                                                                fontWeight: '700',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </span>
                                                        <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                                            {q.text}
                                                            {q.isRequired && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '0.72rem',
                                                                padding: '0.15rem 0.5rem',
                                                                borderRadius: '20px',
                                                                background: 'var(--bg-base)',
                                                                color: 'var(--text-secondary)',
                                                                border: '1px solid var(--border-color)'
                                                            }}
                                                        >
                                                            {q.type}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {qPreview.questions?.length ?? 0} question{(qPreview.questions?.length ?? 0) !== 1 ? 's' : ''} · ID: {qPreview._id}
                                            </p>
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                padding: '2rem',
                                                color: 'var(--text-secondary)',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '16px',
                                                border: '1px solid var(--glass-border)'
                                            }}
                                        >
                                            Impossible d’afficher l’aperçu. Rechargez la section ou sélectionnez un questionnaire dans le tableau.
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={{
                                        marginTop: '1.5rem',
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '16px',
                                        padding: '1.25rem',
                                        opacity: qStatsLoading && qStats ? 0.72 : 1,
                                        transition: 'opacity 0.2s ease',
                                    }}
                                >
                                    <div style={{ marginBottom: '1rem' }}>
                                        <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                                            Statistiques des réponses
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                                            Indicateurs par question et détail des réponses utilisateur pour le questionnaire sélectionné dans le tableau (ligne
                                            surlignée).
                                        </p>
                                    </div>
                                    {!qPanelSelectedId ? (
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            Cliquez sur une ligne du tableau « Tous les questionnaires » pour charger les statistiques.
                                        </p>
                                    ) : qStatsLoading && !qStats ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                                            Chargement des statistiques…
                                        </div>
                                    ) : qStats ? (
                                        <QuestionnaireStatsVisual
                                            data={qStats}
                                            pageSize={Q_STATS_PAGE_SIZE}
                                            onPageChange={(pg) => qPanelSelectedId && loadQuestionnaireStats(qPanelSelectedId, pg)}
                                            showToast={showToast}
                                        />
                                    ) : (
                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            Statistiques indisponibles. Réessayez ou sélectionnez un autre questionnaire.
                                        </p>
                                    )}
                                </div>
                            </>
    );
}
