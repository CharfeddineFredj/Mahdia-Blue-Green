import { useEffect, useState, useRef, useId } from 'react';
import { Extension, mergeAttributes } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Eraser,
    Heading1,
    Heading2,
    Heading3,
    Highlighter,
    ImagePlus,
    Italic,
    Link2,
    List,
    ListOrdered,
    Minus,
    Pilcrow,
    Quote,
    Redo2,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
    X,
} from 'lucide-react';
import { api } from '../services';

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return { types: ['textStyle'] };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element) => element.style.fontSize || null,
                        renderHTML: (attributes) => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
});

const HR_PRESETS = [
    { label: '1/4 pt', thickness: 1 },
    { label: '1/2 pt', thickness: 1.5 },
    { label: '3/4 pt', thickness: 2 },
    { label: '1 pt', thickness: 2.5 },
    { label: '1 1/2 pt', thickness: 3.5 },
    { label: '2 1/4 pt', thickness: 4.5 },
    { label: '3 pt', thickness: 6 },
    { label: '4 1/2 pt', thickness: 8 },
    { label: '6 pt', thickness: 10 },
];

const StyledHorizontalRule = HorizontalRule.extend({
    addAttributes() {
        return {
            width: {
                default: 100,
                parseHTML: (element) => parseFloat(element.getAttribute('data-width') || '100'),
                renderHTML: (attributes) => ({ 'data-width': String(attributes.width) }),
            },
            thickness: {
                default: 1,
                parseHTML: (element) => parseFloat(element.getAttribute('data-thickness') || '1'),
                renderHTML: (attributes) => ({ 'data-thickness': String(attributes.thickness) }),
            },
            lineStyle: {
                default: 'solid',
                parseHTML: (element) => element.getAttribute('data-line-style') || 'solid',
                renderHTML: (attributes) => ({ 'data-line-style': attributes.lineStyle }),
            },
            color: {
                default: '#111827',
                parseHTML: (element) => element.getAttribute('data-color') || '#111827',
                renderHTML: (attributes) => ({ 'data-color': attributes.color }),
            },
            align: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-align') || 'center',
                renderHTML: (attributes) => ({ 'data-align': attributes.align }),
            },
        };
    },
    renderHTML({ HTMLAttributes }) {
        const width = parseFloat(String(HTMLAttributes['data-width'] ?? HTMLAttributes.width ?? 100));
        const thickness = parseFloat(String(HTMLAttributes['data-thickness'] ?? HTMLAttributes.thickness ?? 1));
        const lineStyle = HTMLAttributes['data-line-style'] || HTMLAttributes.lineStyle || 'solid';
        const color = HTMLAttributes['data-color'] || HTMLAttributes.color || '#111827';
        const align = HTMLAttributes['data-align'] || HTMLAttributes.align || 'center';
        const margin =
            align === 'left'
                ? '1rem auto 1rem 0'
                : align === 'right'
                    ? '1rem 0 1rem auto'
                    : '1rem auto';

        return [
            'hr',
            mergeAttributes(this.options.HTMLAttributes, {
                'data-width': String(width),
                'data-thickness': String(thickness),
                'data-line-style': lineStyle,
                'data-color': color,
                'data-align': align,
                style: `border:none !important;border-top:${thickness}px ${lineStyle} ${color} !important;height:0 !important;background:transparent !important;width:${width}%;margin:${margin};`,
            }),
        ];
    },
});

function normalizeHtmlContent(html = '') {
    const textOnly = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .trim();
    return textOnly ? html : '';
}

/**
 * Éditeur riche identique à « Contenu de l’article » (/blog/creer) : TipTap + insertion d’images (Cloudinary).
 */
export default function RichTextEditor({
    content,
    onContentChange,
    placeholder = 'Rédigez ici…',
    minEditorHeight = '300px',
    uploadFolder = 'mahdia_bg/articles',
    disabled = false,
    onUploadingChange,
    onInlineImageUploadError,
}) {
    const uid = useId();
    const inlineImageInputId = `rich-editor-inline-img-${uid}`;
    const inlineImageInputRef = useRef(null);
    const [fontSize, setFontSize] = useState('16px');
    const [textColor, setTextColor] = useState('#0f172a');
    const [highlightColor, setHighlightColor] = useState('#fff59d');
    const [showHrMenu, setShowHrMenu] = useState(false);
    const [inlineImageUploading, setInlineImageUploading] = useState(false);

    useEffect(() => {
        onUploadingChange?.(inlineImageUploading);
    }, [inlineImageUploading, onUploadingChange]);

    const editor = useEditor({
        editable: !disabled,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                horizontalRule: false,
            }),
            TextStyle,
            Color,
            FontSize,
            Underline,
            Highlight.configure({ multicolor: true }),
            StyledHorizontalRule,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
            Image.configure({
                inline: false,
                allowBase64: false,
                HTMLAttributes: {
                    style: 'max-width:100%;height:auto;border-radius:8px;display:block;margin:0.75rem auto;',
                },
            }),
        ],
        content: content || '',
        onUpdate: ({ editor: currentEditor }) => {
            onContentChange(normalizeHtmlContent(currentEditor.getHTML()));
        },
        editorProps: {
            attributes: {
                class: 'blog-rich-editor__content',
            },
        },
    });

    useEffect(() => {
        if (!editor) return;
        const incoming = content || '';
        if (incoming !== editor.getHTML()) {
            editor.commands.setContent(incoming, false);
        }
    }, [content, editor]);

    const applyFontSize = (nextSize) => {
        setFontSize(nextSize);
        if (!editor) return;
        editor.chain().focus().setMark('textStyle', { fontSize: nextSize }).run();
    };

    const applyTextColor = (nextColor) => {
        setTextColor(nextColor);
        if (!editor) return;
        editor.chain().focus().setColor(nextColor).run();
    };

    const applyHighlight = (nextColor) => {
        setHighlightColor(nextColor);
        if (!editor) return;
        editor.chain().focus().setHighlight({ color: nextColor }).run();
    };

    const clearTextColor = () => {
        setTextColor('#0f172a');
        if (!editor) return;
        editor.chain().focus().unsetColor().run();
    };

    const clearHighlight = () => {
        setHighlightColor('#fff59d');
        if (!editor) return;
        editor.chain().focus().unsetHighlight().run();
    };

    const setLink = () => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href || 'https://';
        const url = window.prompt("Entrez l'URL du lien :", previousUrl);
        if (url === null) return;
        if (url.trim() === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url.trim() }).run();
    };

    const insertHorizontalRule = ({ width, thickness, lineStyle = 'solid' }) => {
        if (!editor) return;
        editor.chain().focus().insertContent({
            type: 'horizontalRule',
            attrs: { width, thickness, lineStyle, color: '#111827', align: 'center' },
        }).run();
        setShowHrMenu(false);
    };

    const handleInlineImageFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !editor) return;
        if (!file.type.startsWith('image/')) {
            onInlineImageUploadError?.('Veuillez choisir une image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            onInlineImageUploadError?.("L'image est trop volumineuse (max 5 Mo).");
            return;
        }
        setInlineImageUploading(true);
        try {
            const res = await api.upload(file, uploadFolder);
            if (res.success && res.data?.url) {
                editor.chain().focus().setImage({ src: res.data.url, alt: '' }).run();
            }
        } catch (err) {
            const msg =
                err.status === 403
                    ? err.message || 'Image refusée (contenu inapproprié).'
                    : err.message || "Erreur lors de l'envoi de l'image.";
            onInlineImageUploadError?.(msg);
        } finally {
            setInlineImageUploading(false);
        }
    };

    const isEditorEmpty = !normalizeHtmlContent(content);

    return (
        <div
            style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--bg-surface)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-base)',
                    alignItems: 'center',
                }}
            >
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    style={editor?.isActive('bold') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Gras"
                    title="Gras"
                >
                    <Bold size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    style={editor?.isActive('italic') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Italique"
                    title="Italique"
                >
                    <Italic size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    style={editor?.isActive('strike') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Barré"
                    title="Barré"
                >
                    <Strikethrough size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    style={editor?.isActive('underline') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Souligné"
                    title="Souligné"
                >
                    <UnderlineIcon size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    style={editor?.isActive('heading', { level: 1 }) ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Titre 1"
                    title="Titre 1"
                >
                    <Heading1 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    style={editor?.isActive('heading', { level: 2 }) ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Titre 2"
                    title="Titre 2"
                >
                    <Heading2 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    style={editor?.isActive('heading', { level: 3 }) ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Titre 3"
                    title="Titre 3"
                >
                    <Heading3 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().setParagraph().run()}
                    style={editor?.isActive('paragraph') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Paragraphe"
                    title="Paragraphe"
                >
                    <Pilcrow size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    style={editor?.isActive('blockquote') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Citation"
                    title="Citation"
                >
                    <Quote size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    style={editor?.isActive('bulletList') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Liste à puces"
                    title="Liste à puces"
                >
                    <List size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    style={editor?.isActive('orderedList') ? { borderColor: 'var(--primary-color)' } : undefined}
                    disabled={disabled}
                    aria-label="Liste numérotée"
                    title="Liste numérotée"
                >
                    <ListOrdered size={14} />
                </button>
                <button type="button" className="btn btn--outline btn--sm" onClick={setLink} disabled={disabled} aria-label="Lien" title="Lien">
                    <Link2 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => inlineImageInputRef.current?.click()}
                    disabled={disabled || inlineImageUploading}
                    aria-label="Insérer une image"
                    title="Insérer une image (max 5 Mo)"
                >
                    <ImagePlus size={14} />
                </button>
                <input
                    ref={inlineImageInputRef}
                    id={inlineImageInputId}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleInlineImageFile}
                />
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={disabled}
                    aria-label="Annuler"
                    title="Annuler"
                >
                    <Undo2 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={disabled}
                    aria-label="Rétablir"
                    title="Rétablir"
                >
                    <Redo2 size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    disabled={disabled}
                    aria-label="Aligner à gauche"
                    title="Aligner à gauche"
                >
                    <AlignLeft size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    disabled={disabled}
                    aria-label="Centrer"
                    title="Centrer"
                >
                    <AlignCenter size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    disabled={disabled}
                    aria-label="Aligner à droite"
                    title="Aligner à droite"
                >
                    <AlignRight size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                    disabled={disabled}
                    aria-label="Justifier"
                    title="Justifier"
                >
                    <AlignJustify size={14} />
                </button>
                <div style={{ position: 'relative' }}>
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setShowHrMenu((v) => !v)}
                        disabled={disabled}
                        aria-label="Ligne horizontale"
                        title="Ligne horizontale"
                    >
                        <Minus size={14} />
                    </button>
                    {showHrMenu && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '110%',
                                left: 0,
                                zIndex: 30,
                                minWidth: '190px',
                                background: '#e5e7eb',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                                padding: '0.3rem',
                                display: 'grid',
                                gap: '0.2rem',
                            }}
                        >
                            {HR_PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => insertHorizontalRule({ width: 100, thickness: preset.thickness, lineStyle: 'solid' })}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '56px 1fr',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        border: 'none',
                                        background: '#f3f4f6',
                                        color: '#111827',
                                        padding: '0.25rem 0.45rem',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={(ev) => {
                                        ev.currentTarget.style.background = '#e2e8f0';
                                    }}
                                    onMouseLeave={(ev) => {
                                        ev.currentTarget.style.background = '#f3f4f6';
                                    }}
                                >
                                    <span style={{ fontSize: '0.95rem' }}>{preset.label}</span>
                                    <span
                                        style={{
                                            width: '100%',
                                            borderTop: `${preset.thickness}px solid #111827`,
                                            height: 0,
                                            display: 'block',
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
                    disabled={disabled}
                    aria-label="Nettoyer format"
                    title="Nettoyer format"
                >
                    <Eraser size={14} />
                </button>

                <select
                    className="form-select"
                    value={fontSize}
                    onChange={(e) => applyFontSize(e.target.value)}
                    style={{ width: '110px', minHeight: '34px', padding: '0.25rem 0.5rem' }}
                    disabled={disabled}
                    aria-label="Taille de texte"
                >
                    <option value="12px">12px</option>
                    <option value="14px">14px</option>
                    <option value="16px">16px</option>
                    <option value="18px">18px</option>
                    <option value="20px">20px</option>
                    <option value="24px">24px</option>
                    <option value="28px">28px</option>
                    <option value="32px">32px</option>
                </select>

                <label
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.45rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                    }}
                    title="Couleur du texte"
                >
                    <span style={{ fontWeight: 700 }}>A</span>
                    <input
                        type="color"
                        value={textColor}
                        onChange={(e) => applyTextColor(e.target.value)}
                        style={{ width: '28px', height: '28px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                        disabled={disabled}
                        aria-label="Couleur du texte"
                    />
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={clearTextColor}
                        style={{ minHeight: '28px', padding: '0 0.35rem' }}
                        disabled={disabled}
                        aria-label="Retirer couleur du texte"
                        title="Retirer couleur du texte"
                    >
                        <X size={12} />
                    </button>
                </label>

                <label
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.45rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                    }}
                    title="Surlignage"
                >
                    <Highlighter size={14} />
                    <input
                        type="color"
                        value={highlightColor}
                        onChange={(e) => applyHighlight(e.target.value)}
                        style={{ width: '28px', height: '28px', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                        disabled={disabled}
                        aria-label="Couleur de surlignage"
                    />
                    <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={clearHighlight}
                        style={{ minHeight: '28px', padding: '0 0.35rem' }}
                        disabled={disabled}
                        aria-label="Retirer surlignage"
                        title="Retirer surlignage"
                    >
                        <X size={12} />
                    </button>
                </label>
            </div>
            <EditorContent
                editor={editor}
                style={{
                    minHeight: minEditorHeight,
                    padding: '1rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                }}
            />
            {isEditorEmpty && (
                <p
                    style={{
                        margin: '-2.5rem 0 0 1rem',
                        pointerEvents: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.95rem',
                    }}
                >
                    {placeholder}
                </p>
            )}
            <style>
                {`
                .blog-rich-editor__content {
                    min-height: ${minEditorHeight};
                    outline: none;
                    line-height: 1.7;
                }
                .blog-rich-editor__content p {
                    margin: 0.6rem 0;
                }
                .blog-rich-editor__content h1,
                .blog-rich-editor__content h2,
                .blog-rich-editor__content h3 {
                    margin: 0.9rem 0 0.45rem;
                    line-height: 1.3;
                }
                .blog-rich-editor__content blockquote {
                    margin: 0.9rem 0;
                    padding-left: 1rem;
                    border-left: 3px solid var(--primary-color);
                    color: var(--text-secondary);
                }
                .blog-rich-editor__content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                }
                .blog-rich-editor__content hr,
                .ProseMirror hr {
                    border-left: none !important;
                    border-right: none !important;
                    border-bottom: none !important;
                    background: transparent !important;
                    outline: none !important;
                    box-shadow: none !important;
                }
                `}
            </style>
        </div>
    );
}
