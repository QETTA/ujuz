'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type OrgItem = {
  org_id: string
  name: string
  address: string
  phone: string
  leads_count: number
  created_at: string | null
  updated_at: string | null
}

type OrgsResponse = {
  orgs?: unknown
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function readText(raw: Record<string, unknown>, key: string): string {
  const value = raw[key]
  return typeof value === 'string' ? value : ''
}

function toNullableIso(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function toErrorMessage(payload: unknown, fallback = '기관 목록을 불러오지 못했습니다.'): string {
  if (!payload || typeof payload !== 'object') return fallback

  const raw = payload as Record<string, unknown>
  if (typeof raw.error === 'string') return raw.error

  if (raw.error && typeof raw.error === 'object') {
    const nested = raw.error as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }

  return fallback
}

function toOrgItems(payload: unknown): OrgItem[] {
  if (!Array.isArray(payload)) return []

  const items: OrgItem[] = []
  for (const row of payload) {
    if (!row || typeof row !== 'object') continue
    const raw = row as Record<string, unknown>
    const orgId = readText(raw, 'org_id')
    if (!orgId) continue

    items.push({
      org_id: orgId,
      name: readText(raw, 'name'),
      address: readText(raw, 'address'),
      phone: readText(raw, 'phone'),
      leads_count: Math.max(0, Math.round(toNumber(raw.leads_count))),
      created_at: toNullableIso(raw.created_at),
      updated_at: toNullableIso(raw.updated_at),
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

export default function AdminOrgsPage() {
  const [adminInput, setAdminInput] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [orgs, setOrgs] = useState<OrgItem[]>([])
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefreshedAt, setLastRefreshedAt] = useState('')

  const fetchOrgs = async () => {
    if (!adminKey) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/v1/partner/profile', {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
      })

      const body = await response.json().catch(() => ({})) as OrgsResponse
      if (!response.ok) {
        setIsAuthorized(false)
        setOrgs([])
        setError(toErrorMessage(body))
        return
      }

      setOrgs(toOrgItems(body.orgs))
      setIsAuthorized(true)
      setLastRefreshedAt(
        new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      )
    } catch {
      setIsAuthorized(false)
      setOrgs([])
      setError('네트워크 오류로 기관 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!adminKey) return
    void fetchOrgs()
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
    setOrgs([])
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Admin 기관 목록</h1>

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
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" loading={isLoading} onClick={() => void fetchOrgs()}>
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
        <Card className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-lg font-semibold">기관 {formatNumber(orgs.length)}개</h2>
          {orgs.length === 0 ? (
            <p className="text-sm text-text-secondary">등록된 기관이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-secondary">
                    <th className="py-2 pr-2">기관ID</th>
                    <th className="py-2 pr-2">기관명</th>
                    <th className="py-2 pr-2">전화번호</th>
                    <th className="py-2 pr-2">주소</th>
                    <th className="py-2 pr-2 text-right">리드 수</th>
                    <th className="py-2">최종 수정</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.org_id} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-2 font-mono text-xs">{org.org_id}</td>
                      <td className="py-2 pr-2 font-medium">{org.name || '-'}</td>
                      <td className="py-2 pr-2">{org.phone || '-'}</td>
                      <td className="py-2 pr-2">{org.address || '-'}</td>
                      <td className="py-2 pr-2 text-right">{formatNumber(org.leads_count)}</td>
                      <td className="py-2 text-xs text-text-secondary">{formatDateTime(org.updated_at ?? org.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </main>
  )
}
