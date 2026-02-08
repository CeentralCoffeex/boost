'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { ShoppingBag, User, House, LucideIcon } from 'lucide-react'

interface NavItem {
  path: string
  alt: string
  isImage: boolean
  icon?: string
  Icon?: LucideIcon
}

export default function Footer() {
  const router = useRouter()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [isCartAnimating, setIsCartAnimating] = useState(false)
  
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = localStorage.getItem('cart')
      if (cart) {
        const items = JSON.parse(cart)
        const total = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
        setCartCount(total)
      } else {
        setCartCount(0)
      }
    }
    
    const handleCartUpdate = () => {
      updateCartCount();
      setIsCartAnimating(true);
      setTimeout(() => setIsCartAnimating(false), 600);
    }
    
    updateCartCount()
    window.addEventListener('storage', updateCartCount)
    window.addEventListener('cartUpdated', handleCartUpdate)
    return () => {
      window.removeEventListener('storage', updateCartCount)
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
  }, [])

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleMobileNavigation = (path: string) => {
    router.push(path)
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const navItems: NavItem[] = [
    { path: '/panier', alt: 'Panier', Icon: ShoppingBag, isImage: false },
    { path: '/', alt: 'Accueil', Icon: House, isImage: false },
    { path: '/profil', alt: 'Profil', Icon: User, isImage: false }
  ]

  return (
    <>
      {/* Barre de navigation mobile */}
      <div 
        className="mobile-bottom-box"
        data-expanded={isExpanded}
        onClick={toggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && toggleExpand()}
        aria-expanded={isExpanded}
      >
        <div className="mobile-icons-row">
          {navItems.map((item) => {
            const isActive = 
              (item.path === '/' && (pathname === '/' || pathname === '')) ||
              (item.path === '/profil' && pathname === '/profil') ||
              (item.path === '/panier' && pathname === '/panier');
            
            let showItem = false;
            if (isExpanded) {
              showItem = true;
            } else {
              if (isActive) {
                showItem = true;
              } else {
                const anyActive = navItems.some(i => 
                  (i.path === '/' && (pathname === '/' || pathname === '')) ||
                  (i.path === '/profil' && pathname === '/profil') ||
                  (i.path === '/panier' && pathname === '/panier')
                );
                if (!anyActive && item.path === '/') {
                  showItem = true;
                }
              }
            }

            if (!showItem) return null;

            const Icon = item.Icon;

            return (
              <div 
                key={item.path}
                className={`mobile-icon-item ${isActive ? 'active' : ''} ${item.path === '/panier' && isCartAnimating ? 'cart-bump' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isExpanded) {
                    toggleExpand();
                  } else {
                    handleMobileNavigation(item.path);
                  }
                }}
                onMouseEnter={() => setHoveredIcon(item.path)}
                onMouseLeave={() => setHoveredIcon(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    if (!isExpanded) toggleExpand();
                    else handleMobileNavigation(item.path);
                  }
                }}
              >
                {item.isImage ? (
                  <Image 
                    src={item.icon || ''} 
                    alt={item.alt} 
                    width={24} 
                    height={24}
                  />
                ) : (
                  Icon && (
                    <Icon 
                      size={24} 
                      color={item.path === '/panier' && isCartAnimating ? '#ef4444' : '#fff'}
                    />
                  )
                )}
                
                {item.path === '/panier' && cartCount > 0 && (
                  <span className="mobile-nav-badge">
                    {cartCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  )
}
