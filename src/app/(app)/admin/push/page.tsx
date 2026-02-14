'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type RangeType = '24h' | '7d'

type Summary = {
  sent: number
  delivered: number
  failed: number
}

type FailureItem = {
  reason: string
  count: number
}

type PushMetricsResponse = {
  summary: Summary
  failures_top3: FailureItem[]
  tokens_cleaned: number
}

type AnalyticsWindow = Window & {
  gtag?: (command: 'event', eventName: string, params?: Record<string, unknown>) => void
}

const RANGE_OPTIONS: Array<{ value: RangeType; label: string }> = [
  { value: '24h', label: '최근 24시간' },
  { value: '7d', label: '최근 7일' },
]

const EMPTY_METRICS: PushMetricsResponse = {
  summary: { sent: 0, delivered: 0, failed: 0 },
  failures_top3: [],
  tokens_cleaned: 0,
}

function trackAdminPushView(range: RangeType) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('ujuz:analytics', {
      detail: { event: 'admin_push_view', range },
    }),
  )

  const gtag = (window as AnalyticsWindow).gtag
  if (typeof gtag === 'function') {
    gtag('event', 'admin_push_view', { range })
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toMetrics(payload: unknown): PushMetricsResponse {
  if (!payload || typeof payload !== 'object') {
    return EMPTY_METRICS
  }

  const raw = payload as Record<string, unknown>
  const summaryRaw = raw.summary && typeof raw.summary === 'object'
    ? raw.summary as Record<string, unknown>
    : {}

  const failuresRaw = Array.isArray(raw.failures_top3) ? raw.failures_top3 : []
  const failuresTop3 = failuresRaw.map((item) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const reason = typeof row.reason === 'string' && row.reason.trim().length > 0 ? row.reason : 'Unknown'
    return {
      reason,
      count: toNumber(row.count),
    }
  })

  return {
    summary: {
      sent: toNumber(summaryRaw.sent),
      delivered: toNumber(summaryRaw.delivered),
      failed: toNumber(summaryRaw.failed),
    },
    failures_top3: failuresTop3.slice(0, 3),
    tokens_cleaned: toNumber(raw.tokens_cleaned),
  }
}

function toErrorMessage(payload: unknown, fallback = '푸시 지표를 불러오지 못했습니다.'): string {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  const raw = payload as Record<string, unknown>
  if (typeof raw.error === 'string') {
    return raw.error
  }

  if (raw.error && typeof raw.error === 'object') {
    const nested = raw.error as Record<string, unknown>
    if (typeof nested.message === 'string') {
      return nested.message
    }
  }

  return fallback
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

export default function AdminPushPage() {
  const [adminInput, setAdminInput] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [range, setRange] = useState<RangeType>('24h')
  const [metrics, setMetrics] = useState<PushMetricsResponse>(EMPTY_METRICS)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const failureRate = useMemo(() => {
    if (metrics.summary.sent === 0) return 0
    return (metrics.summary.failed / metrics.summary.sent) * 100
  }, [metrics.summary.failed, metrics.summary.sent])

  const fetchMetrics = async (selectedRange: RangeType) => {
    if (!adminKey) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/v1/admin/push-metrics?range=${selectedRange}`, {
        headers: {
          'x-admin-key': adminKey,
        },
        cache: 'no-store',
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setIsAuthorized(false)
        setMetrics(EMPTY_METRICS)
        setError(toErrorMessage(payload))
        return
      }

      setMetrics(toMetrics(payload))
      setIsAuthorized(true)
      setLastRefreshedAt(
        new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        }),
      )
    } catch {
      setIsAuthorized(false)
      setMetrics(EMPTY_METRICS)
      setError('네트워크 오류로 지표를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    trackAdminPushView('24h')
  }, [])

  useEffect(() => {
    if (!adminKey) return
    void fetchMetrics(range)
  }, [adminKey, range])

  const handleAuthorize = () => {
    const trimmed = adminInput.trim()
    if (!trimmed) {
      setError('관리자 키를 입력해 주세요.')
      return
    }

    setAdminKey(trimmed)
    setIsAuthorized(false)
    setError('')
    setMetrics(EMPTY_METRICS)
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Admin 푸시 모니터링</h1>

      <Card className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold">관리자 인증</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            value={adminInput}
            onChange={(event) => setAdminInput(event.target.value)}
            placeholder="ADMIN_API_KEY"
            className="h-10 min-w-64 flex-1 rounded-lg border border-border bg-surface px-3"
          />
          <Button type="button" onClick={handleAuthorize}>
            조회
          </Button>
        </div>
      </Card>

      {adminKey ? (
        <Card className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={range === option.value ? 'primary' : 'secondary'}
                onClick={() => setRange(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              loading={isLoading}
              onClick={() => void fetchMetrics(range)}
              className="ml-auto"
            >
              새로고침
            </Button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </Card>
      ) : null}

      {isLoading ? <p className="text-sm text-text-secondary">로딩 중...</p> : null}

      {lastRefreshedAt ? (
        <p className="text-xs text-text-secondary">마지막 갱신: {lastRefreshedAt}</p>
      ) : null}

      {isAuthorized ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">전송 시도</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(metrics.summary.sent)}</p>
            </Card>
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">전달 성공</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(metrics.summary.delivered)}</p>
            </Card>
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">전달 실패</p>
              <p className="mt-1 text-2xl font-bold text-danger">{formatNumber(metrics.summary.failed)}</p>
            </Card>
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">토큰 정리 수</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(metrics.tokens_cleaned)}</p>
            </Card>
          </section>

          <p className="text-xs text-text-secondary">
            실패율: {failureRate.toFixed(1)}%
          </p>

          <Card className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-lg font-semibold">실패 Top3</h2>
            {metrics.failures_top3.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="py-2 pr-3 font-medium">실패 사유</th>
                      <th className="py-2 font-medium">건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.failures_top3.map((item) => (
                      <tr key={item.reason} className="border-b border-border/60">
                        <td className="py-2 pr-3">{item.reason}</td>
                        <td className="py-2">{formatNumber(item.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">실패 로그가 없습니다.</p>
            )}
          </Card>
        </>
      ) : null}
    </main>
  )
}
