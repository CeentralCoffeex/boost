'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  // Maximum vertical distance to consider it a horizontal swipe
  const maxVerticalDistance = 50;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchEndY(null);
    if (e.targetTouches && e.targetTouches[0]) {
      setTouchStart(e.targetTouches[0].clientX);
      setTouchStartY(e.targetTouches[0].clientY);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.targetTouches && e.targetTouches[0]) {
      setTouchEnd(e.targetTouches[0].clientX);
      setTouchEndY(e.targetTouches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;
    
    const distanceX = touchStart - touchEnd;
    const distanceY = Math.abs(touchStartY - touchEndY);
    const isRightSwipe = distanceX < -minSwipeDistance;

    // Right swipe (back)
    const isAdmin = pathname?.startsWith('/administration') || pathname?.startsWith('/admin');
    if (isRightSwipe && distanceY < maxVerticalDistance && pathname !== '/' && !isAdmin) {
      if (pathname?.startsWith('/product/')) {
        window.dispatchEvent(new Event('close-product-overlay'));
      } else if (pathname?.startsWith('/panier') || pathname?.startsWith('/categorie/')) {
        router.push('/');
      } else {
        router.back();
      }
    }
  };

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };
  }, [touchStart, touchEnd, touchStartY, touchEndY, pathname, router]);

  return null;
}
