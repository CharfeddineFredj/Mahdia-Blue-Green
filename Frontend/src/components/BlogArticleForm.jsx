import { Upload, X } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import { ARTICLE_TYPES } from '../utils/articleTypes';

/**
 * Formulaire article identique à la page /blog/creer (CreatePost).
 * Utilisé par CreatePost et par le modal admin.
 */
export default function BlogArticleForm({
    title,
    excerpt,
    content,
    category,
    level,
    articleType = 'article',
    onArticleTypeChange,
    imageUrl,
    categories,
    levels,
    onTitleChange,
    onExcerptChange,
    onContentChange,
    onCategoryChange,
    onLevelChange,
    onImageUrlChange,
    onImageFileChange,
    uploading = false,
    fileInputId = 'blog-article-cover-upload',
    onSubmit,
    submitLabel = 'Envoyer en brouillon',
    cancelLabel = 'Annuler',
    onCancel,
    cancelButtonClassName = 'btn btn--outline',
    disabledSubmit = false,
}) {
    const imagePreview = imageUrl?.trim() ? imageUrl : '';

    const removeImage = (e) => {
        e.stopPropagation();
        onImageUrlChange('');
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="form-group">
                <label className="form-label">Titre de l&apos;article *</label>
                <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Un titre accrocheur..."
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Image de couverture *</label>
                <input
                    type="url"
                    className="form-input"
                    value={imageUrl}
                    onChange={(e) => {
                        onImageUrlChange(e.target.value);
                    }}
                    placeholder="Ou collez une URL d'image..."
                    style={{ marginBottom: '0.75rem' }}
                />
                <div
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--bg-base)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                    }}
                    onClick={() => !imagePreview && document.getElementById(fileInputId)?.click()}
                    onKeyDown={(e) => {
                        if (!imagePreview && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            document.getElementById(fileInputId)?.click();
                        }
                    }}
                    role={imagePreview ? undefined : 'button'}
                    tabIndex={imagePreview ? undefined : 0}
                >
                    {imagePreview ? (
                        <>
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                            <button
                                type="button"
                                onClick={removeImage}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
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
                            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Cliquez ou glissez une image ici
                            </p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PNG, JPG (max 5Mo)</p>
                        </>
                    )}
                    <input
                        id={fileInputId}
                        type="file"
                        accept="image/*"
                        onChange={onImageFileChange}
                        style={{ display: 'none' }}
                    />
                </div>
                {uploading && (
                    <p style={{ color: 'var(--primary-color)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        Import en cours…
                    </p>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Court résumé *</label>
                <textarea
                    className="form-textarea"
                    value={excerpt}
                    onChange={(e) => onExcerptChange(e.target.value)}
                    rows="3"
                    placeholder="Une brève description qui apparaîtra dans la liste..."
                    required
                />
                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {excerpt.length}/200 caractères
                </div>
            </div>

            <div className="grid grid--2" style={{ gap: '1.5rem' }}>
                <div className="form-group">
                    <label className="form-label">Catégorie *</label>
                    <select
                        className="form-select"
                        value={category}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        required
                    >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Niveau *</label>
                    <select
                        className="form-select"
                        value={level}
                        onChange={(e) => onLevelChange(e.target.value)}
                        required
                    >
                        <option value="">Sélectionner un niveau</option>
                        {levels.map((l) => (
                            <option key={l._id} value={l._id}>
                                {l.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {onArticleTypeChange && (
                <div className="form-group">
                    <label className="form-label" htmlFor="article-type-select">Type d&apos;article</label>
                    <select
                        id="article-type-select"
                        className="form-select"
                        value={articleType}
                        onChange={(e) => onArticleTypeChange(e.target.value)}
                    >
                        {ARTICLE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Contenu de l&apos;article *</label>
                <RichTextEditor
                    content={content}
                    onContentChange={onContentChange}
                    placeholder="Rédigez votre article ici..."
                    minEditorHeight="300px"
                    uploadFolder="mahdia_bg/articles"
                    disabled={disabledSubmit || uploading}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className={cancelButtonClassName} onClick={onCancel}>
                    {cancelLabel}
                </button>
                <button type="submit" className="btn btn--primary" disabled={disabledSubmit || uploading}>
                    {disabledSubmit || uploading ? 'Enregistrement...' : submitLabel}
                </button>
            </div>
        </form>
    );
}
