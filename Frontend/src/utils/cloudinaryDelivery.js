/**
 * Cloudinary delivery helpers.
 *
 * Raw uploads (`/raw/upload/`) cannot use URL transformations (fl_attachment, fl_inline, etc.).
 * Adding them returns HTTP 400. Use the original secure_url for raw files.
 * @see https://cloudinary.com/documentation/upload_images#uploading_non_media_files_as_raw_files
 */

export function isCloudinaryRawUrl(url) {
    return String(url || '').includes('/raw/upload/');
}

/**
 * Legacy bug: `fl_attachment` / `fl_inline` were inserted into `/raw/upload/...` (Cloudinary → 400).
 * Remove only `fl_*` transformation segments after `/raw/upload/` until `v123.../` (version) is next.
 */
export function sanitizeCloudinaryRawUrl(url) {
    let u = String(url || '');
    if (!u.includes('/raw/upload/')) return u;
    const re = /\/raw\/upload\/(?!v\d+\/)fl_[^/]+\//;
    let guard = 0;
    while (re.test(u) && guard++ < 24) {
        u = u.replace(re, '/raw/upload/');
    }
    return u;
}

/**
 * Prefer download (Content-Disposition) when supported — only image/video, not raw.
 */
export function cloudinaryAttachmentUrl(url, fileName = '') {
    const raw = sanitizeCloudinaryRawUrl(String(url || ''));
    if (!raw.includes('res.cloudinary.com') || !raw.includes('/upload/')) return raw;
    if (isCloudinaryRawUrl(raw)) return raw;

    const safeName = String(fileName || '')
        .trim()
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 100);
    const attachmentSegment = safeName
        ? `fl_attachment:${encodeURIComponent(safeName)}`
        : 'fl_attachment';
    return raw.replace('/upload/', `/upload/${attachmentSegment}/`);
}

/**
 * Inline display hint — only for non-raw; raw URLs must be opened as-is.
 */
export function cloudinaryInlineUrl(url) {
    const raw = sanitizeCloudinaryRawUrl(String(url || ''));
    if (!raw.includes('res.cloudinary.com') || !raw.includes('/upload/')) return raw;
    if (isCloudinaryRawUrl(raw)) return raw;
    return raw.replace('/upload/', '/upload/fl_inline/');
}

/**
 * Téléchargement fiable : raw Cloudinary = URL sans transformation + fetch→blob si CORS OK,
 * sinon nouvel onglet. Image/video Cloudinary = `fl_attachment` dans l’URL.
 */
export function downloadFileResource(url, suggestedName = 'fichier') {
    const name = String(suggestedName || 'fichier').trim() || 'fichier';
    const src = sanitizeCloudinaryRawUrl(String(url || ''));
    if (!src) return Promise.resolve();

    if (isCloudinaryRawUrl(src)) {
        return fetch(src, { mode: 'cors', credentials: 'omit' })
            .then((r) => {
                if (!r.ok) throw new Error(String(r.status));
                return r.blob();
            })
            .then((blob) => {
                if (!blob || blob.size === 0) throw new Error('empty');
                const objectUrl = URL.createObjectURL(blob);
                try {
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    a.download = name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } finally {
                    URL.revokeObjectURL(objectUrl);
                }
            })
            .catch(() => {
                window.open(src, '_blank', 'noopener,noreferrer');
            });
    }

    window.open(cloudinaryAttachmentUrl(src, name), '_blank', 'noopener,noreferrer');
    return Promise.resolve();
}
