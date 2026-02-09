'use client';

import React from 'react';

/** Version texte brut sans balises (pour aperçus) */
export function stripFormattedText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\[c=[#a-fA-F0-9]+\](.*?)\[\/c\]/gs, '$1');
}

/**
 * Enlève tout HTML et ne garde que le texte + retours à la ligne.
 */
function stripHtmlKeepNewlines(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const decoded = typeof document !== 'undefined'
    ? (() => { try { const t = document.createElement('textarea'); t.innerHTML = text; return t.value; } catch { return text; } })()
    : text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return decoded.replace(/<[^>]+>/g, '');
}

/**
 * Affiche la description produit : uniquement retours à la ligne conservés, pas de HTML (couleur, gras).
 */
export function FormattedTextWithBreaks({ text, className }: { text: string; className?: string }) {
  if (!text) return <span className={className}></span>;

  const plain = stripHtmlKeepNewlines(text);
  const lines = plain.split('\n');
  const items: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) items.push(<br key={`br-${i}`} />);
    items.push(<React.Fragment key={i}>{line}</React.Fragment>);
  });
  return <span className={className}>{items}</span>;
}
