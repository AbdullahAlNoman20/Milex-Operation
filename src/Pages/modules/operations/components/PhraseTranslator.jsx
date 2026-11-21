// src/Pages/modules/operations/components/PhraseTranslator.jsx
// Translates FIXED system texts (labels, buttons, headings, placeholders) into Bangla / Chinese by exact phrase match.
// Anything that comes from outside (shipment numbers, names, addresses, messages) never matches, so it stays English.
// Elements with translate="no" or data-notranslate are skipped.
import { useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { PHRASE_MAPS, normPhrase } from '../i18n/phrases';

const ATTRS = ['placeholder', 'title', 'aria-label'];
const SKIP = 'script,style,textarea,input,code,pre,[translate="no"],[data-notranslate]';
const original = new WeakMap(); // text node / element → { text } | { attr: value }

const translateNode = (node, map) => {
  if (node.nodeType === 3) {
    const raw = node.nodeValue;
    const key = normPhrase(raw);
    if (!key) return;
    const known = original.get(node);
    const hit = map.get(key) || (known && map.get(normPhrase(known.text)));
    if (hit) {
      if (!known) original.set(node, { text: raw });
      const lead = raw.match(/^\s*/)[0];
      const trail = raw.match(/\s*$/)[0];
      const next = `${lead}${hit}${trail}`;
      if (node.nodeValue !== next) node.nodeValue = next;
    }
    return;
  }
  if (node.nodeType !== 1 || node.closest?.(SKIP)) return;
  ATTRS.forEach((a) => {
    const v = node.getAttribute?.(a);
    if (!v) return;
    const rec = original.get(node) || {};
    const src = rec[a] ?? v;
    const hit = map.get(normPhrase(src));
    if (hit) { original.set(node, { ...rec, [a]: src }); if (v !== hit) node.setAttribute(a, hit); }
  });
};

const walk = (root, map) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = w.currentNode;
  while (n) {
    if (n.nodeType === 3 ? !n.parentElement?.closest(SKIP) : true) translateNode(n, map);
    n = w.nextNode();
  }
};

const restore = (root) => {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = w.currentNode;
  while (n) {
    const rec = original.get(n);
    if (rec) {
      if (n.nodeType === 3 && rec.text !== undefined) n.nodeValue = rec.text;
      else ATTRS.forEach((a) => { if (rec[a] !== undefined) n.setAttribute(a, rec[a]); });
    }
    n = w.nextNode();
  }
};

const PhraseTranslator = () => {
  const { lang } = useLanguage();
  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    if (lang === 'en') { restore(root); return undefined; }
    const map = PHRASE_MAPS[lang];
    if (!map) return undefined;
    let raf = 0;
    const run = () => { raf = 0; walk(root, map); };
    run();
    const obs = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); });
    obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [lang]);
  return null;
};

export default PhraseTranslator;
