'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface SliderImage {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  order: number;
}

// Placeholder SVG pour les images par défaut (évite 404 sur /images/index/box*.png)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23e5e7eb' width='400' height='200'/%3E%3Ctext fill='%239ca3af' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='18'%3EImage%3C/text%3E%3C/svg%3E";

const defaultServices = [
  { id: '1', title: "WEBSITE", subtitle: "SERVICE", image: PLACEHOLDER_IMAGE, order: 0 },
  { id: '2', title: "DESIGN", subtitle: "SERVICE", image: PLACEHOLDER_IMAGE, order: 1 },
  { id: '3', title: "SECURITY", subtitle: "SERVICE", image: PLACEHOLDER_IMAGE, order: 2 },
];

export default function MobileServiceCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [services, setServices] = useState<SliderImage[]>(defaultServices);

  useEffect(() => {
    // Charger les images depuis l'API
    fetch('/api/slider')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Utiliser les images de l'API (ex: /uploads/xxx.webp)
          setServices(data.map((img: SliderImage) => ({
            ...img,
            image: img.image?.startsWith('/') || img.image?.startsWith('http') ? img.image : PLACEHOLDER_IMAGE,
          })));
        }
      })
      .catch(err => {
        console.error('Error loading slider images:', err);
        // Garder les images par défaut en cas d'erreur
      });
  }, []);

  const currentService = services[currentIndex] ?? services[0];

  if (!currentService) return null;

  return (
    <div className="mobile-services-banners relative w-[90%] max-w-[355px] h-[70px] mx-auto my-6">
      
      <div className="relative w-full h-full overflow-hidden rounded-[16px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] border border-white/10 bg-[#111]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 w-full h-full"
          >
            <div className="w-full h-full relative">
              <Image 
                src={currentService.image} 
                alt={currentService.title} 
                fill
                className="object-cover object-center"
                priority
              />
              
              {/* Text Content Removed */}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      

    </div>
  );
}
