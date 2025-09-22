// src/components/StarsEffect.jsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { starConfig } from '../constants/globeConfig';

export default function StarsEffect({ globeRef, starsData }) {
  const rafRef = useRef(null);
  const pointsRef = useRef(null);

  useEffect(() => {
    if (!globeRef.current || !Array.isArray(starsData) || starsData.length === 0) return;

    const scene = globeRef.current.scene();

    // geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starsData.length * 3);
    const phases = new Float32Array(starsData.length); // for twinkle

    starsData.forEach((s, i) => {
      positions[i * 3] = s.x;
      positions[i * 3 + 1] = s.y;
      positions[i * 3 + 2] = s.z;
      phases[i] = Math.random() * Math.PI * 2;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    // material
    const material = new THREE.PointsMaterial({
      color: starConfig.color,
      size: starConfig.size,
      sizeAttenuation: starConfig.sizeAttenuation,
      transparent: starConfig.transparent,
      opacity: starConfig.opacity,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    pointsRef.current = points;

    // animate (rotate + subtle twinkle)
    let t0 = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = (now - t0) / 1000;
      t0 = now;

      if (pointsRef.current) {
        pointsRef.current.rotation.y += starConfig.rotationSpeed;

        // gentle global twinkle (material-wide)
        const base = starConfig.opacity;
        const twinkle = 0.08 * Math.sin(now * 0.0015);
        pointsRef.current.material.opacity = Math.max(0, Math.min(1, base + twinkle));
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      scene.remove(points);
      geometry.dispose();
      material.dispose();
      pointsRef.current = null;
    };
  }, [globeRef, starsData]);

  return null;
}
