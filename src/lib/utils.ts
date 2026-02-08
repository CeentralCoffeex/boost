import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine les classes CSS avec clsx et tailwind-merge
 * @param inputs - Classes CSS à combiner
 * @returns String de classes CSS optimisées
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debounce une fonction
 * @param func - Fonction à debouncer
 * @param wait - Délai d'attente en ms
 * @param immediate - Exécuter immédiatement
 * @returns Fonction debouncée
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }
}



/**
 * Vérifie si un élément est visible dans le viewport
 * @param element - Élément à vérifier
 * @param threshold - Seuil de visibilité (0-1)
 * @returns True si visible
 */
export function isElementVisible(
  element: HTMLElement
): boolean {
  const rect = element.getBoundingClientRect()
  const windowHeight = window.innerHeight || document.documentElement.clientHeight
  const windowWidth = window.innerWidth || document.documentElement.clientWidth
  
  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0
  
  return vertInView && horInView
}



/**
 * Clamp une valeur entre min et max
 * @param value - Valeur à clamper
 * @param min - Valeur minimale
 * @param max - Valeur maximale
 * @returns Valeur clampée
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Génère un ID unique
 * @param prefix - Préfixe optionnel
 * @returns ID unique
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}${randomStr}`
}

/**
 * Formate un nombre avec des séparateurs de milliers
 * @param num - Nombre à formater
 * @param locale - Locale à utiliser
 * @returns Nombre formaté
 */
export function formatNumber(num: number, locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Convertit une couleur hex en rgba
 * @param hex - Couleur hexadécimale
 * @param alpha - Valeur alpha (0-1)
 * @returns Couleur rgba
 */
export function hexToRgba(hex: string, alpha = 1): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}



/**
 * Vérifie si on est côté client
 * @returns True si côté client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Vérifie si l'appareil est mobile
 * @returns True si mobile
 */
export function isMobile(): boolean {
  if (!isClient()) return false
  
  return window.innerWidth <= 768
}

/**
 * Scroll fluide vers un élément
 * @param elementId - ID de l'élément
 * @param offset - Offset optionnel
 */
export function scrollToElement(elementId: string, offset = 0): void {
  if (!isClient()) return
  
  const element = document.getElementById(elementId)
  if (!element) return
  
  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
  const offsetPosition = elementPosition - offset
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  })
}

/**
 * Copie du texte dans le presse-papiers
 * @param text - Texte à copier
 * @returns Promise<boolean> - Succès de l'opération
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient()) return false
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}