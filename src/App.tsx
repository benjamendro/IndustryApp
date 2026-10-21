import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import rawBusinesses from "./data/businesses.json"
import { Header } from "./components/Header"
import { KpiStrip } from "./components/KpiStrip"
import { UpdateForm } from "./components/UpdateForm"
import { ZoneMap } from "./components/ZoneMap"
import { config } from "./config"
import { groupByPlace, listAuthorities, loadBusinesses, locationKey } from "./lib/businesses"
import { summarize } from "./lib/stats"
import { loadUpdates, persistUpdates } from "./lib/storage"
import type { BusinessUpdate } from "./types"

export default function App() {
  const all = useMemo(() => loadBusinesses(rawBusinesses), [])
  const authorities = useMemo(() => listAuthorities(all), [all])
  const businesses = useMemo(
    () => all.filter((business) => business.authority === config.authority),
    [all],
  )
  const [updates, setUpdates] = useState(() => loadUpdates(new Set(businesses.map((business) => business.id))))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const guardRef = useRef<(action: () => void) => void>((action) => action())

  useEffect(() => {
    document.title = `עדכון עסקים · ${config.authority}`
  }, [])

  const selectBusiness = useCallback((id: string | null) => {
    guardRef.current(() => setSelectedId(id))
  }, [])

  const summary = useMemo(() => summarize(businesses, updates), [businesses, updates])
  const selected = businesses.find((business) => business.id === selectedId) ?? null
  const pile = selected ? (groupByPlace(businesses).get(locationKey(selected)) ?? [selected]) : []

  function save(update: BusinessUpdate) {
    if (!selected) return
    const next = { ...updates, [selected.id]: update }
    setUpdates(next)
    persistUpdates(next)
  }

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <Header />
      {businesses.length === 0 ? (
        <EmptyAuthority name={config.authority} authorities={authorities} />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <div className="shrink-0">
            <KpiStrip summary={summary} />
          </div>
          <div className="flex min-h-[560px] flex-1 flex-col md:flex-row">
            <UpdateForm
              key={selected?.id ?? "none"}
              business={selected}
              pile={pile}
              update={selected ? updates[selected.id] : undefined}
              guardRef={guardRef}
              onSelect={selectBusiness}
              onSave={save}
              onClose={() => selectBusiness(null)}
            />
            <div className="relative min-h-[70vh] flex-1 md:min-h-0">
              <ZoneMap
                businesses={businesses}
                updates={updates}
                selectedId={selectedId}
                onSelect={selectBusiness}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

function EmptyAuthority({ name, authorities }: { name: string; authorities: string[] }) {
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-8">
      <h2 className="text-2xl font-extrabold text-navy">לא נמצאו עסקים עבור «{name}»</h2>
      <p className="mt-3 text-lg leading-relaxed">
        פתחו את הקובץ <span className="font-bold">src/config.ts</span> וכתבו את שם הרשות בדיוק כמו ברשימה:
      </p>
      <ul className="mt-4 space-y-2">
        {authorities.map((authority) => (
          <li key={authority} className="rounded-xl bg-white px-4 py-3 text-lg font-bold">
            {authority}
          </li>
        ))}
      </ul>
    </section>
  )
}
