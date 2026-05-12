import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseYeastCsv } from '../parseYeastCsv'
import { formatHours, lookupFermentHours } from '../fermentLookup'

const here = dirname(fileURLToPath(import.meta.url))
const csvPath = resolve(here, '../../../Pizza Yeast Table - Baker\'s Yeast.csv')
const csvText = readFileSync(csvPath, 'utf8')
const table = parseYeastCsv(csvText)

describe('lookupFermentHours', () => {
  it('returns the exact tabulated value for an exact (temp, %) match', () => {
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0.128,
      tempC: 21.1,
    })
    expect(result.hours).toBeCloseTo(7, 5)
    expect(result.clamped.temp).toBeNull()
    expect(result.clamped.percent).toBeNull()
  })

  it('linearly interpolates along the temperature axis', () => {
    // At IDY 0.128% the table gives 7 h at 21.1°C and 6 h at 21.7°C.
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0.128,
      tempC: 21.4,
    })
    expect(result.hours).toBeCloseTo(6.5, 5)
  })

  it('linearly interpolates along the percent axis', () => {
    // At 21.1°C, IDY 0.096% = 8 h and IDY 0.128% = 7 h. Midpoint 0.112%.
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0.112,
      tempC: 21.1,
    })
    expect(result.hours).toBeCloseTo(7.5, 5)
  })

  it('clamps temperatures above the table and adds a note', () => {
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0.128,
      tempC: 200,
    })
    expect(result.hours).not.toBeNull()
    expect(result.clamped.temp).toBe('above')
    expect(result.notes.some((n) => /above the tabulated/i.test(n))).toBe(true)
  })

  it('clamps yeast percentages below the table and adds a note', () => {
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0.0001,
      tempC: 21.1,
    })
    expect(result.hours).not.toBeNull()
    expect(result.clamped.percent).toBe('below')
    expect(result.notes.some((n) => /below the tabulated/i.test(n))).toBe(true)
  })

  it('rejects non-positive percentages', () => {
    const result = lookupFermentHours({
      table,
      yeastType: 'IDY',
      bakerPercent: 0,
      tempC: 21.1,
    })
    expect(result.hours).toBeNull()
  })
})

describe('formatHours', () => {
  it('renders whole hours without minutes', () => {
    expect(formatHours(6)).toBe('6 h')
  })
  it('renders mixed hours and minutes', () => {
    expect(formatHours(6.5)).toBe('6 h 30 min')
  })
  it('renders sub-hour values as minutes only', () => {
    expect(formatHours(0.75)).toBe('45 min')
  })
  it('rounds to the nearest 15 minutes', () => {
    expect(formatHours(27.9667)).toBe('28 h')
    expect(formatHours(6.3)).toBe('6 h 15 min')
    expect(formatHours(1.1)).toBe('1 h')
    expect(formatHours(0.45)).toBe('30 min')
  })
})
