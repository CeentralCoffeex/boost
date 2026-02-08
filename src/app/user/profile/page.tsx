'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
  Shield,
  Key,
  Bell,
  Globe,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  Download,
  Trash2,
  Plus,
  Send,
  Link,
  Unlink
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  dateOfBirth?: Date
  bio?: string
  avatar?: string
  emailVerified: boolean
  phoneVerified: boolean
  twoFactorEnabled: boolean
  createdAt: Date
  lastLogin?: Date
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  loginNotifications: boolean
  securityAlerts: boolean
  sessionTimeout: number
  allowedIPs: string[]
}

interface TelegramInfo {
  linked: boolean
  telegramId: string | null
  telegramUsername: string | null
  telegramFirstName?: string | null
  telegramPhoto?: string | null
  linkedAt: Date | null
}

export default function UserProfilePage() {
  const sessionResult = useSession()
  const session = sessionResult?.data
  const status = sessionResult?.status
  const update = sessionResult?.update
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(null)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/login')
      return
    }

    loadUserData()
  }, [session, status, router])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Simuler le chargement des données utilisateur
      const userData: UserProfile = {
        id: session?.user?.id || '1',
        email: session?.user?.email || 'user@example.com',
        name: session?.user?.name || 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+33 1 23 45 67 89',
        address: '123 Rue de la Paix',
        city: 'Paris',
        country: 'France',
        dateOfBirth: new Date('1990-01-15'),
        bio: 'Développeur passionné par les nouvelles technologies et l\'innovation.',
        avatar: session?.user?.image || '/default-avatar.png',
        emailVerified: true,
        phoneVerified: false,
        twoFactorEnabled: false,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date()
      }
      setProfile(userData)
      setFormData(userData)

      // Simuler le chargement des paramètres de sécurité
      const securityData: SecuritySettings = {
        twoFactorEnabled: false,
        loginNotifications: true,
        securityAlerts: true,
        sessionTimeout: 30,
        allowedIPs: ['192.168.1.100', '10.0.0.50']
      }
      setSecuritySettings(securityData)

      // Charger les infos Telegram
      try {
        const telegramResponse = await fetch('/api/user/telegram')
        if (telegramResponse.ok) {
          const telegramData = await telegramResponse.json()
          setTelegramInfo({
            linked: telegramData.linked,
            telegramId: telegramData.telegramId,
            telegramUsername: telegramData.telegramUsername,
            linkedAt: telegramData.linkedAt ? new Date(telegramData.linkedAt) : null
          })
        }
      } catch (telegramError) {
        console.error('Erreur lors du chargement des infos Telegram:', telegramError)
        setTelegramInfo({ linked: false, telegramId: null, telegramUsername: null, linkedAt: null })
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      
      // Simuler la sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProfile({ ...profile!, ...formData })
      setIsEditing(false)
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' })
      
      // Mettre à jour la session si nécessaire
      if (formData.name !== session?.user?.name) {
        await update({ name: formData.name })
      }
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' })
      return
    }

    try {
      setSaving(true)
      
      // Simuler le changement de mot de passe
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' })
      
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error)
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle2FA = async () => {
    try {
      setSaving(true)
      
      // Simuler l'activation/désactivation du 2FA
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newStatus = !securitySettings!.twoFactorEnabled
      setSecuritySettings({ ...securitySettings!, twoFactorEnabled: newStatus })
      setProfile({ ...profile!, twoFactorEnabled: newStatus })
      
      setMessage({ 
        type: 'success', 
        text: newStatus ? '2FA activé avec succès' : '2FA désactivé avec succès' 
      })
      
    } catch (error) {
      console.error('Erreur lors de la modification du 2FA:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la modification du 2FA' })
    } finally {
      setSaving(false)
    }
  }

  const handleLinkTelegram = () => {
    // Ouvrir le bot Telegram avec un deep link pour la liaison
    const botUsername = 'pizzwazabot' // Remplacer par votre bot
    const startParam = `link_${session?.user?.id || 'user'}`
    window.open(`https://t.me/${botUsername}?start=${startParam}`, '_blank')
  }

  const handleUnlinkTelegram = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/user/telegram', { method: 'DELETE' })
      
      if (response.ok) {
        setTelegramInfo({ linked: false, telegramId: null, telegramUsername: null, linkedAt: null })
        setMessage({ type: 'success', text: 'Compte Telegram délié avec succès' })
      } else {
        throw new Error('Erreur lors de la déconnexion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la déconnexion du compte Telegram' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'L\'image ne doit pas dépasser 5MB' })
      return
    }

    try {
      setSaving(true)
      
      // Simuler l'upload d'avatar
      const reader = new FileReader()
      reader.onload = async (e) => {
        const avatarUrl = e.target?.result as string
        setFormData({ ...formData, avatar: avatarUrl })
        setMessage({ type: 'success', text: 'Avatar mis à jour avec succès' })
        setSaving(false)
      }
      reader.readAsDataURL(file)
      
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload de l\'avatar' })
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
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Erreur lors du chargement du profil</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
            <p className="text-gray-600">Gérez vos informations personnelles et paramètres de sécurité</p>
          </div>
          {session?.user?.role === 'ADMIN' && (
             <button 
               onClick={() => router.push('/admin/dashboard')}
               className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
             >
               <Shield className="w-5 h-5" />
               <span>Administration</span>
             </button>
          )}
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

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'profile', label: 'Profil', icon: User },
                { id: 'security', label: 'Sécurité', icon: Shield },
                { id: 'privacy', label: 'Confidentialité', icon: Eye }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden relative">
                    {formData.avatar ? (
                      <Image src={formData.avatar} alt="Avatar" fill className="object-cover" unoptimized />
                    ) : (
                      <User className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{profile.name}</h3>
                  <p className="text-gray-500">{profile.email}</p>
                  {telegramInfo?.linked && (
                    <p className="text-sm text-blue-500 flex items-center space-x-1">
                      <Send className="w-3 h-3" />
                      <span>@{telegramInfo.telegramUsername || telegramInfo.telegramId}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-400">Membre depuis {profile.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Informations Personnelles</h3>
                <div className="flex space-x-2">
                  {isEditing && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
                    >
                      <X className="w-4 h-4" />
                      <span>Annuler</span>
                    </button>
                  )}
                  <button
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    disabled={saving}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                      isEditing
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } disabled:opacity-50`}
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isEditing ? (
                      <Save className="w-4 h-4" />
                    ) : (
                      <Edit className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Sauvegarde...' : isEditing ? 'Sauvegarder' : 'Modifier'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.firstName || 'Non renseigné'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.lastName || 'Non renseigné'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{profile.email}</span>
                    {profile.emailVerified && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{profile.phone || 'Non renseigné'}</span>
                      {profile.phoneVerified && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.dateOfBirth?.toISOString().split('T')[0] || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: new Date(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{profile.dateOfBirth?.toLocaleDateString() || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{profile.country || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{profile.address || 'Non renseigné'}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Parlez-nous de vous..."
                    />
                  ) : (
                    <p className="text-gray-900">{profile.bio || 'Aucune bio renseignée'}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setFormData(profile)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>

            {/* Telegram Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Telegram</h3>
                    <p className="text-sm text-gray-500">Liez votre compte Telegram pour recevoir des notifications</p>
                  </div>
                </div>
              </div>

              {telegramInfo?.linked ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg bg-green-50 border border-green-200`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Compte Telegram lié</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <span className="text-sm text-gray-500">Prénom</span>
                        <p className="text-gray-900 font-medium">{telegramInfo.telegramFirstName || 'Non défini'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Username</span>
                        <p className="text-gray-900 font-medium">@{telegramInfo.telegramUsername || 'Non défini'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ID Telegram</span>
                        <p className="text-gray-900 font-medium">{telegramInfo.telegramId}</p>
                      </div>
                      {telegramInfo.linkedAt && (
                        <div>
                          <span className="text-sm text-gray-500">Lié le</span>
                          <p className="text-gray-900">{telegramInfo.linkedAt.toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleUnlinkTelegram}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    <span>{saving ? 'Déconnexion...' : 'Délier le compte Telegram'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg bg-yellow-50 border border-yellow-200`}>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-yellow-800">Aucun compte Telegram lié</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Liez votre compte Telegram pour recevoir des notifications et accéder à des fonctionnalités exclusives.
                    </p>
                  </div>
                  <button
                    onClick={handleLinkTelegram}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    <Link className="w-4 h-4" />
                    <span>Lier mon compte Telegram</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && securitySettings && (
          <div className="space-y-6">
            {/* Password Change */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Changer le mot de passe</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>{saving ? 'Modification...' : 'Changer le mot de passe'}</span>
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Authentification à deux facteurs</h3>
                  <p className="text-sm text-gray-500">Ajoutez une couche de sécurité supplémentaire à votre compte</p>
                </div>
                <button
                  onClick={handleToggle2FA}
                  disabled={saving}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    securitySettings.twoFactorEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  <span>
                    {saving ? 'Modification...' : securitySettings.twoFactorEnabled ? 'Désactiver 2FA' : 'Activer 2FA'}
                  </span>
                </button>
              </div>

              <div className={`p-4 rounded-lg ${
                securitySettings.twoFactorEnabled ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {securitySettings.twoFactorEnabled ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <span className={`font-medium ${
                    securitySettings.twoFactorEnabled ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {securitySettings.twoFactorEnabled ? '2FA activé' : '2FA désactivé'}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${
                  securitySettings.twoFactorEnabled ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {securitySettings.twoFactorEnabled
                    ? 'Votre compte est protégé par l\'authentification à deux facteurs'
                    : 'Activez le 2FA pour sécuriser davantage votre compte'
                  }
                </p>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Bell className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Paramètres de sécurité</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Notifications de connexion</p>
                    <p className="text-sm text-gray-500">Recevoir un email lors de nouvelles connexions</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings({ ...securitySettings, loginNotifications: !securitySettings.loginNotifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Alertes de sécurité</p>
                    <p className="text-sm text-gray-500">Recevoir des alertes pour les activités suspectes</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings({ ...securitySettings, securityAlerts: !securitySettings.securityAlerts })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.securityAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.securityAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Délai d'expiration de session (minutes)</label>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 heure</option>
                    <option value={120}>2 heures</option>
                    <option value={480}>8 heures</option>
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
              <h3 className="text-lg font-medium text-gray-900 mb-6">Paramètres de confidentialité</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Profil public</p>
                    <p className="text-sm text-gray-500">Permettre aux autres utilisateurs de voir votre profil</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Indexation par les moteurs de recherche</p>
                    <p className="text-sm text-gray-500">Permettre aux moteurs de recherche d'indexer votre profil</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Collecte de données analytiques</p>
                    <p className="text-sm text-gray-500">Autoriser la collecte de données pour améliorer l'expérience</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Export */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Gestion des données</h3>
                <button className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  <span>Ajouter</span>
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Exporter mes données</p>
                    <p className="text-sm text-gray-500">Télécharger une copie de toutes vos données</p>
                  </div>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Download className="w-4 h-4" />
                    <span>Exporter</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <p className="font-medium text-red-900">Supprimer mon compte</p>
                    <p className="text-sm text-red-700">Supprimer définitivement votre compte et toutes vos données</p>
                  </div>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}