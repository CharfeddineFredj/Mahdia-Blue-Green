/**
 * Remplacé par Vite si un import fantôme vers html2canvas subsiste (ancien cache).
 * html-to-image n'utilise pas html2canvas.
 */
export default function stubHtml2canvas() {
    throw new Error(
        '[Export PNG] Ancien module html2canvas détecté. Fermez le serveur, exécutez « npm run dev:fresh », puis rechargez la page sans cache (Ctrl+Shift+R).'
    );
}
