/** Tri des questions comme en base (champ `order`). */
export function sortQuestionsByOrder(questions) {
    if (!Array.isArray(questions)) return [];
    return [...questions].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

export function normalizeQuestionnairePayload(data) {
    if (!data) return null;
    return { ...data, questions: sortQuestionsByOrder(data.questions) };
}

/**
 * Clé stable pour stocker la réponse (évite les collisions si _id est absent / doublons).
 */
export function getQuestionnaireAnswerKey(question, index) {
    if (!question) return `idx-${index}`;
    const raw = question._id ?? question.id;
    if (raw != null && String(raw).trim() !== '') return String(raw);
    return `order-${question.order ?? 'na'}-${index}`;
}

/**
 * Payload API : une entrée par question avec un id Mongo valide (ignore les vides).
 */
export function buildQuestionnaireAnswersPayload(answersRecord, allQuestions) {
    if (!Array.isArray(allQuestions) || !answersRecord) return [];
    const list = [];
    for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        const key = getQuestionnaireAnswerKey(q, i);
        const value = answersRecord[key];
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        const mongoId = q._id ?? q.id;
        if (mongoId == null || String(mongoId).trim() === '') continue;
        list.push({ question: String(mongoId), value });
    }
    return list;
}
