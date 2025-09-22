// Build TerraBook data (kid-friendly) from your master NDVI JSON
// expects: /public/datas/MODIS_NDVI_All_Countries_2000_2024.json

const COUNTRY_META = [
  { code: "ARG", name: "Argentina", coverImage: "/images/covers/arg.png" },
  { code: "BGD", name: "Bangladesh", coverImage: "/images/covers/bgd.png" },
  { code: "JPN", name: "Japan",      coverImage: "/images/covers/jpn.png" },
  { code: "KEN", name: "Kenya",      coverImage: "/images/covers/ken.png" },
  { code: "USA", name: "United States", coverImage: "/images/covers/usa.png" },
];

// image path helper – adjust to your folder structure if needed
const imgPath = (code, year) => `/images/modis_ndvi/${code}/${year}.png`;

// short rotating captions (kid-friendly)
const CAPTIONS = [
  "NDVI = plant greenness",
  "Greener = more plants",
  "Rains make places greener",
  "Seasons change the colors",
  "Maps tell plant stories",
];

// lightweight storyteller using mean NDVI + country flavor
function makeStory(countryCode, year, mean) {
  // NDVI bands
  const band =
    mean >= 0.55 ? "super green in many places" :
    mean >= 0.50 ? "green and growing well" :
    mean >= 0.45 ? "mixed — some green, some pale" :
    mean >= 0.40 ? "a bit dry in places" :
                   "quite dry in many areas";

  const common = `In ${year}, plants looked ${band}. Remember: greener means more leaves and healthy crops!`;

  switch (countryCode) {
    case "ARG": // Pampas / Patagonia
      return `${common} The Pampas farms were often green and busy. Far south in Patagonia, it can be pale because it’s windy and dry.`;
    case "BGD": // Monsoon / coastal salinity
      return `${common} Monsoon months turn fields bright green. Forests in the northeast glow, while some coastal spots can look pale from salty water.`;
    case "JPN": // Forests + rice + cities
      return `${common} Forests stayed very green, and rice fields brighten in summer. Big cities like Tokyo can look lighter because roads don’t grow leaves.`;
    case "KEN": // Rains + ASALs
      return `${common} When the long and short rains arrive, the land greens fast. Northern drylands stay lighter, so herders watch the seasons closely.`;
    case "USA": // Forests/farms/deserts
      return `${common} Forests in the Northwest and Northeast glow. The middle grows lots of food. Deserts in the Southwest look pale because there’s little rain.`;
    default:
      return common;
  }
}

// Turn your master JSON rows into flip-book pages
function rowsToPages(code, rowsForCountry) {
  return rowsForCountry
    .filter(r => r.year >= 2000 && r.year <= 2024)
    .sort((a, b) => a.year - b.year)
    .map((r, i) => ({
      year: r.year,
      image: imgPath(code, r.year),
      caption: CAPTIONS[i % CAPTIONS.length],
      story: makeStory(code, r.year, r.mean ?? r.AverageNDVI ?? 0.48),
    }));
}

/**
 * Build the full bookData object your <TerraBook/> needs.
 * Pass in the parsed master JSON from /public/datas/MODIS_NDVI_All_Countries_2000_2024.json
 * The master JSON should have rows with at least: { countryCode, countryName, year, mean (or AverageNDVI) }
 */
export function buildTerraBookData(masterJson) {
  // Tolerate two common shapes:
  // 1) { countries: [{ code, name, years: [{year, mean}, ...] }, ...] }
  // 2) { records: [{countryCode, countryName, year, mean}, ...] }
  // 3) flat array of records
  const records = Array.isArray(masterJson?.records)
    ? masterJson.records
    : Array.isArray(masterJson?.countries)
      ? masterJson.countries.flatMap(c =>
          (c.years || []).map(y => ({
            countryCode: c.code,
            countryName: c.name,
            year: y.year,
            mean: y.mean ?? y.AverageNDVI
          }))
        )
      : Array.isArray(masterJson) ? masterJson : [];

  const byCode = records.reduce((acc, r) => {
    const code = r.countryCode || r.code || r.CountryCode || r.country || r.Country || "";
    if (!code) return acc;
    acc[code] ??= [];
    acc[code].push(r);
    return acc;
  }, {});

  const countries = COUNTRY_META.map(meta => {
    const rows = byCode[meta.code] || [];
    return {
      code: meta.code,
      name: meta.name,
      coverImage: meta.coverImage,
      pages: rowsToPages(meta.code, rows)
    };
  });

  return {
    title: "Terra at 25 — Stories from Space",
    subtitle: "How Earth looks from the Terra satellite (2000–2024)",
    source: "Terra MODIS NDVI (MOD13Q1 v061)",
    updated: new Date().toISOString().slice(0, 10),
    countries,
  };
}
