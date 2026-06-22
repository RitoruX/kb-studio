import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// single newlines become <br> so casual notes read naturally without strict markdown
marked.setOptions({ breaks: true, gfm: true });

export default function Markdown({ text, className = '', onToggleTask }) {
  const ref = useRef(null);
  const html = DOMPurify.sanitize(marked.parse(normalizeChecklists(text || '')), { ADD_ATTR: ['checked'] });

  // make GFM task checkboxes interactive (click toggles the source line)
  useEffect(() => {
    if (!ref.current || !onToggleTask) return;
    const boxes = ref.current.querySelectorAll('input[type="checkbox"]');
    const handlers = [];
    boxes.forEach((box, i) => {
      box.disabled = false;
      box.style.cursor = 'pointer';
      const h = (e) => {
        e.stopPropagation(); // don't trigger the surrounding "click to edit"
        onToggleTask(i);
      };
      box.addEventListener('click', h);
      handlers.push([box, h]);
    });
    return () => handlers.forEach(([box, h]) => box.removeEventListener('click', h));
  }, [html, onToggleTask]);

  return <div ref={ref} className={`md-body ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

// forgiving checkbox syntax: turn loose `[]`, `[ ]`, `[x]`, `- []` (with or without a
// bullet, with or without the inner space) into canonical GFM `- [ ] ` / `- [x] `.
// Skips fenced code blocks so code isn't mangled.
export function normalizeChecklists(md = '') {
  let inFence = false;
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const m = line.match(/^(\s*)(?:[-*+]\s+)?\[([ xX]?)\]\s?(.*)$/);
      if (!m) return line;
      const checked = m[2].toLowerCase() === 'x' ? 'x' : ' ';
      return `${m[1]}- [${checked}]${m[3] ? ' ' + m[3] : ''}`;
    })
    .join('\n');
}

// flip the Nth `- [ ]` / `- [x]` checkbox in markdown source (index matches render order)
export function toggleChecklistItem(md = '', index) {
  let i = -1;
  return md
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*[-*+]\s+\[)([ xX])(\].*)$/);
      if (!m) return line;
      i += 1;
      if (i !== index) return line;
      return m[1] + (m[2] === ' ' ? 'x' : ' ') + m[3];
    })
    .join('\n');
}

// readable plain-text excerpt for cards — strips markdown syntax but KEEPS
// line breaks and bullets so a multi-point description stays legible
export function toExcerpt(text = '') {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // drop code fences
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s*>\s?/gm, '') // blockquotes
    .replace(/^\s*(?:[-*+]\s+)?\[[ xX]?\]\s*/gm, '☐ ') // task items -> ☐
    .replace(/^\s*[-*+]\s+/gm, '• ') // bullets -> •
    .replace(/\*\*|__|\*|_|`|~~/g, '') // emphasis markers
    .replace(/[ \t]+/g, ' ') // collapse spaces, but keep newlines
    .replace(/\n{2,}/g, '\n') // collapse blank lines
    .replace(/^\n+|\n+$/g, '') // trim edge newlines
    .trim();
}
