'use client';

import MobileHeroClient from './MobileHeroClient';
import { useEffect, useState } from 'react';
import { getTelegramFetchHeaders } from '@/lib/telegram-fetch-headers';

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

export default function MobileHero() {
  const [settings, setSettings] = useState<SiteSettings>({
    heroTitle: '',
    heroSubtitle1: 'Exclusive',
    heroSubtitle2: 'Boutique',
    heroSubtitle3: 'Hotel',
    heroTagline: 'Luxury Experience',
    heroImage: '/hero.png',
    facebookUrl: 'https://facebook.com',
    twitterUrl: 'https://twitter.com',
    instagramUrl: 'https://instagram.com',
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Charger depuis cache si disponible
    try {
      const cached = localStorage.getItem('siteSettings');
      if (cached) {
        setSettings(JSON.parse(cached));
      }
    } catch (e) {
      // Ignore errors
    }

    // Puis charger depuis l'API
    fetch('/api/settings', { headers: getTelegramFetchHeaders(), credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        // Mettre en cache
        try {
          localStorage.setItem('siteSettings', JSON.stringify(data));
        } catch (e) {
          // Ignore storage errors
        }
      })
      .catch(err => {
        console.error('Error loading settings:', err);
      });
  }, []);

  if (!mounted) {
    return <div style={{ minHeight: '320px', background: '#000' }} />;
  }
  
  return <MobileHeroClient settings={settings} />;
}

