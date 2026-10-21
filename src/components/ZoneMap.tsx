import { useEffect, useRef, useState } from "react"
import { AttributionControl, Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"

setWorkerUrl(maplibreWorkerUrl)

import { groupByPlace, viewBounds } from "../lib/businesses"
import { displayName, hoverText, needsRefresh, statusOf } from "../lib/labels"
import { BUILDING_STATUSES, UNKNOWN_STATUS, type Business, type BusinessUpdate } from "../types"

const LABEL_ZOOM = 13

type Props = {
  businesses: Business[]
  updates: Record<string, BusinessUpdate>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

function pileOffset(index: number, count: number): [number, number] {
  if (count < 2) return [0, 0]
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count
  return [Math.round(Math.cos(angle) * 18), Math.round(Math.sin(angle) * 18)]
}

export function ZoneMap({ businesses, updates, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)
  const [showLabels, setShowLabels] = useState(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new Map({
      container,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [35.7, 32.99],
      zoom: 12,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    map.addControl(new AttributionControl({ compact: true }), "bottom-left")
    map.addControl(new NavigationControl({ showCompass: false }), "top-left")

    const syncLabels = () => setShowLabels(map.getZoom() >= LABEL_ZOOM)
    map.on("load", () => {
      map.resize()
      setReady(true)
      syncLabels()
    })
    map.on("zoomend", syncLabels)
    map.on("click", (event) => {
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest(".biz-marker, .maplibregl-ctrl")) return
      onSelectRef.current(null)
    })

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    mapRef.current = map

    return () => {
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  const fittedKey = useRef("")

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || businesses.length === 0) return
    const key = businesses.map((business) => business.id).join("|")
    if (fittedKey.current === key) return
    fittedKey.current = key
    const bounds = viewBounds(businesses)
    map.fitBounds(bounds.fit, { padding: 64, maxZoom: 16, duration: 0 })
    map.setMaxBounds(bounds.limit)
    setShowLabels(map.getZoom() >= LABEL_ZOOM)
  }, [ready, businesses])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    markersRef.current.forEach((marker) => marker.remove())
    const groups = groupByPlace(businesses)
    const next: Marker[] = []

    for (const group of groups.values()) {
      group.forEach((business, index) => {
        const update = updates[business.id]
        const selected = business.id === selectedId
        const button = document.createElement("button")
        button.type = "button"
        button.className = "biz-marker"
        if (needsRefresh(update)) button.classList.add("stale")
        if (selected) button.classList.add("selected")
        button.style.zIndex = selected ? "5" : "1"
        button.style.setProperty("--status", statusOf(update).color)
        button.setAttribute("aria-label", hoverText(business, update))
        button.setAttribute("aria-pressed", selected ? "true" : "false")

        const dot = document.createElement("span")
        dot.className = "dot"
        button.appendChild(dot)

        if (group.length > 1) {
          const badge = document.createElement("span")
          badge.className = "pile"
          badge.textContent = String(group.length)
          button.appendChild(badge)
        }

        const label = document.createElement("span")
        label.className = "label"
        label.textContent = displayName(business, update)
        button.appendChild(label)

        const tip = document.createElement("span")
        tip.className = "tip"
        tip.textContent = hoverText(business, update)
        button.appendChild(tip)

        button.addEventListener("click", (event) => {
          event.stopPropagation()
          onSelectRef.current(business.id)
        })
        button.addEventListener("mouseenter", () => {
          button.style.zIndex = "6"
        })
        button.addEventListener("mouseleave", () => {
          button.style.zIndex = selected ? "5" : "1"
        })

        const marker = new Marker({
          element: button,
          anchor: "center",
          offset: pileOffset(index, group.length),
        })
          .setLngLat([business.lon, business.lat])
          .addTo(map)
        next.push(marker)
      })
    }

    markersRef.current = next
  }, [ready, businesses, updates, selectedId])

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <div ref={containerRef} className={showLabels ? "map-labels h-full w-full" : "h-full w-full"} />
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-start">
        <ul className="pointer-events-auto max-w-[12rem] rounded-2xl bg-white/95 p-2 text-xs shadow-md md:max-w-none md:p-3 md:text-sm">
          {[UNKNOWN_STATUS, ...BUILDING_STATUSES].map((item) => (
            <li key={item.value} className="flex items-center gap-2 py-1 font-semibold">
              <span className="h-3.5 w-3.5 rounded-full border border-white shadow" style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
          <li className="mt-1 flex items-center gap-2 border-t border-line pt-2 font-semibold">
            <span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-[#D55E00]" />
            לא עודכן יותר מחצי שנה
          </li>
        </ul>
      </div>
    </div>
  )
}
