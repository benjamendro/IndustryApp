import { config } from "../config"
import { buildDemoSeed } from "../data/demoSeed"
import { ACTIVITY_TYPES, BUILDING_STATUSES, EMPLOYEE_RANGES, type BusinessUpdate } from "../types"

const storageKey = `industry-updates:v1:${config.authority}`

const statuses = new Set<string>(BUILDING_STATUSES.map((item) => item.value))
const activities = new Set<string>(ACTIVITY_TYPES.map((item) => item.value))
const employees = new Set<string>(EMPLOYEE_RANGES.map((item) => item.value))

function isUpdate(value: unknown): value is BusinessUpdate {
  if (!value || typeof value !== "object") return false
  const update = value as Partial<BusinessUpdate>
  return (
    typeof update.status === "string" &&
    statuses.has(update.status) &&
    typeof update.updatedAt === "string" &&
    typeof update.currentName === "string" &&
    (update.activityType === "" || (typeof update.activityType === "string" && activities.has(update.activityType))) &&
    (update.employees === "" || (typeof update.employees === "string" && employees.has(update.employees))) &&
    (update.available === null || typeof update.available === "boolean") &&
    typeof update.contact === "string" &&
    typeof update.notes === "string" &&
    typeof update.updatedBy === "string" &&
    typeof update.isDemo === "boolean"
  )
}

export function loadUpdates(ids: Set<string>): Record<string, BusinessUpdate> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        const clean: Record<string, BusinessUpdate> = {}
        for (const [id, value] of Object.entries(parsed)) {
          if (ids.has(id) && isUpdate(value)) clean[id] = value
        }
        return clean
      }
    }
  } catch {
    // Broken browser storage falls through to the demo seed.
  }

  const seeded = buildDemoSeed(ids)
  persistUpdates(seeded)
  return seeded
}

export function persistUpdates(updates: Record<string, BusinessUpdate>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(updates))
  } catch {
    // The screen still updates for this visit if the browser refuses storage.
  }
}
