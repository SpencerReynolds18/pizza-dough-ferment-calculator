import csvText from "../../Pizza Yeast Table - Baker's Yeast.csv?raw"
import { parseYeastCsv } from '../lib/parseYeastCsv'

export const yeastTable = parseYeastCsv(csvText)
