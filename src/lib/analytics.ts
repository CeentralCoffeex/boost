// Utilitaire pour collecter et envoyer les données analytics

interface AnalyticsData {
  page: string
  event: string
  data?: any
  sessionId?: string
  
  // Données QR Code spécifiques
  qrCodeId?: string
  qrCodeData?: string
  qrCodeSize?: string
  qrCodeFormat?: string
  
  // Géolocalisation GPS (optionnelle)
  gpsLat?: number
  gpsLng?: number
  
  // Données comportementales
  timeOnPage?: number
  scrollDepth?: number
  clickCount?: number
}

// Fonction pour détecter les caractéristiques de l'appareil
function getDeviceInfo() {
  if (typeof window === 'undefined') return {}
  
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenDensity: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth || 24,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    cameraSupport: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
}

// Fonction pour obtenir la géolocalisation via IP (sans demande d'autorisation)
function getCurrentPosition(): Promise<{ lat: number, lng: number } | null> {
  return new Promise(async (resolve) => {
    try {
      // Utiliser un service de géolocalisation IP gratuit
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.latitude && data.longitude) {
          resolve({
            lat: parseFloat(data.latitude),
            lng: parseFloat(data.longitude)
          })
          return
        }
      }
    } catch (error) {
      console.debug('Géolocalisation IP échouée:', error)
    }
    
    // Fallback: essayer un autre service
    try {
      const response = await fetch('http://ip-api.com/json/?fields=lat,lon', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.lat && data.lon) {
          resolve({
            lat: data.lat,
            lng: data.lon
          })
          return
        }
      }
    } catch (error) {
      console.debug('Géolocalisation IP fallback échouée:', error)
    }
    
    resolve(null)
  })
}

// Génération d'un ID de session persistant
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('analytics_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('analytics_session_id', sessionId)
  }
  return sessionId
}

// Fonction principale pour envoyer les données analytics
export async function trackEvent(data: AnalyticsData) {
  try {
    // Collecte des informations de l'appareil
    const deviceInfo = getDeviceInfo()
    
    // Tentative de géolocalisation GPS (silencieuse)
    const gpsPosition = await getCurrentPosition()
    
    // Préparation des données complètes
    const analyticsPayload = {
      ...data,
      sessionId: data.sessionId || getSessionId(),
      ...deviceInfo,
      ...(gpsPosition && {
        gpsLat: gpsPosition.lat,
        gpsLng: gpsPosition.lng
      }),
      timestamp: new Date().toISOString()
    }
    
    // Envoi vers l'API (en arrière-plan, sans bloquer l'UI)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsPayload)
    }).catch(error => {
      // Échec silencieux pour ne pas perturber l'expérience utilisateur
      console.debug('Analytics tracking failed:', error)
    })
    
  } catch (error) {
    // Échec silencieux
    console.debug('Analytics error:', error)
  }
}

// Fonctions spécialisées pour les événements QR Code
export function trackQRDownload(qrData: string, format: string, size: string) {
  trackEvent({
    page: '/qrcode',
    event: 'qr_download',
    qrCodeData: qrData,
    qrCodeFormat: format,
    qrCodeSize: size,
    data: {
      action: 'download',
      format,
      size
    }
  })
}

export function trackQRScan(qrData: string) {
  trackEvent({
    page: '/qrcode',
    event: 'qr_scan',
    qrCodeData: qrData,
    data: {
      action: 'scan',
      method: 'camera'
    }
  })
}

export function trackQRFileOpen(qrData: string, fileType: string) {
  trackEvent({
    page: '/qrcode',
    event: 'qr_file_open',
    qrCodeData: qrData,
    data: {
      action: 'file_open',
      fileType
    }
  })
}

// Tracking automatique du temps passé sur la page
let pageStartTime = 0
let scrollDepth = 0
let clickCount = 0

if (typeof window !== 'undefined') {
  pageStartTime = Date.now()
  
  // Tracking du scroll
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    )
    scrollDepth = Math.max(scrollDepth, scrollPercent || 0)
  })
  
  // Tracking des clics
  document.addEventListener('click', () => {
    clickCount++
  })
  
  // Envoi des données comportementales à la fermeture de la page
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000)
    
    // Utilisation de sendBeacon pour un envoi fiable
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        page: window.location.pathname,
        event: 'page_exit',
        timeOnPage,
        scrollDepth,
        clickCount,
        sessionId: getSessionId()
      })
      
      navigator.sendBeacon('/api/analytics/track', data)
    }
  })
}

export { getSessionId, getDeviceInfo, getCurrentPosition }