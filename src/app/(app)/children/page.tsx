'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { TopBar } from '@/components/nav/top-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ChildProfile {
  id: string
  name: string
  birth_date: string
  age_class: string
  gender?: string
  created_at: string
}

type FormState = {
  name: string
  birth_date: string
  gender: string
  age_class: string
}

const ageClassOptions = [
  { value: 'AGE_0', label: '0세반' },
  { value: 'AGE_1', label: '1세반' },
  { value: 'AGE_2', label: '2세반' },
  { value: 'AGE_3', label: '3세반' },
  { value: 'AGE_4', label: '4세반' },
  { value: 'AGE_5', label: '5세반' },
]

const defaultForm: FormState = {
  name: '',
  birth_date: '',
  gender: '남',
  age_class: 'AGE_0',
}

function normalizeBirthDate(value: string) {
  if (!value) return ''
  return value.slice(0, 10)
}

function labelForAgeClass(value: string) {
  return ageClassOptions.find((option) => option.value === value)?.label ?? value
}

export default function ChildrenPage() {
  const router = useRouter()
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [error, setError] = useState('')

  const fetchChildren = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/children', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('자녀 목록을 불러오지 못했습니다.')
      }
      const payload = await res.json().catch(() => [])
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.children)
          ? payload.children
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : []
      setChildren(items as ChildProfile[])
    } catch (e) {
      setError(e instanceof Error ? e.message : '자녀 목록을 불러오지 못했습니다.')
      setChildren([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChildren()
  }, [])

  const handleOpenCreate = () => {
    setEditingChild(null)
    setForm(defaultForm)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (child: ChildProfile) => {
    setEditingChild(child)
    setForm({
      name: child.name,
      birth_date: normalizeBirthDate(child.birth_date),
      gender: child.gender ?? '남',
      age_class: child.age_class,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.birth_date || !form.gender || !form.age_class) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const method = editingChild ? 'PATCH' : 'POST'
      const endpoint = editingChild
        ? `/api/v1/children/${editingChild.id}`
        : '/api/v1/children'

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: '요청을 처리하지 못했습니다.' }))
        throw new Error(body?.message || '요청을 처리하지 못했습니다.')
      }

      setIsModalOpen(false)
      await fetchChildren()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청을 처리하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 아이를 삭제하시겠습니까?')) {
      return
    }

    setError('')
    try {
      const res = await fetch(`/api/v1/children/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: '삭제하지 못했습니다.' }))
        throw new Error(body?.message || '삭제하지 못했습니다.')
      }

      await fetchChildren()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.')
    }
  }

  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={`skeleton-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-5">
      <TopBar />

      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">내 아이 목록</h1>
        </div>

        {error && (
          <Card className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </Card>
        )}

        {isLoading ? (
          renderSkeleton()
        ) : children.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-600">
            등록된 아이가 없습니다. 아이를 추가해 주세요.
          </Card>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <Card key={child.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{child.name}</p>
                    <p className="text-sm text-zinc-600">반: {labelForAgeClass(child.age_class)}</p>
                    <p className="text-sm text-zinc-600">생년월일: {normalizeBirthDate(child.birth_date)}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleOpenEdit(child)} className="px-3 py-1 text-sm">
                      수정
                    </Button>
                    <Button onClick={() => handleDelete(child.id)} className="px-3 py-1 text-sm">
                      삭제
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="fixed right-4 bottom-4">
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-12 rounded-full px-6 shadow-lg"
        >
          아이 추가
        </Button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md rounded-2xl bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">
              {editingChild ? '아이 정보 수정' : '아이 추가'}
            </h2>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium">이름</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-zinc-300 px-3 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">생년월일</label>
                <input
                  required
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-zinc-300 px-3 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">성별</label>
                <select
                  required
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-zinc-300 px-3 focus:outline-none"
                >
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">반</label>
                <select
                  required
                  value={form.age_class}
                  onChange={(e) => setForm((prev) => ({ ...prev, age_class: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-zinc-300 px-3 focus:outline-none"
                >
                  {ageClassOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2"
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting} className="px-4 py-2">
                  {isSubmitting ? '저장 중...' : editingChild ? '수정' : '추가'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  )
}
