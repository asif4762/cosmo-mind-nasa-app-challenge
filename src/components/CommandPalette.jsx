import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Search, X } from 'lucide-react';

const fuse = (query, items) => {
  if (!query) return items.map((t, i) => ({ text: t, score: 0, idx: i }));
  const q = query.trim().toLowerCase();
  return items
    .map((t, i) => {
      const s = t.toLowerCase();
      // tiny “fuzzy”: start match + includes + distance-ish
      const start = s.startsWith(q) ? 0 : 0.5;
      const idx = s.indexOf(q);
      const inc = idx >= 0 ? idx / Math.max(1, s.length) : 1;
      const score = start + inc;
      return { text: t, score, idx: i };
    })
    .filter(r => r.score < 1) // drop non-matches
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
};

export default function CommandPalette({
  open,
  onClose,
  items = [],
  onSelect,
  quickActions = []
}) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => fuse(q, items), [q, items]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = results[active];
        if (chosen) { onSelect?.(chosen.text); onClose?.(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, onClose, onSelect]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-start justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        aria-modal="true" role="dialog" aria-labelledby="cmdk-title"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        aria-activedescendant={`result-${active}`} // Adding aria-activedescendant
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        />
        {/* Command Palette Panel */}
        <motion.div
          className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        >
          {/* Header / Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
            <Search className="w-4 h-4 text-slate-300" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country… (try: Japan, Kenya, Brazil)"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-400"
            />
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
              <Command className="w-3.5 h-3.5" /> K
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-white/10 text-slate-300"
              aria-label="Close"
            ><X className="w-4 h-4" /></button>
          </div>

          {/* Quick Actions */}
          {!!quickActions.length && (
            <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => { qa.onRun?.(); onClose?.(); }}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left text-slate-200 border border-slate-700"
                >
                  <span className="opacity-80">{qa.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{qa.title}</div>
                    {qa.desc && <div className="text-xs text-slate-400">{qa.desc}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-2">
            {results.length === 0 && (
              <li className="px-4 py-3 text-slate-400 text-sm">No matches.</li>
            )}
            {results.map((r, i) => (
              <li key={`${r.text}-${i}`}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => { onSelect?.(r.text); onClose?.(); }}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    i === active ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {r.text}
                </button>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Type a country name, then Enter</span>
            <span>↑↓ to navigate • Esc to close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
