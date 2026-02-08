'use client';

import { useEffect, useState } from 'react';

interface ProductThumbnailProps {
  image?: string | null;
  videoUrl?: string | null;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  imgStyle?: React.CSSProperties;
}

/** Affiche l'image du produit, ou une frame vidéo si pas d'image, ou un placeholder */
export default function ProductThumbnail({
  image,
  videoUrl,
  alt,
  className,
  placeholder,
  imgStyle,
}: ProductThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (!image && videoUrl && !videoError) {
      const fullUrl = videoUrl.startsWith('http') ? videoUrl : (typeof window !== 'undefined' ? window.location.origin : '') + videoUrl;
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(video);

      const captureFrame = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.85));
            }
          } catch (_) {}
        }
        video.remove();
      };

      video.addEventListener('seeked', captureFrame, { once: true });
      video.addEventListener('error', () => {
        setVideoError(true);
        video.remove();
      }, { once: true });
      const seekToFrame = () => {
        video.currentTime = video.duration > 0 ? Math.min(0.15, video.duration * 0.05) : 0.05;
      };
      video.addEventListener('loadedmetadata', seekToFrame, { once: true });
      video.addEventListener('loadeddata', () => {
        if (video.currentTime === 0 && video.readyState >= 2) seekToFrame();
      }, { once: true });
      video.src = fullUrl;
      video.load();

      return () => {
        video.remove();
      };
    }
  }, [videoUrl, image, videoError]);

  if (image) {
    return <img src={image} alt={alt} className={className} style={imgStyle} />;
  }
  if (videoUrl && thumbnailUrl) {
    return <img src={thumbnailUrl} alt={alt} className={className} style={imgStyle} />;
  }
  if (placeholder) {
    return <>{placeholder}</>;
  }
  return (
    <div style={{ color: '#ccc', fontSize: '12px' }}>Sans image</div>
  );
}
