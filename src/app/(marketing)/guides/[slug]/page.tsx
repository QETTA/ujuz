import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Checklist, type ChecklistItem } from '@/components/guide/Checklist';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface GuideData {
  title: string;
  description: string;
  summary: string[];
  checklist: ChecklistItem[];
  risks: string[];
  sources: { label: string; url: string }[];
}

const GUIDES: Record<string, GuideData> = {
  'daycare-admission': {
    title: '어린이집 입소 준비 가이드',
    description: '어린이집 입소 신청부터 대기, 입소까지 단계별로 알려드려요.',
    summary: [
      '입소 신청은 보통 전년도 11~12월에 진행돼요.',
      '국공립은 대기가 길어질 수 있으니 일찍 준비하세요.',
      '준비서류와 일정은 지역마다 다를 수 있어요.',
    ],
    checklist: [
      { id: '1', label: '아이사랑포털 회원가입', detail: 'childcare.go.kr' },
      { id: '2', label: '희망 시설 3곳 이상 선정' },
      { id: '3', label: '입소 신청서 작성 및 제출' },
      { id: '4', label: '대기 순번 확인' },
      { id: '5', label: '입소 확정 후 서류 준비(건강검진표 등)' },
    ],
    risks: [
      '신청 기간을 놓치면 1년을 기다려야 할 수 있어요.',
      '서류 미비 시 대기 순번이 밀릴 수 있어요.',
    ],
    sources: [
      { label: '아이사랑포털', url: 'https://childcare.go.kr' },
      { label: '보건복지부 보육정책', url: 'https://www.mohw.go.kr' },
    ],
  },
  'to-alert-guide': {
    title: 'TO 알림 활용 가이드',
    description: 'TO(정원 여석) 알림을 설정하고 빠르게 입소 기회를 잡는 방법.',
    summary: [
      'TO 알림은 관심 시설에 빈 자리가 생기면 바로 알려줘요.',
      '알림을 일찍 설정할수록 기회가 많아요.',
      '여러 시설을 구독하면 확률이 높아져요.',
    ],
    checklist: [
      { id: '1', label: '관심 시설 저장' },
      { id: '2', label: 'TO 알림 구독 설정' },
      { id: '3', label: '푸시 알림 허용' },
      { id: '4', label: '알림 수신 후 시설에 연락' },
    ],
    risks: [
      'TO는 빠르게 마감될 수 있으므로 알림 확인 즉시 행동하세요.',
      '푸시 알림을 거부하면 앱 내에서만 확인할 수 있어요.',
    ],
    sources: [
      { label: '어린이집 정보공개포털', url: 'https://info.childcare.go.kr' },
    ],
  },
  'admission-score': {
    title: '입소 경쟁력 점수 이해하기',
    description: '입소 우선순위 점수가 어떻게 산정되는지 알아보세요.',
    summary: [
      '입소 우선순위는 점수제로 운영돼요.',
      '맞벌이, 다자녀, 한부모 등 가점이 있어요.',
      '지역마다 세부 기준이 다를 수 있어요.',
    ],
    checklist: [
      { id: '1', label: '우리 가구 점수 확인(무료 진단)' },
      { id: '2', label: '가점 항목 서류 준비' },
      { id: '3', label: '지역 기준 확인(시/구 보육과)' },
      { id: '4', label: '신청 전 시뮬레이션 해보기' },
    ],
    risks: [
      '점수 산정 기준이 매년 변경될 수 있어요.',
      '허위 서류 제출 시 불이익이 있을 수 있어요.',
    ],
    sources: [
      { label: '아이사랑포털 입소 기준 안내', url: 'https://childcare.go.kr' },
      { label: '보건복지부 보육서비스', url: 'https://www.mohw.go.kr' },
    ],
  },
};

const VALID_SLUGS = Object.keys(GUIDES);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return {};

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ujuz.kr';
  return {
    title: `${guide.title} | 우주즈`,
    description: guide.description,
    alternates: { canonical: `${baseUrl}/guides/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${baseUrl}/guides/${slug}`,
      type: 'article',
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary">{guide.title}</h1>
      <p className="mt-2 text-sm text-text-secondary">{guide.description}</p>

      {/* 요약 3줄 */}
      <section className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
        <h2 className="mb-2 text-sm font-semibold text-brand-700">핵심 요약</h2>
        <ul className="space-y-1 text-sm text-text-primary">
          {guide.summary.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 text-brand-500">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* 체크리스트 */}
      <section className="mt-6">
        <Checklist items={guide.checklist} title="준비 체크리스트" />
      </section>

      {/* 주의/리스크 */}
      <section className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <h2 className="mb-2 text-sm font-semibold text-warning">주의사항</h2>
        <ul className="space-y-1 text-sm text-text-secondary">
          {guide.risks.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0">⚠️</span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      {/* 근거 링크 */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">참고 자료</h2>
        <ul className="space-y-1 text-sm">
          {guide.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="mt-8 space-y-3">
        <Link href="/ai">
          <Button className="w-full">무료 입소 진단 받기</Button>
        </Link>
        <Link href="/facilities">
          <Button variant="secondary" className="w-full">주변 시설 탐색하기</Button>
        </Link>
      </div>
    </article>
  );
}
