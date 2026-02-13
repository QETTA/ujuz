import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침 | UjuZ',
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-sticky border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">개인정보처리방침</h1>
      </header>

      <article className="prose prose-sm max-w-3xl mx-auto px-md py-lg text-text-primary">
        <p className="text-xs text-text-tertiary mb-6">시행일: 2025년 7월 1일 | 최종 수정: 2025년 7월 1일</p>

        <p>
          우주지(UjuZ, 이하 &quot;회사&quot;)는 「개인정보 보호법」 및 관련 법령에 따라 이용자의
          개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리하기 위하여 다음과 같이
          개인정보처리방침을 수립하여 공개합니다.
        </p>

        {/* 제1조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제1조 (수집하는 개인정보 항목)</h2>
        <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>

        <h3 className="text-sm font-semibold mt-4 mb-2">1. 필수 수집 항목</h3>
        <table className="w-full text-sm border-collapse border border-border-subtle">
          <thead>
            <tr className="bg-surface-inset">
              <th className="border border-border-subtle px-3 py-2 text-left">구분</th>
              <th className="border border-border-subtle px-3 py-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border-subtle px-3 py-2">기기 정보</td>
              <td className="border border-border-subtle px-3 py-2">
                디바이스 식별자(Device ID), 기기 모델, OS 버전, 앱 버전
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">AI 상담 데이터</td>
              <td className="border border-border-subtle px-3 py-2">
                AI 상담 대화 내용, 상담 일시, 상담 주제 분류
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">시설 검색 기록</td>
              <td className="border border-border-subtle px-3 py-2">
                검색 키워드, 검색 필터(지역, 시설 유형 등), 시설 열람 기록
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">구독 정보</td>
              <td className="border border-border-subtle px-3 py-2">
                구독 플랜, 결제 일시, 결제 수단 유형(카드사/간편결제 구분), 구독 상태
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-sm font-semibold mt-4 mb-2">2. 선택 수집 항목</h3>
        <table className="w-full text-sm border-collapse border border-border-subtle">
          <thead>
            <tr className="bg-surface-inset">
              <th className="border border-border-subtle px-3 py-2 text-left">구분</th>
              <th className="border border-border-subtle px-3 py-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border-subtle px-3 py-2">소셜 로그인</td>
              <td className="border border-border-subtle px-3 py-2">
                이메일, 닉네임, 프로필 이미지 URL (OAuth 제공 범위 내)
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">아이 프로필</td>
              <td className="border border-border-subtle px-3 py-2">
                아이 생년월, 성별, 희망 어린이집/유치원 정보
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">위치 정보</td>
              <td className="border border-border-subtle px-3 py-2">
                주소 또는 GPS 좌표 (주변 시설 검색 시, 별도 동의)
              </td>
            </tr>
          </tbody>
        </table>

        {/* 제2조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제2조 (개인정보의 수집 및 이용 목적)</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <strong>어린이집/유치원 검색 서비스 제공</strong>: 지역별 시설 검색, 입소 가능성
            분석, TO 알림 등 핵심 서비스 운영
          </li>
          <li>
            <strong>AI 상담 서비스 제공</strong>: 생성형 AI(Claude)를 활용한 보육 상담,
            입소 전략 분석, 맞춤 추천
          </li>
          <li>
            <strong>서비스 개선</strong>: 이용 패턴 분석, 검색 품질 개선, AI 응답 품질 향상
          </li>
          <li>
            <strong>구독 및 결제 관리</strong>: 유료 구독 처리, 결제 내역 관리, 환불 처리
          </li>
          <li>
            <strong>고객 지원</strong>: 문의 응대, 서비스 장애 대응, 공지사항 전달
          </li>
        </ul>

        {/* 제3조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
        <table className="w-full text-sm border-collapse border border-border-subtle">
          <thead>
            <tr className="bg-surface-inset">
              <th className="border border-border-subtle px-3 py-2 text-left">항목</th>
              <th className="border border-border-subtle px-3 py-2 text-left">보유 기간</th>
              <th className="border border-border-subtle px-3 py-2 text-left">근거</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border-subtle px-3 py-2">AI 상담 대화 내용</td>
              <td className="border border-border-subtle px-3 py-2">최종 상담일로부터 1년</td>
              <td className="border border-border-subtle px-3 py-2">서비스 품질 관리</td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">시설 검색 기록</td>
              <td className="border border-border-subtle px-3 py-2">수집일로부터 6개월</td>
              <td className="border border-border-subtle px-3 py-2">맞춤 추천 서비스</td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">결제/구독 정보</td>
              <td className="border border-border-subtle px-3 py-2">5년</td>
              <td className="border border-border-subtle px-3 py-2">
                전자상거래법 제6조
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">기기 정보</td>
              <td className="border border-border-subtle px-3 py-2">회원 탈퇴 시 즉시 파기</td>
              <td className="border border-border-subtle px-3 py-2">이용 목적 달성</td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2">접속 로그</td>
              <td className="border border-border-subtle px-3 py-2">3개월</td>
              <td className="border border-border-subtle px-3 py-2">
                통신비밀보호법 제15조의2
              </td>
            </tr>
          </tbody>
        </table>

        {/* 제4조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제4조 (개인정보의 제3자 제공)
        </h2>
        <p>
          회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의
          경우에는 예외로 합니다.
        </p>

        <div className="mt-4 rounded-lg border-2 border-warning bg-warning/5 p-4">
          <h3 className="text-sm font-bold mb-2">
            AI 서비스 운영을 위한 해외 데이터 전송
          </h3>
          <table className="w-full text-sm border-collapse border border-border-subtle">
            <tbody>
              <tr>
                <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset w-1/3">
                  제공받는 자
                </td>
                <td className="border border-border-subtle px-3 py-2">
                  Anthropic, PBC (미국)
                </td>
              </tr>
              <tr>
                <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset">
                  제공 항목
                </td>
                <td className="border border-border-subtle px-3 py-2">
                  AI 상담 대화 내용 (텍스트)
                </td>
              </tr>
              <tr>
                <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset">
                  제공 목적
                </td>
                <td className="border border-border-subtle px-3 py-2">
                  생성형 AI(Claude) 기반 상담 응답 생성
                </td>
              </tr>
              <tr>
                <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset">
                  서버 소재지
                </td>
                <td className="border border-border-subtle px-3 py-2">
                  미국 (US)
                </td>
              </tr>
              <tr>
                <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset">
                  보유 기간
                </td>
                <td className="border border-border-subtle px-3 py-2">
                  API 호출 처리 완료 즉시 삭제 (Anthropic 정책에 따름)
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-sm font-medium text-warning-dark">
            생성형 AI(Claude)를 통한 상담 시 대화 내용이 미국 소재 Anthropic 서버로
            전송됩니다. 이용자는 AI 상담 이용 전 이에 대한 동의를 제공하며, 동의를 철회할
            경우 AI 상담 기능 이용이 제한됩니다.
          </p>
        </div>

        <h3 className="text-sm font-semibold mt-4 mb-2">법령에 의한 제공</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>법령에 특별한 규정이 있는 경우</li>
          <li>수사 목적으로 법률이 정한 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
        </ul>

        {/* 제5조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제5조 (아동 및 가족 관련 민감정보 보호)
        </h2>
        <p>
          본 서비스는 어린이집/유치원 입소를 준비하는 가정을 대상으로 하며, 아동 및 가족
          관련 정보의 민감성을 인지하고 다음과 같은 보호 조치를 시행합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
          <li>
            <strong>아동 개인정보 최소 수집</strong>: 아이의 생년월과 성별만 수집하며,
            이름, 주민등록번호, 사진 등 직접 식별 가능한 정보는 수집하지 않습니다.
          </li>
          <li>
            <strong>민감정보 비수집 원칙</strong>: 건강 상태, 장애 여부, 종교 등 민감정보는
            수집하지 않습니다. AI 상담 중 이용자가 자발적으로 입력한 민감정보는 상담 목적
            외에 활용하지 않습니다.
          </li>
          <li>
            <strong>가족 정보 보호</strong>: 가구 소득, 부모 직업 등 가족 관련 정보는
            입소 확률 분석을 위한 통계적 추정에만 사용되며, 개별 식별 목적으로 활용하지
            않습니다.
          </li>
          <li>
            <strong>AI 상담 내 아동 정보</strong>: AI 상담 대화에 포함된 아동 관련 내용은
            암호화하여 전송되며, Anthropic의 데이터 보호 정책에 따라 모델 학습에
            사용되지 않습니다.
          </li>
          <li>
            <strong>14세 미만 아동의 직접 이용</strong>: 본 서비스는 보호자(부모)를 대상으로
            하며, 14세 미만 아동이 직접 이용하는 것을 전제하지 않습니다. 14세 미만 아동의
            개인정보 수집 시에는 법정대리인의 동의를 받습니다.
          </li>
        </ul>

        {/* 제6조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제6조 (개인정보의 파기 절차 및 방법)
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>
            <strong>파기 절차</strong>: 보유 기간이 경과하거나 처리 목적이 달성된 개인정보는
            지체 없이 파기합니다.
          </li>
          <li>
            <strong>파기 방법</strong>: 전자적 파일은 복구 불가능한 방법으로 삭제하며,
            종이 문서는 분쇄하거나 소각합니다.
          </li>
          <li>
            <strong>AI 상담 데이터</strong>: 보유 기간 만료 시 대화 내용 및 메타데이터를
            일괄 삭제합니다.
          </li>
        </ul>

        {/* 제7조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제7조 (이용자의 권리와 행사 방법)</h2>
        <p>이용자(또는 법정대리인)는 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
          <li>개인정보 열람 요구</li>
          <li>개인정보 정정 및 삭제 요구</li>
          <li>개인정보 처리 정지 요구</li>
          <li>AI 상담 대화 내용 삭제 요구</li>
          <li>해외 데이터 전송 동의 철회</li>
        </ul>
        <p className="mt-2 text-sm">
          권리 행사는 서비스 내 &quot;마이페이지 &gt; 설정&quot; 또는 아래 개인정보보호책임자에게
          서면, 이메일로 요청할 수 있으며, 회사는 지체 없이 조치하겠습니다.
        </p>

        {/* 제8조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제8조 (개인정보의 안전성 확보 조치)
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>전송 데이터 암호화 (TLS 1.2 이상)</li>
          <li>저장 데이터 암호화 (AES-256)</li>
          <li>접근 권한 관리 및 접근 통제</li>
          <li>개인정보 취급 직원 최소화 및 교육 실시</li>
          <li>정기적인 보안 점검 및 모니터링</li>
        </ul>

        {/* 제9조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제9조 (개인정보보호책임자)
        </h2>
        <table className="w-full text-sm border-collapse border border-border-subtle">
          <tbody>
            <tr>
              <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset w-1/3">
                직책
              </td>
              <td className="border border-border-subtle px-3 py-2">
                개인정보보호책임자(CPO)
              </td>
            </tr>
            <tr>
              <td className="border border-border-subtle px-3 py-2 font-medium bg-surface-inset">
                이메일
              </td>
              <td className="border border-border-subtle px-3 py-2">privacy@ujuz.co.kr</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-sm text-text-secondary">
          개인정보 관련 문의, 불만 처리, 피해 구제 등에 관한 사항은 위 연락처로 문의해
          주시기 바랍니다.
        </p>

        {/* 제10조 */}
        <h2 className="text-base font-bold mt-8 mb-3">
          제10조 (개인정보처리방침의 변경)
        </h2>
        <p className="text-sm">
          이 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경
          시 서비스 내 공지사항 또는 팝업을 통해 사전에 안내합니다.
        </p>

        {/* 권익 침해 구제 */}
        <h2 className="text-base font-bold mt-8 mb-3">개인정보 침해 신고 및 상담</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>개인정보침해신고센터 (한국인터넷진흥원): privacy.kisa.or.kr / 118</li>
          <li>개인정보분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
          <li>대검찰청 사이버수사과: www.spo.go.kr / 1301</li>
          <li>경찰청 사이버수사국: ecrm.police.go.kr / 182</li>
        </ul>

        {/* 하단 링크 */}
        <div className="mt-10 pt-6 border-t border-border-subtle text-sm text-text-tertiary">
          <Link href="/terms" className="underline hover:text-brand-500 transition-colors">
            이용약관 보기
          </Link>
        </div>
      </article>
    </div>
  );
}
