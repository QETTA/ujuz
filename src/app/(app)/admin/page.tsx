'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type RangeOption = '7d' | '30d'
type MetricUnit = 'krw' | 'percent' | 'count' | 'calls'

type AdminMetricCard = {
  id: string
  title: string
  value: number
  value_unit: MetricUnit
  secondary_value?: number
  secondary_unit?: MetricUnit
  description?: string
}

type SlaOverdueItem = {
  order_id: string
  status: string
  user_id?: string
  amount_krw?: number
  started_at: string
  due_at: string
  elapsed_hours: number
}

type AdminMetricsResponse = {
  cards?: unknown
  sla_overdue_items?: unknown
}

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void
  dataLayer?: Array<Record<string, unknown>>
}

const RANGE_OPTIONS: RangeOption[] = ['7d', '30d']
const SLA_CARD_ID = 'report_sla_overdue'

const AdminCard = Card
const AdminButton = Button

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value)

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

const formatValue = (value: number, unit: MetricUnit) => {
  if (unit === 'krw') return `${formatNumber(Math.round(value))}원`
  if (unit === 'percent') return `${value.toFixed(2)}%`
  if (unit === 'calls') return `${formatNumber(Math.round(value))}회`
  return `${formatNumber(Math.round(value))}건`
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

const parseCards = (payload: unknown): AdminMetricCard[] => {
  if (!Array.isArray(payload)) return []
  const parsed: AdminMetricCard[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const raw = item as {
      id?: unknown
      title?: unknown
      value?: unknown
      value_unit?: unknown
      secondary_value?: unknown
      secondary_unit?: unknown
      description?: unknown
    }
    if (typeof raw.id !== 'string' || typeof raw.title !== 'string') continue
    if (!['krw', 'percent', 'count', 'calls'].includes(String(raw.value_unit))) continue

    const card: AdminMetricCard = {
      id: raw.id,
      title: raw.title,
      value: toNumber(raw.value),
      value_unit: raw.value_unit as MetricUnit,
    }

    if (raw.secondary_value !== undefined) {
      card.secondary_value = toNumber(raw.secondary_value)
    }
    if (raw.secondary_unit && ['krw', 'percent', 'count', 'calls'].includes(String(raw.secondary_unit))) {
      card.secondary_unit = raw.secondary_unit as MetricUnit
    }
    if (typeof raw.description === 'string') {
      card.description = raw.description
    }

    parsed.push(card)
  }
  return parsed
}

const parseSlaOverdueItems = (payload: unknown): SlaOverdueItem[] => {
  if (!Array.isArray(payload)) return []
  const parsed: SlaOverdueItem[] = []
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue
    const raw = item as {
      order_id?: unknown
      status?: unknown
      user_id?: unknown
      amount_krw?: unknown
      started_at?: unknown
      due_at?: unknown
      elapsed_hours?: unknown
    }
    if (typeof raw.order_id !== 'string' || typeof raw.status !== 'string') continue
    if (typeof raw.started_at !== 'string' || typeof raw.due_at !== 'string') continue

    const row: SlaOverdueItem = {
      order_id: raw.order_id,
      status: raw.status,
      started_at: raw.started_at,
      due_at: raw.due_at,
      elapsed_hours: Number(toNumber(raw.elapsed_hours).toFixed(1)),
    }

    if (typeof raw.user_id === 'string') {
      row.user_id = raw.user_id
    }
    if (raw.amount_krw !== undefined) {
      row.amount_krw = Math.round(toNumber(raw.amount_krw))
    }

    parsed.push(row)
  }
  return parsed
}

const extractErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback
  const raw = payload as { error?: unknown }
  if (typeof raw.error === 'string') return raw.error
  if (raw.error && typeof raw.error === 'object') {
    const nested = raw.error as { message?: unknown }
    if (typeof nested.message === 'string' && nested.message) return nested.message
  }
  return fallback
}

const trackAdminDashboardView = (range: RangeOption, cardCount: number) => {
  if (typeof window === 'undefined') return

  const payload = { range, card_count: cardCount }
  const analyticsWindow = window as AnalyticsWindow

  if (typeof analyticsWindow.gtag === 'function') {
    analyticsWindow.gtag('event', 'admin_dashboard_view', payload)
  }

  if (Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer.push({ event: 'admin_dashboard_view', ...payload })
  }

  window.dispatchEvent(
    new CustomEvent('ujuz:analytics', {
      detail: { event: 'admin_dashboard_view', payload },
    }),
  )
}

export default function AdminDashboardPage() {
  const [adminInput, setAdminInput] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [range, setRange] = useState<RangeOption>('7d')
  const [cards, setCards] = useState<AdminMetricCard[]>([])
  const [slaOverdueItems, setSlaOverdueItems] = useState<SlaOverdueItem[]>([])
  const [showSlaDetails, setShowSlaDetails] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')
  const trackedRangesRef = useRef<Set<RangeOption>>(new Set())

  const fetchDashboard = useCallback(
    async (options?: { trackEvent?: boolean }) => {
      if (!adminKey) return

      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/v1/admin/metrics?range=${encodeURIComponent(range)}`, {
          headers: { 'x-admin-key': adminKey },
          cache: 'no-store',
        })

        if (response.status === 401) {
          setIsAuthorized(false)
          setCards([])
          setSlaOverdueItems([])
          setError('관리자 키가 잘못되었습니다. 올바른 ADMIN_API_KEY를 입력해 주세요.')
          return
        }

        const body = (await response.json().catch(() => ({}))) as AdminMetricsResponse

        if (!response.ok) {
          throw new Error(extractErrorMessage(body, '관리자 지표 조회에 실패했습니다.'))
        }

        const parsedCards = parseCards(body.cards)
        const parsedSlaItems = parseSlaOverdueItems(body.sla_overdue_items)

        setCards(parsedCards)
        setSlaOverdueItems(parsedSlaItems)
        setIsAuthorized(true)
        setLastRefreshedAt(
          new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
          }),
        )

        if (options?.trackEvent !== false && !trackedRangesRef.current.has(range)) {
          trackAdminDashboardView(range, parsedCards.length)
          trackedRangesRef.current.add(range)
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    },
    [adminKey, range],
  )

  useEffect(() => {
    if (!adminKey) return

    void fetchDashboard()
    const timer = window.setInterval(() => {
      void fetchDashboard({ trackEvent: false })
    }, 60_000)

    return () => {
      window.clearInterval(timer)
    }
  }, [adminKey, range, fetchDashboard])

  const handleAuthorize = () => {
    const trimmed = adminInput.trim()
    if (!trimmed) {
      setError('관리자 키를 입력해 주세요.')
      return
    }

    trackedRangesRef.current.clear()
    setAdminKey(trimmed)
    setIsAuthorized(false)
    setCards([])
    setSlaOverdueItems([])
    setShowSlaDetails(false)
    setError('')
  }

  const handleRangeChange = (nextRange: RangeOption) => {
    if (range === nextRange) return
    setRange(nextRange)
    setShowSlaDetails(false)
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">관리자 대시보드</h1>

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">관리자 인증</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            value={adminInput}
            onChange={(event) => setAdminInput(event.target.value)}
            placeholder="ADMIN_API_KEY"
            className="h-10 min-w-64 flex-1 rounded-lg border border-border bg-surface px-3"
          />
          <AdminButton type="button" onClick={handleAuthorize}>
            확인
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => {
              void fetchDashboard({ trackEvent: false })
            }}
            disabled={!adminKey || isLoading}
          >
            새로고침
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">기간 필터</h2>
        <div className="mt-3 flex gap-2">
          {RANGE_OPTIONS.map((option) => (
            <AdminButton
              key={option}
              type="button"
              variant={range === option ? 'primary' : 'secondary'}
              onClick={() => handleRangeChange(option)}
              disabled={!adminKey || isLoading}
            >
              {option}
            </AdminButton>
          ))}
        </div>
      </AdminCard>

      {error ? (
        <AdminCard className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </AdminCard>
      ) : null}

      {isLoading ? <p className="text-sm text-text-secondary">로딩 중...</p> : null}
      {lastRefreshedAt ? <p className="text-xs text-text-secondary">마지막 갱신: {lastRefreshedAt}</p> : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.length === 0 ? (
          <AdminCard className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary md:col-span-2 xl:col-span-3">
            {isAuthorized ? '표시할 지표가 없습니다.' : '관리자 키 인증 후 지표가 표시됩니다.'}
          </AdminCard>
        ) : (
          cards.map((card) => {
            const isSlaCard = card.id === SLA_CARD_ID
            const cardClassName = `rounded-xl border bg-surface p-4 ${isSlaCard ? 'border-primary/50' : 'border-border'}`

            const content = (
              <>
                <p className="text-sm font-medium text-text-secondary">{card.title}</p>
                <p className="mt-2 text-2xl font-bold">{formatValue(card.value, card.value_unit)}</p>
                {card.secondary_value !== undefined ? (
                  <p className="mt-1 text-sm text-text-secondary">
                    {formatValue(card.secondary_value, card.secondary_unit ?? 'count')}
                  </p>
                ) : null}
                {card.description ? <p className="mt-2 text-xs text-text-secondary">{card.description}</p> : null}
              </>
            )

            if (!isSlaCard) {
              return (
                <AdminCard key={card.id} className={cardClassName}>
                  {content}
                </AdminCard>
              )
            }

            return (
              <button
                key={card.id}
                type="button"
                className={`${cardClassName} text-left transition hover:border-primary ${showSlaDetails ? 'ring-1 ring-primary/30' : ''}`}
                onClick={() => setShowSlaDetails((prev) => !prev)}
              >
                {content}
              </button>
            )
          })
        )}
      </section>

      {showSlaDetails ? (
        <AdminCard className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">SLA 48h 초과 상세</h2>
          {slaOverdueItems.length === 0 ? (
            <p className="text-sm text-text-secondary">초과 건이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="pb-2 text-left">주문 ID</th>
                    <th className="pb-2 text-left">상태</th>
                    <th className="pb-2 text-left">시작시각</th>
                    <th className="pb-2 text-left">SLA 마감</th>
                    <th className="pb-2 text-left">경과시간</th>
                    <th className="pb-2 text-left">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {slaOverdueItems.map((item) => (
                    <tr key={`${item.order_id}-${item.started_at}`} className="border-t border-border">
                      <td className="py-2">{item.order_id}</td>
                      <td className="py-2">{item.status}</td>
                      <td className="py-2">{formatDateTime(item.started_at)}</td>
                      <td className="py-2">{formatDateTime(item.due_at)}</td>
                      <td className="py-2">{item.elapsed_hours.toFixed(1)}h</td>
                      <td className="py-2">{item.amount_krw !== undefined ? `${formatNumber(item.amount_krw)}원` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      ) : null}
    </main>
  )
}
