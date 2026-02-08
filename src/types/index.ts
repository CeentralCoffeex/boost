// Common types for the application

export interface BaseEntity {
  id: string
  createdAt?: Date
  updatedAt?: Date
}



// Types pour les slides/news
export interface Slide {
  id: string
  title: string
  description: string
  imageUrl?: string
  isActive: boolean
  order: number
  createdAt?: string
  updatedAt?: string
}

// Types pour les services
export interface Service {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  color: string
  gradient: string
  features: string[]
  isActive: boolean
}

// Types pour les projets du portfolio
export interface Project {
  id: string
  title: string
  description: string
  imageUrl: string
  category: string
  technologies: string[]
  url?: string
  githubUrl?: string
  isActive: boolean
  createdAt: string
}

// Types pour les cartes de projet (page d'accueil)
export interface ProjectCard {
  id: string
  title: string
  description: string
  icon: string
  href: string
  gradient: string
  className?: string
}



// Types pour les effets et animations
export interface ParticleConfig {
  count: number
  speed: number
  size: { min: number; max: number }
  color: string
  opacity: number
  connections: boolean
}

// Types pour les composants UI
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export interface CardProps {
  variant?: 'default' | 'glass' | 'gradient'
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string | undefined
  onClick?: (() => void) | undefined
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean | undefined
  className?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
}







// Export de tous les types
export type * from './index'