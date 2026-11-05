/** Taille de page admin (alignée sur le blog : 6 articles / page) */
export const ADMIN_PAGE_SIZE = 6;

/** Pagination des stats questionnaire (admin) */
export const Q_STATS_PAGE_SIZE = 20;

export const EMPTY_PARTNER_FORM = {
    name: '',
    shortName: '',
    description: '',
    role: '',
    logo: '',
    website: '',
    collaboration: '',
    sortOrder: '',
};

export const EMPTY_PUBLIC_TEAM_FORM = {
    name: '',
    organization: '',
    role: '',
    email: '',
    avatar: '',
    linkedin: '',
    github: '',
    facebook: '',
    instagram: '',
    twitter: '',
    sortOrder: '',
    externalId: '',
};

export const EMPTY_ENTREPRENEUR_FORM = {
    name: '',
    role: '',
    organization: '',
    quote: '',
    avatar: '',
    sortOrder: '',
};

/** Champs alignés sur /blog/creer via BlogArticleForm */
export const DEFAULT_ADMIN_ARTICLE_FORM = {
    title: '',
    body: '',
    summary: '',
    featuredImage: '',
    category: '',
    level: '',
    status: 'draft',
};

export const emptyPaginated = { data: [], total: 0, count: 0, totalPages: 1, currentPage: 1 };

export const QUESTION_CATEGORY_OPTIONS = [
    'personal',
    'profession',
    'education',
    'location',
    'contact',
    'discovery',
    'interests',
    'entrepreneurship',
    'preferences',
    'general',
];

export const SIDEBAR_COLLAPSED_KEY = 'mbg_admin_sidebar_collapsed';

export const PERSONAL_INFO_FIELD_VALUES = [
    '',
    'firstName',
    'lastName',
    'dateOfBirth',
    'gender',
    'phone',
    'bio',
    'avatar',
    'profession',
    'sector',
    'educationLevel',
    'institution',
    'address.street',
    'address.city',
    'address.state',
    'address.country',
    'address.zipCode',
    'socialLinks.website',
    'socialLinks.twitter',
    'socialLinks.linkedin',
    'socialLinks.github',
    'preferences.newsletter',
    'preferences.notifications',
];

export const QUESTIONNAIRE_PREVIEW_FALLBACK_DESC =
    'Ces informations nous aideront à personnaliser votre expérience sur Mahdia Blue & Green.';
