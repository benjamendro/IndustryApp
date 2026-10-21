import { useEffect, useRef, useState, type MutableRefObject } from "react"
import { config } from "../config"
import { formatUpdatedAt, precisionLabel } from "../lib/labels"
import {
  ACTIVITY_TYPES,
  BUILDING_STATUSES,
  EMPLOYEE_RANGES,
  type ActivityType,
  type BuildingStatus,
  type Business,
  type BusinessUpdate,
  type EmployeeRange,
} from "../types"

type Props = {
  business: Business | null
  pile: Business[]
  update?: BusinessUpdate
  guardRef: MutableRefObject<(action: () => void) => void>
  onSelect: (id: string) => void
  onSave: (update: BusinessUpdate) => void
  onClose: () => void
}

type Draft = {
  status: BuildingStatus | ""
  currentName: string
  activityType: ActivityType | ""
  employees: EmployeeRange | ""
  available: boolean | null
  contact: string
  notes: string
}

function draftFrom(update?: BusinessUpdate): Draft {
  return {
    status: update?.status ?? "",
    currentName: update?.currentName ?? "",
    activityType: update?.activityType ?? "",
    employees: update?.employees ?? "",
    available: update?.available ?? null,
    contact: update?.contact ?? "",
    notes: update?.notes ?? "",
  }
}

function snapshot(draft: Draft) {
  return JSON.stringify(draft)
}

export function UpdateForm({ business, pile, update, guardRef, onSelect, onSave, onClose }: Props) {
  const initial = draftFrom(update)
  const [draft, setDraft] = useState<Draft>(initial)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const baseline = useRef(snapshot(initial))
  const dirtyRef = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dirty = snapshot(draft) !== baseline.current
  dirtyRef.current = dirty

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  useEffect(() => {
    if (dirty) setSaved(false)
  }, [dirty])

  useEffect(() => {
    guardRef.current = (action) => {
      if (!dirtyRef.current) {
        action()
        return
      }
      const leave = window.confirm("יש פרטים שלא נשמרו. לעבור בלי לשמור?")
      if (leave) action()
    }
    return () => {
      guardRef.current = (action) => action()
    }
  }, [guardRef])

  if (!business) {
    return (
      <aside className="hidden h-full w-[400px] shrink-0 flex-col justify-center border-e border-line bg-white p-8 text-center md:flex">
        <h2 className="text-2xl font-extrabold text-navy">בחרו עסק במפה</h2>
        <p className="mt-3 text-lg leading-relaxed text-muted">לחץ על עסק במפה כדי לעדכן את הפרטים שלו.</p>
      </aside>
    )
  }

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setError("")
  }

  function save() {
    if (!business) return
    if (!draft.status) {
      setError("בחרו מצב בנייה: פנוי, בנוי, או בנוי חלקית.")
      return
    }
    if (draft.available === true && draft.contact.trim() === "") {
      setError("אם המקום פנוי להשכרה או למכירה, כתבו שם וטלפון ליצירת קשר.")
      return
    }
    const next: BusinessUpdate = {
      status: draft.status,
      currentName: draft.currentName.trim(),
      activityType: draft.activityType,
      employees: draft.employees,
      available: draft.available,
      contact: draft.available === true ? draft.contact.trim() : "",
      notes: draft.notes.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: config.managerName,
      isDemo: false,
    }
    onSave(next)
    const confirmed = draftFrom(next)
    setDraft(confirmed)
    baseline.current = snapshot(confirmed)
    setSaved(true)
    setError("")
  }

  return (
    <>
    <button
      type="button"
      className="fixed inset-0 z-20 bg-[#0E2A47]/40 md:hidden"
      aria-label="סגירה"
      onClick={onClose}
    />
    <aside className="fixed inset-x-0 bottom-0 z-30 flex max-h-[78dvh] min-h-0 flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(14,42,71,0.18)] md:static md:z-auto md:h-full md:max-h-none md:w-[400px] md:shrink-0 md:rounded-none md:border-e md:border-line md:shadow-none">
      <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-line md:hidden" />
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 md:pt-4">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-extrabold leading-snug text-navy outline-none">
            {business.name}
          </h2>
          {update?.isDemo && (
            <p className="mt-1 inline-block rounded-full bg-[#FFF6DE] px-3 py-1 text-sm font-bold text-[#6A4B00]">
              הדגמה
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-11 shrink-0 rounded-xl border border-line px-4 text-base font-bold md:hidden"
        >
          סגירה
        </button>
      </div>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {pile.length > 1 && (
            <div className="mb-4 rounded-2xl bg-paper p-3">
              <p className="text-sm font-bold">בנקודה הזו יש {pile.length} עסקים. בחרו את העסק לעדכון:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pile.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === business.id}
                    onClick={() => onSelect(item.id)}
                    className={`min-h-11 rounded-full px-3 py-2 text-sm font-bold ${
                      item.id === business.id ? "bg-navy text-white" : "bg-white text-navy"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {update?.isDemo && (
            <p className="mb-3 text-sm leading-relaxed text-[#6A4B00]">
              הפרטים שמופיעים כאן הם דוגמה בלבד. שמירה תחליף אותם בעדכון שלכם.
            </p>
          )}

          <dl>
            <ReadRow label="מספר בסקר" value={business.id} />
            <ReadRow label="שם לפי הסקר" value={business.name} />
            <ReadRow label="ענף פעילות" value={business.activityBranch} />
            <ReadRow label="יישוב" value={business.settlement} />
            <ReadRow label="כתובת" value={business.address} />
            <ReadRow label="דיוק המיקום" value={precisionLabel(business.locationPrecision)} />
          </dl>

          <fieldset className="mt-4">
            <legend className="mb-2 text-base font-bold">
              מצב בנייה <span className="text-[#9B2C2C]">*</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {BUILDING_STATUSES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={draft.status === item.value}
                  onClick={() => updateDraft({ status: item.value })}
                  className={`min-h-12 rounded-xl border px-2 text-sm font-bold ${
                    draft.status === item.value ? "border-navy bg-navy text-white" : "border-line bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block text-base font-bold" htmlFor="current-name">
            שם העסק כיום
          </label>
          <input
            id="current-name"
            value={draft.currentName}
            onChange={(event) => updateDraft({ currentName: event.target.value })}
            placeholder="אם השם השתנה, כתבו את השם העדכני"
            className="mt-2 h-12 w-full rounded-xl border border-line px-3 text-base"
            autoComplete="off"
          />

          <label className="mt-4 block text-base font-bold" htmlFor="activity-type">
            סוג הפעילות היום
          </label>
          <select
            id="activity-type"
            value={draft.activityType}
            onChange={(event) => updateDraft({ activityType: event.target.value as ActivityType | "" })}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3 text-base"
          >
            <option value="">בחירה</option>
            {ACTIVITY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-base font-bold" htmlFor="employees">
            מספר עובדים
          </label>
          <select
            id="employees"
            value={draft.employees}
            onChange={(event) => updateDraft({ employees: event.target.value as EmployeeRange | "" })}
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-3 text-base"
          >
            <option value="">בחירה</option>
            {EMPLOYEE_RANGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <fieldset className="mt-4">
            <legend className="mb-2 text-base font-bold">פנוי להשכרה או למכירה?</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: "כן" },
                { value: false, label: "לא" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={draft.available === item.value}
                  onClick={() => updateDraft({ available: item.value })}
                  className={`min-h-12 rounded-xl border text-base font-bold ${
                    draft.available === item.value ? "border-navy bg-navy text-white" : "border-line bg-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          {draft.available === true && (
            <>
              <label className="mt-4 block text-base font-bold" htmlFor="contact">
                פרטי קשר
              </label>
              <input
                id="contact"
                value={draft.contact}
                onChange={(event) => updateDraft({ contact: event.target.value })}
                placeholder="שם ומספר טלפון"
                className="mt-2 h-12 w-full rounded-xl border border-line px-3 text-base"
                autoComplete="off"
              />
            </>
          )}

          <label className="mt-4 block text-base font-bold" htmlFor="notes">
            הערות
          </label>
          <textarea
            id="notes"
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
            rows={3}
            className="mt-2 w-full rounded-xl border border-line px-3 py-3 text-base"
          />

          <p className="mt-4 text-sm leading-relaxed text-muted">
            {update
              ? `עדכון אחרון: ${formatUpdatedAt(update.updatedAt)} · ${update.updatedBy}`
              : "עדיין אין עדכון של המנהל"}
          </p>

        </div>

        <div className="shrink-0 border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <p role="alert" className="mb-3 rounded-xl bg-[#FDECEC] px-3 py-2 text-base font-semibold text-[#9B2C2C]">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="mb-3 rounded-xl bg-[#E5F6EF] px-3 py-2 text-base font-semibold text-[#0F7B4C]">
              הפרטים נשמרו
            </p>
          )}
          <button type="submit" className="h-12 w-full rounded-xl bg-navy text-lg font-extrabold text-white">
            שמירת העדכון
          </button>
        </div>
      </form>
    </aside>
    </>
  )
}

function ReadRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="border-b border-line py-2">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="text-base">{value}</dd>
    </div>
  )
}
