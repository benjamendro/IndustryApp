import { dunamOf } from "./places"
import { BUILDING_STATUSES, UNKNOWN_STATUS, type BusinessUpdate, type Parcel } from "../types"

export function summarize(parcels: Parcel[], updates: Record<string, BusinessUpdate>) {
  const counts = { unknown: 0, vacant: 0, partial: 0, built: 0 }
  const areas = { unknown: 0, vacant: 0, partial: 0, built: 0 }
  let demo = 0

  for (const parcel of parcels) {
    const update = updates[parcel.id]
    const key = update ? update.status : "unknown"
    counts[key] += 1
    areas[key] += dunamOf(parcel)
    if (update?.isDemo) demo += 1
  }

  const land = new Map<string, number>()
  for (const parcel of parcels) {
    const name = parcel.landUseCategory || "לא צוין"
    land.set(name, (land.get(name) ?? 0) + 1)
  }

  const byLandUse = [...land.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"))

  const byStatus = [UNKNOWN_STATUS, ...BUILDING_STATUSES].map((item) => ({
    key: item.value,
    label: item.label,
    color: item.color,
    count: counts[item.value],
    dunam: areas[item.value],
  }))

  return {
    total: parcels.length,
    vacant: counts.vacant,
    built: counts.built,
    partial: counts.partial,
    unknown: counts.unknown,
    updated: parcels.length - counts.unknown,
    demo,
    totalDunam: areas.unknown + areas.vacant + areas.partial + areas.built,
    dunam: areas,
    byStatus,
    byLandUse,
  }
}
