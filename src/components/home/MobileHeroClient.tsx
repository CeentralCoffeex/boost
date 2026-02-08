'use client';

import { Instagram, MessageCircle, Ghost } from 'lucide-react';

function hexToRgb(hex: string): string {
  const h = (hex || '#bef264').replace('#', '');
  if (h.length !== 6) return '190, 242, 100';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

interface SiteSettings {
  heroTitle: string;
  heroSubtitle1: string;
  heroSubtitle2: string;
  heroSubtitle3: string;
  heroTagline: string;
  heroImage: string;
  heroSeparatorColor?: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
}

interface MobileHeroClientProps {
  settings: SiteSettings;
}

/** Hero sans barre Services (déplacée dans la page d'accueil) */
export default function MobileHeroClient({ settings }: MobileHeroClientProps) {
  return (
    <div className="hero-mobile-container relative w-full h-[380px] sm:h-[420px] overflow-visible">
      <img
        src={settings.heroImage || '/hero.png'}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      />

      {/* Contenu haut - position absolue sur l'image */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-6 sm:px-6 sm:pt-8">
        <h2 className={`hero-tagline-outline text-white drop-shadow-lg font-light leading-tight mb-1 font-display whitespace-pre-line ${settings.heroSubtitle1.length > 20 ? 'hero-subtitle-long' : 'hero-subtitle-default'}`}>{settings.heroSubtitle1}</h2>
        <h2 className={`hero-tagline-outline text-white drop-shadow-lg font-bold leading-tight mb-2 font-display whitespace-pre-line ${settings.heroSubtitle3.length > 15 ? 'hero-subtitle-long' : 'hero-subtitle-default'}`}>{settings.heroSubtitle3}</h2>
        
        <p className={`text-white/90 uppercase tracking-[0.3em] mb-3 font-medium font-sans border-l-2 border-white/50 pl-3 hero-tagline-outline ${settings.heroTagline.length > 30 ? 'hero-tagline-small' : 'hero-tagline-default'}`}>
          {settings.heroTagline}
        </p>
      </div>

      {/* Icônes réseaux + barre animée + heroTitle - en bas */}
      <div className="absolute bottom-0 left-0 right-0 z-10 overflow-visible">
        <div className="mobile-social-icons flex justify-center items-center gap-4 mb-2 px-4">
          <a
            href={settings.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon text-white/80 hover:text-white transition-colors"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </a>
          <a
            href={settings.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon text-white/80 hover:text-white transition-colors"
            aria-label="Snapchat"
          >
            <Ghost className="w-5 h-5" />
          </a>
          <a
            href={settings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon text-white/80 hover:text-white transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5" />
          </a>
        </div>

        <div className="hero-separator-full w-full left-0 right-0">
          <div
            className="animated-separator"
            style={{ '--separator-rgb': hexToRgb(settings.heroSeparatorColor || '') } as React.CSSProperties}
          />
        </div>

        <div className="hero-footer-text w-full text-center pt-2 pb-1">
          <h1 className={`hero-title-outline text-white font-black uppercase italic tracking-tighter drop-shadow-lg font-orbitron whitespace-nowrap text-sm sm:text-base ${settings.heroTitle.length > 30 ? 'hero-title-long' : 'hero-title-default'}`}>
            {settings.heroTitle}
          </h1>
        </div>
      </div>
    </div>
  );
}
