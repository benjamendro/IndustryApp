import type { Business, Parcel, Ring, ZoneArea } from "../types"

type FeatureCollection = {
  features: Array<{
    geometry: { type: string; coordinates: number[] | number[][][] }
    properties: Record<string, unknown>
  }>
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

/** Quote marks differ between the zone layer (צח"ר) and the parcel layer (צחר). */
export function samePlace(a: string, b: string) {
  const clean = (value: string) => value.replace(/["״']/g, "")
  return clean(a) === clean(b)
}

export function loadZones(raw: unknown): ZoneArea[] {
  const collection = raw as FeatureCollection
  return collection.features.map((feature) => ({
    name: text(feature.properties.name),
    rings: feature.geometry.coordinates as Ring[],
  }))
}

export function loadParcels(raw: unknown): Parcel[] {
  const collection = raw as FeatureCollection
  return collection.features.map((feature) => {
    const props = feature.properties
    return {
      id: text(props.id),
      zone: text(props.zone),
      plan: text(props.plan),
      planStatus: text(props.planStatus),
      number: text(props.number),
      landUse: text(props.landUse),
      landUseCategory: text(props.landUseCategory),
      surveyStatus: text(props.surveyStatus),
      areaSqm: typeof props.areaSqm === "number" ? props.areaSqm : 0,
      rings: feature.geometry.coordinates as Ring[],
    }
  })
}

export function loadBusinesses(raw: unknown): Business[] {
  const collection = raw as FeatureCollection
  return collection.features.map((feature) => {
    const [lon, lat] = feature.geometry.coordinates as number[]
    const props = feature.properties
    return {
      id: text(props.id),
      name: text(props.name),
      registry: text(props.registry),
      years: typeof props.years === "number" ? props.years : null,
      identificationSource: text(props.identificationSource),
      address: text(props.address),
      locationPrecision: text(props.locationPrecision),
      settlement: text(props.settlement),
      authority: text(props.authority),
      addressSource: text(props.addressSource),
      activityBranch: text(props.activityBranch),
      foodGroup: text(props.foodGroup),
      website: text(props.website),
      description: text(props.description),
      source: text(props.source),
      lon,
      lat,
    }
  })
}

export function dunamOf(parcel: Parcel) {
  return parcel.areaSqm / 1000
}

export function pointInRing(lon: number, lat: number, ring: Ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const crosses = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

/** Businesses whose survey point falls inside the parcel. Points outside are omitted. */
export function businessesInside(parcel: Parcel, businesses: Business[]) {
  const ring = parcel.rings[0]
  if (!ring) return []
  return businesses.filter((business) => pointInRing(business.lon, business.lat, ring))
}

export function ringBounds(rings: Ring[]): [[number, number], [number, number]] {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon)
      minLat = Math.min(minLat, lat)
      maxLon = Math.max(maxLon, lon)
      maxLat = Math.max(maxLat, lat)
    }
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}

export function limitBounds(bounds: [[number, number], [number, number]]): [[number, number], [number, number]] {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds
  const padLon = Math.max((maxLon - minLon) * 0.45, 0.008)
  const padLat = Math.max((maxLat - minLat) * 0.45, 0.008)
  return [
    [minLon - padLon, minLat - padLat],
    [maxLon + padLon, maxLat + padLat],
  ]
}
