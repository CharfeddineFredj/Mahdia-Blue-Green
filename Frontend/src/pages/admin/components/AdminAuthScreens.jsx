export function AdminCheckingAuth() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                gap: '1rem',
            }}
        >
            <p>Vérification de l&apos;authentification...</p>
            <div className="spinner" />
        </div>
    );
}

export function AdminUnauthenticated() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                gap: '1rem',
            }}
        >
            <p>Redirection vers la page de connexion...</p>
        </div>
    );
}
