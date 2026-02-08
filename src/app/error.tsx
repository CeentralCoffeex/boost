'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Montserrat', sans-serif",
        background: '#f5f5f5',
        color: '#333',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
        Une erreur est survenue
      </h1>
      <p style={{ fontSize: '0.95rem', marginBottom: '24px', textAlign: 'center', maxWidth: 400 }}>
        L&apos;application a rencontré un problème. Vous pouvez réessayer ou retourner à l&apos;accueil.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
        <Link
          href="/"
          style={{
            padding: '12px 24px',
            background: 'transparent',
            color: '#0a0a0a',
            border: '2px solid #0a0a0a',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
