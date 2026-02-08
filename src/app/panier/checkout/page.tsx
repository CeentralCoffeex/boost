'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Truck, Handshake } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string | null;
  variant?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

type RetraitMode = 'livraison' | 'meetup';

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [retraitMode, setRetraitMode] = useState<RetraitMode | null>(null);
  const [address, setAddress] = useState('');
  const [orderPlatform, setOrderPlatform] = useState<'telegram' | 'signal'>('telegram');
  const [orderTelegramUsername, setOrderTelegramUsername] = useState('savpizz13');
  const [orderSignalLink, setOrderSignalLink] = useState('');

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    } else {
      router.push('/panier');
    }
  }, [router]);

  useEffect(() => {
    fetch('/api/order-telegram')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.orderTelegramUsername) setOrderTelegramUsername(data.orderTelegramUsername);
        if (data?.orderPlatform === 'signal') setOrderPlatform('signal');
        if (data?.orderSignalLink) setOrderSignalLink(data.orderSignalLink);
      })
      .catch(() => {});
  }, []);

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleBack = () => {
    router.push('/panier');
  };

  const handleCommander = () => {
    const orderLines = cartItems.map(item =>
      `• ${item.title} x${item.quantity} - ${item.price * item.quantity}€`
    ).join('\n');

    let retraitInfo = '';
    if (retraitMode === 'livraison') {
      retraitInfo = `\n📍 *Adresse de livraison:*\n${address || '(non renseignée)'}`;
    } else {
      retraitInfo = '\n📍 *Retrait: meet-up*\n(L\'adresse vous sera communiquée en message privé par le standard)';
    }

    const orderMessage = `🛒 *Nouvelle Commande*\n\n` +
      orderLines +
      `\n\n💰 *Total: ${totalPrice}€*` +
      retraitInfo;

    if (orderPlatform === 'signal') {
      if (orderSignalLink) {
        navigator.clipboard.writeText(orderMessage).then(() => {
          window.open(orderSignalLink, '_blank');
        }).catch(() => {
          window.open(orderSignalLink, '_blank');
        });
      } else {
        navigator.clipboard.writeText(orderMessage);
      }
    } else {
      const tgUrl = `https://t.me/${orderTelegramUsername}?text=${encodeURIComponent(orderMessage)}`;
      const tg = (typeof window !== 'undefined' && (window as any).Telegram?.WebApp);
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(tgUrl);
      } else {
        navigator.clipboard.writeText(orderMessage).then(() => {
          window.open(tgUrl, '_blank');
        }).catch(() => window.open(tgUrl, '_blank'));
      }
    }
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="page-panier" style={{
      height: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div className="page-panier-header" style={{
        flexShrink: 0,
        backgroundColor: '#f5f5f5',
        padding: '20px',
        paddingTop: '20px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <button
          className="page-panier-back-btn"
          onClick={handleBack}
          style={{
            position: 'absolute',
            left: '20px',
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={28} strokeWidth={2} color="#333" className="page-panier-back-icon" />
        </button>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '22px',
          fontWeight: '700',
          color: '#333',
          margin: 0
        }}>
          Finaliser la commande
        </h1>
      </div>

      {/* Contenu */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* MODE DE RETRAIT */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '12px',
            fontWeight: '600',
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: '0 0 16px 0',
          }}>
            MODE DE RETRAIT
          </p>
          <div className="checkout-mode-buttons" style={{ display: 'flex', gap: '12px' }}>
            <button
              className={`checkout-mode-btn ${retraitMode === 'livraison' ? 'checkout-mode-selected' : ''}`}
              onClick={() => setRetraitMode('livraison')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                borderRadius: '12px',
                border: retraitMode === 'livraison' ? '2px solid #0088cc' : '1px solid #e0e0e0',
                background: retraitMode === 'livraison' ? '#e3f2fd' : '#fafafa',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '15px',
                fontWeight: '600',
                color: retraitMode === 'livraison' ? '#0088cc' : '#666',
              }}
            >
              <Truck size={24} strokeWidth={2} />
              Livraison
            </button>
            <button
              onClick={() => setRetraitMode('meetup')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '16px',
                borderRadius: '12px',
                border: retraitMode === 'meetup' ? '2px solid #0088cc' : '1px solid #e0e0e0',
                background: retraitMode === 'meetup' ? '#e3f2fd' : '#fafafa',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '15px',
                fontWeight: '600',
                color: retraitMode === 'meetup' ? '#0088cc' : '#666',
              }}
            >
              <Handshake size={24} strokeWidth={2} />
              Meet-up
            </button>
          </div>
        </div>

        {/* Si Livraison: champ adresse */}
        {retraitMode === 'livraison' && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          }}>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '12px',
              fontWeight: '600',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 12px 0',
            }}>
              ADRESSE DE LIVRAISON
            </p>
            <textarea
              className="checkout-address-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Entrez votre adresse complète..."
              rows={3}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '15px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Si Meet-up: message info */}
        {retraitMode === 'meetup' && (
          <div className="checkout-info-alert" style={{
            background: '#e3f2fd',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            border: '1px solid #90caf9',
          }}>
            <div className="checkout-info-alert-icon" style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#0088cc',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}>
              i
            </div>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '14px',
              color: '#333',
              margin: 0,
              lineHeight: 1.5,
            }}>
              L&apos;adresse vous sera communiquée en message privé par le standard.
            </p>
          </div>
        )}

        {/* Récap commande */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        }}>
          <p style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '14px',
            color: '#666',
            margin: '0 0 8px 0',
          }}>
            {totalItems} article(s) • Total: {totalPrice}€
          </p>
        </div>
      </div>

      {/* Footer avec bouton Commander */}
      {retraitMode && (
        <div className="page-panier-footer" style={{
          flexShrink: 0,
          padding: '20px',
          paddingBottom: '100px',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            <button
              className="checkout-commander-btn"
              onClick={handleCommander}
              disabled={(retraitMode === 'livraison' && !address.trim()) || (orderPlatform === 'signal' && !orderSignalLink)}
              style={{
                width: '100%',
                backgroundColor: (retraitMode === 'livraison' && !address.trim()) || (orderPlatform === 'signal' && !orderSignalLink) ? '#ccc' : '#0088cc',
                color: 'white',
                border: 'none',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '12px',
                cursor: (retraitMode === 'livraison' && !address.trim()) || (orderPlatform === 'signal' && !orderSignalLink) ? 'not-allowed' : 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: (retraitMode === 'livraison' && !address.trim()) || (orderPlatform === 'signal' && !orderSignalLink) ? 'none' : '0 4px 12px rgba(0, 136, 204, 0.3)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.654-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
              </svg>
              {orderPlatform === 'signal' ? 'Commander via Signal' : 'Commander via Telegram'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
