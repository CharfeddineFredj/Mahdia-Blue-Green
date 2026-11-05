import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import authService from '../services/auth.service';
import questionnaireService from '../services/questionnaire.service';

const MandatorySurveyContext = createContext(null);

/** Enquête facultative : jamais imposée en overlay obligatoire */
const EXEMPT_MANDATORY_TITLE_NORMALIZED = 'votre avis compte';

function isExemptFromMandatoryBlocking(p) {
    return (p.title || '').trim().toLowerCase() === EXEMPT_MANDATORY_TITLE_NORMALIZED;
}

/**
 * Questionnaires ouverts, non répondus, et « nouveaux » pour le membre :
 * créés après son inscription ou mis à jour après son inscription (aligné sur getPending / newCount).
 * « Votre avis compte » est exclu (facultatif).
 */
export function getBlockingQuestionnaireIdsFromPendingList(pendingList) {
    if (!Array.isArray(pendingList)) return [];
    return pendingList
        .filter((p) => !isExemptFromMandatoryBlocking(p))
        .filter((p) => p.isNewSinceUserJoined || p.mayHaveNewContent)
        .map((p) => String(p._id));
}

export function MandatorySurveyProvider({ children }) {
    const location = useLocation();
    const [blockingQuestionnaireIds, setBlockingQuestionnaireIds] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshMandatorySurveys = useCallback(async () => {
        if (!authService.isAuthenticated() || authService.needsQuestionnaireCompletion()) {
            setBlockingQuestionnaireIds([]);
            setLoading(false);
            return;
        }
        if (authService.isAdmin()) {
            setBlockingQuestionnaireIds([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const r = await questionnaireService.getPending();
            if (r.success && Array.isArray(r.data)) {
                setBlockingQuestionnaireIds(getBlockingQuestionnaireIdsFromPendingList(r.data));
            } else {
                setBlockingQuestionnaireIds([]);
            }
        } catch {
            setBlockingQuestionnaireIds([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /* À chaque navigation (ex. après connexion sur le même onglet) + montage initial */
    useEffect(() => {
        refreshMandatorySurveys();
    }, [location.pathname, refreshMandatorySurveys]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'mbg_user' || e.key === 'mbg_temp_user' || e.key === null) {
                refreshMandatorySurveys();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [refreshMandatorySurveys]);

    const isMandatoryBlockActive = blockingQuestionnaireIds.length > 0;

    const value = useMemo(
        () => ({
            blockingQuestionnaireIds,
            loading,
            refreshMandatorySurveys,
            isMandatoryBlockActive
        }),
        [blockingQuestionnaireIds, loading, refreshMandatorySurveys, isMandatoryBlockActive]
    );

    return <MandatorySurveyContext.Provider value={value}>{children}</MandatorySurveyContext.Provider>;
}

export function useMandatorySurvey() {
    const ctx = useContext(MandatorySurveyContext);
    if (!ctx) {
        throw new Error('useMandatorySurvey must be used within MandatorySurveyProvider');
    }
    return ctx;
}
