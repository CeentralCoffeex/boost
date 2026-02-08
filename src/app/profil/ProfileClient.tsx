'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Share2, Send, Shield } from 'lucide-react';
import { getInitData } from '@/lib/telegram-client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface TelegramInfo {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramFirstName?: string | null;
  telegramPhoto?: string | null;
  linkedAt?: string | null;
  isAdmin?: boolean;
}

interface ProfileClientProps {
  initialTelegramInfo: TelegramInfo | null;
}

const DEFAULT_BLOCK1 = {
  title: 'Bienvenue ⭐',
  content: '📦 Service de livraison ouvert 7j/7\n⏰ Horaires : 11h - 2h\n🚚 Organisation des livraisons\n• 1 livreur dédié à Marseille\n• 1 livreur dédié aux alentours\n⚡ Objectif : une livraison rapide, efficace et fiable',
};
const DEFAULT_BLOCK2 = {
  title: '📦 LIVRAISON MAIN PROPRE',
  content: '⏰ 3 tournées quotidiennes pour mieux vous servir :\n• ⌚ TOURNÉE : 11h\n• ⌚ TOURNÉE : 15h\n• ⌚ TOURNÉE : 20h\n📌 Zones proches du département 13\n(Aix-en-Provence, Gardanne, Vitrolles, Marignane, Salon-de-Provence, Martigues)\n💶 Frais de livraison : 10 €\n📌 Zones 83 / 84 / 04 🚚\n(Toulon, La Seyne-sur-Mer, Hyères, Fréjus, Draguignan / Avignon, Orange, Carpentras / Digne-les-Bains, Manosque)\n🛒 Commande minimum : 150 €\n⭐ Programme de parrainage ⭐\nChaque client peut parrainer un ami et gagner une commande offerte ! 🎁',
};

/** Parse **bold** et [c=#hex]texte coloré[/c] */
function parseFormattedText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const colorMatch = remaining.match(/\[c=([#a-fA-F0-9]+)\](.*?)\[\/c\]/s);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/s);
    const colorIdx = colorMatch ? remaining.indexOf('[c=') : -1;
    const boldIdx = boldMatch ? remaining.indexOf('**') : -1;
    let nextIdx = -1;
    let match: RegExpMatchArray | null = null;
    let type: 'color' | 'bold' = 'bold';
    if (colorMatch && (boldIdx < 0 || colorIdx < boldIdx)) {
      nextIdx = colorIdx;
      match = colorMatch;
      type = 'color';
    } else if (boldMatch) {
      nextIdx = boldIdx;
      match = boldMatch;
      type = 'bold';
    }
    if (match && nextIdx >= 0) {
      if (nextIdx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, nextIdx)}</span>);
      }
      if (type === 'color' && match[2] !== undefined) {
        parts.push(
          <span key={key++} style={{ color: match[1] }}>
            {parseFormattedText(match[2])}
          </span>
        );
      } else if (type === 'bold' && match[1] !== undefined) {
        parts.push(
          <strong key={key++}>{parseFormattedText(match[1])}</strong>
        );
      }
      remaining = remaining.slice(nextIdx + (type === 'color' ? match[0].length : match[0].length));
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return parts;
}

function renderBlockContent(content: string) {
  const lines = content.split('\n');
  const items: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;
  const flushList = () => {
    if (listBuffer.length > 0) {
      items.push(
        <ul key={key++} className="page-profil-info-rect-list">
          {listBuffer.map((line, i) => (
            <li key={i}>{parseFormattedText(line.replace(/^[•\-]\s*/, ''))}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushList();
      items.push(<br key={key++} />);
    } else if (/^[•\-]\s/.test(trimmed)) {
      listBuffer.push(line);
    } else {
      flushList();
      items.push(
        <p key={key++} className="page-profil-info-rect-line">
          {parseFormattedText(trimmed)}
        </p>
      );
    }
  });
  flushList();
  return items;
}

export default function ProfileClient({ initialTelegramInfo }: ProfileClientProps) {
  const router = useRouter();
  const [telegramInfo, setTelegramInfo] = useState<TelegramInfo | null>(initialTelegramInfo);
  const [photoKey, setPhotoKey] = useState(0);
  const [profileBlocks, setProfileBlocks] = useState<{
    block1: { title: string | null; content: string | null };
    block2: { title: string | null; content: string | null };
  } | null>(null);

  useEffect(() => {
    fetch('/api/profile-blocks')
      .then((res) => res.json())
      .then((data) => setProfileBlocks(data))
      .catch(() => {});
  }, []);

  // Rafraîchir la photo Telegram à chaque ouverture de l'app
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const initData = getInitData();
      if (!initData) {
        setTimeout(run, 300);
        return;
      }
      fetch('/api/telegram/refresh-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && data?.telegramInfo) {
          setTelegramInfo((prev) =>
            prev ? { ...prev, ...data.telegramInfo } : data.telegramInfo
          );
          if (data.telegramInfo?.telegramPhoto) setPhotoKey((k) => k + 1);
        }
      })
      .catch(() => {});
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="page-profil" style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '0',
      paddingBottom: '120px',
      position: 'relative'
    }}>
      {/* Header */}
      <div className="page-profil-header" style={{
        background: 'white',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        borderBottom: '1px solid #e0e0e0',
        minWidth: 0,
        overflow: 'hidden'
      }}>
        <button
          className="page-profil-back-btn"
          onClick={handleBack}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            flexShrink: 0,
            zIndex: 1
          }}
        >
          <ChevronLeft size={28} strokeWidth={2} color="#333" className="page-profil-back-icon" />
        </button>

        <h1 style={{
          position: 'absolute',
          left: 0,
          right: 0,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '18px',
          fontWeight: '600',
          color: '#333',
          margin: 0,
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          Profil
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 1, minWidth: 0, zIndex: 1 }}>
          {telegramInfo?.isAdmin && (
            <button
              className="page-profil-admin-btn"
              onClick={() => router.push('/admin')}
              title="Administration"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
                maxWidth: '100%'
              }}
            >
              <Shield size={22} color="#ef4444" style={{ flexShrink: 0 }} />
              <span className="page-profil-admin-btn-label" style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '13px',
                fontWeight: '600',
                color: '#333',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '95px'
              }}>
                Administration
              </span>
            </button>
          )}
          {!telegramInfo?.isAdmin && (
            <button
              className="page-profil-share-btn"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <Share2 size={24} color="#333" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{
        padding: '20px'
      }}>
        {/* Avatar et niveau */}
        <div className="profile-card" style={{
          background: 'white',
          borderRadius: '20px',
          padding: '30px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Avatar 3D */}
          <div style={{
            position: 'relative'
          }}>
            <div style={{
              width: '140px',
              height: '160px',
              background: telegramInfo?.telegramPhoto ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '60px',
              color: 'white',
              fontWeight: '700',
              boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {telegramInfo?.telegramPhoto ? (
                <Image 
                  key={photoKey}
                  src={`${telegramInfo.telegramPhoto}${telegramInfo.telegramPhoto.includes('?') ? '&' : '?'}t=${photoKey}`}
                  alt="Avatar Telegram"
                  fill
                  style={{
                    objectFit: 'cover'
                  }}
                />
              ) : (
                (telegramInfo?.telegramFirstName?.substring(0, 2).toUpperCase() || 
                 telegramInfo?.telegramUsername?.substring(0, 2).toUpperCase() || 
                 'BC')
              )}
            </div>
            
            {/* Badge Telegram */}
            <div className="page-profil-badge" style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'white',
              borderRadius: '12px',
              padding: '6px 16px',
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '14px',
              fontWeight: '700',
              color: telegramInfo?.linked ? '#0088cc' : '#333',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: '2px solid #f5f5f5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {telegramInfo?.linked ? (
                <>
                  <Send size={14} />
                  @{telegramInfo.telegramUsername || 'User'}
                </>
              ) : (
                'Non lié'
              )}
            </div>
          </div>

          {/* Infos Telegram */}
          <div style={{
            flex: 1
          }}>
            {/* Cartes info Telegram */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {/* Pseudo Telegram */}
              <div className="page-profil-info-field" style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Pseudo Telegram
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0088cc'
                }}>
                  {telegramInfo?.telegramUsername ? `@${telegramInfo.telegramUsername}` : 'Non lié'}
                </span>
              </div>

              {/* ID Telegram */}
              <div className="page-profil-info-field" style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '12px',
                  color: '#666'
                }}>
                  ID Telegram
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  {telegramInfo?.telegramId || '—'}
                </span>
              </div>

              {/* Date liaison */}
              <div className="page-profil-info-field" style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Lié depuis
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#333'
                }}>
                  {telegramInfo?.linkedAt ? new Date(telegramInfo.linkedAt).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>

              {/* Statut */}
              <div className="page-profil-info-field" style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '12px',
                  color: '#666'
                }}>
                  Statut
                </span>
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  fontWeight: '600',
                  color: telegramInfo?.linked ? '#22c55e' : '#ef4444'
                }}>
                  {telegramInfo?.linked ? '✓ Connecté' : '✗ Non connecté'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rectangles info livraison (contenu éditable depuis l'admin) - style news */}
        <div className="page-profil-info-cards" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          <article className="page-profil-info-rect page-profil-info-rect-1">
            <header className="page-profil-info-rect-header">
              <h3 className="page-profil-info-rect-title">
                {profileBlocks?.block1?.title ?? DEFAULT_BLOCK1.title}
              </h3>
            </header>
            <div className="page-profil-info-rect-separator" />
            <div className="page-profil-info-rect-body">
              {renderBlockContent(profileBlocks?.block1?.content ?? DEFAULT_BLOCK1.content)}
            </div>
          </article>
          <article className="page-profil-info-rect page-profil-info-rect-2">
            <header className="page-profil-info-rect-header">
              <h3 className="page-profil-info-rect-title">
                {parseFormattedText(profileBlocks?.block2?.title ?? DEFAULT_BLOCK2.title)}
              </h3>
            </header>
            <div className="page-profil-info-rect-separator" />
            <div className="page-profil-info-rect-body">
              {renderBlockContent(profileBlocks?.block2?.content ?? DEFAULT_BLOCK2.content)}
            </div>
          </article>
        </div>

      </div>
    </div>
  );
}
