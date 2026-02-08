'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Heart } from 'lucide-react'
import MobileHero from '@/components/home/MobileHero'
import MobileServiceCarousel from '@/components/home/MobileServiceCarousel'
import MenuBar from '@/components/home/MenuBar'
import ProductThumbnail from '@/components/product/ProductThumbnail'
import '@/styles/index-mobile.css'

// Fonction pour gérer l'affichage HTML en toute sécurité
const safeHtmlContent = (content: any): string => {
  if (!content) return '';
  if (typeof content !== 'string') return '';
  return content;
};

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
        const headers: HeadersInit = {};
        const tgWebApp = (window as any)?.Telegram?.WebApp;
        const initData = tgWebApp?.initData || 
          sessionStorage.getItem('tgInitData') || 
          localStorage.getItem('tgInitData');
        
        if (initData) {
          headers['Authorization'] = `tma ${initData}`;
          headers['X-Telegram-Init-Data'] = initData;
        }

        const res = await fetch(`/api/products/${productId}/like`, { 
          method: 'GET',
          headers,
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
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const tgWebApp = (window as any)?.Telegram?.WebApp;
      const initData = tgWebApp?.initData || 
        sessionStorage.getItem('tgInitData') || 
        localStorage.getItem('tgInitData');
      
      if (initData) {
        headers['Authorization'] = `tma ${initData}`;
        headers['X-Telegram-Init-Data'] = initData;
      }

      const res = await fetch(`/api/products/${productId}/like`, { 
        method: 'POST',
        headers,
        credentials: 'include'
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.alreadyLiked) {
          // Déjà liké, on garde le like actif
          setLiked(true);
        } else {
          // Erreur, on restaure l'état précédent
          setLiked(previousLiked);
          setLikes(previousLikes);
        }
      } else {
        // Succès : le like est confirmé
        setLiked(true);
        if (data.likesCount !== undefined) {
          setLikes(data.likesCount);
        }
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
        <div 
          className="project-subtitle" 
          dangerouslySetInnerHTML={{ __html: safeHtmlContent(subtitle) }}
          style={{ 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any
          }}
        />
        <button className="project-button project-button-details">Voir les détails</button>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [settings, setSettings] = useState<{ featuredRecentIds?: string; featuredTrendingIds?: string }>({})

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/products').then(res => res.json()).then(data => {
        if (!cancelled && Array.isArray(data)) setProducts(data);
      }).catch(() => {}),
      fetch('/api/categories').then(res => res.json()).then(data => {
        if (!cancelled && Array.isArray(data)) setCategories(data);
      }).catch(() => {}),
      fetch('/api/settings').then(res => res.json()).then(data => {
        if (!cancelled && data) setSettings(data);
      }).catch(() => {}),
    ]);
    return () => { cancelled = true; };
  }, []);

  const handleProjectCardClick = (url: string) => {
    router.push(url)
  }

  // IDs manuellement configurés (settings) ou fallback produit.featuredInRecent/Trending
  const parseIds = (json?: string | null): string[] => {
    if (!json) return [];
    try {
      const arr = JSON.parse(json);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch { return []; }
  };

  const featuredRecentIds = parseIds(settings.featuredRecentIds);
  const featuredTrendingIds = parseIds(settings.featuredTrendingIds);

  const getRecentProducts = (limit: number = 6) => {
    const list = Array.isArray(products) ? products : [];
    if (featuredRecentIds.length > 0) {
      const byId = new Map(list.map(p => [p.id, p]));
      return featuredRecentIds
        .map(id => byId.get(id))
        .filter(Boolean)
        .slice(0, limit);
    }
    return [...list]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  const getTrendingProducts = (limit: number = 6) => {
    const list = Array.isArray(products) ? products : [];
    if (featuredTrendingIds.length > 0) {
      const byId = new Map(list.map(p => [p.id, p]));
      return featuredTrendingIds
        .map(id => byId.get(id))
        .filter(Boolean)
        .slice(0, limit);
    }
    const featured = list.filter(p => p.featuredInTrending);
    if (featured.length > 0) return featured.slice(0, limit);
    return list.filter(p => p.section === 'DECOUVRIR').slice(0, limit);
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
                          <img src={category.icon} alt={category.name} className="project-card-category-img" />
                        ) : (
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 21l4-7 4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <h3>{category.name}</h3>
                      <div dangerouslySetInnerHTML={{ __html: safeHtmlContent(category.subtitle) }} />
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
