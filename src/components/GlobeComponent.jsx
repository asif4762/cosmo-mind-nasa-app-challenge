import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react'; // <-- Added React hooks import
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { colors, generateArcsData, locations } from '../constants/locationsData';
import StarsEffect from './StarsEffect';
import { globeConfig } from '../constants/globeConfig';

const GlobeComponent = ({
  dimensions,
  starsData,
  onLocationClick
}) => {
  const globeRef = useRef(null);

  // UI state
  const [hovered, setHovered] = useState(null);     // {name, lat, lng, ...}
  const [selected, setSelected] = useState(null);   // {name, lat, lng, ...}
  const [autoRotate, setAutoRotate] = useState(true);
  const idleTimer = useRef(null);

  // Scene adornments
  const haloRef = useRef(null);   // selection halo torus
  const burstsRef = useRef([]);   // active particle bursts (for cleanup)
  const rafRef = useRef(null);    // animation loop for bursts

  // --- Satellite orbit refs + UI ---
  const satOrbitRef = useRef({ group: null, pivot: null, mesh: null });
  const satAnimRef = useRef(null);
  const satAngleRef = useRef(0);
  const satLastTsRef = useRef(0);
  const [satInfoOpen, setSatInfoOpen] = useState(false);

  // Memoize static datasets (avoid re-creating on each render)
  const arcsData = useMemo(() => generateArcsData(), []);
  const points = useMemo(() => locations, []);
  const labelColorFn = useCallback(() => globeConfig.labelColor, []);

  // --- Helpers --------------------------------------------------------------

  // Convert lat/lng to a Vector3 on the globe surface (altRatio > 1 = above surface)
  const latLngToVector3 = useCallback((lat, lng, altRatio = 1.0) => {
    const radius = globeRef.current?.getGlobeRadius?.() || 100;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const r = radius * altRatio;
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const z =  r * Math.sin(phi) * Math.sin(theta);
    const y =  r * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }, []);

  // Start/stop idle auto-rotate
  const markUserActive = useCallback(() => {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    setAutoRotate(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      globeRef.current.controls().autoRotate = true;
      setAutoRotate(true);
    }, 5000); // 5s idle → auto-rotate
  }, []);

  // --- Visual FX ------------------------------------------------------------

  // Create/update selection halo (torus) at selected point
  const updateSelectionHalo = useCallback((sel) => {
    const globe = globeRef.current;
    if (!globe) return;

    // ensure a group for halo exists
    if (!haloRef.current) {
      const group = new THREE.Group();
      group.name = 'selection-halo';

      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.14, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.65 })
      );
      group.add(torus);

      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.4, 0.06, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      );
      group.add(innerRing);

      globe.scene().add(group);
      haloRef.current = group;
    }

    // position/orient halo
    if (sel) {
      const pos = latLngToVector3(sel.lat, sel.lng, 1.01);
      haloRef.current.position.copy(pos);

      // Orient torus to be tangent to sphere (normal is pos normalized)
      const normal = pos.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      haloRef.current.setRotationFromQuaternion(q);
      haloRef.current.visible = true;
    } else {
      haloRef.current.visible = false;
    }
  }, [latLngToVector3]);

  // Create a short-lived burst particles effect at lat/lng
  const spawnBurst = useCallback((lat, lng) => {
    const globe = globeRef.current;
    if (!globe) return;

    const scene = globe.scene();
    const pos = latLngToVector3(lat, lng, 1.03);

    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // random tiny sphere directions
    for (let i = 0; i < particleCount; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize().multiplyScalar(0.25 + Math.random() * 0.35);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities[i * 3] = dir.x;
      velocities[i * 3 + 1] = dir.y;
      velocities[i * 3 + 2] = dir.z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xfff3a3,
      size: 0.9,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const points = new THREE.Points(geom, mat);
    points.name = 'burst';
    scene.add(points);

    const burst = { mesh: points, start: performance.now(), life: 900 }; // ms
    burstsRef.current.push(burst);

    // ensure loop running
    if (!rafRef.current) {
      const step = () => {
        const now = performance.now();
        let anyAlive = false;

        burstsRef.current.forEach(b => {
          const elapsed = now - b.start;
          const t = Math.min(1, elapsed / b.life);

          // update positions
          const p = b.mesh.geometry.attributes.position;
          const v = b.mesh.geometry.attributes.velocity;
          for (let i = 0; i < p.count; i++) {
            p.array[i * 3]     += v.array[i * 3] * 0.9;
            p.array[i * 3 + 1] += v.array[i * 3 + 1] * 0.9;
            p.array[i * 3 + 2] += v.array[i * 3 + 2] * 0.9;
          }
          p.needsUpdate = true;

          // fade
          b.mesh.material.opacity = 0.95 * (1 - t);

          if (elapsed < b.life) anyAlive = true;
        });

        // cleanup expired
        burstsRef.current = burstsRef.current.filter(b => {
          if (now - b.start >= b.life) {
            b.mesh.geometry.dispose();
            b.mesh.material.dispose();
            globeRef.current?.scene().remove(b.mesh);
            return false;
          }
          return true;
        });

        if (anyAlive) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }
  }, [latLngToVector3]);

  // --- Handlers -------------------------------------------------------------

  const flyTo = useCallback((lat, lng, altitude = 2) => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat, lng, altitude }, 1000);
  }, []);

  const handlePointClick = useCallback((point, event) => {
    if (!point) return;
    markUserActive();

    // smooth camera & FX
    flyTo(point.lat, point.lng, 2);
    spawnBurst(point.lat, point.lng);

    // plain object for selection (no THREE refs)
    const sel = { name: point.name, lat: point.lat, lng: point.lng, emoji: point.emoji };
    setSelected(sel);
    updateSelectionHalo(sel);

    onLocationClick?.(point, event);
  }, [flyTo, onLocationClick, spawnBurst, updateSelectionHalo, markUserActive]);

  const handleLabelClick = useCallback((label, event) => {
    if (!label) return;
    markUserActive();
    flyTo(label.lat, label.lng, 2);
    spawnBurst(label.lat, label.lng);

    const sel = { name: label.name, lat: label.lat, lng: label.lng, emoji: label.emoji };
    setSelected(sel);
    updateSelectionHalo(sel);

    onLocationClick?.(label, event);
  }, [flyTo, onLocationClick, spawnBurst, updateSelectionHalo, markUserActive]);

  const handlePointHover = useCallback((point) => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.controls().domElement.style.cursor = point ? 'pointer' : 'grab';
    setHovered(point ? { name: point.name, lat: point.lat, lng: point.lng, emoji: point.emoji } : null);
  }, []);

  // Keyboard shortcuts: ←/→ cycle, Enter fly, Space toggle rotate, Esc clear
  useEffect(() => {
    const onKey = (e) => {
      if (!points?.length) return;

      if (['ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        markUserActive();
      }

      const idx = selected ? points.findIndex(p => p.name === selected.name) : -1;

      if (e.key === 'ArrowRight') {
        const next = points[(idx + 1 + points.length) % points.length];
        handlePointClick(next);
      } else if (e.key === 'ArrowLeft') {
        const prev = points[(idx - 1 + points.length) % points.length];
        handlePointClick(prev);
      } else if (e.key === 'Enter' && selected) {
        flyTo(selected.lat, selected.lng, 1.8);
      } else if (e.key === ' ') {
        const g = globeRef.current;
        if (g) {
          const newAR = !autoRotate;
          g.controls().autoRotate = newAR;
          setAutoRotate(newAR);
        }
      } else if (e.key === 'Escape') {
        setSelected(null);
        updateSelectionHalo(null);
        setSatInfoOpen(false); // close modal via Esc too
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [points, selected, handlePointClick, flyTo, autoRotate, updateSelectionHalo, markUserActive]);

  // Pause auto-rotate on user interactions (drag/wheel), then resume after idle
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const dom = g.controls().domElement;
    const handlers = ['pointerdown', 'wheel', 'pointermove'].map(evt =>
      dom.addEventListener(evt, markUserActive, { passive: true })
    );
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      dom.removeEventListener('pointerdown', markUserActive);
      dom.removeEventListener('wheel', markUserActive);
      dom.removeEventListener('pointermove', markUserActive);
    };
  }, [markUserActive]);

  // Keep halo in sync if selected changes externally
  useEffect(() => {
    updateSelectionHalo(selected);
  }, [selected, updateSelectionHalo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      burstsRef.current.forEach(b => {
        b.mesh.geometry?.dispose?.();
        b.mesh.material?.dispose?.();
        globeRef.current?.scene()?.remove(b.mesh);
      });
      burstsRef.current = [];
      if (haloRef.current) {
        haloRef.current.children?.forEach(child => {
          child.geometry?.dispose?.();
          child.material?.dispose?.();
        });
        globeRef.current?.scene()?.remove(haloRef.current);
        haloRef.current = null;
      }
    };
  }, []);

  // --- Satellite orbit setup (GLB + manual textures) ---
  useEffect(() => {
    let disposed = false;
    let orbitGroup = null;
    let pivot = null;

    const init = async () => {
      const globe = globeRef.current;
      if (!globe) return;

      const scene  = globe.scene();
      const radius = globe.getGlobeRadius?.() || 100;

      // Orbit parameters
      const orbitAltitudeRatio = 1.50;                  // >1 => above surface
      const orbitRadius = radius * orbitAltitudeRatio;
      const inclination = THREE.MathUtils.degToRad(35); // tilt of the orbit plane
      const ascNode    = THREE.MathUtils.degToRad(-20); // rotation around Y

      // Group that defines the orbit plane
      orbitGroup = new THREE.Group();
      orbitGroup.name = 'satellite-orbit-group';
      orbitGroup.rotation.set(inclination, ascNode, 0);
      scene.add(orbitGroup);

      // Orbit path (line)
      const steps = 256;
      const pts = [];
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius));
      }
      orbitGroup.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.95 })
      ));

      // Pivot we rotate to move the satellite
      pivot = new THREE.Object3D();
      orbitGroup.add(pivot);

      // Lazy import GLTFLoader so SSR is safe
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        // 🔧 EDIT THESE PATHS (GLB + 2 textures)
        // Serve from your web root (e.g., /public in Next/Vite => URL like /models/xxx)
        '../../public/nasa-eos-am-1terra-satellite/source/nasa_eos_am-1terra_satellite.glb',
        async (gltf) => {
          if (disposed) return;
          const sat = gltf.scene;

          // Bigger satellite ~4.5% of globe radius
          const scale = radius * 0.045;
          sat.scale.setScalar(scale);

          // Position on orbit
          sat.position.set(orbitRadius, 0, 0);
          sat.lookAt(0, 0, 0);

          // --- load and apply the TWO textures ---
          // 🔧 EDIT THESE PATHS to your real files (you said they're in a "textures" folder)
          const ALBEDO_URL   = '../../public/nasa-eos-am-1terra-satellite/textures/gltf_embedded_2.png'; // base color (solid blue)
          const EMISSIVE_URL = '../../public/nasa-eos-am-1terra-satellite/textures/gltf_embedded_0.png'; // grid/tiles (emissive glow)

          const tLoader = new THREE.TextureLoader();
          const loadTex = (url, isColor = false) =>
            new Promise((resolve) => {
              tLoader.load(
                url,
                (tex) => {
                  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
                  tex.flipY = false;      // GLTF UV convention
                  tex.anisotropy = 4;
                  resolve(tex);
                },
                undefined,
                () => resolve(null)
              );
            });

          const [colorMap, emissiveMap] = await Promise.all([
            loadTex(ALBEDO_URL, true),
            loadTex(EMISSIVE_URL, true)
          ]);

          // Replace materials on all meshes so we see the textures
          sat.traverse((o) => {
            if (!o.isMesh) return;

            // Dispose previous materials
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
              else o.material.dispose?.();
            }

            o.material = new THREE.MeshStandardMaterial({
              map: colorMap || null,
              metalness: 0.55,
              roughness: 0.5,
              emissiveMap: emissiveMap || null,
              emissive: emissiveMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
              emissiveIntensity: emissiveMap ? 0.8 : 0.0
            });

            o.castShadow = false;
            o.receiveShadow = false;
          });
          // --- end texture application ---

          pivot.add(sat);
          satOrbitRef.current = { group: orbitGroup, pivot, mesh: sat };
        },
        undefined,
        (err) => console.error('Satellite load error:', err)
      );

      // Animate: one revolution ≈ 30s
      const angularSpeed = (2 * Math.PI) / 30000; // rad per ms
      const step = (now) => {
        if (satLastTsRef.current === 0) satLastTsRef.current = now;
        const dt = now - satLastTsRef.current;
        satLastTsRef.current = now;

        satAngleRef.current += dt * angularSpeed;
        if (pivot) pivot.rotation.y = satAngleRef.current;

        // Keep satellite always facing Earth (optional)
        if (satOrbitRef.current.mesh) {
          satOrbitRef.current.mesh.lookAt(0, 0, 0);
        }

        if (!disposed) satAnimRef.current = requestAnimationFrame(step);
      };
      satAnimRef.current = requestAnimationFrame(step);
    };

    init();

    return () => {
      disposed = true;
      if (satAnimRef.current) cancelAnimationFrame(satAnimRef.current);
      satAnimRef.current = null;

      const globe = globeRef.current;
      if (globe && orbitGroup) {
        // Dispose children (line, GLB meshes/materials)
        orbitGroup.traverse(obj => {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
          else obj.material?.dispose?.();
        });
        globe.scene().remove(orbitGroup);
      }
      satOrbitRef.current = { group: null, pivot: null, mesh: null };
    };
  }, []);

  // --- Click satellite to open NASA info (raycast) ---
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const dom = g.renderer().domElement;
    const camera = g.camera();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const pick = (e) => {
      const sat = satOrbitRef.current?.mesh;
      if (!sat) return;

      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(sat, true);
      if (hits.length) {
        e.preventDefault();
        markUserActive();
        setSatInfoOpen(true);
      }
    };

    const hover = (e) => {
      const sat = satOrbitRef.current?.mesh;
      if (!sat) return;
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(sat, true);
      dom.style.cursor = hits.length ? 'pointer' : (hovered ? 'pointer' : 'grab');
    };

    dom.addEventListener('pointerdown', pick);
    dom.addEventListener('pointermove', hover, { passive: true });
    return () => {
      dom.removeEventListener('pointerdown', pick);
      dom.removeEventListener('pointermove', hover);
    };
  }, [markUserActive, hovered]);

  // Dynamic label size/color (pop on hover/selected)
  const labelSize = useCallback((d) => {
    if (selected?.name === d.name) return globeConfig.labelSize * 1.35;
    if (hovered?.name === d.name) return globeConfig.labelSize * 1.2;
    return globeConfig.labelSize;
  }, [hovered, selected]);

  const labelText = useCallback((d) => {
    return `${d.emoji ? d.emoji + ' ' : ''}${d.name}`;
  }, []);

  const labelColor = useCallback((d) => {
    if (selected?.name === d.name) return '#ffd54a';
    if (hovered?.name === d.name) return '#ffffff';
    return labelColorFn(d);
  }, [hovered, selected, labelColorFn]);

  return (
    <>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}

        // Globe base
        globeImageUrl={globeConfig.globeImageUrl}
        backgroundColor={globeConfig.backgroundColor}
        enablePointerInteraction={globeConfig.enablePointerInteraction}

        // Arcs
        arcsData={arcsData}
        arcStartLat={d => d.startLat}
        arcStartLng={d => d.startLng}
        arcEndLat={d => d.endLat}
        arcEndLng={d => d.endLng}
        arcColor={d => d.color}
        arcStroke={globeConfig.arcStroke}
        arcDashLength={globeConfig.arcDashLength}
        arcDashGap={globeConfig.arcDashGap}
        arcDashAnimateTime={globeConfig.arcDashAnimateTime}
        arcDashInitialGap={() => Math.random()}

        // Points
        pointsData={points}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointColor={() => colors[Math.floor(Math.random() * colors.length)]}
        pointRadius={globeConfig.pointRadius}
        pointAltitude={globeConfig.pointAltitude}
        onPointClick={handlePointClick}
        onPointHover={handlePointHover}

        // Rings
        ringsData={points}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringMaxRadius={globeConfig.ringMaxRadius}
        ringPropagationSpeed={globeConfig.ringPropagationSpeed}
        ringRepeatPeriod={globeConfig.ringRepeatPeriod}
        ringColor={() => colors[Math.floor(Math.random() * colors.length)]}

        // Labels (clickable)
        labelsData={points}
        labelLat={d => d.lat}
        labelLng={d => d.lng}
        labelText={labelText}
        labelSize={labelSize}
        labelColor={labelColor}
        labelAltitude={globeConfig.labelAltitude}
        labelDotRadius={0.34}
        labelResolution={2}
        onLabelClick={handleLabelClick}
        onLabelHover={handlePointHover}

        // Atmosphere
        showAtmosphere={globeConfig.showAtmosphere}
        atmosphereColor={globeConfig.atmosphereColor}
        atmosphereAltitude={globeConfig.atmosphereAltitude}

        // Camera controls caps
        cameraMinDistance={globeConfig.cameraMinDistance}
        cameraMaxDistance={globeConfig.cameraMaxDistance}
      />

      {/* Stars effect stays as-is */}
      <StarsEffect globeRef={globeRef} starsData={starsData} />

      {/* Hover card (fixed UI, no anchor math needed) */}
      {hovered && !selected && (
        <div
          className="pointer-events-none select-none"
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            background: 'rgba(0,0,0,.6)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,.12)',
            fontSize: 12,
            lineHeight: 1.3,
            zIndex: 10
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {hovered.emoji ? `${hovered.emoji} ` : ''}{hovered.name}
          </div>
          <div>lat: {hovered.lat.toFixed(2)} · lng: {hovered.lng.toFixed(2)}</div>
          <div style={{ opacity: 0.75, marginTop: 2 }}>Click to explore</div>
        </div>
      )}

      {/* Selected toast */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            background: 'rgba(0,0,0,.65)',
            backdropFilter: 'blur(6px)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,.12)',
            fontSize: 12,
            zIndex: 10
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {selected.emoji ? `${selected.emoji} ` : ''}{selected.name}
          </div>
          <div>Enter = focus · Esc = clear · Space = auto-rotate</div>
        </div>
      )}

      {/* NASA-themed modal on satellite click */}
      {satInfoOpen && (
        <div
          onClick={() => setSatInfoOpen(false)}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 30,
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 92vw)',
              maxHeight: '80vh',
              overflow: 'auto',
              borderRadius: 16,
              boxShadow: '0 10px 40px rgba(0,0,0,.6)',
              border: '1px solid rgba(255,255,255,.12)',
              background: 'linear-gradient(160deg, #0b3d91 0%, #0a1a2f 60%)',
              color: 'white',
              padding: '18px 20px 16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#e0312c', display: 'grid', placeItems: 'center',
                fontWeight: 800, letterSpacing: 0.5
              }}>NASA</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>Terra (EOS AM-1)</div>
                <div style={{ opacity: .85, fontSize: 12, marginTop: 2 }}>Instrument Suite — Quick Overview</div>
              </div>
              <button
                onClick={() => setSatInfoOpen(false)}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: 18,
                  cursor: 'pointer'
                }}
                aria-label="Close"
                title="Close"
              >×</button>
            </div>

            <div style={{
              borderTop: '2px solid rgba(255,255,255,.1)',
              paddingTop: 12,
              display: 'grid',
              gap: 10
            }}>
              <Item k="MODIS" v="Monitors land, oceans, and atmosphere for vegetation, temperature, and clouds." />
              <Item k="ASTER" v="Captures high-resolution images of Earth’s surface for geology and land cover." />
              <Item k="CERES" v="Measures Earth’s energy balance to study climate and clouds." />
              <Item k="MISR"  v="Analyzes aerosols, clouds, and surface features from multiple angles." />
              <Item k="MOPITT" v="Tracks atmospheric carbon monoxide to monitor air pollution." />
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: '#e0312c' }} />
              <div style={{ fontSize: 12, opacity: .9 }}>
                Tip: Click outside this window or press <b>Esc</b> to close.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Small presentational component for the modal list
function Item({ k, v }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '110px 1fr',
      gap: 10,
      alignItems: 'start',
      background: 'linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,0))',
      padding: '10px 12px',
      borderRadius: 10
    }}>
      <div style={{ fontWeight: 800 }}>{k}</div>
      <div style={{ opacity: .95 }}>{v}</div>
    </div>
  );
}

export default GlobeComponent;
