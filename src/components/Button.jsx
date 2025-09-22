// src/components/Button.jsx
import React from 'react';

const cx = (...c) => c.filter(Boolean).join(' ');

const VARIANT = {
  primary:
    'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-lg shadow-teal-500/20',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600',
  outline:
    'border border-teal-400 text-teal-300 hover:bg-teal-400/10',
  ghost:
    'bg-transparent hover:bg-white/10 text-white border border-white/10',
};

const SIZE = {
  sm: 'text-sm px-3 py-1.5 rounded-md',
  md: 'text-sm px-4 py-2.5 rounded-lg',
  lg: 'text-base px-5 py-3 rounded-xl',
};

export default function Button({
  name,
  variant = 'primary',
  size = 'md',
  isBeam = false,
  isLoading = false,
  startIcon = null,
  endIcon = null,
  fullWidth = false,
  containerClass = '',
  disabled = false,
  ...props
}) {
  const content = (
    <>
      {isBeam && (
        <span className="relative mr-2 inline-flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-teal-300 opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      )}

      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      )}

      {startIcon && <span className="mr-2 inline-flex">{startIcon}</span>}
      <span>{name}</span>
      {endIcon && <span className="ml-2 inline-flex">{endIcon}</span>}
    </>
  );

  return (
    <button
      type="button"
      className={cx(
        'group relative inline-flex items-center justify-center select-none',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70',
        VARIANT[variant], SIZE[size], fullWidth && 'w-full',
        isLoading && 'opacity-90 cursor-wait',
        disabled && 'opacity-60 cursor-not-allowed',
        containerClass
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {/* soft beam glow on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'radial-gradient(120px 60px at var(--x,50%) var(--y,50%), rgba(255,255,255,0.18), transparent 60%)'
        }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
          e.currentTarget.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      />
      {content}
    </button>
  );
}
