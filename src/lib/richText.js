// Product text written in the CMS rich-text editor arrives as simple HTML (paragraphs, bold, lists).
// Only admins can write products, and the editor emits a fixed set of tags; this is an extra safety net.

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

/** Strips tags so HTML text can be used in cards and search. */
export function plainText(html = '') {
  return String(html)
    .replace(/<\/(p|li|h[1-6]|div)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/** Drops scripts, event handlers and javascript: links from CMS-authored HTML. */
export function safeHtml(html = '') {
  return String(html)
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

/** Plain text saved before the editor existed has no tags; keep its line breaks. */
export const isHtml = (s = '') => /<[a-z][\s\S]*>/i.test(s);
