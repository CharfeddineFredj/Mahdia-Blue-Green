import { formatAnswerValue, formatDateTime } from './eventQuestionnaireRules';

/**
 * Export des réponses aux questionnaires d'événements : CSV (Excel FR) et PDF (impression du navigateur).
 */

const BASE_COLUMNS = ['Nom d’utilisateur', 'E-mail', 'Téléphone', 'Date d’envoi'];

/** Colonnes de questions : ordre du questionnaire, puis questions présentes uniquement dans d'anciennes réponses */
export function getQuestionColumns(questions = [], responses = []) {
    const cols = (questions || []).map((q) => ({ id: String(q._id), text: q.text, type: q.type }));
    const known = new Set(cols.map((c) => c.id));
    for (const r of responses) {
        for (const a of r.answers || []) {
            const id = String(a.questionId);
            if (!known.has(id)) {
                known.add(id);
                cols.push({ id, text: a.questionText || 'Question', type: a.questionType });
            }
        }
    }
    return cols;
}

function responseRow(r, columns) {
    const byId = new Map((r.answers || []).map((a) => [String(a.questionId), a]));
    return [
        r.user?.username || 'Utilisateur supprimé',
        r.user?.email || '',
        r.user?.phone || '',
        formatDateTime(r.submittedAt),
        ...columns.map((c) => {
            const a = byId.get(c.id);
            return a ? formatAnswerValue(a.value, a.questionType || c.type) : '';
        }),
    ];
}

function csvCell(value) {
    const s = String(value ?? '');
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV séparé par « ; » + BOM UTF-8 : s'ouvre correctement (accents) dans Excel en français */
export function buildResponsesCsv(questions, responses) {
    const columns = getQuestionColumns(questions, responses);
    const lines = [
        [...BASE_COLUMNS, ...columns.map((c) => c.text)],
        ...responses.map((r) => responseRow(r, columns)),
    ];
    return '﻿' + lines.map((line) => line.map(csvCell).join(';')).join('\r\n');
}

export function safeFileName(...parts) {
    const base = parts.filter(Boolean).join('-')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 80);
    return base || 'reponses';
}

export function downloadCsv(fileName, csv) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Document HTML imprimable : un tableau unique (une ligne par participant, une colonne par question),
 * en-tête aux couleurs de la marque et pied de page sur chaque page (mention, date, pagination).
 */
export function buildResponsesPdfHtml({ questionnaireTitle, eventTitle, questions, responses, total }) {
    const columns = getQuestionColumns(questions, responses);
    const generatedAt = formatDateTime(new Date());
    const footerNote = `Mahdia Blue & Green — Document confidentiel · Généré le ${generatedAt}`;

    const head = ['#', 'Participant', 'Contact', 'Envoyé le', ...columns.map((c) => c.text)]
        .map((h, i) => `<th${i === 0 ? ' class="num"' : ''}>${esc(h)}</th>`)
        .join('');

    const rows = responses.map((r, i) => {
        const byId = new Map((r.answers || []).map((a) => [String(a.questionId), a]));
        const contact = [r.user?.email, r.user?.phone].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>';
        const answers = columns.map((c) => {
            const a = byId.get(c.id);
            return a
                ? `<td>${esc(formatAnswerValue(a.value, a.questionType || c.type))}</td>`
                : '<td class="muted">—</td>';
        }).join('');
        return `<tr>
          <td class="num">${i + 1}</td>
          <td class="who">${esc(r.user?.username || 'Utilisateur supprimé')}</td>
          <td class="contact">${contact}</td>
          <td class="date">${esc(formatDateTime(r.submittedAt))}</td>
          ${answers}
        </tr>`;
    }).join('');

    const filtered = total != null && total !== responses.length
        ? ` <span class="muted">(sur ${total}, filtre de recherche appliqué)</span>` : '';

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(questionnaireTitle)} — ${esc(eventTitle || '')}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 14mm 12mm 18mm;
          @bottom-left { content: "${footerNote.replace(/"/g, '\\"')}"; font: 8pt Arial, sans-serif; color: #64748b; }
          @bottom-right { content: "Page " counter(page) " / " counter(pages); font: 8pt Arial, sans-serif; color: #64748b; }
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; }
        body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; font-size: 9.5pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .brand { display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 3px solid #007d90; }
        .brand__name { font-size: 13pt; font-weight: 800; letter-spacing: .02em; color: #005a68; }
        .brand__name span { color: #7cb518; }
        .brand__tag { font-size: 8pt; text-transform: uppercase; letter-spacing: .12em; color: #64748b; }

        h1 { margin: 14px 0 2px; font-size: 17pt; color: #0f172a; }
        .lead { margin: 0 0 12px; color: #475569; font-size: 10pt; }

        .meta { display: flex; gap: 10px; margin-bottom: 14px; }
        .meta div { flex: 1; padding: 8px 10px; border: 1px solid #e2e8f0; border-left: 3px solid #007d90; border-radius: 4px; background: #f8fafc; }
        .meta dt { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
        .meta dd { margin: 2px 0 0; font-weight: 700; font-size: 10pt; }

        table { width: 100%; border-collapse: collapse; table-layout: auto; }
        thead { display: table-header-group; } /* en-tête répété sur chaque page */
        tr { page-break-inside: avoid; break-inside: avoid; }
        th { background: #005a68; color: #fff; font-weight: 700; font-size: 8.5pt; text-align: left; vertical-align: bottom; padding: 7px 8px; border: 1px solid #004a56; }
        /* Retour à la ligne entre les mots ; seules les chaînes très longues (e-mails…) sont coupées */
        td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; white-space: pre-wrap; word-break: normal; overflow-wrap: break-word; }
        tbody tr:nth-child(even) td { background: #f1f7f8; }
        .num { width: 34px; text-align: center; color: #64748b; white-space: nowrap; }
        .who { font-weight: 700; white-space: nowrap; }
        .contact { font-size: 8.5pt; color: #334155; }
        .date { white-space: nowrap; font-size: 8.5pt; }
        .muted { color: #94a3b8; }
        .note { margin-top: 10px; font-size: 8pt; color: #64748b; }
      </style></head><body>
      <div class="brand">
        <div class="brand__name">Mahdia Blue <span>&amp;</span> Green</div>
        <div class="brand__tag">Rapport des réponses</div>
      </div>
      <h1>${esc(questionnaireTitle)}</h1>
      <p class="lead">Réponses des participants inscrits à l’événement.</p>
      <dl class="meta">
        <div><dt>Événement</dt><dd>${esc(eventTitle || '—')}</dd></div>
        <div><dt>Réponses</dt><dd>${responses.length}${filtered}</dd></div>
        <div><dt>Questions</dt><dd>${columns.length}</dd></div>
        <div><dt>Généré le</dt><dd>${esc(generatedAt)}</dd></div>
      </dl>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">Document confidentiel — réponses consultables uniquement par l’organisateur de l’événement et les administrateurs autorisés.</p>
    </body></html>`;
}

/** Ouvre la fenêtre d'impression du navigateur (destination « Enregistrer au format PDF »). */
export function printResponsesPdf(options) {
    const html = buildResponsesPdfHtml(options);

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => setTimeout(() => iframe.remove(), 1000);
    iframe.contentWindow.onafterprint = cleanup;
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(cleanup, 60_000); // filet de sécurité si onafterprint n'est pas déclenché
    }, 250);
}
