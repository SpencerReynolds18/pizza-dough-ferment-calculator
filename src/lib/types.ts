export type YeastType = 'ADY' | 'IDY' | 'CY' | 'SS'

export const YEAST_TYPES: readonly YeastType[] = ['ADY', 'IDY', 'CY', 'SS'] as const

export const YEAST_LABELS: Record<YeastType, string> = {
  ADY: 'Active dry yeast',
  IDY: 'Instant dry yeast',
  CY: 'Cake / fresh yeast',
  SS: 'Sourdough starter',
}

/**
 * One column of the master table. Each yeast type maps to its own
 * baker's percentage at this column index; cells where a yeast does not
 * have a defined percent are omitted from that yeast's percent list.
 */
export interface ColumnHeader {
  columnIndex: number
  bakerPercent: number
}

/**
 * Hours of bulk fermentation for a given temperature row, indexed by the
 * raw CSV column index. `null` means the source sheet had no entry for
 * that combination.
 */
export interface TempRow {
  tempC: number
  tempF: number
  hoursByColumn: Array<number | null>
}

/**
 * Parsed view of the yeast table. `columnsByYeast[yeast]` is sorted by
 * `bakerPercent` ascending and only includes columns where the yeast has
 * a defined percentage. `rows` is sorted by `tempC` ascending.
 */
export interface YeastTable {
  columnsByYeast: Record<YeastType, ColumnHeader[]>
  rows: TempRow[]
}
