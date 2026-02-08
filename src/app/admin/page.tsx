'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getInitData } from '@/lib/telegram-client'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [adminVerified, setAdminVerified] = useState<boolean | null>(null)
  const [initDataToPass, setInitDataToPass] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    const doVerify = (initData?: string) => {
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' }
      if (initData) headers['Authorization'] = `tma ${initData}`
      fetch('/api/admin/verify', {
        credentials: 'include',
        cache: 'no-store',
        headers,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.allowed) {
            router.push('/unauthorized')
          } else {
            if (initData) {
              try {
                sessionStorage.setItem('tgInitData', initData)
                localStorage.setItem('tgInitData', initData)
              } catch {}
              setInitDataToPass(initData)
            }
            setAdminVerified(true)
          }
        })
        .catch(() => router.push('/unauthorized'))
    }

    const initData = getInitData()
    if (initData) {
      doVerify(initData)
      return
    }
    if (session) {
      doVerify()
      return
    }
    router.push('/unauthorized')
  }, [session, status, router])

  if (status === 'loading' || adminVerified !== true) {
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

  // Admin vérifié : afficher le panneau (initData ou session)
  const hash = typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/';
  const iframeUrl = adminVerified
    ? `/administration/index.html${hash === '#' ? '#/' : hash}`
    : '/administration/index.html#/authentication/login';

  const handleIframeLoad = useCallback(() => {
    const data = initDataToPass || sessionStorage.getItem('tgInitData') || localStorage.getItem('tgInitData')
    if (data) {
      const iframe = document.querySelector('iframe[title="Administration Panel"]') as HTMLIFrameElement
      iframe?.contentWindow?.postMessage({ type: 'TG_INIT_DATA', initData: data }, '*')
    }
  }, [initDataToPass])

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
        onLoad={handleIframeLoad}
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
