/** Toast fixe en haut à droite (feedback admin). */
export default function AdminToast({ show, message, type = 'success' }) {
    if (!show) return null;
    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    padding: '1rem 1.5rem',
                    borderRadius: '12px',
                    background:
                        type === 'success'
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontWeight: '500',
                    fontSize: '0.95rem',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    animation: 'slideIn 0.3s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
            >
                {message}
            </div>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </>
    );
}
