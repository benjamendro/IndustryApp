import { config } from "../config"

export function Header() {
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <div>
          <p className="text-sm font-medium text-white/75">{config.clusterName}</p>
          <h1 className="text-[1.65rem] font-extrabold leading-tight md:text-3xl">{config.authority}</h1>
        </div>
        <p className="max-w-xl text-base font-semibold leading-snug md:text-lg">
          לחץ על עסק במפה כדי לעדכן את הפרטים שלו
        </p>
      </div>
    </header>
  )
}
