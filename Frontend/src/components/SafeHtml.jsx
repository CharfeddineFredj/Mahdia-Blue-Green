import { sanitizeHtml } from '../utils/sanitizeHtml';

export default function SafeHtml({ html, ...props }) {
    return <div {...props} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

