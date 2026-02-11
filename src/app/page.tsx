'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Heart } from 'lucide-react'
import { getTelegramFetchHeaders, waitForTelegramHeaders } from '@/lib/telegram-fetch-headers'
import MobileHero from '@/components/home/MobileHero'
import MobileServiceCarousel from '@/components/home/MobileServiceCarousel'
import MenuBar from '@/components/home/MenuBar'
import ProductThumbnail from '@/components/product/ProductThumbnail'

// Composant Carte Produit - étiquette sur image, bouton Détails redesigné, like
const ProductCard = ({ 
  title, 
  subtitle = '', 
  tag, 
  image,
  videoUrl,
  productId,
  likesCount = 0,
  onClick 
}: { 
  title: string
  subtitle?: string
  tag?: string
  image?: string | null
  videoUrl?: string
  productId?: string
  likesCount?: number
  onClick: () => void 
}) => {
  const hasMedia = !!image || !!videoUrl;
  const [likes, setLikes] = useState(likesCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!productId || hasCheckedRef.current) return;
    
    const checkLikeStatus = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/like`, { 
          method: 'GET',
          headers: getTelegramFetchHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        setLiked(data.liked || false);
        hasCheckedRef.current = true;
      } catch (error) {
        // Erreur silencieuse
      }
    };

    checkLikeStatus();
  }, [productId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked || !productId || loading) return;
    
    setLoading(true);
    const previousLiked = liked;
    const previousLikes = likes;
    
    setLiked(true);
    setLikes(prev => (prev || 0) + 1);

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...getTelegramFetchHeaders() };
      const res = await fetch(`/api/products/${productId}/like`, { 
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.alreadyLiked) {
          setLiked(true);
          if (data.likesCount !== undefined) setLikes(data.likesCount);
        } else {
          setLiked(previousLiked);
          setLikes(previousLikes);
        }
      } else {
        setLiked(true);
        if (data.likesCount !== undefined) setLikes(data.likesCount);
      }
    } catch (error) {
      setLiked(previousLiked);
      setLikes(previousLikes);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-product-card" onClick={onClick}>
      {hasMedia && (
        <div className="project-image-container">
          {tag && <span className="project-tag product-tag-on-image">{tag}</span>}
          <div className="project-icon">
            <ProductThumbnail
              image={image}
              videoUrl={videoUrl}
              alt={title}
              className="project-card-product-img"
              imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
              placeholder={<div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Sans image</div>}
            />
          </div>
          {productId && (
            <button
              className="product-like-btn"
              onClick={handleLike}
              aria-label="J'aime"
            >
              <Heart className={liked ? 'fill-red-500 text-red-500' : ''} />
              <span>{likes}</span>
            </button>
          )}
        </div>
      )}
      <div className="project-content">
        <h3>{title}</h3>
        <p 
          className="project-subtitle" 
          style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any
          }}
        >
          {subtitle}
        </p>
        <button className="project-button project-button-details">Voir les détails</button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false;
    
    // Attendre initData puis charger produits/catégories (évite 403 et "introuvable")
    waitForTelegramHeaders(2500).then((headers) => {
      if (cancelled) return;
      const h = Object.keys(headers).length ? headers : getTelegramFetchHeaders();
      Promise.all([
        fetch('/api/products', { cache: 'no-store', headers: h, credentials: 'include' }).then(res => res.json()).then(data => {
          if (!cancelled) {
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            setProducts(list);
          }
        }).catch(() => {}),
        fetch('/api/categories', { cache: 'no-store', headers: h, credentials: 'include' }).then(res => res.json()).then(data => {
          if (!cancelled) {
            const list = Array.isArray(data) ? data : (data?.data ?? []);
            setCategories(list);
          }
        }).catch(() => {}),
      ]);
    });
    return () => { cancelled = true; };
  }, []);

  const handleProjectCardClick = (url: string) => {
    // Précharger la page avant la navigation
    router.prefetch(url);
    router.push(url);
  }

  const getRecentProducts = (limit: number = 6) => {
    const list = Array.isArray(products) ? products : [];
    return [...list]
      .sort((a, b) => {
        // Trier par prix (du moins cher au plus cher)
        const priceA = parseFloat(String(a.basePrice || a.price || 0).replace(',', '.')) || 0;
        const priceB = parseFloat(String(b.basePrice || b.price || 0).replace(',', '.')) || 0;
        return priceA - priceB;
      })
      .slice(0, limit);
  }

  const getTrendingProducts = (limit: number = 6) => {
    const list = Array.isArray(products) ? products : [];
    
    // Charger les IDs sélectionnés depuis localStorage
    let featuredIds: string[] = [];
    try {
      const saved = localStorage.getItem('admin_featured_trending');
      if (saved) {
        featuredIds = JSON.parse(saved);
      }
    } catch {}
    
    // Si des produits sont sélectionnés, les afficher en priorité
    if (featuredIds.length > 0) {
      const byId = new Map(list.map(p => [p.id, p]));
      return featuredIds
        .map(id => byId.get(id))
        .filter(Boolean)
        .slice(0, limit);
    }
    
    // Sinon, afficher tous les produits de la section DECOUVRIR triés par prix
    return list
      .filter(p => p.section === 'DECOUVRIR')
      .sort((a, b) => {
        const priceA = parseFloat(String(a.basePrice || a.price || 0).replace(',', '.')) || 0;
        const priceB = parseFloat(String(b.basePrice || b.price || 0).replace(',', '.')) || 0;
        return priceA - priceB;
      })
      .slice(0, limit);
  }

  useEffect(() => {
    // Animation d'enfoncement pour les project-card
    const projectCards = document.querySelectorAll('.project-card')
    
    projectCards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.add('clicked')
        setTimeout(() => {
          card.classList.remove('clicked')
        }, 300)
      })
    })

    return () => {
      // Cleanup
    }
  }, [])

  return (
    <>
      <div className="home" style={{
        opacity: 1,
      }}>
        

        
        {/* Contenu principal de la page d'accueil */}
        <div className="content-wrapper">
          
          {/* Hero mobile - toujours affiché */}
          <div className="w-full flex-shrink-0">
            <MobileHero />
          </div>

          <div className="content">
            
            {/* Contenu mobile */}
            <div className="mobile-content">
              {/* Nouveau contenu mobile riche sous les project-cards */}
              <div className="mobile-additional-content">
                
                {/* Section à propos - Remplacée par MobileHero */}
                <div style={{ marginTop: '0px', position: 'relative' }}>
                  {/* MobileHero moved to top */}
                </div>

              </div>

              {/* Section 1: Catégories */}
              <div className="my-projects-section">
                <h2>Catégories</h2>
                <div className="projects-grid">
                  {categories.map((category) => (
                    <div 
                      key={category.id} 
                      className="project-card" 
                      onClick={() => handleProjectCardClick(`/categorie/${category.id}`)}
                    >
                      <div className={`project-icon ${category.icon ? 'project-icon--image' : ''}`}>
                        {category.icon ? (
                          <img src={category.icon} alt={category.name} className="project-card-category-img" loading="lazy" />
                        ) : (
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 21l4-7 4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <h3>{category.name}</h3>
                      <p>{category.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Barre Menu (entre Catégories et Récents) */}
              <div className="flex-shrink-0 w-full" style={{ marginTop: '20px', marginBottom: '20px' }}>
                <MenuBar />
              </div>

              {/* Section 2: Récents */}
              <div className="my-projects-section">
                <h2>Récents</h2>
                <div className="projects-grid">
                  {products.length > 0 ? getRecentProducts(6).map((product) => (
                    <ProductCard 
                      key={product.id}
                      productId={product.id}
                      likesCount={product.likesCount ?? 0}
                      title={product.title || ''}
                      subtitle={product.description || ''}
                      tag={product.category?.name ?? product.category?.parent?.name ?? product.tag ?? ''}
                      image={product.image || undefined}
                      videoUrl={product.videoUrl || undefined}
                      onClick={() => handleProjectCardClick(`/product/${product.id}`)}
                    />
                  )) : (
                    <div style={{ 
                      gridColumn: '1 / -1', 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#666'
                    }}>
                      Chargement des produits...
                    </div>
                  )}
                </div>
              </div>

              {/* Section Services Banners - Slider (Entre Récent et Tendances) */}
              <MobileServiceCarousel />

              {/* Section 3: Tendances */}
              <div className="my-projects-section">
                <h2>Tendances</h2>
                <div className="projects-grid">
                  {products.length > 0 ? getTrendingProducts(6).map((product) => (
                    <ProductCard 
                      key={product.id}
                      productId={product.id}
                      likesCount={product.likesCount ?? 0}
                      title={product.title}
                      subtitle={product.description || ''}
                      tag={product.category?.name ?? product.category?.parent?.name ?? product.tag ?? undefined}
                      image={product.image || undefined}
                      videoUrl={product.videoUrl || undefined}
                      onClick={() => handleProjectCardClick(`/product/${product.id}`)}
                    />
                  )) : (
                    <div style={{ 
                      gridColumn: '1 / -1', 
                      textAlign: 'center', 
                      padding: '40px 20px',
                      color: '#666'
                    }}>
                      Chargement des produits...
                    </div>
                  )}
                </div>
              </div>

            </div>
            

            
            <div className="visual">
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
