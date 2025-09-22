// src/components/Alert.jsx
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const styles = {
  success: {
    wrap: 'bg-emerald-900/85 border border-emerald-700/60 text-emerald-50',
    pill: 'bg-emerald-500 text-white',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-300" />,
    label: 'Success'
  },
  info: {
    wrap: 'bg-blue-900/85 border border-blue-700/60 text-blue-50',
    pill: 'bg-blue-500 text-white',
    icon: <Info className="w-5 h-5 text-blue-300" />,
    label: 'Info'
  },
  warning: {
    wrap: 'bg-amber-900/85 border border-amber-700/60 text-amber-50',
    pill: 'bg-amber-500 text-white',
    icon: <AlertTriangle className="w-5 h-5 text-amber-300" />,
    label: 'Warning'
  },
  danger: {
    wrap: 'bg-rose-900/85 border border-rose-700/60 text-rose-50',
    pill: 'bg-rose-500 text-white',
    icon: <XCircle className="w-5 h-5 text-rose-300" />,
    label: 'Failed'
  }
};

export default function Alert({
  type = 'info',
  text,
  title,
  isOpen = true,
  onClose,
  autoDismiss = 4000,
  position = 'bottom-right' // 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
}) {
  useEffect(() => {
    if (!isOpen || !autoDismiss) return;
    const t = setTimeout(() => onClose?.(), autoDismiss);
    return () => clearTimeout(t);
  }, [isOpen, autoDismiss, onClose]);

  const pos = {
    'bottom-right': 'fixed bottom-5 right-5',
    'top-right': 'fixed top-5 right-5',
    'bottom-left': 'fixed bottom-5 left-5',
    'top-left': 'fixed top-5 left-5'
  }[position];

  const s = styles[type] || styles.info;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`${pos} z-50`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          role="alert"
          aria-live="polite"
        >
          <div className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl ${s.wrap}`}>
            <div className="mt-0.5">{s.icon}</div>
            <div className="min-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.pill}`}>
                  {s.label}
                </span>
                {title && <span className="text-xs font-semibold opacity-90">{title}</span>}
              </div>
              <p className="text-sm leading-snug">{text}</p>
            </div>
            <button
              aria-label="Close alert"
              className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
              onClick={() => onClose?.()}
            >
              <X className="w-4 h-4 opacity-80" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
