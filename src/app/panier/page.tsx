'use client';

import { useState, useEffect } from 'react';
import ProductThumbnail from '@/components/product/ProductThumbnail';
import { ChevronLeft, Trash2, Plus, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string | null;
  videoUrl?: string | null;
  variant?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export default function PanierPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Charger le panier depuis localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    // Sauvegarder le panier dans localStorage à chaque modification
    localStorage.setItem('cart', JSON.stringify(cartItems));
    // Notifier le Footer du changement
    window.dispatchEvent(new Event('cartUpdated'));
  }, [cartItems]);

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleBack = () => {
    router.push('/');
  };

  const handleValidateCart = () => {
    router.push('/panier/checkout');
  };

  return (
    <div className="page-panier" style={{
      height: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }}>
      {/* Header avec bouton retour */}
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
          fontSize: '28px',
          fontWeight: '700',
          color: '#333',
          margin: 0
        }}>
          Mon Panier
        </h1>
      </div>

      {/* Liste des produits */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        paddingTop: '20px',
        paddingBottom: cartItems.length > 0 ? '20px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: cartItems.length === 0 ? 'center' : 'flex-start',
        alignItems: 'center',
        WebkitOverflowScrolling: 'touch',
      }}>
        {cartItems.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px 20px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            width: '100%',
            maxWidth: '340px',
          }}>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: 0
            }}>
              Votre panier est vide
            </p>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '15px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                gap: '15px',
                alignItems: 'center'
              }}>
                {/* Image ou frame vidéo si pas de photo */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#f8f8f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <ProductThumbnail
                    image={item.image}
                    videoUrl={item.videoUrl}
                    alt={item.title}
                    imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    placeholder={<div style={{ color: '#ccc', fontSize: '12px' }}>Sans image</div>}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    margin: '0 0 4px 0'
                  }}>
                    {item.title}
                  </h3>
                  {item.variant && (
                    <p style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#666',
                      margin: '0 0 4px 0',
                      fontStyle: 'italic'
                    }}>
                      {item.variant.type === 'weight' ? 'Grammage: ' : 'Goût: '}
                      {item.variant.name}{item.variant.type === 'weight' ? 'G' : ''}
                    </p>
                  )}
                  <p style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1a1a1a',
                    margin: 0
                  }}>
                    {item.price}€
                  </p>
                </div>

                {/* Quantité - styles de base, thèmes gérés par theme.css (pas de background inline) */}
                <div className="page-panier-qty-selector page-panier-qty-selector-themed" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '6px',
                  padding: '2px 6px'
                }}>
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="page-panier-qty-btn"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Minus size={14} className="page-panier-qty-icon" />
                  </button>
                  <span className="page-panier-qty-value" style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '13px',
                    fontWeight: '600',
                    minWidth: '14px',
                    textAlign: 'center'
                  }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="page-panier-qty-btn"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Plus size={14} className="page-panier-qty-icon" />
                  </button>
                </div>

                {/* Supprimer */}
                <button
                  onClick={() => removeItem(item.id)}
                  style={{
                    background: '#ff4444',
                    border: 'none',
                    borderRadius: '12px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)'
                  }}
                >
                  <Trash2 size={24} color="white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total et Commander - Fixe en bas */}
      {cartItems.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '15px 20px',
          paddingBottom: '20px',
          backgroundColor: '#f5f5f5',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <span style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '18px',
                fontWeight: '600',
                color: '#333'
              }}>
                Total ({totalItems} articles)
              </span>
              <span style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a1a1a'
              }}>
                {totalPrice}€
              </span>
            </div>
            <button
              className="page-panier-valider-btn"
              onClick={handleValidateCart}
              style={{
                width: '100%',
                border: 'none',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              Valider le panier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
