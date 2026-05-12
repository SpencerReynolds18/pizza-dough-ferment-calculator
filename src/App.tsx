import { useMemo, useState } from 'react'
import { yeastTable } from './data/yeastTable'
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatHours,
  lookupFermentHours,
} from './lib/fermentLookup'
import { YEAST_LABELS, YEAST_TYPES, type YeastType } from './lib/types'

type TempUnit = 'C' | 'F'

interface YeastDefaults {
  percent: number
  step: number
  min: number
  max: number
  description: string
}

const YEAST_DEFAULTS: Record<YeastType, YeastDefaults> = {
  IDY: {
    percent: 0.7,
    step: 0.1,
    min: 0.1,
    max: 1.0,
    description: 'SAF Red, Saf-Instant, Fleischmann\u2019s Instant.',
  },
  ADY: {
    percent: 0.7,
    step: 0.1,
    min: 0.1,
    max: 1.3,
    description: 'Active dry yeast (rehydrate before use for best results).',
  },
  CY: {
    percent: 1,
    step: 0.1,
    min: 0.1,
    max: 3.0,
    description: 'Fresh / cake / compressed yeast (often sold refrigerated).',
  },
  SS: {
    percent: 20,
    step: 0.1,
    min: 1,
    max: 40,
    description: 'Sourdough starter, expressed as % of flour weight.',
  },
}

const NUMBER_FORMAT_PCT = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

function formatPercent(p: number): string {
  return `${NUMBER_FORMAT_PCT.format(p)}%`
}

function formatTemp(c: number, unit: TempUnit): string {
  if (unit === 'F') return `${Math.round(celsiusToFahrenheit(c))}°F`
  return `${c.toFixed(1)}°C`
}

export default function App() {
  const [yeastType, setYeastType] = useState<YeastType>('IDY')
  const [bakerPercent, setBakerPercent] = useState<number>(YEAST_DEFAULTS.IDY.percent)
  const [tempUnit, setTempUnit] = useState<TempUnit>('F')
  const [tempC, setTempC] = useState<number>(fahrenheitToCelsius(38))
  const [flourGrams, setFlourGrams] = useState<number>(1000)

  const result = useMemo(
    () =>
      lookupFermentHours({
        table: yeastTable,
        yeastType,
        bakerPercent,
        tempC,
      }),
    [yeastType, bakerPercent, tempC],
  )

  const yeastGrams = (flourGrams * bakerPercent) / 100
  const defaults = YEAST_DEFAULTS[yeastType]

  const handleYeastTypeChange = (next: YeastType) => {
    setYeastType(next)
    setBakerPercent(YEAST_DEFAULTS[next].percent)
  }

  const handleBakerPercentBlur = () => {
    if (!Number.isFinite(bakerPercent)) return
    const snapped = Number((Math.round(bakerPercent / defaults.step) * defaults.step).toFixed(1))
    const clamped = Math.max(defaults.min, Math.min(defaults.max, snapped))
    if (clamped !== bakerPercent) setBakerPercent(clamped)
  }

  const handleTempChange = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    if (tempUnit === 'F') {
      setTempC(fahrenheitToCelsius(parsed))
    } else {
      setTempC(parsed)
    }
  }

  const handleUnitToggle = (next: TempUnit) => {
    setTempUnit(next)
  }

  const tempDisplay =
    tempUnit === 'F'
      ? Math.round(celsiusToFahrenheit(tempC) * 10) / 10
      : Math.round(tempC * 10) / 10

  const tempStep = tempUnit === 'F' ? 1 : 0.5

  return (
    <div className="page">
      <main className="card">
        <header className="hero">
          <h1>Pizza Dough Ferment Calculator</h1>
          <p className="hero-sub">
            Estimate bulk ferment time from yeast type, baker&rsquo;s percentage of
            flour, and proofing temperature.
          </p>
        </header>

        <section className="form">
          <fieldset className="field">
            <legend>Yeast type</legend>
            <div className="segmented" role="radiogroup" aria-label="Yeast type">
              {YEAST_TYPES.map((type) => (
                <label
                  key={type}
                  className={`segment ${yeastType === type ? 'is-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="yeast"
                    value={type}
                    checked={yeastType === type}
                    onChange={() => handleYeastTypeChange(type)}
                  />
                  <span className="segment-label">{type}</span>
                  <span className="segment-sub">{YEAST_LABELS[type]}</span>
                </label>
              ))}
            </div>
            <p className="hint">{defaults.description}</p>
          </fieldset>

          <div className="row">
            <label className="field">
              <span className="field-label">Yeast (baker&rsquo;s %)</span>
              <div className="field-with-aside">
                <div className="input-with-unit input-with-unit--compact">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={defaults.step}
                    min={defaults.min}
                    max={defaults.max}
                    value={bakerPercent}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      if (Number.isFinite(value)) setBakerPercent(value)
                    }}
                    onBlur={handleBakerPercentBlur}
                  />
                  <span className="input-unit" aria-hidden="true">%</span>
                </div>
                {flourGrams > 0 && (
                  <span className="field-aside">
                    × {flourGrams} g = {yeastGrams.toFixed(yeastGrams < 1 ? 2 : 1)} g
                  </span>
                )}
              </div>
            </label>

            <label className="field">
              <span className="field-label">
                Proof temperature
                <span className="field-meta">
                  <button
                    type="button"
                    className={`unit-toggle ${tempUnit === 'F' ? 'is-active' : ''}`}
                    onClick={() => handleUnitToggle('F')}
                  >
                    °F
                  </button>
                  <button
                    type="button"
                    className={`unit-toggle ${tempUnit === 'C' ? 'is-active' : ''}`}
                    onClick={() => handleUnitToggle('C')}
                  >
                    °C
                  </button>
                </span>
              </span>
              <div className="input-with-unit">
                <input
                  type="number"
                  inputMode="decimal"
                  step={tempStep}
                  value={tempDisplay}
                  onChange={(event) => handleTempChange(event.target.value)}
                />
                <span className="input-unit" aria-hidden="true">{`°${tempUnit}`}</span>
              </div>
            </label>
          </div>

          <label className="field field-flour">
            <span className="field-label">Flour weight</span>
            <div className="input-with-unit">
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step={10}
                value={flourGrams}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value) && value >= 0) setFlourGrams(value)
                }}
              />
              <span className="input-unit" aria-hidden="true">g</span>
            </div>
          </label>
        </section>

        <section className="result" aria-live="polite">
          {result.hours === null ? (
            <div className="result-empty">
              <h2>No estimate available</h2>
              <ul className="notes">
                {result.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="result-headline">
                <span className="result-label">Estimated bulk ferment</span>
                <span className="result-time">{formatHours(result.hours)}</span>
              </div>

              <dl className="meta">
                {result.bracket && (
                  <>
                    <div>
                      <dt>Proof temperature</dt>
                      <dd>{formatTemp(tempC, tempUnit)}</dd>
                    </div>
                    <div>
                      <dt>Yeast</dt>
                      <dd>{formatPercent(bakerPercent)}</dd>
                    </div>
                  </>
                )}
                {flourGrams > 0 && (
                  <div>
                    <dt>Yeast for {flourGrams} g flour</dt>
                    <dd>{yeastGrams.toFixed(yeastGrams < 1 ? 2 : 1)} g</dd>
                  </div>
                )}
              </dl>

              {result.notes.length > 0 && (
                <ul className="notes">
                  {result.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <footer className="footnote">
          <p>
            Source values from a baker&rsquo;s reference table. Times are estimates
            for bulk ferment until ready &mdash; treat them as a starting point and
            confirm by feel and float test.
          </p>
        </footer>
      </main>
    </div>
  )
}
