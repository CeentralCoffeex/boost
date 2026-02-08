'use client'

import { forwardRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CardProps } from '@/types'

const cardVariants = {
  default: {
    base: 'bg-white/5 border border-white/10',
    hover: 'hover:bg-white/10 hover:border-white/20',
  },
  glass: {
    base: 'glass border border-white/20',
    hover: 'hover:bg-white/10',
  },
  gradient: {
    base: 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20',
    hover: 'hover:from-white/15 hover:to-white/10',
  },
}

const paddingVariants = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    padding = 'md',
    children,
    className,
    ...props
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          // Base styles
          'rounded-glass backdrop-blur-glass transition-all duration-300',
          'shadow-glass',
          
          // Variant styles
          cardVariants[variant].base,
          cardVariants[variant].hover,
          
          // Padding
          paddingVariants[padding],
          
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

// Card avec header
interface CardWithHeaderProps extends Omit<CardProps, 'children'> {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function CardWithHeader({
  title,
  description,
  action,
  children,
  ...props
}: CardWithHeaderProps) {
  return (
    <Card {...props}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-white/70">{description}</p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
      {children}
    </Card>
  )
}

// Card interactive (cliquable)
interface InteractiveCardProps extends CardProps {
  onClick?: (() => void) | undefined
  href?: string | undefined
  disabled?: boolean
}

export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({
    onClick,
    href,
    disabled = false,
    children,
    className,
    ...props
  }, ref) => {
    const Component = href ? 'a' : 'div'
    const isClickable = !disabled && (onClick || href)
    
    return (
      <motion.div
        ref={ref}
        whileHover={isClickable ? { scale: 1.02, y: -2 } : {}}
        whileTap={isClickable ? { scale: 0.98 } : {}}
        className={cn(
          'group cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <Card
          className={cn(
            isClickable && [
              'transition-all duration-300',
              'hover:shadow-glass-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
            ]
          )}
          onClick={!disabled ? onClick : undefined}
          {...(href && { as: Component, href })}
          {...props}
        >
          {children}
        </Card>
      </motion.div>
    )
  }
)

InteractiveCard.displayName = 'InteractiveCard'

// Card de projet/portfolio
interface ProjectCardProps {
  title: string
  description: string
  image?: string
  tags?: string[]
  href?: string
  onClick?: () => void
  className?: string
}

export function ProjectCard({
  title,
  description,
  image,
  tags = [],
  href,
  onClick,
  className,
}: ProjectCardProps) {
  return (
    <InteractiveCard
      href={href}
      onClick={onClick}
      className={cn('overflow-hidden', className)}
    >
      {/* Image */}
      {image && (
        <div className="relative mb-4 aspect-video overflow-hidden rounded-lg">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}
      
      {/* Contenu */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white group-hover:text-secondary-400 transition-colors duration-300">
          {title}
        </h3>
        
        <p className="text-sm text-white/70 leading-relaxed">
          {description}
        </p>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="rounded-full bg-secondary-500/20 px-2 py-1 text-xs text-secondary-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </InteractiveCard>
  )
}

// Card de service
interface ServiceCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features?: string[]
  gradient?: string
  href?: string
  onClick?: () => void
  className?: string
}

export function ServiceCard({
  title,
  description,
  icon: Icon,
  features = [],
  gradient = 'from-secondary-600 to-secondary-500',
  href,
  onClick,
  className,
}: ServiceCardProps) {
  return (
    <InteractiveCard
      href={href}
      onClick={onClick}
      className={className}
    >
      {/* Header avec icône */}
      <div className="mb-4 flex items-center space-x-3">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br',
          gradient
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white group-hover:text-secondary-400 transition-colors duration-300">
          {title}
        </h3>
      </div>
      
      {/* Description */}
      <p className="mb-4 text-white/70 leading-relaxed">
        {description}
      </p>
      
      {/* Features */}
      {features.length > 0 && (
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center space-x-2 text-sm text-white/80">
              <div className="h-1.5 w-1.5 rounded-full bg-secondary-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </InteractiveCard>
  )
}

// Card de statistique
interface StatCardProps {
  label: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('text-center', className)}>
      {Icon && (
        <div className="mb-3 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-500/20">
            <Icon className="h-5 w-5 text-secondary-400" />
          </div>
        </div>
      )}
      
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-white/70">{label}</div>
      
      {change && (
        <div className={cn(
          'mt-2 text-xs',
          change.type === 'increase' ? 'text-green-400' : 'text-red-400'
        )}>
          {change.type === 'increase' ? '+' : '-'}{Math.abs(change.value)}%
        </div>
      )}
    </Card>
  )
}

// Grid de cards
interface CardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: CardGridProps) {
  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}