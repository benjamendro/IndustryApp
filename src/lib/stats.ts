import { BUILDING_STATUSES, UNKNOWN_STATUS, type Business, type BusinessUpdate } from "../types"

export function summarize(businesses: Business[], updates: Record<string, BusinessUpdate>) {
  const counts = { unknown: 0, vacant: 0, partial: 0, built: 0 }
  let demo = 0
  for (const business of businesses) {
    const update = updates[business.id]
    if (!update) {
      counts.unknown += 1
      continue
    }
    counts[update.status] += 1
    if (update.isDemo) demo += 1
  }

  const activity = new Map<string, number>()
  for (const business of businesses) {
    const name = business.activityBranch || "לא צוין"
    activity.set(name, (activity.get(name) ?? 0) + 1)
  }

  const byActivity = [...activity.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"))

  const byStatus = [UNKNOWN_STATUS, ...BUILDING_STATUSES].map((item) => ({
    key: item.value,
    label: item.label,
    color: item.color,
    count: counts[item.value],
  }))

  return {
    total: businesses.length,
    vacant: counts.vacant,
    built: counts.built,
    partial: counts.partial,
    unknown: counts.unknown,
    updated: businesses.length - counts.unknown,
    demo,
    byStatus,
    byActivity,
  }
}
