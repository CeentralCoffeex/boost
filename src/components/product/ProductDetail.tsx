'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { FormattedTextWithBreaks } from '@/lib/formatted-text';

interface ProductVariant {
  name: string;
  price: string;
  type?: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number | string;
  image: string | null;
  videoUrl: string | null;
  tag: string | null;
  section: string;
  category?: { name: string } | null;
  variants?: ProductVariant[];
  defaultUnit?: 'gramme' | 'ml';
}

import { motion } from 'framer-motion';

function getVideoMimeType(url: string): string {
  const base = (url || '').split('?')[0];
  const u = (base ?? '').toLowerCase();
  if (u.endsWith('.mov') || u.endsWith('.qt')) return 'video/quicktime';
  if (u.endsWith('.webm')) return 'video/webm';
  if (u.endsWith('.ogg')) return 'video/ogg';
  return 'video/mp4';
}

function getInitialProduct(_id: string | string[] | undefined): Product | null {
  return null;
}

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const productId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;
  const [product, setProduct] = useState<Product | null>(() => getInitialProduct(productId));
  const [loadError, setLoadError] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const posterCaptured = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleBack = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.dispatchEvent(new Event('close-product-overlay'));
  };

  const handleContinueShopping = () => {
    setShowSuccessModal(false);
  };

  const handleGoToCart = () => {
    setShowSuccessModal(false);
    router.push('/panier');
  };

  useEffect(() => {
    if (!productId) return;
    setLoadError(false);
    let cancelled = false;
    fetch(`/api/products/${productId}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data?.error) {
          setProduct(null);
          setLoadError(true);
          return;
        }
        setLoadError(false);
        setProduct({ ...data, price: data.price || data.basePrice });
        if (data.variants && data.variants.length > 0) {
          const sorted = [...data.variants].sort((a: ProductVariant, b: ProductVariant) => (parseFloat(String(a.price).replace(',', '.')) || 0) - (parseFloat(String(b.price).replace(',', '.')) || 0));
          setSelectedVariant(sorted[0]);
        } else {
          setSelectedVariant(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null);
          setLoadError(true);
        }
      });
    return () => { cancelled = true; };
  }, [productId]);

  useEffect(() => {
    if (!product?.videoUrl) return;
    setVideoPosterUrl(null);
    setIsVideoPlaying(false);
    posterCaptured.current = false;

    const videoSrc = product.videoUrl.startsWith('http') ? product.videoUrl : (typeof window !== 'undefined' ? window.location.origin : '') + product.videoUrl;
    const hidden = document.createElement('video');
    hidden.muted = true;
    hidden.playsInline = true;
    hidden.preload = 'metadata';
    hidden.crossOrigin = 'anonymous';
    hidden.className = 'page-product-hidden-video';
    hidden.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = getVideoMimeType(product.videoUrl);
    hidden.appendChild(source);

    const capture = () => {
      if (posterCaptured.current || hidden.videoWidth === 0) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(hidden.videoWidth, 800);
        canvas.height = Math.min(hidden.videoHeight, 800);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(hidden, 0, 0, canvas.width, canvas.height);
          setVideoPosterUrl(canvas.toDataURL('image/jpeg', 0.7));
          posterCaptured.current = true;
        }
      } catch (_) {}
    };

    hidden.addEventListener('loadedmetadata', () => { 
      if (!posterCaptured.current) hidden.currentTime = 0.1; 
    }, { once: true });
    hidden.addEventListener('seeked', capture, { once: true });
    document.body.appendChild(hidden);
    hidden.load();

    setTimeout(() => hidden.remove(), 5000);

    return () => { hidden.remove(); };
  }, [product?.videoUrl]);

  if (loadError) {
    return (
      <div className="page-product page-product-loading">
        <button className="page-product-back-btn" onClick={handleBack} aria-label="Retour">
          <ArrowLeft size={32} />
        </button>
        <div style={{ padding: '80px 20px 20px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif" }}>
          <p style={{ margin: 0, color: '#666' }}>Produit introuvable.</p>
          <button type="button" onClick={handleBack} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>Retour</button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-product page-product-loading">
        <button className="page-product-back-btn" onClick={handleBack} aria-label="Retour">
          <ArrowLeft size={32} />
        </button>
      </div>
    );
  }

  return (
    <div className="page-product">
      {/* Vidéo + preview comme sur la 2e image : image produit ou frame vidéo, plus bouton play */}
      {product.videoUrl ? (
        <div className="page-product-media-container">
          <button type="button" className="page-product-back-btn page-product-back-btn--on-video" onClick={handleBack} aria-label="Retour">
            <ArrowLeft size={24} />
          </button>
          <video
            ref={videoRef}
            key={product.videoUrl}
            controls
            playsInline
            preload="none"
            onLoadedData={(e) => {
              const v = e.currentTarget;
              if (!posterCaptured.current && v.readyState >= 2) v.currentTime = 0.05;
            }}
            onCanPlay={(e) => {
              const v = e.currentTarget;
              if (!posterCaptured.current && v.currentTime === 0) v.currentTime = 0.05;
            }}
            onSeeked={(e) => {
              const v = e.currentTarget;
              if (posterCaptured.current || v.videoWidth === 0) return;
              try {
                const canvas = document.createElement('canvas');
                canvas.width = v.videoWidth;
                canvas.height = v.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(v, 0, 0);
                  setVideoPosterUrl(canvas.toDataURL('image/jpeg', 0.9));
                  posterCaptured.current = true;
                }
              } catch (_) {}
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (posterCaptured.current || v.videoWidth === 0) return;
              if (v.currentTime > 0.03) {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = v.videoWidth;
                  canvas.height = v.videoHeight;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(v, 0, 0);
                    setVideoPosterUrl(canvas.toDataURL('image/jpeg', 0.9));
                    posterCaptured.current = true;
                    v.pause();
                    v.currentTime = 0;
                  }
                } catch (_) {}
              }
            }}
            onPlay={() => setIsVideoPlaying(true)}
            onError={(e) => {
              const videoElement = e.target as HTMLVideoElement;
              console.error('Video error:', videoElement.error?.code, videoElement.error?.message);
            }}
          >
            <source
              src={product.videoUrl.startsWith('http') ? product.videoUrl : (typeof window !== 'undefined' ? window.location.origin : '') + product.videoUrl}
              type={getVideoMimeType(product.videoUrl)}
            />
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
          {/* Overlay preview : uniquement le début de la vidéo (1ère frame), pas l'image produit */}
          {!isVideoPlaying && videoPosterUrl && (
            <div
              className="page-product-video-overlay"
              role="button"
              tabIndex={0}
              onClick={() => { videoRef.current?.play(); setIsVideoPlaying(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); videoRef.current?.play(); setIsVideoPlaying(true); } }}
            >
              <img src={videoPosterUrl} alt="" className="page-product-poster-img" />
              <div className="page-product-play-btn">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      ) : product.image && (
        <div className="page-product-media-container page-product-media-container--image">
          <button type="button" className="page-product-back-btn page-product-back-btn--on-video" onClick={handleBack} aria-label="Retour">
            <ArrowLeft size={24} />
          </button>
          <img src={product.image} alt={product.title} loading="lazy" />
        </div>
      )}

      {!product.videoUrl && !product.image && (
        <button type="button" className="page-product-back-btn" onClick={handleBack} aria-label="Retour">
          <ArrowLeft size={24} />
        </button>
      )}

      <div className="page-product-content">
        <div className="page-product-row">
          {product.tag && (
            <span className="page-product-tag"># {product.tag}</span>
          )}
          {(product.category?.name ?? product.section) && (
            <span className="page-product-category">{product.category?.name ?? product.section}</span>
          )}
        </div>

        <div className="page-product-title-row">
          <h1 className="page-product-title">{product.title.toUpperCase()}</h1>
          <button
            className="page-product-cta-btn"
            onClick={() => {
              const cart = JSON.parse(localStorage.getItem('cart') || '[]');
              const price = selectedVariant ? selectedVariant.price : product.price;
              const unit = product.defaultUnit === 'ml' ? 'ML' : 'G';
              const variantName = selectedVariant ? (selectedVariant.type === 'weight' ? `${selectedVariant.name}${unit}` : selectedVariant.name) : '';
              const title = selectedVariant ? `${product.title} (${variantName})` : product.title;
              const variantId = selectedVariant ? `${product.id}-${selectedVariant.name}` : product.id;
              const existingItem = cart.find((item: any) => item.id === variantId);
              if (existingItem) existingItem.quantity += quantity;
              else cart.push({ id: variantId, title, price, quantity, image: product.image, videoUrl: product.videoUrl });
              localStorage.setItem('cart', JSON.stringify(cart));
              window.dispatchEvent(new Event('cartUpdated'));
              setShowSuccessModal(true);
              setQuantity(1);
            }}
          >
            <ShoppingCart size={32} color="#ffffff" strokeWidth={2.5} />
          </button>
        </div>

        <div className="page-product-desc">
          <p className="page-product-desc-p page-product-desc-p--muted">
            <span className="page-product-desc-label">Description :</span>{' '}
            <FormattedTextWithBreaks text={product.description || ''} />
          </p>
        </div>

        <div className="page-product-variants">
          {product.variants && product.variants.length > 0 ? (
            (() => {
              const sortedVariants = [...product.variants].sort((a, b) => {
                const priceA = parseFloat(String(a.price).replace(',', '.')) || 0;
                const priceB = parseFloat(String(b.price).replace(',', '.')) || 0;
                return priceA - priceB;
              });
              return product.variants.length > 8 ? (
              <select
                className="page-product-select"
                value={Math.max(0, selectedVariant ? sortedVariants.findIndex(v => v.name === selectedVariant?.name && v.price === selectedVariant?.price) : 0)}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  const v = sortedVariants?.[idx];
                  if (v) setSelectedVariant(v);
                }}
              >
                {sortedVariants.map((v, i) => (
                  <option key={i} value={i}>
                    {(v.type === 'weight' ? `${v.name}${product.defaultUnit === 'ml' ? 'ML' : 'G'}` : v.name)} — {v.price}€
                  </option>
                ))}
              </select>
            ) : (
              <div className="page-product-variants-grid">
                {sortedVariants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`page-product-variant-btn ${selectedVariant === v ? 'page-product-variant-selected' : ''}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    <span className="page-product-variant-name">
                      {v.type === 'weight' ? `${v.name}${product.defaultUnit === 'ml' ? 'ML' : 'G'}` : v.name}
                    </span>
                    <span className="page-product-price">{v.price}€</span>
                  </button>
                ))}
              </div>
            );
            })()
          ) : null}

          {(selectedVariant || (!product.variants || product.variants.length === 0)) && (
            <motion.div
              className="page-product-cart-block"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="page-product-top-row">
                <div className="page-product-quantity-control">
                  <span className="page-product-qty-label">QUANTITÉ</span>
                  <div className="page-product-qty-controls">
                    <button
                      type="button"
                      className="page-product-qty-btn"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      −
                    </button>
                    <span className="page-product-qty-value">{quantity}</span>
                    <button
                      type="button"
                      className="page-product-qty-btn"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div className="page-product-total-price">
                  <span className="page-product-total-label">Total</span>
                  <span className="page-product-total-value">
                    {(parseFloat(String(selectedVariant?.price ?? product.price ?? 0)) * quantity).toFixed(2)}€
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="page-product-add-to-cart-btn"
                onClick={() => {
                  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
                  const price = selectedVariant ? selectedVariant.price : product.price;
                  const unit = product.defaultUnit === 'ml' ? 'ML' : 'G';
                  const variantName = selectedVariant ? (selectedVariant.type === 'weight' ? `${selectedVariant.name}${unit}` : selectedVariant.name) : '';
                  const title = selectedVariant ? `${product.title} (${variantName})` : product.title;
                  const variantId = selectedVariant ? `${product.id}-${selectedVariant.name}` : product.id;
                  const existingItem = cart.find((item: any) => item.id === variantId);
                  if (existingItem) existingItem.quantity += quantity;
                  else cart.push({ id: variantId, title, price, quantity, image: product.image, videoUrl: product.videoUrl });
                  localStorage.setItem('cart', JSON.stringify(cart));
                  window.dispatchEvent(new Event('cartUpdated'));
                  setShowSuccessModal(true);
                  setQuantity(1);
                }}
              >
                <span className="page-product-add-to-cart-btn-inner">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                  <span>Ajouter au panier</span>
                </span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
      {/* Modal de succès */}
      {showSuccessModal && (
        <div className="page-product-success-modal-overlay">
          <motion.div 
            className="page-product-success-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="page-product-success-modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            
            <div>
              <h3 className="page-product-success-modal-title">Produit ajouté !</h3>
              <p className="page-product-success-modal-text">Le produit a été ajouté à votre panier avec succès.</p>
            </div>

            <div className="page-product-success-modal-btns">
              <button className="page-product-success-modal-btn-continue" onClick={handleContinueShopping}>
                Continuer les achats
              </button>
              <button type="button" className="page-product-success-modal-btn-cart" onClick={handleGoToCart}>
                <span className="page-product-success-modal-btn-cart-inner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <span>Voir mon panier</span>
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
