export const BUILDING_STATUSES = [
  { value: "vacant", label: "פנוי", color: "#0072B2" },
  { value: "partial", label: "בנוי חלקית", color: "#E69F00" },
  { value: "built", label: "בנוי", color: "#009E73" },
] as const

export const UNKNOWN_STATUS = {
  value: "unknown",
  label: "טרם עודכן",
  color: "#5C6F82",
} as const

export const ACTIVITY_TYPES = [
  { value: "industry", label: "תעשייה" },
  { value: "crafts", label: "מלאכה" },
  { value: "commerce", label: "מסחר" },
  { value: "logistics", label: "לוגיסטיקה" },
  { value: "services", label: "שירותים" },
  { value: "other", label: "אחר" },
] as const

export const EMPLOYEE_RANGES = [
  { value: "1-5", label: "1–5" },
  { value: "6-20", label: "6–20" },
  { value: "21-50", label: "21–50" },
  { value: "51-100", label: "51–100" },
  { value: "100+", label: "מעל 100" },
] as const

export type BuildingStatus = (typeof BUILDING_STATUSES)[number]["value"]
export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"]
export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number]["value"]

export type Business = {
  id: string
  name: string
  registry: string
  years: number | null
  identificationSource: string
  address: string
  locationPrecision: string
  settlement: string
  authority: string
  addressSource: string
  activityBranch: string
  foodGroup: string
  website: string
  description: string
  source: string
  lon: number
  lat: number
}

/** Manager update for one parcel. Not part of the GIS layers. */
export type BusinessUpdate = {
  status: BuildingStatus
  currentName: string
  activityType: ActivityType | ""
  employees: EmployeeRange | ""
  available: boolean | null
  contact: string
  notes: string
  updatedAt: string
  updatedBy: string
  isDemo: boolean
}

export type Ring = number[][]

export type Parcel = {
  id: string
  zone: string
  plan: string
  planStatus: string
  number: string
  landUse: string
  landUseCategory: string
  surveyStatus: string
  /** Source column `Dunam`, which is square meters. */
  areaSqm: number
  rings: Ring[]
}

export type ZoneArea = {
  name: string
  rings: Ring[]
}
