export const globeConfig = {
  // Globe appearance
  globeImageUrl:
    "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg",
  backgroundColor: "rgba(0,0,0,0)",
  enablePointerInteraction: true,

  // Arc configuration
  arcStroke: 0.2,
  arcDashLength: 0.4,
  arcDashGap: 0.2,
  arcDashAnimateTime: 1000,

  // Points configuration
  pointRadius: 0.5,
  pointAltitude: 0.01,

  // Rings configuration
  ringMaxRadius: 5,
  ringPropagationSpeed: 3,
  ringRepeatPeriod: 1500,

  // Labels configuration
  labelSize: 1,
  labelAltitude: 0.01,
  labelColor: "#ffffff",

  // Atmosphere configuration
  showAtmosphere: true,
  atmosphereColor: "#1e40af",
  atmosphereAltitude: 0.1,

  // Camera configuration
  cameraMinDistance: 120,
  cameraMaxDistance: 800,
};

export const starConfig = {
  color: 0xffffff,
  size: 0.7,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.8,
  rotationSpeed: 0.0005,
};
