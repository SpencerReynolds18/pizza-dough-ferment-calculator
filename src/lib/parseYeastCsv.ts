import type { ColumnHeader, TempRow, YeastTable, YeastType } from './types'
import { YEAST_TYPES } from './types'

/**
 * The source CSV is a flattened 3D table:
 *   row 1: ADY baker %, row 2: IDY %, row 3: CY %, row 4: SS %
 *   row 5: "°C, °F / hrs" axis labels
 *   rows 6+: tempC, tempF, then ferment hours for each column index
 *
 * Column 0 holds the temperature in °C (or is empty on header rows),
 * column 1 holds °F (or the yeast label like "ADY %"), and columns 2..N
 * carry per-yeast percentages or per-cell hours.
 */

const YEAST_LABEL_TO_TYPE: Record<string, YeastType> = {
  'ADY %': 'ADY',
  'IDY %': 'IDY',
  'CY %': 'CY',
  'SS %': 'SS',
}

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim())
}

function parseNumberOrNull(cell: string): number | null {
  if (cell === '') return null
  const value = Number(cell)
  return Number.isFinite(value) ? value : null
}

export function parseYeastCsv(csvText: string): YeastTable {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line, index, all) => index < all.length - 1 || line.length > 0)

  if (lines.length < 6) {
    throw new Error('Yeast CSV is missing expected header and data rows.')
  }

  const columnsByYeast: Record<YeastType, ColumnHeader[]> = {
    ADY: [],
    IDY: [],
    CY: [],
    SS: [],
  }

  for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
    const cells = splitCsvLine(lines[rowIndex])
    const yeastType = YEAST_LABEL_TO_TYPE[cells[1]]
    if (!yeastType) {
      throw new Error(
        `Expected yeast label in row ${rowIndex + 1}, column 2 (got "${cells[1]}").`,
      )
    }
    for (let columnIndex = 2; columnIndex < cells.length; columnIndex += 1) {
      const percent = parseNumberOrNull(cells[columnIndex])
      if (percent !== null) {
        columnsByYeast[yeastType].push({ columnIndex, bakerPercent: percent })
      }
    }
    columnsByYeast[yeastType].sort((a, b) => a.bakerPercent - b.bakerPercent)
  }

  const rows: TempRow[] = []
  for (let rowIndex = 5; rowIndex < lines.length; rowIndex += 1) {
    const line = lines[rowIndex]
    if (line.trim() === '') continue
    const cells = splitCsvLine(line)
    const tempC = parseNumberOrNull(cells[0])
    const tempF = parseNumberOrNull(cells[1])
    if (tempC === null || tempF === null) continue

    const hoursByColumn: Array<number | null> = new Array(cells.length).fill(null)
    for (let columnIndex = 2; columnIndex < cells.length; columnIndex += 1) {
      hoursByColumn[columnIndex] = parseNumberOrNull(cells[columnIndex])
    }
    rows.push({ tempC, tempF, hoursByColumn })
  }

  rows.sort((a, b) => a.tempC - b.tempC)

  for (const yeast of YEAST_TYPES) {
    if (columnsByYeast[yeast].length === 0) {
      throw new Error(`No baker percentages parsed for yeast type ${yeast}.`)
    }
  }
  if (rows.length === 0) {
    throw new Error('No temperature rows parsed from yeast CSV.')
  }

  return { columnsByYeast, rows }
}
