'use client'

import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InputProps } from '@/types'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    type = 'text',
    placeholder,
    value,
    defaultValue,
    disabled = false,
    required = false,
    className,
    onChange,
    onBlur,
    onFocus,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value)
    }
    
    const handleFocus = (_: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.()
    }
    
    const handleBlur = (_: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.()
    }
    
    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            // Base styles
            'w-full rounded-glass border bg-white/5 px-4 py-3 text-white placeholder-white/50 backdrop-blur-glass transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-black',
            
            // Border states
            isFocused
              ? 'border-secondary-500 bg-white/10'
              : 'border-white/20 hover:border-white/30',
            
            // Disabled state
            disabled && 'cursor-not-allowed opacity-50',
            
            className
          )}
          {...props}
        />
        
        {/* Focus indicator */}
        {isFocused && (
          <motion.div
            layoutId="inputFocus"
            className="absolute inset-0 rounded-glass border-2 border-secondary-500 pointer-events-none"
            initial={false}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Input avec label
interface LabeledInputProps extends InputProps {
  label: string
  error?: string
  hint?: string
}

export function LabeledInput({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: LabeledInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      
      <Input
        required={required}
        className={cn(
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-white/60">{hint}</p>
      )}
    </div>
  )
}

// Input de mot de passe avec toggle de visibilité
interface PasswordInputProps extends Omit<InputProps, 'type'> {
  label?: string
  error?: string
  showStrength?: boolean
}

export function PasswordInput({
  label,
  error,
  showStrength = false,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  
  const getPasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (/[A-Z]/.test(pwd)) strength++
    if (/[a-z]/.test(pwd)) strength++
    if (/[0-9]/.test(pwd)) strength++
    if (/[^A-Za-z0-9]/.test(pwd)) strength++
    return strength
  }
  
  const strength = getPasswordStrength(password)
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white">
          {label}
          {props.required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}
      
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'pr-12',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          onChange={(value) => {
            setPassword(value)
            props.onChange?.(value)
          }}
          {...props}
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {showStrength && password && (
        <div className="space-y-2">
          <div className="flex space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  i < strength ? strengthColors[strength - 1] : 'bg-white/20'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-white/60">
            Force: {strengthLabels[strength - 1] || 'Aucune'}
          </p>
        </div>
      )}
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

// Input de recherche
interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void
  showClearButton?: boolean
}

export function SearchInput({
  placeholder = 'Rechercher...',
  onClear,
  showClearButton = true,
  className,
  ...props
}: SearchInputProps) {
  const [value, setValue] = useState('')
  
  const handleClear = () => {
    setValue('')
    onClear?.()
    props.onChange?.('')
  }
  
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
        <Search className="h-5 w-5" />
      </div>
      
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(val) => {
          setValue(val)
          props.onChange?.(val)
        }}
        className={cn('pl-10', showClearButton && value && 'pr-10', className)}
        {...props}
      />
      
      {showClearButton && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

// Textarea
interface TextareaProps {
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean | undefined
  rows?: number
  className?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    placeholder,
    value,
    defaultValue,
    disabled = false,
    required = false,
    rows = 4,
    className,
    onChange,
    onBlur,
    onFocus,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    }
    
    const handleFocus = () => {
      setIsFocused(true)
      onFocus?.()
    }
    
    const handleBlur = () => {
      setIsFocused(false)
      onBlur?.()
    }
    
    return (
      <div className="relative">
        <textarea
          ref={ref}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          rows={rows}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            // Base styles
            'w-full resize-none rounded-glass border bg-white/5 px-4 py-3 text-white placeholder-white/50 backdrop-blur-glass transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 focus:ring-offset-black',
            
            // Border states
            isFocused
              ? 'border-secondary-500 bg-white/10'
              : 'border-white/20 hover:border-white/30',
            
            // Disabled state
            disabled && 'cursor-not-allowed opacity-50',
            
            className
          )}
          {...props}
        />
        
        {/* Focus indicator */}
        {isFocused && (
          <motion.div
            layoutId="textareaFocus"
            className="absolute inset-0 rounded-glass border-2 border-secondary-500 pointer-events-none"
            initial={false}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Textarea avec label
interface LabeledTextareaProps extends TextareaProps {
  label: string
  error?: string
  hint?: string
  maxLength?: number
  showCount?: boolean
}

export function LabeledTextarea({
  label,
  error,
  hint,
  maxLength,
  showCount = false,
  required,
  className,
  ...props
}: LabeledTextareaProps) {
  const [value, setValue] = useState(props.value || props.defaultValue || '')
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-white">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
        
        {showCount && maxLength && (
          <span className="text-sm text-white/60">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      
      <Textarea
        required={required}
        className={cn(
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className
        )}
        onChange={(val) => {
          setValue(val)
          props.onChange?.(val)
        }}
        {...props}
      />
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-white/60">{hint}</p>
      )}
    </div>
  )
}