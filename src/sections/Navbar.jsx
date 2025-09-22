// src/sections/Navbar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { navLinks } from '../constants/index.js';

const SkipLink = () => (
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] bg-black/80 text-white px-3 py-2 rounded-lg"
  >
    Skip to content
  </a>
);

const NavItems = ({ activeId, onClick = () => {} }) => {
  return (
    <ul className="flex flex-col sm:flex-row gap-6 sm:gap-8">
      {navLinks.map((item) => {
        const isHash = item.href?.startsWith('#');
        const isActive = isHash && activeId && item.href.replace('#', '') === activeId;

        return (
          <li key={item.id} className="relative group">
            <a
              href={item.href}
              onClick={onClick}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'block font-medium transition-colors outline-none',
                isActive ? 'text-white' : 'text-gray-200 hover:text-white focus:text-white',
                'focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20 rounded'
              ].join(' ')}
            >
              {item.name}
              {/* gradient underline */}
              <span
                className={[
                  'pointer-events-none absolute -bottom-1 left-0 h-[2px] w-0 bg-gradient-to-r from-teal-300 via-blue-300 to-purple-300',
                  'transition-all duration-300 group-hover:w-full',
                  isActive ? 'w-full' : 'w-0'
                ].join(' ')}
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');
  const sheetRef = useRef(null);

  // Toggle handlers
  const toggleMenu = () => setIsOpen((v) => !v);
  const closeMenu = () => setIsOpen(false);

  // Scroll effects: glass + progress
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setScrolled(y > 10);
      const h = document.documentElement;
      const full = (h.scrollHeight - h.clientHeight) || 1;
      setProgress(Math.min(1, Math.max(0, y / full)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section (hash links only)
  const observedIds = useMemo(
    () =>
      navLinks
        .map((l) => (l.href?.startsWith('#') ? l.href.slice(1) : null))
        .filter(Boolean),
    []
  );

  useEffect(() => {
    if (!observedIds.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0.1, 0.25, 0.5, 0.75] }
    );

    observedIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });

    return () => io.disconnect();
  }, [observedIds]);

  // Close mobile sheet on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  // Command Palette button fires a custom event your app can listen for
  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* tiny progress bar */}
      <div
        className="h-[2px] bg-gradient-to-r from-teal-300 via-blue-300 to-purple-300 transition-[width]"
        style={{ width: `${progress * 100}%` }}
      />

      <SkipLink />

      <div
        className={[
          'transition-all',
          'backdrop-blur-md',
          scrolled ? 'bg-black/40 border-b border-white/10' : 'bg-transparent'
        ].join(' ')}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4 relative">
            {/* Logo */}
            <a
              href="/"
              className="text-white font-extrabold tracking-tight text-xl hover:text-gray-200 transition-colors"
              aria-label="Cosmo Minds home"
            >
              COSMO<span className="text-teal-300">Minds</span>
            </a>

            {/* Desktop Nav */}
            <nav className="hidden sm:flex backdrop-blur-md bg-white/10 px-6 py-2 rounded-full absolute left-1/2 -translate-x-1/2 shadow-[0_6px_24px_rgba(0,0,0,0.12)] border border-white/20">
              <NavItems activeId={activeId} />
            </nav>

            {/* Right-side buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={openPalette}
                className="text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-sm"
                title="Open command palette"
              >
                ⌘K
              </button>
              <a
                href="#contact"
                className="text-sm font-semibold text-black bg-gradient-to-r from-teal-300 to-blue-300 hover:from-teal-200 hover:to-blue-200 px-4 py-2 rounded-lg"
              >
                Contact
              </a>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={toggleMenu}
              className="sm:hidden text-gray-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg p-1"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              <img
                src={isOpen ? '/assets/close.svg' : '/assets/menu.svg'}
                alt=""
                className="w-6 h-6"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={[
          'sm:hidden fixed inset-0 z-40 transition-colors',
          isOpen ? 'bg-black/40 backdrop-blur-[2px] pointer-events-auto' : 'bg-transparent pointer-events-none'
        ].join(' ')}
        onClick={closeMenu}
        aria-hidden={!isOpen}
      />

      {/* Mobile sheet */}
      <div
        ref={sheetRef}
        className={[
          'sm:hidden fixed top-[56px] left-0 right-0 z-50 origin-top',
          'transition-transform duration-300 ease-out',
          isOpen ? 'scale-y-100' : 'scale-y-0',
          'bg-white/10 backdrop-blur-md border-t border-white/20 rounded-b-2xl shadow-[0_20px_40px_rgba(0,0,0,0.35)]'
        ].join(' ')}
      >
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-white/90 font-semibold">Menu</span>
            <button
              onClick={() => {
                openPalette();
                closeMenu();
              }}
              className="text-xs text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 px-2 py-1 rounded-md"
            >
              Open Palette ⌘K
            </button>
          </div>
          <NavItems onClick={closeMenu} activeId={activeId} />
          <div className="mt-6 flex items-center gap-3">
            <a
              href="#contact"
              onClick={closeMenu}
              className="flex-1 text-center text-sm font-semibold text-black bg-gradient-to-r from-teal-300 to-blue-300 hover:from-teal-200 hover:to-blue-200 px-4 py-2 rounded-lg"
            >
              Contact
            </a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-sm text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg"
            >
              GitHub
            </a>
          </div>
          <div className="mt-4 text-[11px] text-white/60">v1.0 • Terra Explorer</div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
