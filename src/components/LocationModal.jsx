import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function LocationModal({ location, isOpen, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !location) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        aria-modal="true" role="dialog" aria-labelledby="loc-modal-title"
        onMouseDown={(e) => {
          // close on backdrop click (not on panel)
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        />
        {/* Panel */}
        <motion.div
          ref={panelRef}
          className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 m-4 max-w-md w-full border border-slate-700 shadow-2xl"
          initial={{ y: 30, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          aria-labelledby="loc-modal-title" // Adding aria-labelledby for screen reader support
          aria-describedby="loc-modal-description" // Describes the content for screen readers
        >
          <div className="flex items-center justify-between mb-4">
            <h2 id="loc-modal-title" className="text-xl font-bold text-white">
              {location.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-700 transition-colors duration-200 text-slate-300 hover:text-white"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div id="loc-modal-description" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                <span className="text-slate-400 block">Latitude</span>
                <span className="text-white font-mono">{location.lat.toFixed(4)}°</span>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                <span className="text-slate-400 block">Longitude</span>
                <span className="text-white font-mono">{location.lng.toFixed(4)}°</span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <h3 className="text-white font-semibold mb-2">Location Info</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {location.description || 'This is a key location in our global network. Click and explore the connections that span continents.'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-700/50">
                <div className="text-blue-400 text-xs uppercase tracking-wide">Timezone</div>
                <div className="text-white font-semibold text-sm mt-1">{location.timezone || 'UTC+0'}</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 border border-green-700/50">
                <div className="text-green-400 text-xs uppercase tracking-wide">Status</div>
                <div className="text-white font-semibold text-sm mt-1">Active</div>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-700/50">
                <div className="text-purple-400 text-xs uppercase tracking-wide">Region</div>
                <div className="text-white font-semibold text-sm mt-1">{location.region || 'Global'}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-transform hover:scale-[1.02]">
              Connect
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
