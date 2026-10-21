import { BUILDING_STATUSES, UNKNOWN_STATUS, type BusinessUpdate } from "../types"

export function statusOf(update?: BusinessUpdate) {
  if (!update) return UNKNOWN_STATUS
  return BUILDING_STATUSES.find((item) => item.value === update.status) ?? UNKNOWN_STATUS
}

export function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatDunam(dunam: number) {
  return dunam.toLocaleString("he-IL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** A saved update older than six months. A parcel with no manager update is not stale. */
export function isStale(update: BusinessUpdate | undefined, now = new Date()) {
  if (!update) return false
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 6)
  return new Date(update.updatedAt) < cutoff
}
