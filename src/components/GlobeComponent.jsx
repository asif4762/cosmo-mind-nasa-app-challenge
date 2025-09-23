import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { colors, generateArcsData, locations } from '../constants/locationsData';
import StarsEffect from './StarsEffect';
import { globeConfig } from '../constants/globeConfig';

const GlobeComponent = ({
  dimensions,
  starsData,
  onLocationClick,

  // ✅ You can override these when you use <GlobeComponent ... />
  satellitePath = '/nasa-eos-am-1terra-satellite/source/nasa_eos_am-1terra_satellite.glb',
  albedoPath    = '/nasa-eos-am-1terra-satellite/textures/gltf_embedded_2.png',
  emissivePath  = '/nasa-eos-am-1terra-satellite/textures/gltf_embedded_0.png',

  // Orbit tuning
  orbitAltitudeRatio = 1.50,        // >1 = above surface
  orbitInclinationDeg = 35,         // tilt of orbit plane
  orbitRAANDeg = -20,               // rotation around Y (ascending node)
  orbitalPeriodMs = 30000,          // ~30s per revolution
  orbitThicknessRatio = 0.03,       // ✅ thickness of torus ring (relative to globe radius)
  satelliteScaleRatio = 0.045       // satellite size vs globe radius
}) => {
  const globeRef = useRef(null);

  // UI state
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const idleTimer = useRef(null);

  // Scene adornments
  const haloRef = useRef(null);
  const burstsRef = useRef([]);
  const rafRef = useRef(null);

  // Satellite orbit refs + UI
  const satOrbitRef = useRef({ group: null, pivot: null, mesh: null, ring: null, torus: null });
  const satAnimRef = useRef(null);
  const satAngleRef = useRef(0);
  const satLastTsRef = useRef(0);
  const [satInfoOpen, setSatInfoOpen] = useState(false);

  // Data
  const arcsData = useMemo(() => generateArcsData(), []);
  const points = useMemo(() => locations, []);
  const labelColorFn = useCallback(() => globeConfig.labelColor, []);

  // Helpers
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

  const markUserActive = useCallback(() => {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    setAutoRotate(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      globeRef.current.controls().autoRotate = true;
      setAutoRotate(true);
    }, 5000);
  }, []);

  // Visual FX
  const updateSelectionHalo = useCallback((sel) => {
    const globe = globeRef.current;
    if (!globe) return;

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

    if (sel) {
      const pos = latLngToVector3(sel.lat, sel.lng, 1.01);
      haloRef.current.position.copy(pos);
      const normal = pos.clone().normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      haloRef.current.setRotationFromQuaternion(q);
      haloRef.current.visible = true;
    } else {
      haloRef.current.visible = false;
    }
  }, [latLngToVector3]);

  const spawnBurst = useCallback((lat, lng) => {
    const globe = globeRef.current;
    if (!globe) return;
    const scene = globe.scene();
    const pos = latLngToVector3(lat, lng, 1.03);

    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

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

    const burst = { mesh: points, start: performance.now(), life: 900 };
    burstsRef.current.push(burst);

    if (!rafRef.current) {
      const step = () => {
        const now = performance.now();
        let anyAlive = false;

        burstsRef.current.forEach(b => {
          const elapsed = now - b.start;
          const t = Math.min(1, elapsed / b.life);
          const p = b.mesh.geometry.attributes.position;
          const v = b.mesh.geometry.attributes.velocity;
          for (let i = 0; i < p.count; i++) {
            p.array[i * 3]     += v.array[i * 3] * 0.9;
            p.array[i * 3 + 1] += v.array[i * 3 + 1] * 0.9;
            p.array[i * 3 + 2] += v.array[i * 3 + 2] * 0.9;
          }
          p.needsUpdate = true;
          b.mesh.material.opacity = 0.95 * (1 - t);
          if (elapsed < b.life) anyAlive = true;
        });

        burstsRef.current = burstsRef.current.filter(b => {
          if (now - b.start >= b.life) {
            b.mesh.geometry.dispose();
            b.mesh.material.dispose();
            globeRef.current?.scene().remove(b.mesh);
            return false;
          }
          return true;
        });

        if (anyAlive) rafRef.current = requestAnimationFrame(step);
        else { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      };
      rafRef.current = requestAnimationFrame(step);
    }
  }, [latLngToVector3]);

  // Handlers
  const flyTo = useCallback((lat, lng, altitude = 2) => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat, lng, altitude }, 1000);
  }, []);

  const handlePointClick = useCallback((point, event) => {
    if (!point) return;
    markUserActive();
    flyTo(point.lat, point.lng, 2);
    spawnBurst(point.lat, point.lng);
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

  // Keyboard shortcuts
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
        setSatInfoOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [points, selected, handlePointClick, flyTo, autoRotate, updateSelectionHalo, markUserActive]);

  // Pause auto-rotate on interactions
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const dom = g.controls().domElement;
    const handler = () => markUserActive();
    dom.addEventListener('pointerdown', handler, { passive: true });
    dom.addEventListener('wheel', handler, { passive: true });
    dom.addEventListener('pointermove', handler, { passive: true });
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      dom.removeEventListener('pointerdown', handler);
      dom.removeEventListener('wheel', handler);
      dom.removeEventListener('pointermove', handler);
    };
  }, [markUserActive]);

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

  // --- Satellite orbit setup: GLB + textures + thick torus orbit ---
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
      const orbitRadius = radius * orbitAltitudeRatio;
      const inclination = THREE.MathUtils.degToRad(orbitInclinationDeg);
      const ascNode    = THREE.MathUtils.degToRad(orbitRAANDeg);

      // Group defining the orbit plane
      orbitGroup = new THREE.Group();
      orbitGroup.name = 'satellite-orbit-group';
      orbitGroup.rotation.set(inclination, ascNode, 0);
      scene.add(orbitGroup);

      // Thin guide line (kept for visual sharpness)
      const steps = 256;
      const pts = [];
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius));
      }
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })
      );
      orbitGroup.add(ring);

      // ✅ Thick orbit ring (torus) — THIS is the "thickness"
      const orbitThickness = radius * orbitThicknessRatio; // tweak this value
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(orbitRadius, orbitThickness, 24, 200),
        new THREE.MeshPhysicalMaterial({
          color: 0x7dd3fc,
          roughness: 0.35,
          metalness: 0.2,
          transparent: true,
          opacity: 0.22,
          emissive: new THREE.Color(0x7dd3fc),
          emissiveIntensity: 0.55
        })
      );
      // Torus lies in XY plane by default — spin to XZ to match our line
      torus.rotation.x = Math.PI / 2;
      orbitGroup.add(torus);

      // Pivot that rotates the satellite around Earth
      pivot = new THREE.Object3D();
      orbitGroup.add(pivot);

      // Lazy import GLTFLoader (SSR-safe)
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      loader.load(
        satellitePath,
        async (gltf) => {
          if (disposed) return;
          const sat = gltf.scene;

          // Size satellite relative to globe
          const scale = radius * satelliteScaleRatio;
          sat.scale.setScalar(scale);

          // Start position on orbit
          sat.position.set(orbitRadius, 0, 0);
          sat.lookAt(0, 0, 0);

          // Load & apply textures to ensure color (no gray model)
          const tLoader = new THREE.TextureLoader();
          const loadTex = (url, isColor = false) =>
            new Promise((resolve) => {
              tLoader.load(
                url,
                (tex) => {
                  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
                  tex.flipY = false;
                  tex.anisotropy = 4;
                  resolve(tex);
                },
                undefined,
                () => resolve(null)
              );
            });

          const [colorMap, emissiveMap] = await Promise.all([
            loadTex(albedoPath, true),
            loadTex(emissivePath, true)
          ]);

          sat.traverse((o) => {
            if (!o.isMesh) return;
            if (o.material) {
              if (Array.isArray(o.material)) o.material.forEach(m => m.dispose?.());
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

          pivot.add(sat);
          satOrbitRef.current = { group: orbitGroup, pivot, mesh: sat, ring, torus };
        },
        undefined,
        (err) => console.error('Satellite load error:', err)
      );

      // Animate: revolution
      const angularSpeed = (2 * Math.PI) / orbitalPeriodMs; // rad per ms
      const step = (now) => {
        if (satLastTsRef.current === 0) satLastTsRef.current = now;
        const dt = now - satLastTsRef.current;
        satLastTsRef.current = now;

        satAngleRef.current += dt * angularSpeed;
        if (pivot) pivot.rotation.y = satAngleRef.current;

        if (satOrbitRef.current.mesh) {
          // Keep satellite facing Earth (nice visual)
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
      if (globe && satOrbitRef.current.group) {
        const grp = satOrbitRef.current.group;
        grp.traverse(obj => {
          obj.geometry?.dispose?.();
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
          else obj.material?.dispose?.();
        });
        globe.scene().remove(grp);
      }
      satOrbitRef.current = { group: null, pivot: null, mesh: null, ring: null, torus: null };
    };
  }, [satellitePath, albedoPath, emissivePath, orbitAltitudeRatio, orbitInclinationDeg, orbitRAANDeg, orbitalPeriodMs, orbitThicknessRatio, satelliteScaleRatio]);

  // Click satellite to open info (raycast)
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

  // Label helpers
  const labelSize = useCallback((d) => {
    if (selected?.name === d.name) return globeConfig.labelSize * 1.35;
    if (hovered?.name === d.name) return globeConfig.labelSize * 1.2;
    return globeConfig.labelSize;
  }, [hovered, selected]);

  const labelText = useCallback((d) => `${d.emoji ? d.emoji + ' ' : ''}${d.name}`, []);
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

        // Labels
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

        // Camera caps
        cameraMinDistance={globeConfig.cameraMinDistance}
        cameraMaxDistance={globeConfig.cameraMaxDistance}
      />

      {/* Stars */}
      <StarsEffect globeRef={globeRef} starsData={starsData} />

      {/* HUD — small NASA-flavored badge */}
      <div className="nasa-hud">
        <div className="nasa-hud-badge">NASA</div>
        <div className="nasa-hud-text">Terra • Earth Observing System</div>
      </div>

      {/* Hover tip */}
      {hovered && !selected && (
        <div className="nasa-hover">
          <div className="nasa-hover-title">
            {hovered.emoji ? `${hovered.emoji} ` : ''}{hovered.name}
          </div>
          <div>lat: {hovered.lat.toFixed(2)} · lng: {hovered.lng.toFixed(2)}</div>
          <div className="nasa-hover-sub">Click to explore</div>
        </div>
      )}

      {/* Selected toast */}
      {selected && (
        <div className="nasa-toast">
          <div className="nasa-toast-title">
            {selected.emoji ? `${selected.emoji} ` : ''}{selected.name}
          </div>
          <div>Enter = focus · Esc = clear · Space = auto-rotate</div>
        </div>
      )}

      {/* NASA-themed modal on satellite click */}
      {satInfoOpen && (
        <div className="nasa-backdrop" onClick={() => setSatInfoOpen(false)}>
          <div
            className="nasa-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Terra Instrument Suite"
          >
            <div className="nasa-border-glow" />
            <div className="nasa-bg">
              <div className="nasa-stars nasa-stars-1" />
              <div className="nasa-stars nasa-stars-2" />
              <div className="nasa-scanline" />
            </div>

            <div className="nasa-header">
              <div className="nasa-badge">
                <div className="nasa-badge-ring" />
                <div className="nasa-badge-core">NASA</div>
              </div>
              <div className="nasa-title">
                <div className="nasa-title-main">Terra (EOS AM-1)</div>
                <div className="nasa-title-sub">Instrument Suite — Quick Overview</div>
              </div>
              <button onClick={() => setSatInfoOpen(false)} className="nasa-close" aria-label="Close">×</button>
            </div>

            <div className="nasa-content">
              <Item k="MODIS"  v="Monitors land, oceans, and atmosphere for vegetation, temperature, and clouds." delay={0} />
              <Item k="ASTER"  v="Captures high-resolution images of Earth’s surface for geology and land cover." delay={60} />
              <Item k="CERES"  v="Measures Earth’s energy balance to study climate and clouds." delay={120} />
              <Item k="MISR"   v="Analyzes aerosols, clouds, and surface features from multiple angles." delay={180} />
              <Item k="MOPITT" v="Tracks atmospheric carbon monoxide to monitor air pollution." delay={240} />
            </div>

            <div className="nasa-footer">
              <div className="nasa-dot" />
              <div className="nasa-tip">Tip: Click outside this window or press <b>Esc</b> to close.</div>
              <div className="nasa-chip">Sun-sync orbit</div>
              <div className="nasa-chip">Polar crossing</div>
              <div className="nasa-chip">Climate science</div>
            </div>
          </div>
        </div>
      )}

      {/* NASA styles */}
      <style>{`
        .nasa-hud {
          position: absolute; left: 16px; top: 12px; z-index: 12;
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 999px;
          background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(6px);
          animation: nasaFade .24s ease-out both;
        }
        .nasa-hud-badge {
          width: 26px; height: 26px; border-radius: 999px; background: #e0312c;
          display: grid; place-items: center; font-size: 11px; font-weight: 900; letter-spacing: .4px; color: #fff;
          box-shadow: 0 0 0 2px rgba(224,49,44,.35) inset, 0 4px 10px rgba(224,49,44,.35);
        }
        .nasa-hud-text { color: #d7e8ff; font-size: 12px; opacity: .95 }

        .nasa-hover {
          position: absolute; left: 16px; top: 48px; z-index: 10;
          background: rgba(0,0,0,.6); backdrop-filter: blur(6px); color: #fff;
          padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12);
          font-size: 12px; line-height: 1.3; animation: nasaFade .18s ease-out both;
        }
        .nasa-hover-title { font-weight: 700; margin-bottom: 4px }
        .nasa-hover-sub { opacity: .75; margin-top: 2px }

        .nasa-toast {
          position: absolute; left: 16px; bottom: 16px; z-index: 10;
          background: rgba(0,0,0,.65); backdrop-filter: blur(6px); color: #fff;
          padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12);
          font-size: 12px; animation: nasaSlideUp .22s ease-out both;
        }
        .nasa-toast-title { font-weight: 700; margin-bottom: 4px }

        .nasa-backdrop {
          position: absolute; inset: 0; z-index: 30;
          background: radial-gradient(1200px 600px at 60% 30%, rgba(11,61,145,.35), rgba(0,0,0,.45)), rgba(0,0,0,.45);
          backdrop-filter: blur(3px);
          animation: nasaFade 180ms ease-out both;
          display: grid; place-items: center;
        }
        .nasa-modal {
          width: min(820px, 94vw); max-height: 80vh; overflow: hidden;
          position: relative; border-radius: 18px; background: #0a1426; color: #fff;
          box-shadow: 0 16px 55px rgba(0,0,0,.6); border: 1px solid rgba(255,255,255,.12);
          animation: nasaPop 280ms cubic-bezier(.2,.9,.3,1.2) both;
        }
        .nasa-border-glow {
          pointer-events: none; position: absolute; inset: -2px; border-radius: 20px;
          background: conic-gradient(from 0deg,
            rgba(125,211,252,.0), rgba(125,211,252,.35), rgba(224,49,44,.35),
            rgba(255,255,255,.35), rgba(125,211,252,.35), rgba(125,211,252,.0));
          filter: blur(14px) saturate(140%); opacity: .65; animation: nasaSpinSlow 10s linear infinite;
        }
        .nasa-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden;
          background: radial-gradient(1200px 800px at -10% -20%, rgba(11,61,145,.65), rgba(10,26,47,1) 50%, rgba(6,13,26,1) 70%),
                      linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0));
        }
        .nasa-bg::after {
          content: ''; position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
          background-size: 26px 26px, 26px 26px;
          mask-image: radial-gradient(800px 520px at 20% 10%, rgba(255,255,255,1), transparent 60%);
          opacity: .15; animation: nasaDrift 24s linear infinite;
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
        .nasa-scanline { position: absolute; inset: 0;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,.07), rgba(255,255,255,.07) 1px, transparent 2px);
          mix-blend-mode: overlay; opacity: .05; animation: nasaScan 8s linear infinite;
        }
        .nasa-header { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 16px 18px 10px 18px; }
        .nasa-badge { position: relative; width: 44px; height: 44px; }
        .nasa-badge-core { position: absolute; inset: 6px; border-radius: 999px; background: #e0312c;
          display: grid; place-items: center; font-weight: 900; letter-spacing: .5px; font-size: 13px;
          text-shadow: 0 1px 2px rgba(0,0,0,.4); box-shadow: inset 0 -6px 10px rgba(0,0,0,.25), 0 6px 14px rgba(224,49,44,.35);
        }
        .nasa-badge-ring { position: absolute; inset: 0; border-radius: 999px;
          background: conic-gradient(from 180deg, #7dd3fc, #ffffff, #e0312c, #7dd3fc);
          filter: blur(1px); animation: nasaSpinSlow 6s linear infinite; opacity: .9;
        }
        .nasa-title { display: grid; line-height: 1; }
        .nasa-title-main { font-weight: 900; font-size: 18px; letter-spacing: .2px; }
        .nasa-title-sub { opacity: .9; font-size: 12px; margin-top: 3px; }
        .nasa-close { margin-left: auto; background: transparent; border: none; color: #fff;
          font-size: 22px; cursor: pointer; padding: 2px 6px; transition: transform .18s ease, color .18s ease; }
        .nasa-close:hover { transform: rotate(90deg) scale(1.05); color: #7dd3fc; }

        .nasa-content { position: relative; z-index: 1; padding: 10px 14px 14px 14px; display: grid; gap: 12px;
          border-top: 2px solid rgba(255,255,255,.08); }
        .nasa-item { display: grid; grid-template-columns: 130px 1fr; gap: 12px; align-items: start;
          background: linear-gradient(90deg, rgba(255,255,255,.07), rgba(255,255,255,0));
          padding: 12px 14px; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
          transform-origin: 20% 50%; animation: nasaItem 360ms cubic-bezier(.2,.9,.3,1) both; }
        .nasa-item-key { font-weight: 900; letter-spacing: .3px; text-shadow: 0 1px 2px rgba(0,0,0,.35); }
        .nasa-item-val { opacity: .96 }
        .nasa-item:hover { box-shadow: inset 0 0 0 1px rgba(125,211,252,.35), 0 0 0 3px rgba(125,211,252,.08);
          transform: translateY(-1px) scale(1.01); }

        .nasa-footer { position: relative; z-index: 1; padding: 6px 14px 16px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          border-top: 1px dashed rgba(255,255,255,.12); }
        .nasa-dot { width: 8px; height: 8px; border-radius: 999px; background: #e0312c; box-shadow: 0 0 10px rgba(224,49,44,.6) inset, 0 0 10px rgba(224,49,44,.6); }
        .nasa-tip { font-size: 12px; opacity: .9 }
        .nasa-chip { margin-left: auto; background: linear-gradient(180deg, rgba(125,211,252,.25), rgba(125,211,252,.05));
          border: 1px solid rgba(125,211,252,.35); color: #dff5ff; font-size: 12px; padding: 6px 10px; border-radius: 999px;
          box-shadow: 0 4px 12px rgba(125,211,252,.15); animation: nasaFade 260ms 180ms ease-out both; }

        @keyframes nasaFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes nasaPop { 0% { opacity: 0; transform: translateY(10px) scale(.96) }
          60% { opacity: 1; transform: translateY(0) scale(1.02) } 100% { transform: translateY(0) scale(1) } }
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

// Animated item line used inside modal
function Item({ k, v, delay = 0 }) {
  return (
    <div className="nasa-item" style={{ animationDelay: `${delay}ms` }}>
      <div className="nasa-item-key">{k}</div>
      <div className="nasa-item-val">{v}</div>
    </div>
  );
}

export default GlobeComponent;
