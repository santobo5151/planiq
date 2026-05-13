const NIGERIAN_INDICATORS = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Victoria Island',
  'VI',
  'Lekki',
  'Ikoyi',
  'Surulere',
  'Ikeja',
  'Warri',
  'Calabar',
  'Kano',
  'Ibadan',
  'Enugu',
  'Jos',
  'Ilorin',
  'Owerri',
  'Uyo',
  'Abeokuta',
  'Mainland',
  'Naija',
  'NG',
  'Nigeria',
]

const UK_INDICATORS = [
  'United Kingdom',
  'UK',
  'England',
  'Scotland',
  'Wales',
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Liverpool',
  'Sheffield',
  'Bristol',
  'Cardiff',
  'Edinburgh',
  'Glasgow',
  'Newcastle',
  'Brighton',
  'Oxford',
  'Cambridge',
  'Bath',
  'York',
  'Essex',
  'Kent',
  'Surrey',
]

const NIGERIAN_PATTERN = new RegExp(
  `\\b(${NIGERIAN_INDICATORS.map((s) =>
    s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  ).join('|')})\\b`,
  'i'
)

const UK_PATTERN = new RegExp(
  `\\b(${UK_INDICATORS.map((s) =>
    s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  ).join('|')})\\b`,
  'i'
)

export function getMarketFromLocation(
  location?: string | null
): 'nigeria' | 'uk' | 'international' {
  if (!location) return 'international'
  if (NIGERIAN_PATTERN.test(location)) return 'nigeria'
  if (UK_PATTERN.test(location)) return 'uk'
  return 'international'
}

export function getCurrencySymbol(location?: string | null): '₦' | '£' | '$' {
  const market = getMarketFromLocation(location)
  if (market === 'nigeria') return '₦'
  if (market === 'uk') return '£'
  return '$'
}
