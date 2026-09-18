export function validateProfiles(entries) {
  const ids = new Set();
  return Object.entries(entries).map(([file, value]) => {
    const fail = (message) => { throw new Error(`${file}: ${message}`); };
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("expected a profile object");
    const p = value;
    for (const field of ["id", "name", "role", "region", "city", "country"]) {
      if (typeof p[field] !== "string" || !p[field].trim()) fail(`${field} must be a nonempty string`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail("id must be a lowercase hyphenated identifier");
    if (ids.has(p.id)) fail(`duplicate id: ${p.id}`);
    ids.add(p.id);
    if (!Array.isArray(p.expertise) || !p.expertise.length || p.expertise.some(x => typeof x !== "string" || !x.trim())) fail("expertise must be a nonempty array of strings");
    for (const [key, limit] of [["latitude", 90], ["longitude", 180]]) {
      if (typeof p[key] !== "number" || !Number.isFinite(p[key]) || Math.abs(p[key]) > limit) fail(`${key} must be a number between -${limit} and ${limit}`);
    }
    if (p.email !== undefined && (typeof p.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))) fail("email must be a valid email address");
    if (p.phone !== undefined && (typeof p.phone !== "string" || !/^\+?[\d\s().-]+$/.test(p.phone) || !/\d/.test(p.phone))) fail("phone must be a telephone number");
    return p;
  }).sort((a, b) => a.name.localeCompare(b.name, "en"));
}
export function filterExperts(experts, expertise, region) {
  return experts.filter(p => (expertise === "all" || p.expertise.includes(expertise)) && (region === "all" || p.region === region));
}
export function inBounds(expert, bounds) {
  if (expert.latitude < bounds.south || expert.latitude > bounds.north) return false;
  let width = bounds.east - bounds.west;
  if (Math.abs(width) >= 360) return true;
  if (width < 0) width += 360;
  const offset = ((expert.longitude - bounds.west) % 360 + 360) % 360;
  return offset <= width;
}
// Smallest longitude span, including data crossing the date line.
export function fitExtent(experts) {
  if (!experts.length) return null;
  const xs = experts.map(p => (p.longitude + 360) % 360).sort((a, b) => a - b);
  let largest = -1, start = 0;
  xs.forEach((x, i) => {
    const next = i === xs.length - 1 ? xs[0] + 360 : xs[i + 1];
    if (next - x > largest) { largest = next - x; start = next % 360; }
  });
  const west = start > 180 ? start - 360 : start;
  return [[west, Math.min(...experts.map(p => p.latitude))], [west + 360 - largest, Math.max(...experts.map(p => p.latitude))]];
}
