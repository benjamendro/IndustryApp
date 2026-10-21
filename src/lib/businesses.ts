import type { Business } from "../types"

type RawProperties = Omit<Business, "lon" | "lat">

type RawCollection = {
  features: Array<{
    geometry: { type: string; coordinates: number[] }
    properties: RawProperties
  }>
}

export function loadBusinesses(collection: RawCollection): Business[] {
  return collection.features.map((feature) => {
    const [lon, lat] = feature.geometry.coordinates
    if (typeof lon !== "number" || typeof lat !== "number") {
      throw new Error(`חסרות קואורדינטות לעסק ${feature.properties.id}`)
    }
    return { ...feature.properties, lon, lat }
  })
}

export function listAuthorities(businesses: Business[]) {
  return [...new Set(businesses.map((business) => business.authority))].sort((a, b) =>
    a.localeCompare(b, "he"),
  )
}

export function locationKey(business: Business) {
  return `${business.lon.toFixed(5)},${business.lat.toFixed(5)}`
}

export function groupByPlace(businesses: Business[]) {
  const groups = new Map<string, Business[]>()
  for (const business of businesses) {
    const key = locationKey(business)
    const list = groups.get(key)
    if (list) list.push(business)
    else groups.set(key, [business])
  }
  return groups
}

export function viewBounds(businesses: Business[]) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const business of businesses) {
    minLon = Math.min(minLon, business.lon)
    minLat = Math.min(minLat, business.lat)
    maxLon = Math.max(maxLon, business.lon)
    maxLat = Math.max(maxLat, business.lat)
  }
  if (maxLon - minLon < 0.004) {
    minLon -= 0.004
    maxLon += 0.004
  }
  if (maxLat - minLat < 0.004) {
    minLat -= 0.004
    maxLat += 0.004
  }
  const padLon = Math.max((maxLon - minLon) * 0.45, 0.01)
  const padLat = Math.max((maxLat - minLat) * 0.45, 0.01)
  return {
    fit: [
      [minLon, minLat],
      [maxLon, maxLat],
    ] as [[number, number], [number, number]],
    limit: [
      [minLon - padLon, minLat - padLat],
      [maxLon + padLon, maxLat + padLat],
    ] as [[number, number], [number, number]],
  }
}
