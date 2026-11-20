// Standard material names: type first, then wood or finish. No grade, brand or thickness.
export const MATERIALS = [
  'MTX birch', 'MTX spruce', 'MTX poplar', 'MTX okoumé', 'MTX oak',
  'MDF', 'MDF oak', 'MDF black', 'MDF MR', 'HDF', 'OSB', 'Melamine white',
  'Oak', 'Beech', 'Ash', 'Pine', 'Walnut',
]

const has = (s: string, words: string[]) => words.some((w) => new RegExp(`(^|[^a-zé])${w}([^a-zé]|$)`).test(s))

/**
 * Map a material as written in a sheet ("BERK MTX 18 MM BB/BB", "Birch plywood",
 * "MDF eik") to a standard name. Returns the input unchanged if it isn't recognised.
 */
export function normalizeMaterial(raw: string): string {
  const s = raw.toLowerCase().normalize('NFC')
  const species =
    has(s, ['berk', 'birch', 'berken']) ? 'birch'
    : has(s, ['spruce', 'vuren', 'sparren', 'wisa']) ? 'spruce'
    : has(s, ['populier', 'poplar']) ? 'poplar'
    : has(s, ['okoume', 'okoumé']) ? 'okoumé'
    : has(s, ['eik', 'eiken', 'oak']) ? 'oak'
    : has(s, ['beuk', 'beuken', 'beech']) ? 'beech'
    : has(s, ['es', 'essen', 'ash']) ? 'ash'
    : has(s, ['grenen', 'den', 'pine']) ? 'pine'
    : has(s, ['noten', 'notelaar', 'walnut']) ? 'walnut'
    : null

  if (has(s, ['mtx', 'multiplex', 'plywood', 'triplex', 'ply'])) return species ? `MTX ${species}` : raw.trim()
  if (has(s, ['hdf'])) return 'HDF'
  if (has(s, ['mdf'])) {
    if (has(s, ['zwart', 'black'])) return 'MDF black'
    if (has(s, ['mr', 'vochtwerend', 'moisture', 'hydro'])) return 'MDF MR'
    if (species === 'oak') return 'MDF oak'
    return 'MDF'
  }
  if (has(s, ['osb'])) return 'OSB'
  if (has(s, ['melamine', 'melamin', 'gemelamineerd'])) return 'Melamine white'
  if (species && !has(s, ['fineer', 'veneer'])) return species[0].toUpperCase() + species.slice(1)
  return raw.trim()
}
