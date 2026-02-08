'use client';

import { useState, useEffect, useRef } from 'react';
// Remplacement de Next/Image par balises img pour éviter l'optimizer
import { ChevronLeft, ChevronDown, ShoppingCart, Cannabis, Check } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import ProductThumbnail from '@/components/product/ProductThumbnail';

interface Product {
  id: string;
  title: string;
  description: string;
  basePrice: string;
  image: string | null;
  videoUrl?: string | null;
  categoryId?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  subtitle: string;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
  subcategories?: Subcategory[];
}

export default function CategoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [subcategoryDropdownOpen, setSubcategoryDropdownOpen] = useState(false);
  const subcategoryDropdownRef = useRef<HTMLDivElement>(null);
  const fetchRef = useRef(0);

  // Extraire l'id depuis le pathname (plus fiable que useParams)
  const id = pathname?.replace(/^\/categorie\/?/, '').split('/')[0]?.trim() || '';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setCategory(null);
      return;
    }
    const generation = ++fetchRef.current;
    setLoading(true);
    fetch(`/api/categories/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (generation !== fetchRef.current) return;
        if (data?.error) {
          setCategory(null);
        } else {
          setCategory(data);
          setSelectedSubcategoryId(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (generation !== fetchRef.current) return;
        setCategory(null);
        setLoading(false);
      });
  }, [id]);

  const handleBack = () => {
    router.push('/');
  };

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (subcategoryDropdownRef.current && !subcategoryDropdownRef.current.contains(target)) {
        setSubcategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subcategories = category?.subcategories || [];
  const selectedSubcategoryName = selectedSubcategoryId
    ? subcategories.find((s) => s.id === selectedSubcategoryId)?.name ?? 'Tous'
    : 'Tous';
  const displayedProducts = selectedSubcategoryId
    ? (category?.products || []).filter((p) => p.categoryId === selectedSubcategoryId)
    : (category?.products || []);

  if (loading) {
    return (
      <div className="page-categorie page-categorie-loading" style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Montserrat', sans-serif"
      }}>
        Chargement...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="page-categorie page-categorie-loading" style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Montserrat', sans-serif"
      }}>
        Catégorie non trouvée
      </div>
    );
  }

  return (
    <div className="page-categorie" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px',
      paddingTop: '80px',
      paddingBottom: '120px'
    }}>
      {/* Header avec bouton retour */}
      <div className="page-categorie-header" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: '20px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <button
          onClick={handleBack}
          className="page-categorie-back page-categorie-back-btn"
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
          <ChevronLeft size={28} strokeWidth={2} color="#333" className="page-categorie-back-icon" />
        </button>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '24px',
          fontWeight: '700',
          color: '#333',
          margin: 0,
          textTransform: 'uppercase'
        }}>
          {category.name}
        </h1>
      </div>

      {/* Sous-catégories - sélecteur centré en haut, design propre (style photo) */}
      {subcategories.length > 0 && (
        <div className="page-categorie-selector-row">
          <div ref={subcategoryDropdownRef} className="page-categorie-subcategory-wrapper">
            <button
              type="button"
              onClick={() => setSubcategoryDropdownOpen(!subcategoryDropdownOpen)}
              className="page-categorie-subcategory-trigger"
              aria-expanded={subcategoryDropdownOpen}
              aria-haspopup="listbox"
            >
              <Cannabis size={18} strokeWidth={2} className="page-categorie-subcategory-icon" />
              <span className="page-categorie-subcategory-label">{selectedSubcategoryName}</span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                className={`page-categorie-subcategory-chevron ${subcategoryDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {subcategoryDropdownOpen && (
              <div className="page-categorie-subcategory-dropdown" role="listbox">
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedSubcategoryId === null}
                  className={`page-categorie-subcategory-item ${selectedSubcategoryId === null ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSubcategoryId(null);
                    setSubcategoryDropdownOpen(false);
                  }}
                >
                  <span>Tous</span>
                  {selectedSubcategoryId === null && <Check size={16} strokeWidth={2.5} className="page-categorie-subcategory-check" />}
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    role="option"
                    aria-selected={selectedSubcategoryId === sub.id}
                    className={`page-categorie-subcategory-item ${selectedSubcategoryId === sub.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedSubcategoryId(sub.id);
                      setSubcategoryDropdownOpen(false);
                    }}
                  >
                    <span>{sub.name}</span>
                    {selectedSubcategoryId === sub.id && <Check size={16} strokeWidth={2.5} className="page-categorie-subcategory-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liste des produits */}
      {displayedProducts.length === 0 ? (
        <div style={{
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div className="page-categorie-empty" style={{
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
              margin: 0,
              fontFamily: "'Montserrat', sans-serif"
            }}>
              Aucun produit dans cette catégorie
            </p>
          </div>
        </div>
      ) : (
        <>
          {displayedProducts.map((product) => (
            <div 
              key={product.id} 
              className="page-categorie-card"
              onClick={() => handleProductClick(product.id)}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '15px',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                gap: '15px',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {/* Image ou frame vidéo */}
              <div className="page-categorie-card-img" style={{
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
                  image={product.image}
                  videoUrl={product.videoUrl}
                  alt={product.title}
                  imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  placeholder={<div style={{ color: '#ccc', fontSize: '12px' }}>Sans image</div>}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                {(product.categoryId ? (subcategories.find(s => s.id === product.categoryId)?.name ?? category.name) : category.name) && (
                  <span className="page-categorie-card-category">
                    {product.categoryId ? (subcategories.find(s => s.id === product.categoryId)?.name ?? category.name) : category.name}
                  </span>
                )}
                <h3 style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  margin: '0 0 4px 0'
                }}>
                  {product.title || ''}
                </h3>
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '14px',
                  color: '#666',
                  margin: '0 0 4px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {product.description || ''}
                </p>
                <p style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  margin: 0
                }}>
                  {product.basePrice}€
                </p>
              </div>

              {/* Icon Cart */}
              <div className="page-categorie-card-cart" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
              }}>
                 <ShoppingCart size={20} color="#333" className="page-categorie-cart-icon" />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
