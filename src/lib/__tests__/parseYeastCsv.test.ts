import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseYeastCsv } from '../parseYeastCsv'

const here = dirname(fileURLToPath(import.meta.url))
const csvPath = resolve(here, '../../../Pizza Yeast Table - Baker\'s Yeast.csv')
const csvText = readFileSync(csvPath, 'utf8')

describe('parseYeastCsv', () => {
  it('parses all four yeast types with their baker percentages', () => {
    const table = parseYeastCsv(csvText)

    expect(table.columnsByYeast.ADY.length).toBeGreaterThan(20)
    expect(table.columnsByYeast.IDY.length).toBeGreaterThan(20)
    expect(table.columnsByYeast.CY.length).toBeGreaterThan(20)
    expect(table.columnsByYeast.SS.length).toBeGreaterThan(15)

    // SS row stops earlier than the others, so it should have fewer columns.
    expect(table.columnsByYeast.SS.length).toBeLessThan(
      table.columnsByYeast.ADY.length,
    )
  })

  it('keeps temperature rows sorted ascending and pairs C with F', () => {
    const table = parseYeastCsv(csvText)
    expect(table.rows.length).toBeGreaterThan(50)

    for (let i = 1; i < table.rows.length; i += 1) {
      expect(table.rows[i].tempC).toBeGreaterThanOrEqual(table.rows[i - 1].tempC)
    }

    const room = table.rows.find((r) => r.tempF === 70)
    expect(room).toBeDefined()
    expect(room?.tempC).toBeCloseTo(21.1, 1)
  })

  it('represents missing cells as null', () => {
    const table = parseYeastCsv(csvText)
    const coldest = table.rows[0]
    const hasNullCell = coldest.hoursByColumn.some((h) => h === null)
    expect(hasNullCell).toBe(true)
  })
})
