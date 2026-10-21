import { useEffect, useMemo, useRef, useState } from "react"
import {
  AttributionControl,
  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"

setWorkerUrl(maplibreWorkerUrl)

import { formatDunam, isStale, statusOf } from "../lib/labels"
import { dunamOf, limitBounds, ringBounds } from "../lib/places"
import { BUILDING_STATUSES, UNKNOWN_STATUS, type BusinessUpdate, type Parcel, type ZoneArea } from "../types"

const LABEL_ZOOM = 13

type Props = {
  zone: ZoneArea
  parcels: Parcel[]
  updates: Record<string, BusinessUpdate>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

type Tip = { id: string; x: number; y: number }

function parcelCollection(parcels: Parcel[], updates: Record<string, BusinessUpdate>) {
  return {
    type: "FeatureCollection" as const,
    features: parcels.map((parcel) => {
      const update = updates[parcel.id]
      return {
        type: "Feature" as const,
        id: parcel.id,
        properties: {
          id: parcel.id,
          label: parcel.number,
          status: statusOf(update).value,
          stale: isStale(update) ? 1 : 0,
        },
        geometry: { type: "Polygon" as const, coordinates: parcel.rings },
      }
    }),
  }
}

function hoverLine(parcel: Parcel, update?: BusinessUpdate) {
  const status = statusOf(update).label
  const name = update?.currentName.trim()
  const area = `${formatDunam(dunamOf(parcel))} דונם`
  const head = name ? `מגרש ${parcel.number} · ${name}` : `מגרש ${parcel.number}`
  const stale = isStale(update) ? " · העדכון ישן" : ""
  return `${head} · ${status} · ${area}${stale}`
}

function zoneCollection(zone: ZoneArea) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        properties: { name: zone.name },
        geometry: { type: "Polygon" as const, coordinates: zone.rings },
      },
    ],
  }
}

function labelFont(map: Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue
    const font = layer.layout?.["text-font"]
    if (Array.isArray(font) && typeof font[0] === "string") return font as string[]
  }
  return ["Noto Sans Regular"]
}

export function ZoneMap({ zone, parcels, updates, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const onSelectRef = useRef(onSelect)
  const fittedRef = useRef("")
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<Tip | null>(null)
  const tip = useMemo(() => {
    if (!hover) return null
    const parcel = parcels.find((item) => item.id === hover.id)
    if (!parcel) return null
    return { x: hover.x, y: hover.y, text: hoverLine(parcel, updates[parcel.id]) }
  }, [hover, parcels, updates])
  const data = useMemo(() => parcelCollection(parcels, updates), [parcels, updates])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new Map({
      container,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [35.71, 32.99],
      zoom: 13,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    map.addControl(new AttributionControl({ compact: true }), "bottom-left")
    map.addControl(new NavigationControl({ showCompass: false }), "top-left")

    map.on("load", () => {
      map.resize()
      setReady(true)
    })

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    mapRef.current = map

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      setReady(false)
      fittedRef.current = ""
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const existing = map.getSource("parcels") as GeoJSONSource | undefined
    if (!existing) {
      map.addSource("zone", { type: "geojson", data: zoneCollection(zone) })
      map.addSource("parcels", { type: "geojson", data })

      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": [
            "match",
            ["get", "status"],
            "vacant",
            "#0072B2",
            "partial",
            "#E69F00",
            "built",
            "#009E73",
            "#5C6F82",
          ],
          "fill-opacity": 0.72,
        },
      })
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "vacant",
            "#0072B2",
            "partial",
            "#E69F00",
            "built",
            "#009E73",
            "#314556",
          ],
          "line-width": 1.2,
        },
      })
      map.addLayer({
        id: "parcels-stale",
        type: "line",
        source: "parcels",
        filter: ["==", ["get", "stale"], 1],
        paint: {
          "line-color": "#D55E00",
          "line-width": 2.5,
          "line-dasharray": [1.4, 1.1],
        },
      })
      map.addLayer({
        id: "parcels-selected",
        type: "line",
        source: "parcels",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "line-color": "#0E2A47",
          "line-width": 4,
        },
      })
      map.addLayer({
        id: "zone-line",
        type: "line",
        source: "zone",
        paint: {
          "line-color": "#0E2A47",
          "line-width": 3,
        },
      })
      const font = labelFont(map)
      map.addLayer({
        id: "parcel-labels",
        type: "symbol",
        source: "parcels",
        minzoom: LABEL_ZOOM,
        layout: {
          "text-field": ["get", "label"],
          "text-font": font,
          "text-size": 13,
          "text-allow-overlap": false,
          "text-padding": 2,
        },
        paint: {
          "text-color": "#0E2A47",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
      })
      map.addLayer({
        id: "parcel-selected-label",
        type: "symbol",
        source: "parcels",
        filter: ["==", ["get", "id"], ""],
        layout: {
          "text-field": ["get", "label"],
          "text-font": font,
          "text-size": 14,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#0E2A47",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      })

      const choose = (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === "string") onSelectRef.current(id)
      }
      map.on("click", "parcels-fill", choose)
      map.on("click", (event) => {
        const target = event.originalEvent.target
        if (target instanceof Element && target.closest(".maplibregl-ctrl")) return
        const hits = map.queryRenderedFeatures(event.point, { layers: ["parcels-fill"] })
        if (hits.length === 0) onSelectRef.current(null)
      })
      map.on("mousemove", "parcels-fill", (event) => {
        map.getCanvas().style.cursor = "pointer"
        const id = event.features?.[0]?.properties?.id
        if (typeof id !== "string") return
        setHover({ id, x: event.point.x, y: event.point.y })
      })
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = ""
        setHover(null)
      })
    } else {
      existing.setData(data)
      const zoneSource = map.getSource("zone") as GeoJSONSource
      zoneSource.setData(zoneCollection(zone))
    }

    if (fittedRef.current !== zone.name) {
      const bounds = ringBounds(zone.rings)
      map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 0 })
      map.setMaxBounds(limitBounds(bounds))
      fittedRef.current = zone.name
    }
  }, [ready, data, zone])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer("parcels-selected")) return
    const filter: ["==", ["get", "id"], string] = ["==", ["get", "id"], selectedId ?? ""]
    map.setFilter("parcels-selected", filter)
    if (map.getLayer("parcel-selected-label")) map.setFilter("parcel-selected-label", filter)
  }, [ready, selectedId, data])

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <div ref={containerRef} className="h-full w-full" />
      <ul className="pointer-events-none absolute start-3 top-3 z-10 max-w-[220px] rounded-2xl bg-white/95 p-3 text-sm shadow-sm">
        {[UNKNOWN_STATUS, ...BUILDING_STATUSES].map((item) => (
          <li key={item.value} className="flex items-center gap-2 py-0.5 font-semibold">
            <span className="h-3.5 w-3.5 rounded-sm" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
        <li className="mt-1 flex items-center gap-2 font-semibold text-[#9A3412]">
          <span className="h-0 w-4 border-t-2 border-dashed border-[#D55E00]" />
          עדכון ישן
        </li>
      </ul>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-xl bg-navy px-3 py-2 text-sm font-semibold leading-snug text-white"
          style={{ left: tip.x, top: Math.max(tip.y - 12, 8) }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}
