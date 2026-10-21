import { BUILDING_STATUSES, UNKNOWN_STATUS, type Business, type BusinessUpdate } from "../types"

export function statusOf(update?: BusinessUpdate) {
  if (!update) return UNKNOWN_STATUS
  return BUILDING_STATUSES.find((item) => item.value === update.status) ?? UNKNOWN_STATUS
}

export function displayName(business: Business, update?: BusinessUpdate) {
  const custom = update?.currentName.trim()
  return custom || business.name
}

export function precisionLabel(value: string) {
  if (value === "כתובת מלאה") return "המיקום במפה לפי כתובת מלאה"
  if (value === "יישוב בלבד") return "המיקום במפה לפי שם היישוב בלבד, לא לפי כתובת מדויקת"
  return value || "לא צוין דיוק המיקום"
}

export function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** An update older than six months, or a business with no manager update yet. */
export function needsRefresh(update: BusinessUpdate | undefined, now = new Date()) {
  if (!update) return true
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 6)
  return new Date(update.updatedAt) < cutoff
}

export function hoverText(business: Business, update?: BusinessUpdate) {
  const name = displayName(business, update)
  const status = statusOf(update).label
  if (update && needsRefresh(update)) return `${name} · ${status} · העדכון ישן`
  return `${name} · ${status}`
}
