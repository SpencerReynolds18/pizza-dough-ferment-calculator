import type { ColumnHeader, TempRow, YeastTable, YeastType } from './types'

export interface LookupRequest {
  table: YeastTable
  yeastType: YeastType
  bakerPercent: number
  tempC: number
}

export interface LookupResult {
  hours: number | null
  bracket: {
    tempC: [number, number]
    bakerPercent: [number, number]
  } | null
  clamped: {
    temp: 'below' | 'above' | null
    percent: 'below' | 'above' | null
  }
  notes: string[]
}

interface RowInterpolation {
  hours: number
  lowPct: number
  highPct: number
  clamp: 'below' | 'above' | null
}

function interpolateRowAtPercent(
  row: TempRow,
  columns: ColumnHeader[],
  userPercent: number,
): RowInterpolation | null {
  const valid: Array<{ pct: number; hours: number }> = []
  for (const column of columns) {
    const cell = row.hoursByColumn[column.columnIndex]
    if (cell !== null && cell !== undefined) {
      valid.push({ pct: column.bakerPercent, hours: cell })
    }
  }
  if (valid.length === 0) return null
  valid.sort((a, b) => a.pct - b.pct)

  const first = valid[0]
  const last = valid[valid.length - 1]

  if (userPercent <= first.pct) {
    return { hours: first.hours, lowPct: first.pct, highPct: first.pct, clamp: 'below' }
  }
  if (userPercent >= last.pct) {
    return { hours: last.hours, lowPct: last.pct, highPct: last.pct, clamp: 'above' }
  }

  for (let i = 0; i < valid.length - 1; i += 1) {
    const a = valid[i]
    const b = valid[i + 1]
    if (userPercent >= a.pct && userPercent <= b.pct) {
      const span = b.pct - a.pct
      const t = span === 0 ? 0 : (userPercent - a.pct) / span
      return {
        hours: a.hours + t * (b.hours - a.hours),
        lowPct: a.pct,
        highPct: b.pct,
        clamp: null,
      }
    }
  }
  return null
}

export function lookupFermentHours(req: LookupRequest): LookupResult {
  const { table, yeastType, bakerPercent, tempC } = req
  const columns = table.columnsByYeast[yeastType]
  const notes: string[] = []
  const empty: LookupResult = {
    hours: null,
    bracket: null,
    clamped: { temp: null, percent: null },
    notes,
  }

  if (!Number.isFinite(bakerPercent) || bakerPercent <= 0) {
    notes.push('Yeast percentage must be greater than zero.')
    return empty
  }
  if (!Number.isFinite(tempC)) {
    notes.push('Temperature must be a finite number.')
    return empty
  }

  const perRow: Array<{ row: TempRow; interp: RowInterpolation }> = []
  for (const row of table.rows) {
    const interp = interpolateRowAtPercent(row, columns, bakerPercent)
    if (interp) perRow.push({ row, interp })
  }

  if (perRow.length === 0) {
    notes.push('No data is tabulated for this yeast percentage.')
    return empty
  }

  const firstPctSeen = Math.min(...perRow.map((p) => p.interp.lowPct))
  const lastPctSeen = Math.max(...perRow.map((p) => p.interp.highPct))
  let percentClamp: 'below' | 'above' | null = null
  if (bakerPercent < firstPctSeen) percentClamp = 'below'
  else if (bakerPercent > lastPctSeen) percentClamp = 'above'

  let tempClamp: 'below' | 'above' | null = null
  let chosen: { row: TempRow; interp: RowInterpolation }
  let other: { row: TempRow; interp: RowInterpolation } | null = null
  let blendT = 0

  const minTemp = perRow[0].row.tempC
  const maxTemp = perRow[perRow.length - 1].row.tempC

  if (tempC <= minTemp) {
    chosen = perRow[0]
    if (tempC < minTemp) tempClamp = 'below'
  } else if (tempC >= maxTemp) {
    chosen = perRow[perRow.length - 1]
    if (tempC > maxTemp) tempClamp = 'above'
  } else {
    let bracketed: { a: typeof perRow[number]; b: typeof perRow[number] } | null = null
    for (let i = 0; i < perRow.length - 1; i += 1) {
      const a = perRow[i]
      const b = perRow[i + 1]
      if (tempC >= a.row.tempC && tempC <= b.row.tempC) {
        bracketed = { a, b }
        break
      }
    }
    if (!bracketed) {
      chosen = perRow[0]
    } else {
      const span = bracketed.b.row.tempC - bracketed.a.row.tempC
      blendT = span === 0 ? 0 : (tempC - bracketed.a.row.tempC) / span
      chosen = bracketed.a
      other = bracketed.b
    }
  }

  const hours =
    other === null
      ? chosen.interp.hours
      : chosen.interp.hours + blendT * (other.interp.hours - chosen.interp.hours)

  const tempLow = chosen.row.tempC
  const tempHigh = other ? other.row.tempC : chosen.row.tempC
  const pctLow = other
    ? Math.min(chosen.interp.lowPct, other.interp.lowPct)
    : chosen.interp.lowPct
  const pctHigh = other
    ? Math.max(chosen.interp.highPct, other.interp.highPct)
    : chosen.interp.highPct

  if (tempClamp === 'below') {
    notes.push(
      `Temperature is below the tabulated range; using the coldest row (${minTemp}°C).`,
    )
  } else if (tempClamp === 'above') {
    notes.push(
      `Temperature is above the tabulated range; using the warmest row (${maxTemp}°C).`,
    )
  }
  if (percentClamp === 'below') {
    notes.push(
      `Yeast percentage is below the tabulated range; using the lowest available value (${firstPctSeen}%).`,
    )
  } else if (percentClamp === 'above') {
    notes.push(
      `Yeast percentage is above the tabulated range; using the highest available value (${lastPctSeen}%).`,
    )
  }

  return {
    hours,
    bracket: {
      tempC: [tempLow, tempHigh],
      bakerPercent: [pctLow, pctHigh],
    },
    clamped: { temp: tempClamp, percent: percentClamp },
    notes,
  }
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '—'
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

export function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32
}

export function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9
}
