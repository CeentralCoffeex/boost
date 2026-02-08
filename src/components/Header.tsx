'use client';
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  
  if (pathname?.startsWith('/admin')) {
    return null;
  }
  
  return (
    <div className={`header-wrapper ${isHome ? "home-header" : ""}`}>
      <div className="header">
        <Link href="/" className="logo logo-link">Accueil</Link>
      </div>
    </div>
  )
}