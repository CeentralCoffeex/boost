import { NextRequest } from 'next/server'

/**
 * Valide si une chaîne est une adresse IP valide (IPv4 ou IPv6)
 */
export function isValidIP(ip: string): boolean {
  // Validation IPv4
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // Validation IPv6 (simplifiée)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Valide si une chaîne est une notation CIDR valide
 */
export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split('/')
  if (parts.length !== 2) return false
  
  const [ip, prefix] = parts
  if (!ip || !prefix) return false
  const prefixNum = parseInt(prefix, 10)
  
  // Vérifier l'IP
  if (!isValidIP(ip)) return false
  
  // Vérifier le préfixe
  if (isNaN(prefixNum)) return false
  
  // IPv4: préfixe entre 0 et 32
  if (ip.includes('.')) {
    return prefixNum >= 0 && prefixNum <= 32
  }
  
  // IPv6: préfixe entre 0 et 128
  if (ip.includes(':')) {
    return prefixNum >= 0 && prefixNum <= 128
  }
  
  return false
}

/**
 * Convertit une adresse IP en nombre (IPv4 uniquement)
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

/**
 * Vérifie si une IP est dans une plage CIDR (IPv4 uniquement)
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  if (!isValidIP(ip) || !isValidCIDR(cidr)) return false
  
  // Pour l'instant, on ne gère que IPv4
  if (!ip.includes('.') || !cidr.includes('.')) return false
  
  const [networkIP, prefixStr] = cidr.split('/')
  if (!networkIP || !prefixStr) return false
  const prefix = parseInt(prefixStr, 10)
  
  const ipNum = ipToNumber(ip)
  const networkNum = ipToNumber(networkIP)
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  
  return (ipNum & mask) === (networkNum & mask)
}

/**
 * Vérifie si une IP correspond à une règle (IP exacte ou CIDR)
 */
export function matchesIPRule(clientIP: string, ruleIP: string): boolean {
  // Correspondance exacte
  if (clientIP === ruleIP) return true
  
  // Vérifier si c'est une règle CIDR
  if (ruleIP.includes('/')) {
    return isIPInCIDR(clientIP, ruleIP)
  }
  
  return false
}

/**
 * Extrait l'adresse IP du client à partir de la requête
 */
export function getClientIP(request: NextRequest): string {
  // Vérifier les en-têtes de proxy dans l'ordre de priorité
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Prendre la première IP de la liste (IP originale du client)
    const firstIP = forwardedFor.split(',')[0]?.trim()
    if (firstIP && isValidIP(firstIP)) return firstIP
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP && isValidIP(realIP.trim())) {
    return realIP.trim()
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP && isValidIP(cfConnectingIP.trim())) {
    return cfConnectingIP.trim()
  }
  
  // Vérifier si request.ip existe (certains environnements l'exposent)
  const requestIP = (request as any).ip
  if (requestIP && typeof requestIP === 'string' && isValidIP(requestIP)) {
    return requestIP
  }
  
  // Vérifier les en-têtes additionnels
  const xClientIP = request.headers.get('x-client-ip')
  if (xClientIP && isValidIP(xClientIP.trim())) {
    return xClientIP.trim()
  }
  
  const xForwarded = request.headers.get('x-forwarded')
  if (xForwarded && isValidIP(xForwarded.trim())) {
    return xForwarded.trim()
  }
  
  // Fallback vers une IP par défaut si aucune IP valide n'est trouvée
  return '127.0.0.1'
}

/**
 * Normalise une adresse IP (supprime les espaces, convertit en minuscules)
 */
export function normalizeIP(ip: string): string {
  return ip.trim().toLowerCase()
}

/**
 * Vérifie si une IP est une adresse privée/locale
 */
export function isPrivateIP(ip: string): boolean {
  if (!isValidIP(ip) || !ip.includes('.')) return false
  
  const parts = ip.split('.').map(part => parseInt(part, 10))
  const [a, b, c, d] = parts
  
  if (a === undefined || b === undefined || c === undefined || d === undefined) return false
  
  // 10.0.0.0/8 - Réseau privé classe A
  if (a === 10) return true
  
  // 172.16.0.0/12 - Réseau privé classe B
  if (a === 172 && b >= 16 && b <= 31) return true
  
  // 192.168.0.0/16 - Réseau privé classe C
  if (a === 192 && b === 168) return true
  
  // 127.0.0.0/8 - Localhost/loopback
  if (a === 127) return true
  
  // 169.254.0.0/16 - Link-local (APIPA)
  if (a === 169 && b === 254) return true
  
  // 0.0.0.0/8 - Réseau "this network"
  if (a === 0) return true
  
  // 224.0.0.0/4 - Multicast classe D
  if (a >= 224 && a <= 239) return true
  
  // 240.0.0.0/4 - Réservé classe E
  if (a >= 240) return true
  
  return false
}

/**
 * Génère une liste d'IPs à partir d'une plage CIDR (pour les petites plages uniquement)
 */
export function expandCIDR(cidr: string, maxIPs: number = 256): string[] {
  if (!isValidCIDR(cidr) || !cidr.includes('.')) return []
  
  const [networkIP, prefixStr] = cidr.split('/')
  if (!networkIP || !prefixStr) return []
  
  const prefix = parseInt(prefixStr, 10)
  if (isNaN(prefix)) return []
  
  // Limiter aux plages raisonnables
  if (prefix < 24) return [] // Trop d'IPs
  
  const networkNum = ipToNumber(networkIP)
  const hostBits = 32 - prefix
  const numHosts = Math.pow(2, hostBits)
  
  if (numHosts > maxIPs) return []
  
  const ips: string[] = []
  for (let i = 0; i < numHosts; i++) {
    const ipNum = networkNum + i
    const ip = [
      (ipNum >>> 24) & 255,
      (ipNum >>> 16) & 255,
      (ipNum >>> 8) & 255,
      ipNum & 255
    ].join('.')
    ips.push(ip)
  }
  
  return ips
}

/**
 * Formate une adresse IP pour l'affichage
 */
export function formatIPForDisplay(ip: string): string {
  if (ip === 'unknown') return 'IP inconnue'
  if (isPrivateIP(ip)) return `${ip} (privée)`
  return ip
}

/**
 * Valide et nettoie une liste d'IPs
 */
export function validateAndCleanIPs(ips: string[]): { valid: string[], invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []
  
  for (const ip of ips) {
    const cleanIP = normalizeIP(ip)
    if (isValidIP(cleanIP) || isValidCIDR(cleanIP)) {
      valid.push(cleanIP)
    } else {
      invalid.push(ip)
    }
  }
  
  return { valid, invalid }
}