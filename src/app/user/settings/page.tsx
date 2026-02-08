'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Palette,
  Languages,
  User,
  Lock,
  Key,
  Database,
  Download,
  Upload,
  RefreshCw,
  Check,
  AlertCircle,
  Save,
  X,
  Plus,
  Trash2,
  Edit
} from 'lucide-react'

interface NotificationSettings {
  email: {
    marketing: boolean
    security: boolean
    updates: boolean
    comments: boolean
    mentions: boolean
  }
  push: {
    enabled: boolean
    marketing: boolean
    security: boolean
    updates: boolean
    comments: boolean
    mentions: boolean
  }
  sms: {
    enabled: boolean
    security: boolean
    important: boolean
  }
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  colorScheme: 'blue' | 'green' | 'purple' | 'orange'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  animations: boolean
}

interface LanguageSettings {
  language: string
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  currency: string
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends'
  showEmail: boolean
  showPhone: boolean
  showLastSeen: boolean
  allowSearchEngines: boolean
  dataCollection: boolean
  thirdPartySharing: boolean
}

export default function UserSettingsPage() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'notifications' | 'appearance' | 'language' | 'privacy' | 'security'>('notifications')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      marketing: false,
      security: true,
      updates: true,
      comments: true,
      mentions: true
    },
    push: {
      enabled: true,
      marketing: false,
      security: true,
      updates: false,
      comments: true,
      mentions: true
    },
    sms: {
      enabled: false,
      security: true,
      important: true
    }
  })

  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: 'system',
    colorScheme: 'blue',
    fontSize: 'medium',
    compactMode: false,
    animations: true
  })

  const [language, setLanguage] = useState<LanguageSettings>({
    language: 'fr',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR'
  })

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLastSeen: true,
    allowSearchEngines: false,
    dataCollection: true,
    thirdPartySharing: false
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/login')
      return
    }

    loadSettings()
  }, [session, status, router])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Simuler le chargement des paramètres
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des paramètres' })
    } finally {
      setSaving(false)
    }
  }

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 5000)
  }

  useEffect(() => {
    if (message) clearMessage()
  }, [message])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          </div>
          <p className="text-gray-600">Personnalisez votre expérience et gérez vos préférences</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {[
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'appearance', label: 'Apparence', icon: Palette },
                { id: 'language', label: 'Langue & Région', icon: Languages },
                { id: 'privacy', label: 'Confidentialité', icon: Eye },
                { id: 'security', label: 'Sécurité', icon: Shield }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                    activeTab === id
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Notifications Email</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'security', label: 'Alertes de sécurité', description: 'Notifications importantes concernant la sécurité de votre compte' },
                      { key: 'updates', label: 'Mises à jour produit', description: 'Nouvelles fonctionnalités et améliorations' },
                      { key: 'comments', label: 'Commentaires', description: 'Quand quelqu\'un commente vos publications' },
                      { key: 'mentions', label: 'Mentions', description: 'Quand quelqu\'un vous mentionne' },
                      { key: 'marketing', label: 'Marketing', description: 'Offres spéciales et promotions' }
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{label}</p>
                            <p className="text-sm text-gray-500">{description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setNotifications({
                            ...notifications,
                            email: {
                              ...notifications.email,
                              [key]: !notifications.email[key as keyof typeof notifications.email]
                            }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications.email[key as keyof typeof notifications.email] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.email[key as keyof typeof notifications.email] ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    {notifications.push.enabled ? <Volume2 className="w-5 h-5 text-gray-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                    <h3 className="text-lg font-medium text-gray-900">Notifications Push</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Activer les notifications push</p>
                          <p className="text-sm text-gray-500">Recevoir des notifications sur votre appareil</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications({
                          ...notifications,
                          push: { ...notifications.push, enabled: !notifications.push.enabled }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.push.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.push.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {notifications.push.enabled && [
                      { key: 'security', label: 'Alertes de sécurité' },
                      { key: 'updates', label: 'Mises à jour produit' },
                      { key: 'comments', label: 'Commentaires' },
                      { key: 'mentions', label: 'Mentions' },
                      { key: 'marketing', label: 'Marketing' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{label}</p>
                        <button
                          onClick={() => setNotifications({
                            ...notifications,
                            push: {
                              ...notifications.push,
                              [key]: !notifications.push[key as keyof typeof notifications.push]
                            }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications.push[key as keyof typeof notifications.push] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.push[key as keyof typeof notifications.push] ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Notifications SMS</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Activer les SMS</p>
                          <p className="text-sm text-gray-500">Recevoir des SMS pour les notifications importantes</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications({
                          ...notifications,
                          sms: { ...notifications.sms, enabled: !notifications.sms.enabled }
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications.sms.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notifications.sms.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {notifications.sms.enabled && [
                      { key: 'security', label: 'Alertes de sécurité' },
                      { key: 'important', label: 'Notifications importantes' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{label}</p>
                        <button
                          onClick={() => setNotifications({
                            ...notifications,
                            sms: {
                              ...notifications.sms,
                              [key]: !notifications.sms[key as keyof typeof notifications.sms]
                            }
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notifications.sms[key as keyof typeof notifications.sms] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications.sms[key as keyof typeof notifications.sms] ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Thème</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: 'Clair', icon: Sun },
                      { value: 'dark', label: 'Sombre', icon: Moon },
                      { value: 'system', label: 'Système', icon: Monitor }
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setAppearance({ ...appearance, theme: value as any })}
                        className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                          appearance.theme === value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Couleur d'accent</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: 'blue', label: 'Bleu', color: 'bg-blue-500' },
                      { value: 'green', label: 'Vert', color: 'bg-green-500' },
                      { value: 'purple', label: 'Violet', color: 'bg-purple-500' },
                      { value: 'orange', label: 'Orange', color: 'bg-orange-500' }
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        onClick={() => setAppearance({ ...appearance, colorScheme: value as any })}
                        className={`flex items-center space-x-3 p-3 border-2 rounded-lg transition-colors ${
                          appearance.colorScheme === value
                            ? 'border-gray-400 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${color}`} />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Affichage</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Taille de police</label>
                      <select
                        value={appearance.fontSize}
                        onChange={(e) => setAppearance({ ...appearance, fontSize: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="small">Petite</option>
                        <option value="medium">Moyenne</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Mode compact</p>
                        <p className="text-sm text-gray-500">Réduire l'espacement pour afficher plus de contenu</p>
                      </div>
                      <button
                        onClick={() => setAppearance({ ...appearance, compactMode: !appearance.compactMode })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appearance.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          appearance.compactMode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Animations</p>
                        <p className="text-sm text-gray-500">Activer les transitions et animations</p>
                      </div>
                      <button
                        onClick={() => setAppearance({ ...appearance, animations: !appearance.animations })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          appearance.animations ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          appearance.animations ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <Globe className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Langue et Région</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                      <select
                        value={language.language}
                        onChange={(e) => setLanguage({ ...language, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="de">Deutsch</option>
                        <option value="it">Italiano</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire</label>
                      <select
                        value={language.timezone}
                        onChange={(e) => setLanguage({ ...language, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                        <option value="Europe/London">Europe/London (GMT+0)</option>
                        <option value="America/New_York">America/New_York (GMT-5)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format de date</label>
                      <select
                        value={language.dateFormat}
                        onChange={(e) => setLanguage({ ...language, dateFormat: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Format d'heure</label>
                      <select
                        value={language.timeFormat}
                        onChange={(e) => setLanguage({ ...language, timeFormat: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="24h">24 heures</option>
                        <option value="12h">12 heures (AM/PM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                      <select
                        value={language.currency}
                        onChange={(e) => setLanguage({ ...language, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">Dollar US ($)</option>
                        <option value="GBP">Livre Sterling (£)</option>
                        <option value="JPY">Yen Japonais (¥)</option>
                        <option value="CHF">Franc Suisse (CHF)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <User className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Visibilité du profil</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Qui peut voir votre profil</label>
                      <select
                        value={privacy.profileVisibility}
                        onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="public">Public</option>
                        <option value="friends">Amis seulement</option>
                        <option value="private">Privé</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'showEmail', label: 'Afficher l\'email' },
                        { key: 'showPhone', label: 'Afficher le téléphone' },
                        { key: 'showLastSeen', label: 'Afficher la dernière connexion' }
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {privacy[key as keyof PrivacySettings] ? <Eye className="w-4 h-4 text-gray-500" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                            <p className="font-medium text-gray-900">{label}</p>
                          </div>
                          <button
                            onClick={() => setPrivacy({ ...privacy, [key]: !privacy[key as keyof PrivacySettings] })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              privacy[key as keyof PrivacySettings] ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              privacy[key as keyof PrivacySettings] ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <Database className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Données et confidentialité</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { key: 'allowSearchEngines', label: 'Autoriser l\'indexation par les moteurs de recherche', description: 'Permettre aux moteurs de recherche de trouver votre profil' },
                      { key: 'dataCollection', label: 'Collecte de données analytiques', description: 'Autoriser la collecte de données pour améliorer l\'expérience' },
                      { key: 'thirdPartySharing', label: 'Partage avec des tiers', description: 'Autoriser le partage de données avec des partenaires de confiance' }
                    ].map(({ key, label, description }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{label}</p>
                          <p className="text-sm text-gray-500">{description}</p>
                        </div>
                        <button
                          onClick={() => setPrivacy({ ...privacy, [key]: !privacy[key as keyof PrivacySettings] })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            privacy[key as keyof PrivacySettings] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacy[key as keyof PrivacySettings] ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Gestion des données</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Download className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Exporter mes données</p>
                          <p className="text-sm text-gray-500">Télécharger toutes vos données</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Exporter
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Upload className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">Importer des données</p>
                          <p className="text-sm text-gray-500">Restaurer vos données sauvegardées</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Importer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-medium text-gray-900">Sécurité du compte</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Key className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">Changer le mot de passe</p>
                          <p className="text-sm text-gray-500">Dernière modification il y a 30 jours</p>
                        </div>
                      </div>
                      <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Edit className="w-4 h-4" />
                        <span>Modifier</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Authentification à deux facteurs</p>
                          <p className="text-sm text-gray-500">Sécurisez votre compte avec 2FA</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Configurer
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900">Sessions actives</p>
                          <p className="text-sm text-gray-500">Gérer vos sessions de connexion</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                        Voir tout
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Sessions actives</h3>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <Plus className="w-4 h-4" />
                      <span>Nouvelle session</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[
                      { device: 'Chrome sur Windows', location: 'Paris, France', time: 'Maintenant', current: true },
                      { device: 'Safari sur iPhone', location: 'Lyon, France', time: 'Il y a 1 heure', current: false },
                      { device: 'Firefox sur Mac', location: 'Marseille, France', time: 'Il y a 2 jours', current: false }
                    ].map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Monitor className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{session.device}</p>
                            <p className="text-sm text-gray-500">{session.location} • {session.time}</p>
                          </div>
                          {session.current && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Actuelle</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!session.current && (
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">Historique de sécurité</h3>
                  <div className="space-y-3">
                    {[
                      { action: 'Connexion réussie', location: 'Paris, France', time: 'Il y a 2 heures', status: 'success' },
                      { action: 'Mot de passe modifié', location: 'Paris, France', time: 'Il y a 1 jour', status: 'info' },
                      { action: 'Tentative de connexion échouée', location: 'Londres, UK', time: 'Il y a 3 jours', status: 'warning' }
                    ].map((event, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          event.status === 'success' ? 'bg-green-500' :
                          event.status === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{event.action}</p>
                          <p className="text-sm text-gray-500">{event.location} • {event.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}