import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Tier = 'basic' | 'standard' | 'premium';

interface ConsultationPackage {
  id: string;
  tier: Tier;
  title: string;
  subtitle: string;
  price_krw: number;
  duration_min: number;
  includes: string[];
  sample_pdf_url: string;
}

const PACKAGES: ConsultationPackage[] = [
  {
    id: 'pkg_basic',
    tier: 'basic',
    title: 'Basic',
    subtitle: '핵심 진단 + 빠른 방향 설정',
    price_krw: 49000,
    duration_min: 20,
    includes: ['사전 설문 분석', '20분 전화 상담', '핵심 요약 PDF'],
    sample_pdf_url: 'https://cdn.ujuz.kr/samples/consult-basic-report.pdf',
  },
  {
    id: 'pkg_standard',
    tier: 'standard',
    title: 'Standard',
    subtitle: '가장 많이 선택하는 맞춤 전략',
    price_krw: 99000,
    duration_min: 40,
    includes: ['사전 설문 분석', '40분 전화 상담', '우선순위 액션 PDF', '질의응답 1회'],
    sample_pdf_url: 'https://cdn.ujuz.kr/samples/consult-standard-report.pdf',
  },
  {
    id: 'pkg_premium',
    tier: 'premium',
    title: 'Premium',
    subtitle: '심화 코칭 + 실행 로드맵',
    price_krw: 169000,
    duration_min: 60,
    includes: ['사전 설문 분석', '60분 전화 상담', '실행 로드맵 PDF', '질의응답 2회'],
    sample_pdf_url: 'https://cdn.ujuz.kr/samples/consult-premium-report.pdf',
  },
];

export async function GET() {
  return NextResponse.json({ packages: PACKAGES });
}
