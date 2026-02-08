'use client'

import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ButtonProps } from '@/types'

const buttonVariants = {
  primary: {
    base: 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white shadow-button hover:from-secondary-500 hover:to-secondary-400 hover:shadow-hover focus-visible:ring-secondary-500',
    disabled: 'bg-gray-600 text-gray-400 cursor-not-allowed',
  },
  secondary: {
    base: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 focus-visible:ring-white/50',
    disabled: 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed',
  },
  ghost: {
    base: 'text-white hover:bg-white/10 focus-visible:ring-white/50',
    disabled: 'text-gray-500 cursor-not-allowed',
  },
  glass: {
    base: 'glass text-white border border-white/20 hover:bg-white/10 focus-visible:ring-secondary-500',
    disabled: 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed',
  },
}

const sizeVariants = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    children,
    className,
    onClick,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading
    
    return (
      <motion.button
        ref={ref}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center rounded-button font-semibold transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          'overflow-hidden group',
          
          // Variant styles
          isDisabled
            ? buttonVariants[variant].disabled
            : buttonVariants[variant].base,
          
          // Size styles
          sizeVariants[size],
          
          className
        )}
        disabled={isDisabled}
        onClick={onClick}
        {...props}
      >
        {/* Effet de brillance */}
        {!isDisabled && variant === 'primary' && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        )}
        
        {/* Contenu */}
        <span className="relative z-10 flex items-center space-x-2">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{children}</span>
        </span>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

// Bouton avec icône
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: React.ComponentType<{ className?: string }>
  label?: string
  iconPosition?: 'left' | 'right'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({
    icon: Icon,
    label,
    iconPosition = 'left',
    ...props
  }, ref) => {
    return (
      <Button ref={ref} {...props}>
        {iconPosition === 'left' && <Icon className="h-4 w-4" />}
        {label && <span>{label}</span>}
        {iconPosition === 'right' && <Icon className="h-4 w-4" />}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// Bouton flottant (FAB)
interface FloatingButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  icon: React.ComponentType<{ className?: string }>
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const positionClasses = {
  'bottom-right': 'fixed bottom-6 right-6',
  'bottom-left': 'fixed bottom-6 left-6',
  'top-right': 'fixed top-6 right-6',
  'top-left': 'fixed top-6 left-6',
}

export const FloatingButton = forwardRef<HTMLButtonElement, FloatingButtonProps>(
  ({
    icon: Icon,
    position = 'bottom-right',
    className,
    ...props
  }, ref) => {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className={cn(positionClasses[position], 'z-50')}
      >
        <Button
          ref={ref}
          variant="primary"
          className={cn(
            'h-14 w-14 rounded-full p-0 shadow-float hover:shadow-float-hover',
            className
          )}
          {...props}
        >
          <Icon className="h-6 w-6" />
        </Button>
      </motion.div>
    )
  }
)

FloatingButton.displayName = 'FloatingButton'

// Groupe de boutons
interface ButtonGroupProps {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  className,
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        '[&>button]:rounded-none',
        '[&>button:first-child]:rounded-l-button',
        '[&>button:last-child]:rounded-r-button',
        orientation === 'vertical' && [
          '[&>button:first-child]:rounded-t-button [&>button:first-child]:rounded-l-none',
          '[&>button:last-child]:rounded-b-button [&>button:last-child]:rounded-r-none',
        ],
        className
      )}
    >
      {children}
    </div>
  )
}

// Bouton de copie
interface CopyButtonProps extends Omit<ButtonProps, 'children'> {
  text: string
  successMessage?: string
}

export function CopyButton({
  text,
  successMessage = 'Copié !',
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erreur lors de la copie:', error)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      {...props}
    >
      {copied ? successMessage : 'Copier'}
    </Button>
  )
}