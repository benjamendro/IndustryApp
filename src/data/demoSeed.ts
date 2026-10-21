import { config } from "../config"
import type { BusinessUpdate } from "../types"

const DAY = 24 * 60 * 60 * 1000

type Sample = { id: string } & Omit<BusinessUpdate, "updatedBy">

/**
 * Sample parcel updates for the קצרין demo only.
 * They are stored like real updates, and the screen marks them as demo data.
 * Dates are relative to the first time the app is opened, so the map always
 * shows both a fresh update and one older than six months.
 * Ids are אזור||תכנית||מגרש from the parcel layer.
 */
export function buildDemoSeed(ids: Set<string>): Record<string, BusinessUpdate> {
  if (config.zone !== "קצרין") return {}
  const now = Date.now()
  const samples: Sample[] = [
    {
      id: "קצרין||220-0511089||300",
      status: "built",
      currentName: "יקב הגולן",
      activityType: "industry",
      employees: "51-100",
      available: false,
      contact: "",
      notes: "דוגמה בלבד, לא נתון אמיתי",
      updatedAt: new Date(now - 18 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "קצרין||220-0511089||715",
      status: "built",
      currentName: "מי עדן",
      activityType: "industry",
      employees: "21-50",
      available: false,
      contact: "",
      notes: "דוגמה בלבד, לא נתון אמיתי",
      updatedAt: new Date(now - 220 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "קצרין||220-0663724||37",
      status: "partial",
      currentName: "בנדע אריזות",
      activityType: "industry",
      employees: "6-20",
      available: false,
      contact: "",
      notes: "דוגמה בלבד, לא נתון אמיתי",
      updatedAt: new Date(now - 12 * DAY).toISOString(),
      isDemo: true,
    },
    {
      id: "קצרין||220-0663724||13",
      status: "vacant",
      currentName: "",
      activityType: "",
      employees: "",
      available: true,
      contact: "לשכת המנהל, 04-0000000",
      notes: "דוגמה בלבד, לא נתון אמיתי",
      updatedAt: new Date(now - 240 * DAY).toISOString(),
      isDemo: true,
    },
  ]

  const seeded: Record<string, BusinessUpdate> = {}
  for (const sample of samples) {
    if (!ids.has(sample.id)) continue
    const { id, ...fields } = sample
    seeded[id] = { ...fields, updatedBy: config.managerName }
  }
  return seeded
}
