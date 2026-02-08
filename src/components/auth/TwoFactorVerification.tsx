'use client'

import { useState } from 'react'
import { Shield, RefreshCw, AlertCircle, Key } from 'lucide-react'

interface TwoFactorVerificationProps {
  onVerify: (code: string, isBackupCode?: boolean) => Promise<boolean>
  onCancel: () => void
  loading?: boolean
  error?: string
}

export default function TwoFactorVerification({ 
  onVerify, 
  onCancel, 
  loading = false, 
  error 
}: TwoFactorVerificationProps) {
  const [code, setCode] = useState<string>('')
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [localError, setLocalError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code.trim()) {
      setLocalError('Veuillez saisir un code')
      return
    }

    if (!useBackupCode && code.length !== 6) {
      setLocalError('Le code doit contenir 6 chiffres')
      return
    }

    if (useBackupCode && code.length !== 12) {
      setLocalError('Le code de récupération doit contenir 12 caractères')
      return
    }

    try {
      setIsVerifying(true)
      setLocalError('')
      
      const success = await onVerify(code, useBackupCode)
      
      if (!success) {
        setLocalError(useBackupCode ? 'Code de récupération invalide' : 'Code de vérification incorrect')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification 2FA:', error)
      setLocalError('Erreur lors de la vérification')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCodeChange = (value: string) => {
    if (useBackupCode) {
      // Code de récupération: lettres et chiffres, 12 caractères max
      const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
      setCode(cleanValue)
    } else {
      // Code TOTP: chiffres uniquement, 6 caractères max
      const cleanValue = value.replace(/\D/g, '').slice(0, 6)
      setCode(cleanValue)
    }
    setLocalError('')
  }

  const toggleCodeType = () => {
    setUseBackupCode(!useBackupCode)
    setCode('')
    setLocalError('')
  }

  const displayError = error || localError

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Vérification 2FA</h2>
          <p className="text-sm text-gray-600">Sécurité renforcée requise</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <div className="mb-4">
            {useBackupCode ? (
              <Key className="w-12 h-12 text-yellow-600 mx-auto mb-2" />
            ) : (
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-2" />
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {useBackupCode ? 'Code de récupération' : 'Code d\'authentification'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            {useBackupCode 
              ? 'Saisissez l\'un de vos codes de récupération à 12 caractères'
              : 'Saisissez le code à 6 chiffres de votre application d\'authentification'
            }
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {useBackupCode ? 'Code de récupération' : 'Code de vérification'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={useBackupCode ? 'ABC123DEF456' : '123456'}
              className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={useBackupCode ? 12 : 6}
              autoComplete="off"
              autoFocus
            />
          </div>

          {displayError && (
            <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={loading || isVerifying || !code.trim()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {(loading || isVerifying) && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>
              {loading || isVerifying ? 'Vérification...' : 'Vérifier'}
            </span>
          </button>

          <div className="flex items-center justify-center space-x-4 text-sm">
            <button
              type="button"
              onClick={toggleCodeType}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {useBackupCode 
                ? 'Utiliser l\'application d\'authentification' 
                : 'Utiliser un code de récupération'
              }
            </button>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>

      {/* Aide contextuelle */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Besoin d'aide ?</h4>
        <div className="text-xs text-gray-600 space-y-1">
          {useBackupCode ? (
            <>
              <p>• Les codes de récupération sont composés de 12 caractères</p>
              <p>• Chaque code ne peut être utilisé qu'une seule fois</p>
              <p>• Vous avez reçu ces codes lors de l'activation du 2FA</p>
            </>
          ) : (
            <>
              <p>• Ouvrez votre application d'authentification</p>
              <p>• Trouvez l'entrée pour ce site</p>
              <p>• Saisissez le code à 6 chiffres affiché</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}