import React, { useEffect, useState, useCallback } from 'react';
import LocationModal from '../components/LocationModal';
import GlobeComponent from '../components/GlobeComponent';
import { generateStarsData, locations } from '../constants/locationsData';
import CommandPalette from '../components/CommandPalette';
import Alert from '../components/Alert';
import { Command, Shuffle, Link as LinkIcon, XCircle } from 'lucide-react';

const Hero = () => {
  // Layout & data
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [starsData, setStarsData] = useState([]);

  // Selection & UI
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Command palette & toasts
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success', text: '' });

  // Reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Debounced/RAF resize
  useEffect(() => {
    let raf = null;
    const handleResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Stars + initial loading
  useEffect(() => {
    setStarsData(generateStarsData(prefersReducedMotion ? 400 : 1200));
    const t = setTimeout(() => setIsLoading(false), prefersReducedMotion ? 400 : 900);
    return () => clearTimeout(t);
  }, [prefersReducedMotion]);

  // Deep-link support: #loc=Country%20Name
  useEffect(() => {
    const openFromHash = () => {
      const match = window.location.hash.match(/loc=([^&]+)/i);
      if (!match) return;
      const name = decodeURIComponent(match[1]).trim().toLowerCase();
      const loc = locations.find(l => l.name.toLowerCase() === name);
      if (loc) {
        setSelectedLocation(loc);
        setIsModalOpen(true);
      }
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  // Global keyboard: ⌘K / Ctrl+K to open palette, Esc to close modal/palette
  useEffect(() => {
    const onKey = (e) => {
      const isK = e.key.toLowerCase() === 'k';
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (cmdOrCtrl && isK) {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        if (isModalOpen) handleCloseModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen]);

  // Toast helper
  const showToast = (type, text, ms = 1800) => {
    setToast({ visible: true, type, text });
    if (ms > 0) setTimeout(() => setToast(t => ({ ...t, visible: false })), ms);
  };

  // When a location is clicked on the globe OR chosen in palette
  const handleLocationClick = useCallback((location /*, event */) => {
    setSelectedLocation(location);
    setIsModalOpen(true);
    const nextHash = `#loc=${encodeURIComponent(location.name)}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
    showToast('success', `Opened ${location.name}`);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedLocation(null), 250);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  // Command palette handlers
  const handleSelectFromPalette = (name) => {
    const loc = locations.find(l => l.name === name);
    if (!loc) return showToast('danger', `Location "${name}" not found`);
    handleLocationClick(loc);
  };

  const randomLocation = () => {
    const loc = locations[Math.floor(Math.random() * locations.length)];
    handleLocationClick(loc);
  };

  const clearSelection = () => {
    if (!selectedLocation) return;
    handleCloseModal();
    showToast('success', 'Cleared selection');
  };

  const shareCurrent = async () => {
    try {
      if (!selectedLocation) return showToast('danger', 'No location selected');
      const url = `${window.location.origin}${window.location.pathname}#loc=${encodeURIComponent(selectedLocation.name)}`;
      await navigator.clipboard.writeText(url);
      showToast('success', 'Link copied!');
    } catch {
      showToast('danger', 'Copy failed');
    }
  };

  // Loading state
  if (isLoading || dimensions.width === 0 || dimensions.height === 0) {
    return (
      <section
        className="fixed inset-0 w-screen h-screen flex justify-center items-center bg-[#0c0f1b] overflow-hidden"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -inset-32 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(59,130,246,.25),transparent_60%)]" />
        </div>
        <div className="flex flex-col items-center space-y-4">
          {!prefersReducedMotion ? (
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-12 h-12 border-4 border-blue-500/70 rounded-full" />
          )}
          <p className="text-white text-lg font-medium italic font-mono">Loading Global Network…</p>
        </div>
      </section>
    );
  }

  // Quick actions for the palette
  const quickActions = [
    { title: 'Random location', desc: 'Jump anywhere', icon: <Shuffle className="w-4 h-4" />, onRun: randomLocation },
    { title: selectedLocation ? `Share ${selectedLocation.name}` : 'Share current', desc: 'Copy deep-link', icon: <LinkIcon className="w-4 h-4" />, onRun: shareCurrent },
    { title: 'Clear selection', desc: 'Close details', icon: <XCircle className="w-4 h-4" />, onRun: clearSelection },
  ];

  return (
    <>
      {/* Main Hero Section */}
      <section className="fixed inset-0 w-screen h-screen flex justify-center items-center bg-[#0c0f1b] overflow-hidden">
        {/* Decorative glows for readability */}
        <div className="absolute inset-0 pointer-events-none z-[5]">
          <div className="absolute -inset-40 bg-[radial-gradient(75%_55%_at_50%_0%,rgba(59,130,246,.18),transparent_60%)]" />
          <div className="absolute -inset-40 bg-[radial-gradient(60%_40%_at_20%_80%,rgba(16,185,129,.12),transparent_60%)]" />
        </div>

        {/* Interactive Globe */}
        <GlobeComponent
          dimensions={dimensions}
          starsData={starsData}
          onLocationClick={handleLocationClick}

          /* 🔭 Assets in /public/...  (adjust if your folder differs) */
          satellitePath="/nasa-eos-am-1terra-satellite/source/nasa_eos_am-1terra_satellite.glb"
          albedoPath="/nasa-eos-am-1terra-satellite/textures/gltf_embedded_2.png"
          emissivePath="/nasa-eos-am-1terra-satellite/textures/gltf_embedded_0.png"

          /* ✨ Visual tuning */
          orbitThicknessRatio={0.05}     // thicker glowing ring
          satelliteScaleRatio={0.06}     // slightly bigger satellite
          orbitalPeriodMs={24000}        // a bit faster revolution
          orbitInclinationDeg={35}
          orbitRAANDeg={-20}
          orbitAltitudeRatio={1.5}
        />

        {/* Title / CTA overlay (NASA-ish gradient) */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-teal-200 drop-shadow">
            Terra • Global Story & Data Explorer
          </h1>
          <p className="mt-2 text-slate-300/90 text-sm">
            Explore climate stories & urban heat across the world.
          </p>
        </div>

        {/* Instructions & Palette hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-center">
          <div className="bg-black/40 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-600 inline-flex items-center gap-3">
            <span className="text-slate-300 text-sm">
              🌍 Click locations or labels • 🖱️ Drag to rotate • 📌 Scroll to zoom
            </span>
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-white/90 bg-white/10 px-2 py-1 rounded-md">
              <Command className="w-3.5 h-3.5" /> K
              <span className="opacity-80">Open palette</span>
            </span>
          </div>
        </div>

        {/* Top-right utility buttons */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
          <button
            onClick={() => setPaletteOpen(true)}
            className="text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
            title="Open command palette (⌘K / Ctrl+K)"
          >
            <Command className="w-4 h-4" /> Palette
          </button>

          {selectedLocation && (
            <button
              onClick={shareCurrent}
              className="text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
              title={`Share ${selectedLocation.name}`}
            >
              <LinkIcon className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </section>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={locations.map(l => l.name)}
        onSelect={handleSelectFromPalette}
        quickActions={quickActions}
      />

      {/* Toasts */}
      {toast.visible && <Alert type={toast.type === 'danger' ? 'danger' : 'success'} text={toast.text} />}

      {/* Location Modal */}
      <LocationModal
        location={selectedLocation}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default Hero;
