/** Sous-types d'article (articleData.articleType) — valeurs identiques au modèle serveur */
export const ARTICLE_TYPES = [
    { value: 'article', label: 'Article' },
    { value: 'news', label: 'Actualité' },
    { value: 'guide', label: 'Guide' },
    { value: 'tutorial', label: 'Tutoriel' },
    { value: 'case_study', label: 'Étude de cas' },
    { value: 'success_story', label: 'Témoignage de réussite' },
    { value: 'testimonial', label: 'Témoignage' },
];

export const ARTICLE_TYPE_LABELS = Object.fromEntries(ARTICLE_TYPES.map((t) => [t.value, t.label]));

/** Libellé d'un sous-type (« Article » par défaut) */
export const articleTypeLabel = (value) => ARTICLE_TYPE_LABELS[value] || ARTICLE_TYPE_LABELS.article;
