'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type LeadStatus = 'new' | 'in_progress' | 'done'
type StatusFilter = 'all' | LeadStatus

type LeadItem = {
  id: string
  org_id: string
  partner_name: string
  status: LeadStatus
  parent_name: string
  child_age: number
  message: string
  created_at: string | null
  updated_at: string | null
}

type LeadsResponse = {
  leads?: unknown
}

type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void
  dataLayer?: Array<Record<string, unknown>>
}

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: '신규' },
  { value: 'in_progress', label: '진행중' },
  { value: 'done', label: '완료' },
]

const FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'new', label: '신규' },
  { value: 'in_progress', label: '진행중' },
  { value: 'done', label: '완료' },
]

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function readText(raw: Record<string, unknown>, key: string): string {
  const value = raw[key]
  return typeof value === 'string' ? value : ''
}

function normalizeStatus(value: unknown): LeadStatus {
  if (value === 'new' || value === 'in_progress' || value === 'done') return value
  return 'new'
}

function toIso(value: unknown): string | null {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  return null
}

function toErrorMessage(payload: unknown, fallback = '리드 목록을 불러오지 못했습니다.'): string {
  if (!payload || typeof payload !== 'object') return fallback

  const raw = payload as Record<string, unknown>
  if (typeof raw.error === 'string') return raw.error

  if (raw.error && typeof raw.error === 'object') {
    const nested = raw.error as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }

  return fallback
}

function toLeadItems(payload: unknown): LeadItem[] {
  if (!Array.isArray(payload)) return []

  const items: LeadItem[] = []
  for (const row of payload) {
    if (!row || typeof row !== 'object') continue
    const raw = row as Record<string, unknown>
    const leadId = readText(raw, 'id') || readText(raw, 'lead_id')
    if (!leadId) continue

    items.push({
      id: leadId,
      org_id: readText(raw, 'org_id'),
      partner_name: readText(raw, 'partner_name'),
      status: normalizeStatus(raw.status),
      parent_name: readText(raw, 'parent_name'),
      child_age: Math.max(0, Math.round(toNumber(raw.child_age))),
      message: readText(raw, 'message'),
      created_at: toIso(raw.created_at),
      updated_at: toIso(raw.updated_at),
    })
  }

  return items
}

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function trackLeadStatusChange(leadId: string, status: LeadStatus) {
  if (typeof window === 'undefined') return

  const payload = { lead_id: leadId, status }
  window.dispatchEvent(
    new CustomEvent('ujuz:analytics', {
      detail: { event: 'b2b_lead_status_change', payload },
    }),
  )

  const analyticsWindow = window as AnalyticsWindow
  if (typeof analyticsWindow.gtag === 'function') {
    analyticsWindow.gtag('event', 'b2b_lead_status_change', payload)
  }

  if (Array.isArray(analyticsWindow.dataLayer)) {
    analyticsWindow.dataLayer.push({ event: 'b2b_lead_status_change', ...payload })
  }
}

export default function AdminLeadsPage() {
  const [adminInput, setAdminInput] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const statusCount = useMemo(() => {
    const countMap: Record<LeadStatus, number> = { new: 0, in_progress: 0, done: 0 }
    for (const lead of leads) {
      countMap[lead.status] += 1
    }
    return countMap
  }, [leads])

  const fetchLeads = async (nextFilter = statusFilter) => {
    if (!adminKey) return

    setIsLoading(true)
    setError('')

    try {
      const query = nextFilter === 'all' ? '' : `?status=${encodeURIComponent(nextFilter)}`
      const response = await fetch(`/api/v1/partner/leads${query}`, {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
      })

      const body = await response.json().catch(() => ({})) as LeadsResponse
      if (!response.ok) {
        setIsAuthorized(false)
        setLeads([])
        setError(toErrorMessage(body))
        return
      }

      setLeads(toLeadItems(body.leads))
      setIsAuthorized(true)
      setLastRefreshedAt(
        new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      )
    } catch {
      setIsAuthorized(false)
      setLeads([])
      setError('네트워크 오류로 리드 데이터를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!adminKey) return
    void fetchLeads(statusFilter)
  }, [adminKey, statusFilter])

  const handleAuthorize = () => {
    const trimmed = adminInput.trim()
    if (!trimmed) {
      setError('관리자 키를 입력해 주세요.')
      return
    }

    setAdminKey(trimmed)
    setIsAuthorized(false)
    setError('')
    setLeads([])
  }

  const updateLeadStatus = async (leadId: string, nextStatus: LeadStatus) => {
    if (!adminKey) return

    setUpdatingId(`${leadId}:${nextStatus}`)
    setError('')

    try {
      const response = await fetch('/api/v1/partner/leads', {
        method: 'PATCH',
        headers: {
          'x-admin-key': adminKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          status: nextStatus,
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(toErrorMessage(body, '리드 상태 변경에 실패했습니다.'))
        return
      }

      setLeads((prev) => prev.map((lead) => (
        lead.id === leadId
          ? { ...lead, status: nextStatus, updated_at: new Date().toISOString() }
          : lead
      )))
      trackLeadStatusChange(leadId, nextStatus)
    } catch {
      setError('네트워크 오류로 상태를 변경하지 못했습니다.')
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Admin 리드 인박스</h1>

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
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={statusFilter === option.value ? 'primary' : 'secondary'}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              loading={isLoading}
              onClick={() => void fetchLeads(statusFilter)}
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

      {lastRefreshedAt ? (
        <p className="text-xs text-text-secondary">마지막 갱신: {lastRefreshedAt}</p>
      ) : null}

      {isAuthorized ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">신규</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(statusCount.new)}</p>
            </Card>
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">진행중</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(statusCount.in_progress)}</p>
            </Card>
            <Card className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary">완료</p>
              <p className="mt-1 text-2xl font-bold">{formatNumber(statusCount.done)}</p>
            </Card>
          </section>

          <Card className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-lg font-semibold">리드 {formatNumber(leads.length)}건</h2>
            {leads.length === 0 ? (
              <p className="text-sm text-text-secondary">조건에 맞는 리드가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-text-secondary">
                      <th className="py-2 pr-2">리드ID</th>
                      <th className="py-2 pr-2">기관</th>
                      <th className="py-2 pr-2">보호자</th>
                      <th className="py-2 pr-2">아이 나이</th>
                      <th className="py-2 pr-2">문의</th>
                      <th className="py-2 pr-2">상태</th>
                      <th className="py-2">접수 시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-2 font-mono text-xs">{lead.id}</td>
                        <td className="py-2 pr-2">
                          <p className="font-medium">{lead.partner_name || '-'}</p>
                          <p className="text-xs text-text-secondary">{lead.org_id || '-'}</p>
                        </td>
                        <td className="py-2 pr-2">{lead.parent_name || '-'}</td>
                        <td className="py-2 pr-2">{lead.child_age}</td>
                        <td className="py-2 pr-2">
                          <p className="max-w-md whitespace-pre-wrap break-words">{lead.message || '-'}</p>
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-wrap gap-1">
                            {STATUS_OPTIONS.map((statusOption) => (
                              <Button
                                key={statusOption.value}
                                type="button"
                                size="sm"
                                variant={lead.status === statusOption.value ? 'primary' : 'secondary'}
                                loading={updatingId === `${lead.id}:${statusOption.value}`}
                                onClick={() => void updateLeadStatus(lead.id, statusOption.value)}
                              >
                                {statusOption.label}
                              </Button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 text-xs text-text-secondary">{formatDateTime(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </main>
  )
}
