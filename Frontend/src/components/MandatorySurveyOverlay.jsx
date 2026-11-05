import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import authService from '../services/auth.service';
import { useMandatorySurvey } from '../context/MandatorySurveyContext';
import { QuestionnaireFillById } from '../pages/QuestionnaireFill';

/**
 * Affiche l’enquête obligatoire au-dessus du site (fond flouté), sans rediriger ni masquer la page sous-jacente.
 */
export default function MandatorySurveyOverlay() {
    const { blockingQuestionnaireIds, loading } = useMandatorySurvey();

    const eligible =
        authService.isAuthenticated() &&
        !authService.needsQuestionnaireCompletion() &&
        !authService.isAdmin();

    const visible = eligible && !loading && blockingQuestionnaireIds.length > 0;
    const activeId = blockingQuestionnaireIds[0];

    useEffect(() => {
        if (visible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [visible]);

    if (!visible || !activeId) return null;

    return createPortal(
        <div className="mandatory-survey-overlay" role="presentation">
            <div className="mandatory-survey-overlay__backdrop" aria-hidden />
            <div
                className="mandatory-survey-overlay__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mandatory-survey-heading"
            >
                <QuestionnaireFillById key={activeId} id={activeId} variant="overlay" />
            </div>
        </div>,
        document.body
    );
}
