import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import rawBusinesses from "./data/businesses.json"
import rawParcels from "./data/parcels.json"
import rawZones from "./data/zones.json"
import { Header } from "./components/Header"
import { KpiStrip } from "./components/KpiStrip"
import { UpdateForm } from "./components/UpdateForm"
import { ZoneMap } from "./components/ZoneMap"
import { config } from "./config"
import { businessesInside, loadBusinesses, loadParcels, loadZones, samePlace } from "./lib/places"
import { summarize } from "./lib/stats"
import { loadUpdates, persistUpdates } from "./lib/storage"
import type { BusinessUpdate } from "./types"

export default function App() {
  const zones = useMemo(() => loadZones(rawZones), [])
  const allParcels = useMemo(() => loadParcels(rawParcels), [])
  const businesses = useMemo(() => loadBusinesses(rawBusinesses), [])
  const zoneNames = useMemo(
    () => zones.map((zone) => zone.name).sort((a, b) => a.localeCompare(b, "he")),
    [zones],
  )
  const zone = zones.find((item) => samePlace(item.name, config.zone)) ?? null
  const parcels = useMemo(
    () => allParcels.filter((parcel) => samePlace(parcel.zone, config.zone)),
    [allParcels],
  )
  const [updates, setUpdates] = useState(() => loadUpdates(new Set(parcels.map((parcel) => parcel.id))))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const guardRef = useRef<(action: () => void) => void>((action) => action())

  useEffect(() => {
    document.title = `עדכון מגרשים · ${config.zone}`
  }, [])

  const selectParcel = useCallback((id: string | null) => {
    guardRef.current(() => setSelectedId(id))
  }, [])

  const summary = useMemo(() => summarize(parcels, updates), [parcels, updates])
  const selected = parcels.find((parcel) => parcel.id === selectedId) ?? null
  const inside = useMemo(
    () => (selected ? businessesInside(selected, businesses) : []),
    [selected, businesses],
  )

  function save(update: BusinessUpdate) {
    if (!selected) return
    const next = { ...updates, [selected.id]: update }
    setUpdates(next)
    persistUpdates(next)
  }

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <Header />
      {!zone || parcels.length === 0 ? (
        <EmptyZone name={config.zone} zones={zoneNames} />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="shrink-0">
            <KpiStrip summary={summary} />
          </div>
          <div className="flex min-h-[560px] flex-1 flex-col md:flex-row">
            <UpdateForm
              key={selected?.id ?? "none"}
              parcel={selected}
              businesses={inside}
              update={selected ? updates[selected.id] : undefined}
              guardRef={guardRef}
              onSave={save}
              onClose={() => selectParcel(null)}
            />
            <div className="relative min-h-[70vh] flex-1 md:min-h-0">
              <ZoneMap
                zone={zone}
                parcels={parcels}
                updates={updates}
                selectedId={selectedId}
                onSelect={selectParcel}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

function EmptyZone({ name, zones }: { name: string; zones: string[] }) {
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8">
      <h2 className="text-2xl font-extrabold text-navy">לא נמצא אזור בשם «{name}»</h2>
      <p className="mt-3 text-lg leading-relaxed">
        פתחו את הקובץ <span className="font-bold">src/config.ts</span> וכתבו את שם האזור בדיוק כמו ברשימה:
      </p>
      <ul className="mt-4 space-y-2">
        {zones.map((zone) => (
          <li key={zone} className="rounded-xl bg-white px-4 py-3 text-lg font-bold">
            {zone}
          </li>
        ))}
      </ul>
    </section>
  )
}
