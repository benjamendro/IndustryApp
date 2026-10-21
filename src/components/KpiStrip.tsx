import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatDunam } from "../lib/labels"
import type { summarize } from "../lib/stats"

type Summary = ReturnType<typeof summarize>

const cards = [
  { key: "total", label: "סה״כ מגרשים", color: "#0E2A47" },
  { key: "vacant", label: "פנויים", color: "#0072B2" },
  { key: "built", label: "בנויים", color: "#009E73" },
  { key: "partial", label: "בנויים חלקית", color: "#E69F00" },
] as const

function areaOf(summary: Summary, key: (typeof cards)[number]["key"]) {
  if (key === "total") return summary.totalDunam
  return summary.dunam[key]
}

export function KpiStrip({ summary }: { summary: Summary }) {
  const progress = summary.total === 0 ? 0 : Math.round((summary.updated / summary.total) * 100)
  const chartHeight = Math.max(180, summary.byLandUse.length * 36 + 8)

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-3 md:px-6" aria-label="תמונת מצב">
      {summary.demo > 0 && (
        <p className="mb-3 rounded-xl border border-[#F0D48A] bg-[#FFF6DE] px-4 py-2 text-sm font-medium text-[#6A4B00] md:text-base">
          רשומות שמסומנות «הדגמה» הן דוגמה בלבד, לא עדכון אמיתי של המנהל.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.key} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-muted">{card.label}</p>
            <p className="mt-1 text-4xl font-extrabold leading-none text-navy">{summary[card.key]}</p>
            <p className="mt-2 text-base font-bold text-ink">{formatDunam(areaOf(summary, card.key))} דונם</p>
            <span className="mt-2 block h-1.5 w-10 rounded-full" style={{ background: card.color }} />
          </article>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold">מצב הבנייה</h2>
          <div className="h-52" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byStatus}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="#fff"
                >
                  {summary.byStatus.map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value, entry) => {
                    const count = (entry.payload as { count?: number } | undefined)?.count ?? 0
                    return `${value} (${count})`
                  }}
                />
                <Tooltip formatter={(value) => [`${value ?? 0}`, "מגרשים"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1">
            <p className="text-base font-bold">
              עודכנו {summary.updated} מתוך {summary.total} מגרשים
            </p>
            {summary.demo > 0 && (
              <p className="text-sm text-[#6A4B00]">מתוכם {summary.demo} הם נתוני הדגמה</p>
            )}
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#E4EAF1]" aria-hidden="true">
              <div className="h-full rounded-full bg-navy" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold">לפי ייעוד הקרקע</h2>
          <div dir="ltr" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.byLandUse}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
              >
                <XAxis type="number" reversed hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  orientation="right"
                  width={188}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#122033", fontSize: 13, fontFamily: "Heebo, Arial, sans-serif" }}
                />
                <Tooltip formatter={(value) => [`${value ?? 0}`, "מגרשים"]} />
                <Bar dataKey="count" fill="#1F4E79" barSize={14} radius={[6, 0, 0, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  )
}
