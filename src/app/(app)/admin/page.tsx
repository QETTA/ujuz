'use client'

import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import Card from '@/components/ui/card'
import Button from '@/components/ui/button'

type AdminStats = {
  users: number
  subscriptions: {
    free: number
    basic: number
    premium: number
  }
  alerts_24h: number
  payments_total: number
}

type ToAlertItem = {
  id?: string
  facility_id?: string
  facility_name?: string
  age_class?: string
  detected_at?: string
  created_at?: string
  is_read?: boolean
}

type HealthStatus = {
  status?: string
  db?: unknown
}

const AdminCard = ((Card as unknown as { Card?: ComponentType }).Card as ComponentType) || (Card as ComponentType)
const AdminButton = ((Button as unknown as { Button?: ComponentType }).Button as ComponentType) || (Button as ComponentType)

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  })
}

const parseToAlerts = (payload: unknown): ToAlertItem[] => {
  if (Array.isArray(payload)) {
    return payload as ToAlertItem[]
  }

  if (payload && typeof payload === 'object') {
    const raw = payload as { items?: unknown[]; alerts?: unknown[] }
    if (Array.isArray(raw.items)) {
      return raw.items as ToAlertItem[]
    }
    if (Array.isArray(raw.alerts)) {
      return raw.alerts as ToAlertItem[]
    }
  }

  return []
}

export default function AdminDashboardPage() {
  const [adminInput, setAdminInput] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [alerts, setAlerts] = useState<ToAlertItem[]>([])
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const fetchDashboard = async () => {
    if (!adminKey) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const headers = {
        'x-admin-key': adminKey,
      }

      const [statsResponse, toAlertsResponse, healthResponse] = await Promise.all([
        fetch('/api/v1/admin/stats', {
          headers,
          cache: 'no-store',
        }),
        fetch('/api/v1/to-alerts?limit=10', {
          headers,
          cache: 'no-store',
        }),
        fetch('/api/health', {
          cache: 'no-store',
        }),
      ])

      if (statsResponse.status === 401 || toAlertsResponse.status === 401) {
        setIsAuthorized(false)
        setError('관리자 키가 잘못되었습니다. 올바른 ADMIN_API_KEY를 입력해 주세요.')
        return
      }

      if (!statsResponse.ok) {
        const payload = await statsResponse.json().catch(() => ({ error: '관리자 통계 조회 실패' }))
        throw new Error((payload as { error?: string }).error ?? '관리자 통계 조회 실패')
      }

      const statsPayload = (await statsResponse.json()) as Partial<AdminStats>
      setStats({
        users: Number(statsPayload.users ?? 0),
        subscriptions: {
          free: Number(statsPayload.subscriptions?.free ?? 0),
          basic: Number(statsPayload.subscriptions?.basic ?? 0),
          premium: Number(statsPayload.subscriptions?.premium ?? 0),
        },
        alerts_24h: Number(statsPayload.alerts_24h ?? 0),
        payments_total: Number(statsPayload.payments_total ?? 0),
      })
      setIsAuthorized(true)

      if (toAlertsResponse.ok) {
        const toAlertPayload = await toAlertsResponse.json().catch(() => null)
        setAlerts(parseToAlerts(toAlertPayload))
      } else {
        setAlerts([])
      }

      if (healthResponse.ok) {
        setHealth(await healthResponse.json())
      } else {
        setHealth({ status: 'unhealthy' })
      }

      setLastRefreshedAt(
        new Date().toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        }),
      )
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '데이터를 불러오지 못했습니다.')
      setIsAuthorized(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!adminKey) {
      return
    }

    void fetchDashboard()
    const timer = window.setInterval(() => {
      void fetchDashboard()
    }, 60_000)

    return () => {
      window.clearInterval(timer)
    }
  }, [adminKey])

  const handleAuthorize = () => {
    const trimmed = adminInput.trim()
    if (!trimmed) {
      setError('관리자 키를 입력해 주세요.')
      return
    }

    setAdminKey(trimmed)
    setIsAuthorized(false)
    setError('')
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
            className="h-10 flex-1 min-w-64 rounded-lg border border-border bg-surface px-3"
          />
          <AdminButton type="button" onClick={handleAuthorize}>
            확인
          </AdminButton>
        </div>
        {adminInput && adminKey === '' ? (
          <p className="mt-2 text-xs text-text-secondary">입력 후 인증 버튼을 누르면 데이터 조회가 시작됩니다.</p>
        ) : null}
      </AdminCard>

      {error && (
        <AdminCard className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {error}
        </AdminCard>
      )}

      {isLoading && <p className="text-sm text-text-secondary">로딩 중...</p>}

      {lastRefreshedAt ? (
        <p className="text-xs text-text-secondary">마지막 갱신: {lastRefreshedAt}</p>
      ) : null}

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-semibold">사용자 통계</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2 font-medium">총 사용자</td>
                <td className="py-2">{stats ? stats.users : isAuthorized ? '0' : '-'}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 font-medium">최근 24h TO 알림</td>
                <td className="py-2">{stats ? stats.alerts_24h : isAuthorized ? '0' : '-'}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 font-medium">총 결제 건수</td>
                <td className="py-2">{stats ? stats.payments_total : isAuthorized ? '0' : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-semibold">TO 알림 현황</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-text-secondary">조회된 알림이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80">
                  <th className="pb-2 text-left">시설 ID</th>
                  <th className="pb-2 text-left">시설명</th>
                  <th className="pb-2 text-left">연령대</th>
                  <th className="pb-2 text-left">생성일시</th>
                  <th className="pb-2 text-left">읽음</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, index) => (
                  <tr key={alert.id ?? `${alert.facility_id}-${index}`} className="border-t border-border">
                    <td className="py-2">{alert.facility_id ?? '-'}</td>
                    <td className="py-2">{alert.facility_name ?? '-'}</td>
                    <td className="py-2">{alert.age_class ?? '-'}</td>
                    <td className="py-2">{formatDateTime(alert.detected_at || alert.created_at)}</td>
                    <td className="py-2">{alert.is_read ? '읽음' : '미읽음'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-semibold">구독 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="border-b border-border/80">
                <th className="pb-2 text-left">구독 티어</th>
                <th className="pb-2 text-left">사용자 수</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2">free</td>
                <td className="py-2">{stats ? stats.subscriptions.free : '-'}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">basic</td>
                <td className="py-2">{stats ? stats.subscriptions.basic : '-'}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2">premium</td>
                <td className="py-2">{stats ? stats.subscriptions.premium : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard className="rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-lg font-semibold">시스템 상태</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2 font-medium">상태</td>
                <td className="py-2">{health?.status ?? '-'}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2 font-medium">DB</td>
                <td className="py-2">{typeof health?.db === 'boolean' ? (health?.db ? 'OK' : 'FAIL') : JSON.stringify(health?.db) ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminCard>
    </main>
  )
}
