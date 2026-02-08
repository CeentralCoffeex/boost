import { z } from 'zod'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Configuration DOMPurify pour le serveur
const window = new JSDOM('').window
const purify = DOMPurify(window as any)

// Configuration sécurisée de DOMPurify
purify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror']
})

// Fonction de sanitisation
export function sanitizeHtml(dirty: string): string {
  return purify.sanitize(dirty)
}

// Fonction de sanitisation pour texte brut
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return entities[match] || match
    })
    .trim()
}

// Schémas de validation Zod

// Validation utilisateur
export const userSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100).optional(),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial')
    .optional(),
  phone: z.string().regex(/^[+]?[0-9\s\-\(\)]{10,}$/, 'Numéro de téléphone invalide').optional(),
  bio: z.string().max(500, 'La bio ne peut pas dépasser 500 caractères').optional(),
  website: z.string().url('URL invalide').optional(),
  location: z.string().max(100, 'La localisation ne peut pas dépasser 100 caractères').optional()
})

// Validation projet
export const projectSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(200),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(5000),
  shortDescription: z.string().max(300, 'La description courte ne peut pas dépasser 300 caractères').optional(),
  content: z.string().max(50000, 'Le contenu ne peut pas dépasser 50000 caractères').optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  category: z.string().min(2, 'La catégorie doit contenir au moins 2 caractères').max(50),
  tags: z.array(z.string().max(30)).max(10, 'Maximum 10 tags'),
  technologies: z.array(z.string().max(30)).max(20, 'Maximum 20 technologies'),
  projectUrl: z.string().url('URL invalide').optional(),
  githubUrl: z.string().url('URL GitHub invalide').optional(),
  demoUrl: z.string().url('URL de démo invalide').optional(),
  clientName: z.string().max(100).optional(),
  clientWebsite: z.string().url('URL client invalide').optional(),
  price: z.number().min(0, 'Le prix doit être positif').optional(),
  budget: z.number().min(0, 'Le budget doit être positif').optional(),
  teamSize: z.number().int().min(1, 'La taille de l\'équipe doit être au moins 1').optional(),
  duration: z.string().max(50).optional(),
  myRole: z.string().max(200).optional(),
  challenges: z.string().max(2000).optional(),
  solutions: z.string().max(2000).optional(),
  results: z.string().max(2000).optional(),
  testimonial: z.string().max(1000).optional()
})

// Validation message de contact
export const contactMessageSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().email('Email invalide').max(255),
  phone: z.string().regex(/^[+]?[0-9\s\-\(\)]{10,}$/, 'Numéro de téléphone invalide').optional(),
  company: z.string().max(100, 'Le nom de l\'entreprise ne peut pas dépasser 100 caractères').optional(),
  subject: z.string().min(5, 'Le sujet doit contenir au moins 5 caractères').max(200),
  message: z.string().min(10, 'Le message doit contenir au moins 10 caractères').max(5000)
})

// Validation commentaire
export const commentSchema = z.object({
  content: z.string().min(3, 'Le commentaire doit contenir au moins 3 caractères').max(1000),
  projectId: z.string().cuid('ID de projet invalide'),
  parentId: z.string().cuid('ID de commentaire parent invalide').optional()
})

// Validation service
export const serviceSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères').max(200),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(5000),
  shortDescription: z.string().max(300).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  category: z.string().min(2).max(50),
  price: z.number().min(0, 'Le prix doit être positif'),
  currency: z.string().length(3, 'Le code de devise doit contenir 3 caractères'),
  duration: z.string().max(50).optional(),
  features: z.array(z.string().max(200)).max(20, 'Maximum 20 fonctionnalités'),
  deliverables: z.array(z.string().max(200)).max(20, 'Maximum 20 livrables'),
  requirements: z.array(z.string().max(200)).max(20, 'Maximum 20 prérequis'),
  tags: z.array(z.string().max(30)).max(10, 'Maximum 10 tags')
})

// Validation paramètres
export const settingsSchema = z.object({
  key: z.string().min(1, 'La clé ne peut pas être vide').max(100),
  value: z.string().max(10000, 'La valeur ne peut pas dépasser 10000 caractères'),
  type: z.enum(['string', 'number', 'boolean', 'json']),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional()
})

// Validation catégorie (création / mise à jour)
const subcategorySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100).trim(),
})
export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200).trim(),
  subtitle: z.string().min(1, 'Sous-titre requis').max(500).trim(),
  icon: z.string().max(500).optional().nullable(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hex invalide').default('#000000'),
  url: z.string().max(200).optional(),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.union([z.boolean(), z.string()]).transform((v) => v === true || v === 'true').default(true),
  parentId: z.preprocess((v) => (v === '' || v === undefined ? null : v), z.string().cuid().nullable().optional()),
  subcategories: z.array(subcategorySchema).max(50).optional(),
})
export const categoryUpdateSchema = categoryCreateSchema.partial().extend({
  name: z.string().min(1).max(200).trim().optional(),
  subtitle: z.string().min(1).max(500).trim().optional(),
})

// Validation produit
const productVariantSchema = z.object({
  name: z.string().min(1, 'Nom variante requis').max(100),
  type: z.enum(['weight', 'flavor']).default('weight'),
  unit: z.enum(['gramme', 'ml']).optional().nullable(),
  price: z.string().min(1, 'Prix requis').max(50),
  power: z.string().max(50).optional().nullable(),
  capacity: z.string().max(50).optional().nullable(),
  resistance: z.string().max(50).optional().nullable(),
})
export const productUpdateSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200).trim(),
  description: z.string().min(1, 'Description requise').max(5000).trim(),
  basePrice: z.string().max(50).optional().nullable(),
  tag: z.string().max(100).optional().nullable(),
  image: z.string().max(1000).optional().nullable(),
  videoUrl: z.string().max(1000).optional().nullable(),
  section: z.enum(['PHARE', 'DECOUVRIR', 'CATEGORIE']).default('DECOUVRIR'),
  categoryId: z.string().cuid().optional().nullable(),
  featuredInRecent: z.boolean().optional(),
  featuredInTrending: z.boolean().optional(),
  variants: z.array(productVariantSchema).max(50).optional(),
})
export const productCreateSchema = productUpdateSchema

// PATCH produit : mise à jour partielle
export const productPatchSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(5000).trim().optional(),
  basePrice: z.string().max(50).optional().nullable(),
  tag: z.string().max(100).optional().nullable(),
  image: z.string().max(1000).optional().nullable(),
  videoUrl: z.string().max(1000).optional().nullable(),
  section: z.enum(['PHARE', 'DECOUVRIR', 'CATEGORIE']).optional(),
  categoryId: z.string().cuid().optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Au moins un champ requis' })

/** Formate les erreurs Zod pour une réponse API */
export function formatZodErrors(errors: z.ZodError): string[] {
  return errors.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

// Validation settings (mise à jour partielle)
export const settingsUpdateSchema = z.object({
  heroTitle: z.string().max(200).optional(),
  heroSubtitle1: z.string().max(200).optional(),
  heroSubtitle2: z.string().max(200).optional(),
  heroSubtitle3: z.string().max(200).optional(),
  heroTagline: z.string().max(500).optional(),
  heroImage: z.string().max(1000).optional(),
  heroSeparatorColor: z.string().max(20).optional(),
  facebookUrl: z.string().max(500).optional(),
  twitterUrl: z.string().max(500).optional(),
  instagramUrl: z.string().max(500).optional(),
  theme: z.enum(['blanc', 'blue-white', 'noir', 'orange', 'violet', 'rouge', 'jaune']).optional(),
  profileBlock1Title: z.string().max(200).optional(),
  profileBlock1Content: z.string().max(5000).optional(),
  profileBlock2Title: z.string().max(200).optional(),
  profileBlock2Content: z.string().max(5000).optional(),
  featuredRecentIds: z.string().max(2000).optional().nullable(),
  featuredTrendingIds: z.string().max(2000).optional().nullable(),
})

// Validation slider
export const sliderCreateSchema = z.object({
  title: z.string().max(200).default(''),
  subtitle: z.string().max(200).default(''),
  image: z.string().min(1, 'Image requise').max(1000),
  order: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})
export const sliderUpdateSchema = sliderCreateSchema.partial()

// Validation Telegram admin
export const telegramAdminCreateSchema = z.object({
  telegramId: z.string().max(50).optional().nullable(),
  username: z.string().max(100).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
}).refine((d) => d.telegramId || d.username, { message: 'Au moins telegramId ou username requis' })
export const telegramAdminUpdateSchema = z.object({
  telegramId: z.string().max(50).optional().nullable(),
  username: z.string().max(100).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
})

// Validation bot link (appelé par le bot Python)
export const botLinkSchema = z.object({
  userId: z.string().cuid('userId invalide'),
  telegramId: z.union([z.string(), z.number()]).transform(String),
  telegramUsername: z.string().max(100).optional().nullable(),
  telegramFirstName: z.string().max(100).optional().nullable(),
  telegramPhoto: z.string().max(500).optional().nullable(),
})

// Validation refresh-profile (initData uniquement)
export const refreshProfileSchema = z.object({
  initData: z.string().min(1, 'initData requis'),
})

// Fonction de validation générique avec sanitisation
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  sanitizeFields?: string[]
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    // Sanitiser les champs spécifiés
    if (sanitizeFields && typeof data === 'object' && data !== null) {
      const sanitizedData = { ...data } as any
      for (const field of sanitizeFields) {
        if (typeof sanitizedData[field] === 'string') {
          sanitizedData[field] = sanitizeText(sanitizedData[field])
        }
      }
      data = sanitizedData
    }
    
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

// Fonction pour valider les IDs
export function validateId(id: string, fieldName = 'id'): boolean {
  const idSchema = z.string().cuid(`${fieldName} invalide`)
  try {
    idSchema.parse(id)
    return true
  } catch {
    return false
  }
}

// Fonction pour valider les emails
export function validateEmail(email: string): boolean {
  const emailSchema = z.string().email()
  try {
    emailSchema.parse(email)
    return true
  } catch {
    return false
  }
}

// Fonction pour valider les URLs
export function validateUrl(url: string): boolean {
  const urlSchema = z.string().url()
  try {
    urlSchema.parse(url)
    return true
  } catch {
    return false
  }
}

// Fonction pour nettoyer les données d'entrée
export function cleanInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeText(input)
  }
  
  if (Array.isArray(input)) {
    return input.map(cleanInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(input)) {
      cleaned[key] = cleanInput(value)
    }
    return cleaned
  }
  
  return input
}