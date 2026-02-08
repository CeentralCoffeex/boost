'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{
        margin: 0,
        padding: '24px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#f5f5f5',
        color: '#333',
      }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Erreur de l&apos;application</h1>
        <p style={{ marginBottom: '24px', textAlign: 'center', maxWidth: 400 }}>
          Une erreur s&apos;est produite. Réessayez ou ouvrez l&apos;application depuis Telegram.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            background: '#0a0a0a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
