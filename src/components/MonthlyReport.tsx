import { useRef, useState } from 'react'
import type { MonthlyReportData } from '../types'
import { analyzeCSV } from '../services/anthropic'

// ── Types ────────────────────────────────────────────────────────────────────

interface ReportEntry {
  id: string
  filename: string
  generatedAt: string // ISO string
  data: MonthlyReportData
}

// ── Storage ──────────────────────────────────────────────────────────────────

const ARCHIVE_KEY = 'signal-report-archive'
const LEGACY_KEY = 'signal-monthly-report'

function loadArchive(): ReportEntry[] {
  try {
    // Migrate legacy single-report key into archive on first load
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy) as { report: MonthlyReportData; filename: string }
      if (parsed.report) {
        const migrated: ReportEntry[] = [
          {
            id: crypto.randomUUID(),
            filename: parsed.filename ?? 'report.csv',
            generatedAt: new Date().toISOString(),
            data: parsed.report,
          },
        ]
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(migrated))
        localStorage.removeItem(LEGACY_KEY)
        return migrated
      }
    }

    const raw = localStorage.getItem(ARCHIVE_KEY)
    return raw ? (JSON.parse(raw) as ReportEntry[]) : []
  } catch {
    return []
  }
}

function saveArchive(entries: ReportEntry[]): void {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  P0: { bg: '#FEE2E2', color: '#DC2626' },
  P1: { bg: '#FFEDD5', color: '#EA580C' },
  P2: { bg: '#FEF9C3', color: '#CA8A04' },
  P3: { bg: '#DBEAFE', color: '#2563EB' },
  P4: { bg: '#F3F4F6', color: '#6B7280' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  bg = '#f7f7f5',
  titleColor = '#9b9b97',
  children,
}: {
  title: string
  bg?: string
  titleColor?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ background: bg, borderRadius: '10px', padding: '20px 24px' }}>
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: titleColor,
          marginBottom: '14px',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function ReportView({ report }: { report: MonthlyReportData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Section title="Executive Summary">
        <p style={{ fontSize: '14px', color: '#3d3d3a', lineHeight: '1.75' }}>
          {report.executiveSummary}
        </p>
      </Section>

      <Section title="Priority Breakdown">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((p) => {
            const { bg, color } = PRIORITY_COLORS[p]
            return (
              <div
                key={p}
                style={{
                  background: bg,
                  borderRadius: '8px',
                  padding: '14px 20px',
                  minWidth: '80px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '26px', fontWeight: 700, color, lineHeight: 1 }}>
                  {report.priorityBreakdown[p] ?? 0}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color, marginTop: '4px' }}>
                  {p}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Top Themes">
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {report.topThemes.map((theme, i) => (
            <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '14px', lineHeight: '1.5' }}>
              <span style={{ color: '#c4c4c0', fontWeight: 600, minWidth: '18px' }}>{i + 1}.</span>
              <span style={{ color: '#3d3d3a' }}>{theme}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Churn Risks" bg="#FFF5F5" titleColor="#DC2626">
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {report.churnRisks.map((risk, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px', lineHeight: '1.5' }}>
              <span style={{ color: '#DC2626', flexShrink: 0 }}>⚠</span>
              <span style={{ color: '#3d3d3a' }}>{risk}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recommendations">
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {report.recommendations.map((rec, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px', lineHeight: '1.5' }}>
              <span style={{ color: '#22c55e', flexShrink: 0 }}>→</span>
              <span style={{ color: '#3d3d3a' }}>{rec}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function MonthlyReport() {
  const [archive, setArchive] = useState<ReportEntry[]>(() => loadArchive())
  const [selectedId, setSelectedId] = useState<string | null>(() => loadArchive()[0]?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedReport = archive.find((e) => e.id === selectedId) ?? null

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const text = await file.text()
      const data = await analyzeCSV(text)
      const entry: ReportEntry = {
        id: crypto.randomUUID(),
        filename: file.name,
        generatedAt: new Date().toISOString(),
        data,
      }
      const updated = [entry, ...archive]
      setArchive(updated)
      setSelectedId(entry.id)
      saveArchive(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Check your Anthropic API key.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset input so re-uploading the same file triggers onChange
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '36px 24px 60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>Monthly Report</h2>
        <p style={{ fontSize: '14px', color: '#9b9b97' }}>
          Upload a CSV of customer feedback. Claude generates an executive report with priority
          breakdown, themes, churn risks, and recommendations.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#6b6b6b' : '#e2e2df'}`,
          borderRadius: '12px',
          padding: loading ? '28px 24px' : '36px 24px',
          textAlign: 'center',
          cursor: loading ? 'default' : 'pointer',
          marginBottom: '28px',
          background: dragOver ? '#f7f7f5' : '#fff',
          transition: 'all 0.15s',
          pointerEvents: loading ? 'none' : 'auto',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', marginBottom: '3px' }}>
          {loading ? '✦  Analyzing with Claude…' : 'Click or drag a CSV to upload'}
        </p>
        <p style={{ fontSize: '12px', color: '#9b9b97' }}>
          {loading ? 'This usually takes a few seconds' : 'Customer name, date, feedback columns recommended'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#DC2626',
            lineHeight: '1.5',
          }}
        >
          {error}
        </div>
      )}

      {/* Archive + report viewer */}
      {archive.length > 0 && (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Sidebar: archive list */}
          <div
            style={{
              width: '200px',
              flexShrink: 0,
              position: 'sticky',
              top: '20px',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#9b9b97',
                marginBottom: '8px',
                paddingLeft: '4px',
              }}
            >
              Archive · {archive.length}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {archive.map((entry, index) => {
                const isSelected = entry.id === selectedId
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 11px',
                      borderRadius: '7px',
                      border: isSelected ? '1px solid #e2e2df' : '1px solid transparent',
                      background: isSelected ? '#fff' : 'transparent',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginBottom: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: isSelected ? '#1a1a1a' : '#3d3d3a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(entry.generatedAt)}
                      </span>
                      {index === 0 && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: '#9b9b97',
                            background: '#f0f0ee',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                          }}
                        >
                          LATEST
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#9b9b97',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime(entry.generatedAt)} · {entry.filename}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Report content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {selectedReport && (
              <>
                <div style={{ marginBottom: '18px' }}>
                  <p style={{ fontSize: '13px', color: '#9b9b97' }}>
                    Generated {formatDate(selectedReport.generatedAt)} at{' '}
                    {formatTime(selectedReport.generatedAt)} from{' '}
                    <span style={{ color: '#6b6b6b', fontWeight: 500 }}>
                      {selectedReport.filename}
                    </span>
                  </p>
                </div>
                <ReportView report={selectedReport.data} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {archive.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#c4c4c0', fontSize: '14px' }}>
          No reports yet. Upload a CSV to generate your first report.
        </div>
      )}
    </div>
  )
}
