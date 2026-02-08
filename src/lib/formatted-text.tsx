'use client';

import React from 'react';

/**
 * Parse **bold** et [c=#hex]texte coloré[/c]
 * Retourne des ReactNode pour affichage
 */
export function parseFormattedText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const colorMatch = remaining.match(/\[c=([#a-fA-F0-9]+)\](.*?)\[\/c\]/s);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/s);
    const colorIdx = colorMatch ? remaining.indexOf('[c=') : -1;
    const boldIdx = boldMatch ? remaining.indexOf('**') : -1;
    let nextIdx = -1;
    let match: RegExpMatchArray | null = null;
    let type: 'color' | 'bold' = 'bold';
    if (colorMatch && (boldIdx < 0 || colorIdx < boldIdx)) {
      nextIdx = colorIdx;
      match = colorMatch;
      type = 'color';
    } else if (boldMatch) {
      nextIdx = boldIdx;
      match = boldMatch;
      type = 'bold';
    }
    if (match && nextIdx >= 0) {
      if (nextIdx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, nextIdx)}</span>);
      }
      if (type === 'color' && match[2] !== undefined) {
        parts.push(
          <span key={key++} style={{ color: match[1] }}>
            {parseFormattedText(match[2])}
          </span>
        );
      } else if (type === 'bold' && match[1] !== undefined) {
        parts.push(
          <strong key={key++}>{parseFormattedText(match[1])}</strong>
        );
      }
      remaining = remaining.slice(nextIdx + (type === 'color' ? match[0].length : match[0].length));
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return parts;
}

/** Version texte brut sans balises (pour aperçus) */
export function stripFormattedText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\[c=[#a-fA-F0-9]+\](.*?)\[\/c\]/gs, '$1');
}

/**
 * Décode les entités HTML
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  if (typeof window === 'undefined') return text;
  try {
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value;
  } catch {
    return text;
  }
}

/**
 * Affiche un texte formaté avec retours à la ligne préservés.
 * Format: **gras**, [c=#hex]couleur[/c], \n pour les sauts de ligne.
 * Supporte aussi le HTML direct généré par le RichTextEditor.
 */
export function FormattedTextWithBreaks({ text, className }: { text: string; className?: string }) {
  // Décoder les entités HTML si elles existent
  const decodedText = decodeHtmlEntities(text);
  
  // Si le texte contient des balises HTML (<b>, <i>, <u>, <span style=...>), on l'affiche directement
  const hasHtmlTags = /<[^>]+>/.test(decodedText);
  
  if (hasHtmlTags) {
    // Remplacer les \n par <br> pour le HTML
    const htmlWithBreaks = decodedText.replace(/\n/g, '<br>');
    return (
      <span 
        className={className} 
        dangerouslySetInnerHTML={{ __html: htmlWithBreaks }}
      />
    );
  }
  
  // Sinon, parser les balises custom **bold** et [c=#hex]...[/c]
  const lines = text.split('\n');
  const items: React.ReactNode[] = [];
  let key = 0;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      items.push(<br key={key++} />);
    } else {
      items.push(
        <span key={key++} style={{ display: 'block' }}>
          {parseFormattedText(trimmed)}
        </span>
      );
    }
  });
  return <span className={className}>{items}</span>;
}
