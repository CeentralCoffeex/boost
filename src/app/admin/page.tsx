'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [adminVerified, setAdminVerified] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      setAdminVerified(false)
      return
    }

    // Vérifier via API : UNIQUEMENT telegramId dans config.json OU TelegramAdmin (le rôle ADMIN ne suffit pas)
    fetch('/api/admin/verify', {
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.allowed) {
          router.push('/unauthorized')
        } else {
          setAdminVerified(true)
        }
      })
      .catch(() => router.push('/unauthorized'))
  }, [session, status, router])

  if (status === 'loading' || (session && adminVerified !== true)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        Chargement...
      </div>
    )
  }

  // Si pas connecté, laisser afficher l'iframe login. Si connecté mais pas admin bot, on a déjà redirigé.
  if (session && adminVerified === false) {
    return null
  }

  // Déterminer l'URL de l'iframe : passer le hash (#/categories, #/profil, etc.) pour ouvrir la bonne section
  const hash = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';
  const iframeUrl = !session 
    ? '/administration/index.html#/authentication/login'
    : `/administration/index.html${hash === '#' ? '#/' : hash}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden'
    }}>
      <iframe 
        src={iframeUrl}
        style={{ 
          width: '100%', 
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0,
          display: 'block'
        }}
        title="Administration Panel"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation"
      />
    </div>
  )
}
