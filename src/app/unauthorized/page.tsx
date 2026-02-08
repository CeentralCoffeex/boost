'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shield, ArrowLeft, Home, Lock } from 'lucide-react'

export default function UnauthorizedPage() {
  const sessionResult = useSession()
  const session = sessionResult?.data

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-red-100 p-6 rounded-full">
            <Shield className="w-16 h-16 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Accès non autorisé
          </h2>
          <p className="text-gray-600 mb-8">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            {!session && " Veuillez vous connecter avec un compte autorisé."}
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-lg shadow p-6 text-left">
          <div className="flex items-center space-x-3 mb-4">
            <Lock className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Détails de l'erreur</h3>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Code d'erreur:</strong> 403 Forbidden</p>
            <p><strong>Raison:</strong> Permissions insuffisantes</p>
            {session ? (
              <>
                <p><strong>Utilisateur:</strong> {session.user?.email}</p>
                <p><strong>Rôle actuel:</strong> {(session.user as any)?.role || 'user'}</p>
                <p><strong>Accès requis:</strong> ADMIN</p>
              </>
            ) : (
              <p><strong>Statut:</strong> Non connecté</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {!session ? (
            <Link
              href="/login"
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Se connecter</span>
            </Link>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Contactez un administrateur pour obtenir les permissions nécessaires
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={() => window.history.back()}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>
            
            <Link
              href="/"
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Accueil</span>
            </Link>
          </div>
        </div>

        {/* Help */}
        <div className="text-sm text-gray-500">
          <p>
            Besoin d'aide ? {' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500">
              Contactez le support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}