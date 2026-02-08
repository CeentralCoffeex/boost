'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Error:', error);
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
        Erreur admin
      </h1>
      <p style={{ fontSize: '0.95rem', marginBottom: '24px', textAlign: 'center', maxWidth: 400 }}>
        Ouvrez l&apos;administration depuis le bouton « Administration » dans la page Profil de la Mini App.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => {
            reset();
            window.location.href = '/admin';
          }}
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
          href="/profil"
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
          Profil
        </Link>
      </div>
    </div>
  );
}
