import { describe, it, expect } from 'vitest';
import { normalizeChecklists, toggleChecklistItem, toExcerpt } from './Markdown';

describe('normalizeChecklists', () => {
  it('canonicalizes loose checkbox syntax', () => {
    expect(normalizeChecklists('[] a')).toBe('- [ ] a');
    expect(normalizeChecklists('[x] b')).toBe('- [x] b');
    expect(normalizeChecklists('- [ ] c')).toBe('- [ ] c');
  });

  it('leaves fenced code blocks untouched', () => {
    const src = '```\n[] not a task\n```';
    expect(normalizeChecklists(src)).toBe(src);
  });
});

describe('toggleChecklistItem', () => {
  it('flips only the nth checkbox', () => {
    const md = '- [ ] one\n- [ ] two';
    expect(toggleChecklistItem(md, 1)).toBe('- [ ] one\n- [x] two');
  });
});

describe('toExcerpt', () => {
  it('strips markdown but keeps bullets and text', () => {
    const out = toExcerpt('# Title\n- point **bold**');
    expect(out).toContain('• point bold');
    expect(out).not.toContain('#');
    expect(out).not.toContain('**');
  });
});
