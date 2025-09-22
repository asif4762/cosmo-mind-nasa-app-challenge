export const locations = [
  {
    id: 1,
    name: "Washington, D.C., USA",
    lat: 38.9072,
    lng: -77.0369,
    timezone: "UTC-5",
    region: "North America",
    description:
      "Capital of the United States, a hub for politics and global diplomacy.",
  },
  {
    id: 2,
    name: "Ottawa, Canada",
    lat: 45.4215,
    lng: -75.6972,
    timezone: "UTC-5",
    region: "North America",
    description:
      "Canada's capital, known for tech growth and government institutions.",
  },
  {
    id: 3,
    name: "London, UK",
    lat: 51.5074,
    lng: -0.1278,
    timezone: "UTC+0",
    region: "Europe",
    description:
      "Financial technology capital, leading in blockchain and digital banking.",
  },
  {
    id: 4,
    name: "Berlin, Germany",
    lat: 52.52,
    lng: 13.405,
    timezone: "UTC+1",
    region: "Europe",
    description:
      "European startup capital, strong in AI, mobility, and clean technology.",
  },
  {
    id: 5,
    name: "Paris, France",
    lat: 48.8566,
    lng: 2.3522,
    timezone: "UTC+1",
    region: "Europe",
    description:
      "Cultural and technological hub, leading in fashion-tech and green innovation.",
  },
  {
    id: 6,
    name: "Tokyo, Japan",
    lat: 35.6762,
    lng: 139.6503,
    timezone: "UTC+9",
    region: "Asia",
    description:
      "Global technology leader, pioneering robotics and advanced manufacturing.",
  },
  {
    id: 7,
    name: "Beijing, China",
    lat: 39.9042,
    lng: 116.4074,
    timezone: "UTC+8",
    region: "Asia",
    description:
      "China's capital, a powerhouse of tech, finance, and global trade.",
  },
  {
    id: 8,
    name: "Chittagong, Bangladesh",
    lat: 22.3569,
    lng: 91.7832,
    timezone: "UTC+6",
    region: "South Asia",
    description:
      "Major port city and commercial hub, gateway to South Asian markets.",
  },
  {
    id: 9,
    name: "Moscow, Russia",
    lat: 55.7558,
    lng: 37.6173,
    timezone: "UTC+3",
    region: "Europe/Asia",
    description:
      "Russia’s capital, rich in science, aerospace, and energy industries.",
  },
  {
    id: 10,
    name: "Canberra, Australia",
    lat: -35.2809,
    lng: 149.13,
    timezone: "UTC+10",
    region: "Oceania",
    description:
      "Australia’s capital, with a growing defense, space, and tech ecosystem.",
  },
  {
    id: 11,
    name: "Wellington, New Zealand",
    lat: -41.2865,
    lng: 174.7762,
    timezone: "UTC+12",
    region: "Oceania",
    description:
      "New Zealand’s capital, strong in film-tech, innovation, and sustainability.",
  },
  {
    id: 12,
    name: "Brasília, Brazil",
    lat: -15.8267,
    lng: -47.9218,
    timezone: "UTC-3",
    region: "South America",
    description:
      "Brazil’s planned capital, growing in government tech and fintech sectors.",
  },
  {
    id: 13,
    name: "Buenos Aires, Argentina",
    lat: -34.6037,
    lng: -58.3816,
    timezone: "UTC-3",
    region: "South America",
    description:
      "Argentina’s capital, vibrant startup culture and creative industries.",
  },
  {
    id: 14,
    name: "Cairo, Egypt",
    lat: 30.0444,
    lng: 31.2357,
    timezone: "UTC+2",
    region: "Africa",
    description:
      "Africa’s largest city, a major hub for finance, culture, and innovation.",
  },
  {
    id: 15,
    name: "Nairobi, Kenya",
    lat: -1.2921,
    lng: 36.8219,
    timezone: "UTC+3",
    region: "Africa",
    description:
      "East Africa’s tech capital, home to growing innovation and fintech hubs.",
  },
];

export const colors = [
  "#ff4500", // Orange Red
  "#00ff88", // Spring Green
  "#0088ff", // Deep Sky Blue
  "#ff0088", // Deep Pink
  "#88ff00", // Chartreuse
  "#8800ff", // Blue Violet
  "#ffff00", // Yellow
  "#ff8800", // Dark Orange
  "#00ffff", // Cyan
  "#ff0000", // Red
];

// Generate arcs data
export const generateArcsData = () => {
  const arcsData = [];
  let colorIndex = 0;

  locations.forEach((start, i) => {
    locations.forEach((end, j) => {
      if (i !== j) {
        arcsData.push({
          startLat: start.lat,
          startLng: start.lng,
          endLat: end.lat,
          endLng: end.lng,
          color: colors[colorIndex % colors.length],
        });
        colorIndex++;
      }
    });
  });

  return arcsData;
};

// Generate stars data
export const generateStarsData = (count = 1000) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const distance = 150 + Math.random() * 100;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(Math.random() * 2 - 1);

    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.sin(phi) * Math.sin(theta);
    const z = distance * Math.cos(phi);

    stars.push({
      x,
      y,
      z,
      size: Math.random() * 1.5 + 0.5,
    });
  }
  return stars;
};
