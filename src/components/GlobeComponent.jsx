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
        // 🔧 Keep your path as-is if it works for you
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
            zIndex: 10,
            animation: 'nasaFade 180ms ease-out both'
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
            zIndex: 10,
            animation: 'nasaSlideUp 220ms ease-out both'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {selected.emoji ? `${selected.emoji} ` : ''}{selected.name}
          </div>
          <div>Enter = focus · Esc = clear · Space = auto-rotate</div>
        </div>
      )}

      {/* NASA-themed modal on satellite click — fancy + animated */}
      {satInfoOpen && (
        <div
          className="nasa-backdrop"
          onClick={() => setSatInfoOpen(false)}
        >
          <div
            className="nasa-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Terra Instrument Suite"
          >
            {/* Animated gradient border */}
            <div className="nasa-border-glow" />

            {/* Animated starry grid bg */}
            <div className="nasa-bg">
              <div className="nasa-stars nasa-stars-1" />
              <div className="nasa-stars nasa-stars-2" />
              <div className="nasa-scanline" />
            </div>

            {/* Header */}
            <div className="nasa-header">
              <div className="nasa-badge">
                <div className="nasa-badge-ring" />
                <div className="nasa-badge-core">NASA</div>
              </div>
              <div className="nasa-title">
                <div className="nasa-title-main">Terra (EOS AM-1)</div>
                <div className="nasa-title-sub">Instrument Suite — Quick Overview</div>
              </div>
              <button
                onClick={() => setSatInfoOpen(false)}
                className="nasa-close"
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="nasa-content">
              <Item k="MODIS"  v="Monitors land, oceans, and atmosphere for vegetation, temperature, and clouds." delay={0} />
              <Item k="ASTER"  v="Captures high-resolution images of Earth’s surface for geology and land cover." delay={60} />
              <Item k="CERES"  v="Measures Earth’s energy balance to study climate and clouds." delay={120} />
              <Item k="MISR"   v="Analyzes aerosols, clouds, and surface features from multiple angles." delay={180} />
              <Item k="MOPITT" v="Tracks atmospheric carbon monoxide to monitor air pollution." delay={240} />
            </div>

            {/* Footer */}
            <div className="nasa-footer">
              <div className="nasa-dot" />
              <div className="nasa-tip">
                Tip: Click outside this window or press <b>Esc</b> to close.
              </div>
              <div className="nasa-chip">Sun-sync orbit</div>
              <div className="nasa-chip">Polar crossing</div>
              <div className="nasa-chip">Climate science</div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Modal CSS & Animations (scoped) */}
      <style>{`
        /* Backdrop */
        .nasa-backdrop {
          position: absolute; inset: 0; z-index: 30;
          background: radial-gradient(1200px 600px at 60% 30%, rgba(11,61,145,.35), rgba(0,0,0,.45)),
                      rgba(0,0,0,.45);
          backdrop-filter: blur(3px);
          animation: nasaFade 180ms ease-out both;
          display: grid; place-items: center;
        }
        /* Modal shell */
        .nasa-modal {
          width: min(820px, 94vw);
          max-height: 80vh; overflow: hidden;
          position: relative;
          border-radius: 18px;
          background: #0a1426; /* fallback behind layers */
          color: #fff;
          box-shadow: 0 16px 55px rgba(0,0,0,.6);
          border: 1px solid rgba(255,255,255,.12);
          animation: nasaPop 280ms cubic-bezier(.2,.9,.3,1.2) both;
        }
        /* Animated gradient border glow using ::before overlay element */
        .nasa-border-glow {
          pointer-events: none;
          position: absolute; inset: -2px;
          border-radius: 20px;
          background: conic-gradient(from 0deg,
            rgba(125,211,252,.0),
            rgba(125,211,252,.35),
            rgba(224,49,44,.35),
            rgba(255,255,255,.35),
            rgba(125,211,252,.35),
            rgba(125,211,252,.0)
          );
          filter: blur(14px) saturate(140%);
          opacity: .65;
          animation: nasaSpinSlow 10s linear infinite;
        }

        /* Background grid + stars + scanline */
        .nasa-bg {
          position: absolute; inset: 0; z-index: 0; overflow: hidden;
          background:
            radial-gradient(1200px 800px at -10% -20%, rgba(11,61,145,.65), rgba(10,26,47,1) 50%, rgba(6,13,26,1) 70%),
            linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0));
        }
        .nasa-bg::after {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
          background-size: 26px 26px, 26px 26px;
          mask-image: radial-gradient(800px 520px at 20% 10%, rgba(255,255,255,1), transparent 60%);
          opacity: .15;
          animation: nasaDrift 24s linear infinite;
        }
        .nasa-stars { position: absolute; inset: -20% -10% -10% -10%; background-repeat: repeat; opacity: .25 }
        .nasa-stars-1 {
          background-image: radial-gradient(1px 1px at 20% 30%, #ffffff 50%, transparent 51%),
                            radial-gradient(1px 1px at 80% 70%, #ffffff 50%, transparent 51%),
                            radial-gradient(1px 1px at 50% 10%, #ffffff 50%, transparent 51%);
          animation: nasaParallax 50s linear infinite;
        }
        .nasa-stars-2 {
          background-image: radial-gradient(1px 1px at 10% 60%, #7dd3fc 50%, transparent 51%),
                            radial-gradient(1px 1px at 70% 20%, #7dd3fc 50%, transparent 51%),
                            radial-gradient(1px 1px at 40% 80%, #7dd3fc 50%, transparent 51%);
          opacity: .2; animation: nasaParallax 90s linear infinite reverse;
        }
        .nasa-scanline {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,.07), rgba(255,255,255,.07) 1px, transparent 2px);
          mix-blend-mode: overlay;
          opacity: .05;
          animation: nasaScan 8s linear infinite;
        }

        /* Header */
        .nasa-header {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px 10px 18px;
        }
        .nasa-badge { position: relative; width: 44px; height: 44px; }
        .nasa-badge-core {
          position: absolute; inset: 6px;
          border-radius: 999px;
          background: #e0312c;
          display: grid; place-items: center;
          font-weight: 900; letter-spacing: .5px; font-size: 13px;
          text-shadow: 0 1px 2px rgba(0,0,0,.4);
          box-shadow: inset 0 -6px 10px rgba(0,0,0,.25), 0 6px 14px rgba(224,49,44,.35);
        }
        .nasa-badge-ring {
          position: absolute; inset: 0; border-radius: 999px;
          background: conic-gradient(from 180deg, #7dd3fc, #ffffff, #e0312c, #7dd3fc);
          filter: blur(1px);
          animation: nasaSpinSlow 6s linear infinite;
          opacity: .9;
        }
        .nasa-title { display: grid; line-height: 1; }
        .nasa-title-main { font-weight: 900; font-size: 18px; letter-spacing: .2px; }
        .nasa-title-sub { opacity: .9; font-size: 12px; margin-top: 3px; }
        .nasa-close {
          margin-left: auto; background: transparent; border: none; color: #fff;
          font-size: 22px; cursor: pointer; padding: 2px 6px;
          transition: transform .18s ease, color .18s ease;
        }
        .nasa-close:hover { transform: rotate(90deg) scale(1.05); color: #7dd3fc; }

        /* Content */
        .nasa-content {
          position: relative; z-index: 1;
          padding: 10px 14px 14px 14px;
          display: grid; gap: 12px;
          border-top: 2px solid rgba(255,255,255,.08);
        }
        .nasa-item {
          display: grid; grid-template-columns: 130px 1fr;
          gap: 12px; align-items: start;
          background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,0));
          padding: 12px 14px; border-radius: 12px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
          transform-origin: 20% 50%;
          animation: nasaItem 360ms cubic-bezier(.2,.9,.3,1) both;
        }
        .nasa-item-key {
          font-weight: 900; letter-spacing: .3px;
          text-shadow: 0 1px 2px rgba(0,0,0,.35);
        }
        .nasa-item-val { opacity: .96 }
        .nasa-item:hover {
          box-shadow: inset 0 0 0 1px rgba(125,211,252,.35), 0 0 0 3px rgba(125,211,252,.08);
          transform: translateY(-1px) scale(1.01);
        }

        /* Footer chips */
        .nasa-footer {
          position: relative; z-index: 1;
          padding: 6px 14px 16px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          border-top: 1px dashed rgba(255,255,255,.12);
        }
        .nasa-dot { width: 8px; height: 8px; border-radius: 999px; background: #e0312c; box-shadow: 0 0 10px rgba(224,49,44,.6) inset, 0 0 10px rgba(224,49,44,.6); }
        .nasa-tip { font-size: 12px; opacity: .9 }
        .nasa-chip {
          margin-left: auto;
          background: linear-gradient(180deg, rgba(125,211,252,.25), rgba(125,211,252,.05));
          border: 1px solid rgba(125,211,252,.35);
          color: #dff5ff; font-size: 12px; padding: 6px 10px; border-radius: 999px;
          box-shadow: 0 4px 12px rgba(125,211,252,.15);
          animation: nasaFade 260ms 180ms ease-out both;
        }

        /* Keyframes */
        @keyframes nasaFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes nasaPop {
          0% { opacity: 0; transform: translateY(10px) scale(.96) }
          60% { opacity: 1; transform: translateY(0) scale(1.02) }
          100% { transform: translateY(0) scale(1) }
        }
        @keyframes nasaSlideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes nasaItem { from { opacity: 0; transform: translateY(12px) scale(.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes nasaSpinSlow { to { transform: rotate(360deg) } }
        @keyframes nasaParallax { to { background-position: -1000px -400px } }
        @keyframes nasaScan { 0% { transform: translateY(-100%) } 100% { transform: translateY(100%) } }
        @keyframes nasaDrift { to { transform: translate(20px, 12px) } }
      `}</style>
    </>
  );
};

// Animated presentational item with delay
function Item({ k, v, delay = 0 }) {
  return (
    <div className="nasa-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="nasa-item-key">{k}</div>
      <div className="nasa-item-val">{v}</div>
    </div>
  );
}

export default GlobeComponent;
