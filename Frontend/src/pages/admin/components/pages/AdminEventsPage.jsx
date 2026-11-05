import { useCallback, useEffect, useState } from 'react';
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
import { adminService, eventsService, articlesService, resourcesService, contactService, teamService, newsletterService, partnerService, entrepreneurService, api, eventQuestionnaireService } from '../../../../services';
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
import { useAdminPanel } from '../../AdminPanelContext';
import AdminEventReviewPanel from '../AdminEventReviewPanel';
import { getEventReviewStatus } from '../../../../utils/eventQuestionnaireRules';

/** Titre raccourci pour les tableaux (le titre complet reste visible au survol) */
const shortText = (t, max = 12) => (t && t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t);
const shortTitle = (t, max = 15) => (t && t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t);

export default function AdminEventsPage() {
    const {
        ADMIN_PAGE_SIZE,
        askDeleteConfirmation,
        categories,
        closeNewEventModal,
        editEventForm,
        editEventImageUploading,
        editingEvent,
        eventDateFrom,
        eventFilterQ,
        eventFormData,
        eventFormSubmitting,
        eventImageUploading,
        eventImageUrlCheckStatus,
        eventPage,
        eventStatusFilter,
        eventTotalPages,
        events,
        fetchEvents,
        filteredEvents,
        handleAdminNewEventImageUrlChange,
        handleAdminNewEventSubmit,
        handleEditEvent,
        handleEditEventImageUpload,
        handleEventImageUpload,
        handlePublishEvent,
        handleSaveEditEvent,
        handleViewEventParticipants,
        handleViewUser,
        levels,
        location,
        openAdminNewEventModal,
        pagedEvents,
        selectedEvent,
        setEditEventForm,
        setEditingEvent,
        setEventDateFrom,
        setEventDateTo,
        setEventFilterQ,
        setEventFormData,
        setEventImageUrlCheckStatus,
        setEventPage,
        setEventStatusFilter,
        setSelectedEvent,
        showEventForm,
        showToast
    } = useAdminPanel();

    // Événements dont le questionnaire (création ou modification) attend une validation
    const [pendingQuestionnaireEventIds, setPendingQuestionnaireEventIds] = useState(() => new Set());
    const loadPendingQuestionnaires = useCallback(() => {
        eventQuestionnaireService.adminList('pending')
            .then((res) => {
                setPendingQuestionnaireEventIds(new Set(
                    (res.data || []).map((q) => String(q.event?._id || q.event))
                ));
            })
            .catch(() => setPendingQuestionnaireEventIds(new Set()));
    }, []);
    // Rechargé à chaque actualisation de la liste des événements
    useEffect(() => { loadPendingQuestionnaires(); }, [events, loadPendingQuestionnaires]);

    return (
                            <>
                                <div className="admin-header">
                                    <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem' }}>Événements</h1>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn--ghost"
                                            onClick={() => {
                                                fetchEvents();
                                                showToast('🔄 Liste actualisée', 'success');
                                            }}
                                            title="Actualiser"
                                        >
                                            🔄 Actualiser
                                        </button>
                                        <button
                                            className="btn btn--primary"
                                            type="button"
                                            onClick={openAdminNewEventModal}
                                        >
                                            <span className="admin-btn-icon" aria-hidden><Plus size={15} strokeWidth={3} /></span><span>Nouvel événement</span>
                                        </button>
                                    </div>
                                </div>
                                <AdminListFilters
                                    idPrefix="admin-events"
                                    title="Filtres événements"
                                    searchPlaceholder="Recherche sur Événements"
                                    searchValue={eventFilterQ}
                                    onSearchChange={setEventFilterQ}
                                    dateMode="single"
                                    singleDate={eventDateFrom}
                                    onSingleDateChange={(value) => {
                                        setEventDateFrom(value);
                                        setEventDateTo(value);
                                    }}
                                    singleDateTitle="Filtrer par jour (date exacte)"
                                >
                                    <div className="admin-filters__field">
                                        <label className="admin-filters__label" htmlFor="admin-events-status">Statut</label>
                                        <select
                                            id="admin-events-status"
                                            className="form-select admin-filters__select"
                                            value={eventStatusFilter}
                                            onChange={(e) => setEventStatusFilter(e.target.value)}
                                        >
                                            <option value="">Tous</option>
                                            <option value="draft">Brouillon</option>
                                            <option value="published">Publié</option>
                                        </select>
                                    </div>
                                </AdminListFilters>
        
                                {/* Event Creation Modal */}
                                <Modal
                                    isOpen={showEventForm}
                                    onClose={closeNewEventModal}
                                    contentClassName="modal__content--lg"
                                    title="Nouvel événement"
                                >
                                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                        Créez un événement (même formulaire que côté utilisateur). Il est enregistré en brouillon jusqu&apos;à publication.
                                    </p>
                                    <form onSubmit={handleAdminNewEventSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Titre de l&apos;événement *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={eventFormData.title}
                                                onChange={(e) => setEventFormData((p) => ({ ...p, title: e.target.value }))}
                                                required
                                                placeholder="Ex. Atelier économie circulaire"
                                            />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Image de couverture *</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="url"
                                                    className="form-input"
                                                    value={eventFormData.eventImage}
                                                    onChange={handleAdminNewEventImageUrlChange}
                                                    placeholder="Ou collez une URL d'image…"
                                                    style={{
                                                        marginBottom: '0.75rem',
                                                        paddingRight: '2.5rem',
                                                        borderColor: eventImageUrlCheckStatus === 'blocked' ? '#e53e3e' : eventImageUrlCheckStatus === 'ok' ? '#38a169' : undefined,
                                                    }}
                                                />
                                                {eventImageUrlCheckStatus === 'checking' && (
                                                    <Loader size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
                                                )}
                                                {eventImageUrlCheckStatus === 'ok' && (
                                                    <CheckCircle size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: '#38a169' }} />
                                                )}
                                                {eventImageUrlCheckStatus === 'blocked' && (
                                                    <AlertTriangle size={18} style={{ position: 'absolute', right: '0.75rem', top: '0.7rem', color: '#e53e3e' }} />
                                                )}
                                            </div>
                                            <div
                                                style={{
                                                    border: '2px dashed var(--border-color)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '1.5rem',
                                                    textAlign: 'center',
                                                    background: 'var(--bg-base)',
                                                    cursor: eventFormData.eventImage?.trim() ? 'default' : 'pointer',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    minHeight: '160px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                }}
                                                onClick={() => !eventFormData.eventImage?.trim() && document.getElementById('admin-event-image-upload')?.click()}
                                                onKeyDown={(ev) => {
                                                    if (!eventFormData.eventImage?.trim() && (ev.key === 'Enter' || ev.key === ' ')) {
                                                        ev.preventDefault();
                                                        document.getElementById('admin-event-image-upload')?.click();
                                                    }
                                                }}
                                                role={eventFormData.eventImage?.trim() ? undefined : 'button'}
                                                tabIndex={eventFormData.eventImage?.trim() ? undefined : 0}
                                            >
                                                {eventFormData.eventImage?.trim() ? (
                                                    <>
                                                        <img
                                                            src={eventFormData.eventImage.trim()}
                                                            alt=""
                                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={(ev) => {
                                                                ev.stopPropagation();
                                                                setEventImageUrlCheckStatus('');
                                                                setEventFormData((prev) => ({ ...prev, eventImage: '' }));
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: '0.75rem',
                                                                right: '0.75rem',
                                                                background: 'rgba(0,0,0,0.5)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '32px',
                                                                height: '32px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                                            Cliquez pour choisir une image
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG (max 5 Mo)</p>
                                                    </>
                                                )}
                                                <input
                                                    id="admin-event-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleEventImageUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>
                                            {eventImageUploading && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Import en cours…</p>
                                            )}
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Description *</label>
                                            <textarea
                                                className="form-textarea"
                                                rows={5}
                                                value={eventFormData.body}
                                                onChange={(e) => setEventFormData((p) => ({ ...p, body: e.target.value }))}
                                                required
                                                placeholder="Détails, programme, public visé…"
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Date et heure de début *</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    min={getTomorrowMidnightLocalString()}
                                                    value={eventFormData.startDate}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        const minEnd = v ? addMinutesToDatetimeLocalString(v, 90) : '';
                                                        setEventFormData((prev) => {
                                                            let nextEnd = prev.endDate;
                                                            if (v && (!prev.endDate || new Date(prev.endDate) < new Date(minEnd))) nextEnd = minEnd;
                                                            return { ...prev, startDate: v, endDate: nextEnd };
                                                        });
                                                    }}
                                                    required
                                                />
                                                <span className="form-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    À partir de demain · durée min. 1 h 30
                                                </span>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Date et heure de fin *</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    min={eventFormData.startDate
                                                        ? addMinutesToDatetimeLocalString(eventFormData.startDate, 90)
                                                        : addMinutesToDatetimeLocalString(getTomorrowMidnightLocalString(), 90)}
                                                    value={eventFormData.endDate}
                                                    onChange={(e) => setEventFormData((p) => ({ ...p, endDate: e.target.value }))}
                                                    required
                                                />
                                                <span className="form-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Au moins 1 h 30 après le début.
                                                </span>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Lieu *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={eventFormData.location}
                                                onChange={(e) => setEventFormData((p) => ({ ...p, location: e.target.value }))}
                                                placeholder="Adresse ou ville"
                                                required
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Capacité (places) *</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="form-input"
                                                    value={eventFormData.capacity}
                                                    onChange={(e) => setEventFormData((p) => ({ ...p, capacity: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Catégorie *</label>
                                                <select
                                                    className="form-select"
                                                    value={eventFormData.category}
                                                    onChange={(e) => setEventFormData((p) => ({ ...p, category: e.target.value }))}
                                                    required
                                                >
                                                    <option value="">Sélectionner une catégorie</option>
                                                    {categories.map((c) => (
                                                        <option key={c._id} value={c._id}>{c.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Niveau *</label>
                                            <select
                                                className="form-select"
                                                value={eventFormData.level}
                                                onChange={(e) => setEventFormData((p) => ({ ...p, level: e.target.value }))}
                                                required
                                            >
                                                <option value="">Sélectionner un niveau</option>
                                                {levels.map((l) => (
                                                    <option key={l._id} value={l._id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                            <button type="button" className="btn btn--ghost" onClick={closeNewEventModal}>
                                                Annuler
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn--primary"
                                                disabled={
                                                    eventFormSubmitting
                                                    || eventImageUploading
                                                    || eventImageUrlCheckStatus === 'checking'
                                                    || eventImageUrlCheckStatus === 'blocked'
                                                }
                                            >
                                                {eventFormSubmitting ? 'Création…' : "Créer l'événement"}
                                            </button>
                                        </div>
                                    </form>
                                </Modal>
        
                                <div className="table-container" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)' }}>
                                    <table className="table table--content">
                                        <thead>
                                            <tr>
                                                <th>Image</th>
                                                <th>Titre</th>
                                                <th>Date</th>
                                                <th>Lieu</th>
                                                <th>Statut</th>
                                                <th>Inscrits</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {events.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Aucun événement trouvé. Créez-en un nouveau!
                                                    </td>
                                                </tr>
                                            ) : filteredEvents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                                        Aucun résultat pour ces critères
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedEvents.map(event => (
                                                    <tr key={event._id}>
                                                        <td>
                                                            {event.eventData?.eventImage ? (
                                                                <img src={event.eventData.eventImage} alt="" loading="lazy" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                                                            ) : (
                                                                <div aria-label="Pas d’image" style={{ width: 56, height: 40, borderRadius: 6, background: 'var(--bg-section)', border: '1px dashed var(--border-color)' }} />
                                                            )}
                                                        </td>
                                                        <td title={event.title}>{shortTitle(event.title)}</td>
                                                        <td>
                                                            <span className="btn btn--sm btn--outline" style={{ cursor: 'default', whiteSpace: 'nowrap', pointerEvents: 'none', display: 'inline-block', width: '120px', textAlign: 'center' }}>
                                                                {event.eventData?.startDate ? new Date(event.eventData.startDate).toLocaleDateString('fr-FR') : 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td title={event.eventData?.location || 'N/A'}>{shortText(event.eventData?.location || 'N/A', 12)}</td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '2px 8px',
                                                                whiteSpace: 'nowrap',
                                                                borderRadius: '12px',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                background: event.status === 'published' ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.12)',
                                                                color: event.status === 'published' ? '#16a34a' : '#d97706',
                                                                border: `1px solid ${event.status === 'published' ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.25)'}`
                                                            }}>
                                                                {event.status === 'published' ? 'Publié' : 'Brouillon'}
                                                            </span>
                                                            {event.status !== 'published' && getEventReviewStatus(event) === 'rejected' && (
                                                                <span className="badge badge--red" style={{ marginLeft: '0.35rem', fontSize: '0.72rem' }}>Refusé</span>
                                                            )}
                                                            {(() => {
                                                                const eventPending = event.pendingRevision?.status === 'pending';
                                                                const questionnairePending = pendingQuestionnaireEventIds.has(String(event._id));
                                                                if (!eventPending && !questionnairePending) return null;
                                                                const detail = eventPending && questionnairePending
                                                                    ? 'Modification de l’événement et du questionnaire en attente de validation'
                                                                    : eventPending
                                                                        ? 'Modification de l’événement en attente de validation'
                                                                        : 'Questionnaire en attente de validation';
                                                                return (
                                                                    <span className="badge badge--yellow" style={{ marginLeft: '0.35rem', fontSize: '0.7rem', whiteSpace: 'nowrap' }} title={detail}>
                                                                        En attente
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td>
                                                            {(() => {
                                                                const count = event.eventData?.registeredUsers?.length || 0;
                                                                const cap = event.eventData?.capacity || 0;
                                                                const pct = cap ? Math.min(100, Math.round((count / cap) * 100)) : 0;
                                                                const tone = !cap ? '#64748b' : pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#16a34a';
                                                                return (
                                                                    <div title={`${count} inscrit(s) sur ${cap || '\u221E'}`} style={{ display: 'grid', gap: 4, minWidth: 96 }}>
                                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: tone, whiteSpace: 'nowrap' }}>
                                                                            {count} / {cap || '\u221E'}
                                                                        </span>
                                                                        <div style={{ height: 6, borderRadius: 999, background: 'var(--bg-section)', overflow: 'hidden' }}>
                                                                            <div style={{ width: `${pct}%`, height: '100%', background: tone, borderRadius: 999, transition: 'width .3s' }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="table__actions">
                                                            <button className="btn btn--sm btn--ghost btn--action-view" title="Voir les détails" onClick={() => handleViewEventParticipants(event)}><EyeIcon size={16} /></button>
                                                            <button className="btn btn--sm btn--ghost btn--action-edit" title="Modifier" onClick={() => handleEditEvent(event)}><EditIcon size={16} /></button>
                                                            <button
                                                                className="btn btn--sm btn--ghost btn--action-delete"
                                                                title="Supprimer"
                                                                onClick={() => askDeleteConfirmation('event', event, 'Confirmer la suppression de cet événement ?')}
                                                            >
                                                                <TrashIcon size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <AdminPagination
                                    currentPage={eventPage}
                                    totalPages={eventTotalPages}
                                    totalItems={filteredEvents.length}
                                    pageSize={ADMIN_PAGE_SIZE}
                                    onPageChange={setEventPage}
                                />
        
                                {/* Event Detail Modal */}
                                {selectedEvent && (
                                    <Modal
                                        isOpen
                                        onClose={() => setSelectedEvent(null)}
                                        contentClassName="modal__content--lg"
                                        title="Détails de l'événement"
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {/* Header */}
                                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <div style={{
                                                    width: '80px', height: '80px', borderRadius: '10px',
                                                    background: selectedEvent.eventData?.eventImage ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.5rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                                                }}>
                                                    {selectedEvent.eventData?.eventImage
                                                        ? <img src={selectedEvent.eventData.eventImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : '📅'}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{selectedEvent.title}</h3>
                                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        {selectedEvent.author?.username || 'N/A'}
                                                        {/* Compte existant (auteur peuplé) : accès direct à « Détails de l'utilisateur » */}
                                                        {selectedEvent.author?._id && (
                                                            <button
                                                                type="button"
                                                                className="btn btn--sm btn--ghost btn--action-view"
                                                                title="Voir le profil de l'organisateur"
                                                                aria-label={`Voir le profil de ${selectedEvent.author.username || "l'organisateur"}`}
                                                                onClick={() => handleViewUser(selectedEvent.author._id)}
                                                                style={{ padding: '0.15rem 0.35rem', minHeight: 0, lineHeight: 1 }}
                                                            >
                                                                <EyeIcon size={14} />
                                                            </button>
                                                        )}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                                        <span className={`badge badge--${selectedEvent.status === 'published' ? 'green' : 'yellow'}`}>
                                                            {selectedEvent.status === 'published' ? 'Publié' : 'Brouillon'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
        
                                            {/* Info grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                                {[
                                                    { label: 'Date début', value: selectedEvent.eventData?.startDate ? new Date(selectedEvent.eventData.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                                                    { label: 'Date fin', value: selectedEvent.eventData?.endDate ? new Date(selectedEvent.eventData.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                                                    { label: 'Lieu', value: selectedEvent.eventData?.location || '—' },
                                                    { label: 'Capacité', value: `${selectedEvent.eventData?.registeredUsers?.length || 0} / ${selectedEvent.eventData?.capacity || '∞'}` },
                                                    { label: 'Statut', value: selectedEvent.status === 'published' ? 'Publié' : 'Brouillon', badge: selectedEvent.status === 'published' ? 'green' : 'yellow' },
                                                    { label: 'Création', value: selectedEvent.createdAt ? new Date(selectedEvent.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                                                ].map(item => (
                                                    <div key={item.label} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                                                            {item.label}
                                                        </div>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {item.badge ? <span className={`badge badge--${item.badge}`}>{item.value}</span> : item.value}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
        
                                            {/* Image */}
                                            {selectedEvent.eventData?.eventImage && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Image</h4>
                                                    <img src={selectedEvent.eventData.eventImage} alt={selectedEvent.title} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                                                </div>
                                            )}
        
                                            {/* Description */}
                                            {selectedEvent.body && (
                                                <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                    <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>Description</h4>
                                                    <div style={{ lineHeight: 1.7, maxHeight: '300px', overflowY: 'auto', fontSize: '0.88rem' }} dangerouslySetInnerHTML={{ __html: selectedEvent.body }} />
                                                </div>
                                            )}
        
                                            {/* Participants */}
                                            <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>
                                                    Participants ({selectedEvent._attendees?.length || selectedEvent.eventData?.registeredUsers?.length || 0})
                                                </h4>
                                                {(selectedEvent._attendees?.length > 0) ? (
                                                    <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                        {selectedEvent._attendees.map((a, i) => {
                                                            const participantId = a._id || a.id;
                                                            return (
                                                                <div key={participantId || i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.65rem', background: 'var(--bg-elevated, var(--bg-surface))', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                                                        {(a.username || a.email || '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                                        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{a.username || 'N/A'}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</div>
                                                                        {(a.phone || a.address) ? (
                                                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                                                                                {a.phone ? <div><strong>Tél.</strong> {a.phone}</div> : null}
                                                                                {a.address ? <div><strong>Adr.</strong> {a.address}</div> : null}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn--sm btn--ghost btn--action-view"
                                                                        title="Voir le profil utilisateur"
                                                                        disabled={!participantId}
                                                                        onClick={() => participantId && handleViewUser(participantId)}
                                                                        style={{ flexShrink: 0 }}
                                                                    >
                                                                        <EyeIcon size={16} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucun participant inscrit.</p>
                                                )}
                                            </div>
        
                                            {/* Validation : refus motivé, modification en attente, questionnaire */}
                                            <AdminEventReviewPanel
                                                event={selectedEvent}
                                                showToast={showToast}
                                                onEventChanged={() => { fetchEvents(); setSelectedEvent(null); }}
                                                onQuestionnaireChanged={loadPendingQuestionnaires}
                                            />

                                            {/* Footer */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                                <button className="btn btn--outline" onClick={() => setSelectedEvent(null)}>Fermer</button>
                                                {selectedEvent.status !== 'published' && (
                                                    <button className="btn btn--primary" style={{ background: 'var(--color-success, #22c55e)' }} onClick={() => { handlePublishEvent(selectedEvent); setSelectedEvent(null); }}>
                                                        Publier
                                                    </button>
                                                )}
                                                <button className="btn btn--primary" onClick={() => { setSelectedEvent(null); handleEditEvent(selectedEvent); }}>
                                                    Modifier
                                                </button>
                                            </div>
                                        </div>
                                    </Modal>
                                )}
        
                                {/* Event Edit Modal */}
                                {editingEvent && (
                                    <Modal
                                        isOpen
                                        onClose={() => setEditingEvent(null)}
                                        contentClassName="modal__content--lg"
                                        title="Modifier l'événement"
                                    >
                                        <form onSubmit={handleSaveEditEvent} style={{ display: 'grid', gap: '0.75rem' }}>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="admin-edit-event-published"
                                                    checked={editEventForm.status === 'published'}
                                                    onChange={(e) =>
                                                        setEditEventForm((p) => ({
                                                            ...p,
                                                            status: e.target.checked ? 'published' : 'draft',
                                                        }))
                                                    }
                                                />
                                                <label className="form-check-label" htmlFor="admin-edit-event-published">
                                                    {editEventForm.status === 'published' ? 'Publié' : 'Brouillon'}
                                                </label>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Titre *</label>
                                                <input className="form-input" value={editEventForm.title} onChange={(e) => setEditEventForm((f) => ({ ...f, title: e.target.value }))} required />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Description *</label>
                                                <textarea className="form-input" rows={3} value={editEventForm.body} onChange={(e) => setEditEventForm((f) => ({ ...f, body: e.target.value }))} required style={{ resize: 'vertical' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Date début *</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input"
                                                        min={getDatetimeLocalMinForStartEdit(editEventForm.startDate)}
                                                        value={editEventForm.startDate}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setEditEventForm((f) => {
                                                                const minEnd = v ? addMinutesToDatetimeLocalString(v, 90) : '';
                                                                let nextEnd = f.endDate;
                                                                if (v && (!f.endDate || new Date(f.endDate) < new Date(minEnd))) nextEnd = minEnd;
                                                                return { ...f, startDate: v, endDate: nextEnd };
                                                            });
                                                        }}
                                                        required
                                                    />
                                                    <span className="form-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>À partir de demain si nouvelle date · durée min. 1 h 30</span>
                                                </div>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Date fin</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input"
                                                        min={editEventForm.startDate ? addMinutesToDatetimeLocalString(editEventForm.startDate, 90) : addMinutesToDatetimeLocalString(getTomorrowMidnightLocalString(), 90)}
                                                        value={editEventForm.endDate}
                                                        onChange={(e) => setEditEventForm((f) => ({ ...f, endDate: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Lieu *</label>
                                                    <input className="form-input" value={editEventForm.location} onChange={(e) => setEditEventForm((f) => ({ ...f, location: e.target.value }))} required />
                                                </div>
                                                <div className="form-group" style={{ margin: 0 }}>
                                                    <label className="form-label">Capacité *</label>
                                                    <input type="number" className="form-input" value={editEventForm.capacity} onChange={(e) => setEditEventForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="50" required />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                <label className="form-label">Image (optionnel)</label>
                                                <input className="form-input" placeholder="Ou collez une URL d'image..." value={editEventForm.eventImage} onChange={(e) => setEditEventForm((f) => ({ ...f, eventImage: e.target.value }))} style={{ marginBottom: '0.75rem' }} />
                                                <div
                                                    style={{
                                                        border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                                                        padding: '1.25rem', textAlign: 'center', background: 'var(--bg-base)',
                                                        cursor: editEventForm.eventImage?.trim() ? 'default' : 'pointer',
                                                        position: 'relative', overflow: 'hidden', minHeight: '140px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                                                    }}
                                                    onClick={() => !editEventForm.eventImage?.trim() && document.getElementById('admin-edit-event-image-upload')?.click()}
                                                    onKeyDown={(ev) => {
                                                        if (!editEventForm.eventImage?.trim() && (ev.key === 'Enter' || ev.key === ' ')) {
                                                            ev.preventDefault();
                                                            document.getElementById('admin-edit-event-image-upload')?.click();
                                                        }
                                                    }}
                                                    role={editEventForm.eventImage?.trim() ? undefined : 'button'}
                                                    tabIndex={editEventForm.eventImage?.trim() ? undefined : 0}
                                                >
                                                    {editEventForm.eventImage?.trim() ? (
                                                        <>
                                                            <img src={editEventForm.eventImage.trim()} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(ev) => { ev.currentTarget.style.display = 'none'; }} />
                                                            <button type="button" onClick={(ev) => { ev.stopPropagation(); setEditEventForm((f) => ({ ...f, eventImage: '' })); }} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                                <X size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                                                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Cliquez pour choisir une image</p>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG (max 5 Mo)</p>
                                                        </>
                                                    )}
                                                    <input id="admin-edit-event-image-upload" type="file" accept="image/*" onChange={handleEditEventImageUpload} style={{ display: 'none' }} />
                                                </div>
                                                {editEventImageUploading && (
                                                    <p style={{ color: 'var(--primary-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Import en cours…</p>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                                <button type="submit" className="btn btn--primary" disabled={editEventImageUploading}>
                                                    {editEventImageUploading ? 'Import en cours…' : 'Enregistrer'}
                                                </button>
                                                <button type="button" className="btn btn--ghost" onClick={() => setEditingEvent(null)}>Annuler</button>
                                            </div>
                                        </form>
                                    </Modal>
                                )}
                            </>
    );
}
