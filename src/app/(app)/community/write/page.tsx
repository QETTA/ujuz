`use client`;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/nav/top-bar';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

type PostType = 'review' | 'to_report' | 'question';
type AgeClass = 'AGE_0' | 'AGE_1' | 'AGE_2' | 'AGE_3' | 'AGE_4' | 'AGE_5';
type Certainty = '확실' | '추정' | '미확인';

export default function CommunityWritePage() {
  const router = useRouter();

  const [type, setType] = useState<PostType>('review');
  const [boardRegion, setBoardRegion] = useState('');
  const [content, setContent] = useState('');
  const [ageClass, setAgeClass] = useState<AgeClass | ''>('');
  const [waitMonths, setWaitMonths] = useState('');
  const [certainty, setCertainty] = useState<Certainty | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isReport = type === 'to_report';

  const trimContent = content.trim();
  const canSubmit =
    !!type &&
    trimContent.length >= 10 &&
    trimContent.length <= 2000 &&
    boardRegion.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!type) {
      setError('게시글 종류를 선택해 주세요.');
      return;
    }

    if (trimContent.length < 10) {
      setError('내용은 최소 10자 이상 입력해야 합니다.');
      return;
    }

    if (trimContent.length > 2000) {
      setError('내용은 최대 2000자까지 입력 가능합니다.');
      return;
    }

    if (!boardRegion.trim()) {
      setError('지역을 입력해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    const payload: {
      type: PostType;
      board_region: string;
      content: string;
      structured_fields?: {
        age_class?: AgeClass;
        wait_months?: number;
        certainty?: string;
      };
    } = {
      type,
      board_region: boardRegion.trim(),
      content: trimContent
    };

    if (isReport) {
      const structured: {
        age_class?: AgeClass;
        wait_months?: number;
        certainty?: string;
      } = {};

      if (ageClass) structured.age_class = ageClass;

      const waitMonthsValue = Number(waitMonths);
      if (waitMonths.trim() && Number.isFinite(waitMonthsValue)) {
        structured.wait_months = Math.max(0, Math.round(waitMonthsValue));
      }

      if (certainty) structured.certainty = certainty;

      if (Object.keys(structured).length > 0) {
        payload.structured_fields = structured;
      }
    }

    try {
      const response = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anon-id': localStorage.getItem('anon_id') || 'anonymous'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.message || '게시글 등록에 실패했습니다.');
        return;
      }

      router.push('/community');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-red-500">{error}</p> : null}

          <label className="block">
            <span className="block mb-1 font-medium">유형</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PostType)}
              className="w-full border rounded px-2 py-1"
            >
              <option value="review">후기</option>
              <option value="to_report">TO 제보</option>
              <option value="question">질문</option>
            </select>
          </label>

          <label className="block">
            <span className="block mb-1 font-medium">지역</span>
            <input
              value={boardRegion}
              onChange={(event) => setBoardRegion(event.target.value)}
              required
              className="w-full border rounded px-2 py-1"
              placeholder="지역 입력"
            />
          </label>

          {isReport ? (
            <div className="space-y-4">
              <label className="block">
                <span className="block mb-1 font-medium">연령대</span>
                <select
                  value={ageClass}
                  onChange={(event) => setAgeClass(event.target.value as AgeClass | '')}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">선택 안 함</option>
                  <option value="AGE_0">AGE_0</option>
                  <option value="AGE_1">AGE_1</option>
                  <option value="AGE_2">AGE_2</option>
                  <option value="AGE_3">AGE_3</option>
                  <option value="AGE_4">AGE_4</option>
                  <option value="AGE_5">AGE_5</option>
                </select>
              </label>

              <label className="block">
                <span className="block mb-1 font-medium">대기개월</span>
                <input
                  type="number"
                  value={waitMonths}
                  onChange={(event) => setWaitMonths(event.target.value)}
                  min={0}
                  className="w-full border rounded px-2 py-1"
                  placeholder="입력 (개월)"
                />
              </label>

              <label className="block">
                <span className="block mb-1 font-medium">확실성</span>
                <select
                  value={certainty}
                  onChange={(event) => setCertainty(event.target.value as Certainty | '')}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">선택 안 함</option>
                  <option value="확실">확실</option>
                  <option value="추정">추정</option>
                  <option value="미확인">미확인</option>
                </select>
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="block mb-1 font-medium">
              내용 <span className="text-gray-500">({trimContent.length}/2000)</span>
            </span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={10}
              required
              className="w-full border rounded px-2 py-1"
              placeholder="내용을 입력하세요 (10자 이상)"
            />
          </label>

          <Button type="submit" disabled={loading || !canSubmit}>
            {loading ? '등록 중...' : '작성하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
