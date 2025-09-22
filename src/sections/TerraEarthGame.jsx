import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { Play, Pause, RotateCcw, Info, Thermometer, Zap, Building2, Menu, BookOpen, Command, Sparkles } from 'lucide-react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import CommandPalette from '../components/CommandPalette';
import Alert from '../components/Alert';

// Flipbook + CSS
const TerraBook = lazy(() => import('../components/TerraBook'));
import '../components/terra-book.css';

// Lazy-load the book data per country (match marker names)
const loadCountryBookData = {
  Kenya: () => import('../data/terraBookData_ken'),
  Japan: () => import('../data/terraBookData_jpn'),
  Argentina: () => import('../data/terraBookData_arg'),
  'United States': () => import('../data/terraBookData_usa'),
  Bangladesh: () => import('../data/terraBookData_bgd'),
  Australia: () => import('../data/terraBookData_aus'),
  Brazil: () => import('../data/terraBookData_bra'),
  Canada: () => import('../data/terraBookData_can'),
  Chile: () => import('../data/terraBookData_chl'),
  'United Kingdom': () => import('../data/terraBookData_uk'),
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Right-side book panel (unchanged)
const RightBookPanel = ({ open, countryName, onClose, bookData }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed top-0 right-0 h-screen w-[420px] max-w-[90vw] bg-transparent z-[99998] border-l border-white/10 flex flex-col"
        >
          <div className="flex items-center justify-between px-4 h-12">
            <div className="flex items-center gap-2 text-white">
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-white text-xl leading-none">×</button>
          </div>

          <div className="flex-1 min-h-0">
            <Suspense fallback={<div className="p-4 text-white text-sm">Loading book…</div>}>
              {bookData ? (
                <div className="w-full h-full grid place-items-center">
                  <TerraBook title={bookData.title} subtitle={bookData.subtitle} data={{ countries: bookData.countries }} />
                </div>
              ) : (
                <div className="p-4 text-white/80 text-sm">No storybook found for this country yet.</div>
              )}
            </Suspense>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

const TerraEarthGame = () => {
  const globeEl = useRef();
  const controlRef = useRef();
  const climatePanelRef = useRef();

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [activePanel, setActivePanel] = useState('climate');
  const [yearIndex, setYearIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControlPanel, setShowControlPanel] = useState(true);

  const [showBookPanel, setShowBookPanel] = useState(false);
  const [bookData, setBookData] = useState(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [alert, setAlert] = useState({ open: false, type: 'info', text: '' });

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [panelPosition, setPanelPosition] = useState({ x: 24, y: window.innerHeight - 240 });
  const [climatePanelPosition, setClimatePanelPosition] = useState({ x: 24, y: 24 });

  const draggingRef = useRef(false);
  const draggingClimateRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const years = Array.from({ length: 25 }, (_, i) => 2000 + i);

  // ==== Marker data (mock series) ====
  const countryData = useMemo(
    () => ({
      'United Kingdom': {
        lat: 55.3781, lng: -3.436, emoji: '🇬🇧',
        climate: { temperature: Array(25).fill().map(() => 10 + Math.random() * 5), co2: Array(25).fill().map(() => 500 + Math.random() * 50) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 5)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 3)) },
        urban: { population: Array(25).fill().map(() => 80 + Math.random() * 5) },
      },
      Bangladesh: {
        lat: 23.685, lng: 90.3563, emoji: '🇧🇩',
        climate: { temperature: Array(25).fill().map(() => 25 + Math.random() * 3), co2: Array(25).fill().map(() => 100 + Math.random() * 30) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 2)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 10)) },
        urban: { population: Array(25).fill().map(() => 35 + Math.random() * 5) },
      },
      Australia: {
        lat: -25.2744, lng: 133.7751, emoji: '🇦🇺',
        climate: { temperature: Array(25).fill().map(() => 22 + Math.random() * 5), co2: Array(25).fill().map(() => 300 + Math.random() * 50) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 3)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 2)) },
        urban: { population: Array(25).fill().map(() => 85 + Math.random() * 5) },
      },
      Brazil: {
        lat: -14.235, lng: -51.9253, emoji: '🇧🇷',
        climate: { temperature: Array(25).fill().map(() => 27 + Math.random() * 3), co2: Array(25).fill().map(() => 400 + Math.random() * 50) },
        disasters: { earthquakes: Array(25).fill().map(() => 0), floods: Array(25).fill().map(() => Math.floor(Math.random() * 5)) },
        urban: { population: Array(25).fill().map(() => 90 + Math.random() * 5) },
      },
      Canada: {
        lat: 56.1304, lng: -106.3468, emoji: '🇨🇦',
        climate: { temperature: Array(25).fill().map(() => -5 + Math.random() * 5), co2: Array(25).fill().map(() => 600 + Math.random() * 50) },
        disasters: { earthquakes: Array(25).fill().map(() => 1), floods: Array(25).fill().map(() => Math.floor(Math.random() * 3)) },
        urban: { population: Array(25).fill().map(() => 70 + Math.random() * 5) },
      },
      Kenya: {
        lat: -0.0236, lng: 37.9062, emoji: '🇰🇪',
        climate: { temperature: Array(25).fill().map(() => 23 + Math.random() * 3), co2: Array(25).fill().map(() => 120 + Math.random() * 20) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 1)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 7)) },
        urban: { population: Array(25).fill().map(() => 30 + Math.random() * 7) },
      },
      Japan: {
        lat: 36.2048, lng: 138.2529, emoji: '🇯🇵',
        climate: { temperature: Array(25).fill().map(() => 15 + Math.random() * 3), co2: Array(25).fill().map(() => 450 + Math.random() * 60) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 8)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 5)) },
        urban: { population: Array(25).fill().map(() => 92 + Math.random() * 3) },
      },
      'United States': {
        lat: 37.0902, lng: -95.7129, emoji: '🇺🇸',
        climate: { temperature: Array(25).fill().map(() => 12 + Math.random() * 4), co2: Array(25).fill().map(() => 650 + Math.random() * 70) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 7)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 5)) },
        urban: { population: Array(25).fill().map(() => 82 + Math.random() * 3) },
      },
      Argentina: {
        lat: -38.4161, lng: -63.6167, emoji: '🇦🇷',
        climate: { temperature: Array(25).fill().map(() => 18 + Math.random() * 4), co2: Array(25).fill().map(() => 350 + Math.random() * 60) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 3)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 4)) },
        urban: { population: Array(25).fill().map(() => 91 + Math.random() * 3) },
      },
      Chile: {
        lat: -35.6751, lng: -71.5430, emoji: '🇨🇱',
        climate: { temperature: Array(25).fill().map(() => 14 + Math.random() * 4), co2: Array(25).fill().map(() => 300 + Math.random() * 40) },
        disasters: { earthquakes: Array(25).fill().map(() => Math.floor(Math.random() * 9)), floods: Array(25).fill().map(() => Math.floor(Math.random() * 4)) },
        urban: { population: Array(25).fill().map(() => 88 + Math.random() * 3) },
      },
    }),
    []
  );

  const markerData = useMemo(
    () => Object.entries(countryData).map(([name, data]) => ({
      name, lat: data.lat, lng: data.lng, emoji: data.emoji,
      climate: data.climate, disasters: data.disasters, urban: data.urban,
    })), [countryData]
  );

  // Clean label sprite, no custom RAF (prevents leaks)
  const createMarker = (d) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd54a';
    ctx.fillText(`📍 ${d.name}`, 128, 36);
    const texture = new THREE.CanvasTexture(canvas);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.scale.set(14, 4, 1);
    sprite.userData = { name: d.name }; // avoid deep circular refs
    sprite.raycast = THREE.Sprite.prototype.raycast;

    // subtle ring (static, no RAF)
    const ringGeo = new THREE.RingGeometry(0.35, 0.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, -1.5, 0);
    sprite.add(ring);

    return sprite;
  };

  // auto-rotate
  useEffect(() => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    controls.autoRotate = isPlaying;
    controls.autoRotateSpeed = 0.45;
  }, [isPlaying]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard: Cmd/Ctrl+K opens palette, Esc closes
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Open book by country name
  const openBookForCountry = async (name) => {
    setAlert({ open: true, type: 'info', text: `Loading storybook for ${name}…` });
    setShowBookPanel(true);
    try {
      const loader = loadCountryBookData[name];
      if (loader) {
        const mod = await loader();
        const bd = mod.default ?? mod.bookData;
        setBookData(bd || null);
        if (bd) {
          setAlert({ open: true, type: 'success', text: `Loaded ${name} story.` });
          setTimeout(() => setAlert(a => ({ ...a, open: false })), 1200);
        } else {
          setAlert({ open: true, type: 'warning', text: `No storybook found for ${name} yet.` });
        }
      } else {
        setBookData(null);
        setAlert({ open: true, type: 'warning', text: `No storybook mapping for ${name}.` });
      }
    } catch (e) {
      console.error('Failed to load book:', e);
      setBookData(null);
      setAlert({ open: true, type: 'danger', text: `Couldn't load ${name} story.` });
    }
  };

  const focusCountry = (name) => {
    const d = markerData.find(m => m.name === name);
    if (!d) return;
    setSelectedCountry(d);
    globeEl.current?.pointOfView({ lat: d.lat, lng: d.lng, altitude: 2.2 }, 1000);
  };

  const jumpToCountry = (name) => {
    focusCountry(name);
    openBookForCountry(name);
    setShowControlPanel(true);
  };

  const handleMarkerClick = (d) => {
    setSelectedCountry(d);
    globeEl.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 2.2 }, 1000);
    openBookForCountry(d.name);
    setShowControlPanel(true);
  };

  // drag panels
  const startDrag = (clientX, clientY, type = "control") => {
    if (type === "control") draggingRef.current = true;
    if (type === "climate") draggingClimateRef.current = true;
    lastPosRef.current = { x: clientX, y: clientY };
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
  };
  const stopDrag = () => {
    draggingRef.current = false;
    draggingClimateRef.current = false;
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
  };
  const onWindowPointerMove = (e) => {
    let clientX, clientY;
    if (e.type.startsWith('touch')) {
      if (!e.touches?.length) return;
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else { clientX = e.clientX; clientY = e.clientY; }
    const dx = clientX - lastPosRef.current.x;
    const dy = clientY - lastPosRef.current.y;
    lastPosRef.current = { x: clientX, y: clientY };
    if (draggingRef.current) {
      setPanelPosition((prev) => ({
        x: Math.min(windowSize.width - 340, Math.max(0, prev.x + dx)),
        y: Math.min(windowSize.height - 200, Math.max(0, prev.y + dy)),
      }));
    }
    if (draggingClimateRef.current) {
      setClimatePanelPosition((prev) => ({
        x: Math.min(windowSize.width - 320, Math.max(0, prev.x + dx)),
        y: Math.min(windowSize.height - 400, Math.max(0, prev.y + dy)),
      }));
    }
    if (e.cancelable) e.preventDefault();
  };
  useEffect(() => {
    window.addEventListener('mousemove', onWindowPointerMove);
    window.addEventListener('touchmove', onWindowPointerMove, { passive: false });
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchcancel', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onWindowPointerMove);
      window.removeEventListener('touchmove', onWindowPointerMove);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('touchcancel', stopDrag);
    };
  }, [windowSize]);

  // left analytics panel
  const renderDataPanel = () => {
    if (!selectedCountry) return null;
    const { name, emoji, climate, disasters, urban } = selectedCountry;

    const panels = {
      climate: {
        title: 'Climate',
        icon: <Thermometer className="w-4 h-4" />,
        color: 'from-red-500 to-yellow-400',
        data: [
          { label: 'Temperature (°C)', value: climate.temperature[yearIndex], trend: climate.temperature },
          { label: 'CO₂ Emissions (Mt)', value: climate.co2[yearIndex], trend: climate.co2 },
        ],
      },
      disasters: {
        title: 'Disasters',
        icon: <Zap className="w-4 h-4" />,
        color: 'from-purple-500 to-pink-500',
        data: [
          { label: 'Earthquakes', value: disasters.earthquakes[yearIndex], trend: disasters.earthquakes },
          { label: 'Floods', value: disasters.floods[yearIndex], trend: disasters.floods },
        ],
      },
      urban: {
        title: 'Urbanization',
        icon: <Building2 className="w-4 h-4" />,
        color: 'from-green-400 to-teal-400',
        data: [{ label: 'Urban Population (%)', value: urban.population[yearIndex], trend: urban.population }],
      },
    };

    const currentPanel = panels[activePanel];
    const chartData = {
      labels: years,
      datasets: currentPanel.data.map((item, idx) => ({
        label: item.label,
        data: item.trend,
        fill: false,
        borderColor: ['#F87171', '#8B5CF6', '#10B981'][idx % 3],
        tension: 0.3,
      })),
    };
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { labels: { color: 'white' } },
        title: { display: true, text: currentPanel.title + ' Trends', color: 'white', font: { size: 14 } },
      },
      scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } },
    };

    const isMobile = windowSize.width < 900;

    return (
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ left: `${climatePanelPosition.x}px`, top: `${climatePanelPosition.y}px`, position: 'absolute' }}
        className={`${isMobile ? 'w-[90vw]' : 'w-[360px]'} rounded-xl bg-blue-950/85 p-4 backdrop-blur-sm z-[99997]`}
        ref={climatePanelRef}
      >
        <div
          className="w-full mb-2 pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => startDrag(e.clientX, e.clientY, "climate")}
          onTouchStart={(e) => { if (e.touches?.length) { const t = e.touches[0]; startDrag(t.clientX, t.clientY, "climate"); } }}
        >
          <div className="w-16 h-2 bg-gray-500 rounded-full" />
        </div>

        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold text-lg">{emoji} {name} — {years[yearIndex]}</h3>
          <button onClick={() => setSelectedCountry(null)} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="flex mb-4 flex-wrap gap-1 bg-gray-800 rounded-lg p-1">
          {Object.entries(panels).map(([key, panel]) => (
            <button
              key={key}
              onClick={() => setActivePanel(key)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                activePanel === key ? `bg-gradient-to-r ${panel.color} text-white` : 'text-gray-400 hover:text-white'
              }`}
            >
              {panel.icon}<span className="hidden sm:inline">{panel.title}</span>
            </button>
          ))}
        </div>

        <div className="h-44 mb-4">
          <Line data={chartData} options={chartOptions} />
        </div>

        {currentPanel.data.map((item, idx) => (
          <div key={idx} className="bg-orange-500/80 rounded p-2 mt-2">
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-lg font-bold">{Number(item.value).toFixed(2)}</div>
            <div className="w-full bg-black/30 rounded-full h-2 mt-1">
              <div
                className="bg-white rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${
                    Math.min(100, Math.abs(item.trend[yearIndex]) / Math.max(...item.trend.map(v => Math.abs(v))) * 100)
                  }%`,
                }}
              />
            </div>
          </div>
        ))}
      </motion.div>
    );
  };

  const quickActions = [
    { title: 'Reset view', desc: 'Zoom out & stop panels', icon: <RotateCcw className="w-4 h-4" />, onRun: () => {
      setYearIndex(0); setSelectedCountry(null); setShowBookPanel(false); globeEl.current?.pointOfView({ altitude: 2.6 }, 900);
    }},
    { title: isPlaying ? 'Pause auto-rotate' : 'Play auto-rotate', desc: 'Toggle globe rotation', icon: <Play className="w-4 h-4" />, onRun: () => setIsPlaying(v => !v) },
    { title: 'Show info', desc: 'Open help panel', icon: <Info className="w-4 h-4" />, onRun: () => setShowInfo(true) },
    { title: 'Random country', desc: 'Jump & open story', icon: <Sparkles className="w-4 h-4" />, onRun: () => {
      const keys = Object.keys(countryData); const r = keys[Math.floor(Math.random()*keys.length)];
      jumpToCountry(r);
    }},
  ];

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <Navbar />

      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        objectsData={markerData}
        objectThreeObject={createMarker}
        objectLat={(d) => d.lat}
        objectLng={(d) => d.lng}
        onObjectClick={handleMarkerClick}
        width={windowSize.width}
        height={windowSize.height}
        enablePointerInteraction
      />

      {/* LEFT: Data Panel */}
      <AnimatePresence>{renderDataPanel()}</AnimatePresence>

      {/* RIGHT: Book Panel */}
      <RightBookPanel
        open={showBookPanel}
        countryName={selectedCountry?.name}
        onClose={() => setShowBookPanel(false)}
        bookData={bookData}
      />

      {/* Control Bar (bottom-left) */}
      <AnimatePresence>
        {showControlPanel && (
          <motion.div
            ref={controlRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ left: panelPosition.x, top: panelPosition.y, position: 'absolute', width: 340 }}
            className="pointer-events-auto bg-black/90 backdrop-blur-md p-4 flex flex-col gap-3 w-[340px] rounded-xl z-[99996]"
          >
            <div
              className="w-full flex items-center justify-between cursor-grab mb-3"
              onMouseDown={(e) => startDrag(e.clientX, e.clientY, "control")}
              onTouchStart={(e) => { if (e.touches?.length) { const t = e.touches[0]; startDrag(t.clientX, t.clientY, "control"); } }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-gray-600 rounded-full" />
                <div className="w-8 h-2 bg-gray-600 rounded-full" />
              </div>
              <button onClick={() => setShowControlPanel(false)} className="text-gray-400 hover:text-white font-bold text-xl">×</button>
            </div>

            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPlaying(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-white font-medium text-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => {
                    setYearIndex(0);
                    setSelectedCountry(null);
                    setShowBookPanel(false);
                    globeEl.current?.pointOfView({ altitude: 2.5 }, 1000);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium text-sm"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button
                  onClick={() => setShowInfo(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium text-sm"
                >
                  <Info className="w-4 h-4" /> Info
                </button>
              </div>
              <button
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-white/10 hover:bg-white/20"
                title="Open command palette (⌘K / Ctrl+K)"
              >
                <Command className="w-4 h-4" /> Palette
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">Year:</span>
              <input
                type="range"
                min="0"
                max={years.length - 1}
                value={yearIndex}
                onChange={(e) => setYearIndex(+e.target.value)}
                className="flex-1 accent-teal-500"
              />
              <span className="text-white text-lg font-bold min-w-[4rem]">{years[yearIndex]}</span>

              <button
                onClick={() => setYearIndex(prev => Math.max(0, prev - 1))}
                disabled={yearIndex === 0}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold text-lg flex items-center justify-center"
              >
                −
              </button>

              <button
                onClick={() => setYearIndex(prev => Math.min(years.length - 1, prev + 1))}
                disabled={yearIndex === years.length - 1}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold text-lg flex items-center justify-center"
              >
                +
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={Object.keys(countryData)}
        onSelect={jumpToCountry}
        quickActions={quickActions}
      />

      {/* Tiny hint chip for palette */}
      <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/80 bg-white/10 px-2 py-1 rounded-md absolute top-4 left-4 z-[99994]">
        <Command className="w-3.5 h-3.5" /> K
        <span className="opacity-80">Open palette</span>
      </div>

      {/* Intro Info */}
      {showInfo && (
        <div className={`absolute z-[99995] bg-black/80 backdrop-blur-sm rounded-lg p-4
            ${windowSize.width < 640 ? 'top-0 left-0 w-full rounded-t-lg max-h-[60vh] overflow-y-auto' : 'top-4 right-4 max-w-sm'}`}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-bold text-lg">Terra Earth Explorer</h2>
            <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white">×</button>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            <strong>Drag to rotate</strong> the Earth.<br />
            Click a marker to open the country’s storybook (right) and see 25 years of data (left).<br/>
            Tip: press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">⌘K</kbd> / <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Ctrl+K</kbd> to jump anywhere.
          </p>
          <div className="text-xs text-gray-400">Team CosmoMinds • Terra Data Visualization</div>
        </div>
      )}

      {/* Alerts */}
      <Alert
        isOpen={alert.open}
        type={alert.type}
        text={alert.text}
        onClose={() => setAlert(a => ({ ...a, open: false }))}
        autoDismiss={alert.type === 'info' ? 0 : 2500}
        position="bottom-right"
      />
    </div>
  );
};

export default TerraEarthGame;
