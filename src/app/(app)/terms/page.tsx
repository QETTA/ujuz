import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이용약관 | UjuZ',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-sticky border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">이용약관</h1>
      </header>

      <article className="prose prose-sm max-w-3xl mx-auto px-md py-lg text-text-primary">
        <p className="text-xs text-text-tertiary mb-6">시행일: 2025년 7월 1일 | 최종 수정: 2025년 7월 1일</p>

        {/* 제1조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제1조 (목적)</h2>
        <p>
          이 약관은 우주지(UjuZ, 이하 &quot;회사&quot;)가 제공하는 어린이집/유치원 검색 및
          AI 상담 서비스(이하 &quot;서비스&quot;)의 이용 조건과 절차, 회사와 이용자 간의
          권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
        </p>

        {/* 제2조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제2조 (서비스의 내용)</h2>
        <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
        <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
          <li>
            <strong>시설 검색 서비스</strong>: 전국 어린이집/유치원 정보 검색, 필터링,
            상세 정보 열람
          </li>
          <li>
            <strong>입소 확률 분석</strong>: 통계 데이터 기반 입소 가능성 예측 점수 제공
          </li>
          <li>
            <strong>AI 상담 서비스</strong>: 생성형 AI(Claude)를 활용한 보육 관련 상담,
            입소 전략 분석, 맞춤 추천
          </li>
          <li>
            <strong>TO 알림 서비스</strong>: 관심 시설의 정원 변동 알림
          </li>
          <li>
            <strong>커뮤니티</strong>: 이용자 간 정보 공유 게시판
          </li>
        </ul>

        {/* 제3조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제3조 (이용 계약의 체결)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            이용 계약은 이용자가 본 약관에 동의하고 서비스 이용을 신청한 후, 회사가 이를
            승낙함으로써 체결됩니다.
          </li>
          <li>
            비회원도 일부 기능(시설 검색, 제한적 AI 상담)을 이용할 수 있으나, 전체 기능
            이용을 위해서는 소셜 로그인을 통한 회원가입이 필요합니다.
          </li>
          <li>
            회사는 다음의 경우 이용 신청을 거부하거나 사후 해지할 수 있습니다:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>타인의 명의를 이용한 경우</li>
              <li>허위 정보를 기재한 경우</li>
              <li>관련 법령을 위반하거나 사회의 안녕질서를 저해할 목적으로 신청한 경우</li>
            </ul>
          </li>
        </ol>

        {/* 제4조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제4조 (AI 상담 서비스 이용 조건)</h2>

        <div className="rounded-lg border-2 border-warning bg-warning/5 p-4">
          <h3 className="text-sm font-bold mb-2">중요 안내: AI 상담 면책 사항</h3>
          <p className="text-sm font-medium text-warning-dark">
            본 서비스의 입소 가능성 예측, 점수, 전략 정보는 통계적 추정치이며 실제 입소
            결과를 보장하지 않습니다.
          </p>
        </div>

        <ul className="list-disc pl-5 space-y-2 text-sm mt-4">
          <li>
            <strong>AI 응답의 성격</strong>: AI 상담 응답은 공개 데이터와 통계적 모델에
            기반한 참고 정보이며, 전문적인 법률, 교육, 의료 조언을 대체하지 않습니다.
          </li>
          <li>
            <strong>입소 예측의 한계</strong>: 입소 확률, 점수, 순위 등의 예측 정보는
            과거 데이터에 기반한 통계적 추정치입니다. 실제 입소 결과는 해당 연도 지원
            현황, 정책 변경, 개별 시설 사정 등에 따라 달라질 수 있으며, 회사는 예측의
            정확성을 보장하지 않습니다.
          </li>
          <li>
            <strong>데이터 전송</strong>: AI 상담 이용 시 대화 내용이 미국 소재 Anthropic
            서버로 전송됩니다. 이에 대한 상세 사항은{' '}
            <Link href="/privacy" className="underline text-brand-500">
              개인정보처리방침
            </Link>
            을 참고하시기 바랍니다.
          </li>
          <li>
            <strong>전략 정보 활용</strong>: AI가 제시하는 입소 전략, 지원 시기 추천,
            시설 비교 분석 등은 참고 목적으로만 활용해야 하며, 최종 의사결정은 이용자
            본인의 책임입니다.
          </li>
          <li>
            <strong>이용 제한</strong>: 무료 플랜 이용자는 일일 AI 상담 횟수가 제한되며,
            유료 구독을 통해 확장할 수 있습니다.
          </li>
        </ul>

        {/* 제5조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제5조 (구독 및 결제)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            서비스는 무료 플랜과 유료 구독 플랜(베이직, 프리미엄)으로 구분됩니다.
          </li>
          <li>
            유료 구독은 월간 또는 연간 단위로 자동 갱신되며, 갱신일 전까지 해지하지
            않으면 동일 조건으로 자동 결제됩니다.
          </li>
          <li>
            구독 해지는 서비스 내 &quot;마이페이지 &gt; 구독 관리&quot;에서 언제든 가능하며,
            해지 시 현재 결제 주기 종료 시점까지 서비스를 이용할 수 있습니다.
          </li>
          <li>
            환불은 관련 법령(전자상거래법 등)에 따라 처리하며, 구독 개시일로부터 7일
            이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.
          </li>
          <li>
            회사는 요금제의 내용 및 가격을 변경할 수 있으며, 변경 시 30일 전 서비스 내
            공지합니다. 기존 구독자에게는 현재 구독 주기 종료 시까지 변경 전 조건이
            적용됩니다.
          </li>
        </ol>

        {/* 제6조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제6조 (이용자의 의무)</h2>
        <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
        <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
          <li>타인의 개인정보를 도용하거나 허위 정보를 등록하는 행위</li>
          <li>서비스를 이용하여 얻은 정보를 상업적으로 무단 이용하는 행위</li>
          <li>
            AI 상담 기능을 악용하여 불법적이거나 비윤리적인 정보를 생성하려는 행위
          </li>
          <li>서비스의 안정적 운영을 방해하는 행위 (과도한 API 호출, 크롤링 등)</li>
          <li>다른 이용자에게 불쾌감을 주거나 커뮤니티 질서를 해치는 행위</li>
          <li>
            허위 또는 과장된 시설 리뷰를 작성하여 다른 이용자에게 피해를 주는 행위
          </li>
          <li>관련 법령에 위반되는 행위</li>
        </ul>

        {/* 제7조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제7조 (서비스의 변경 및 중단)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            회사는 서비스의 내용을 변경하거나 기능을 추가/삭제할 수 있으며, 중요한
            변경 시 사전에 공지합니다.
          </li>
          <li>
            회사는 다음의 경우 서비스 제공을 일시적으로 중단할 수 있습니다:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>시스템 정기 점검 또는 긴급 보수</li>
              <li>천재지변, 국가비상사태 등 불가항력적 사유</li>
              <li>외부 API(Anthropic Claude 등) 서비스 장애</li>
            </ul>
          </li>
          <li>
            서비스 중단으로 인한 이용자의 손해에 대해 회사는 고의 또는 중대한 과실이
            없는 한 책임을 부담하지 않습니다.
          </li>
        </ol>

        {/* 제8조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제8조 (면책 사항)</h2>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>
            <strong>AI 상담 결과</strong>: 회사는 AI 상담을 통해 제공되는 입소 확률,
            점수, 전략 정보의 정확성, 완전성, 적시성을 보장하지 않습니다. 이러한 정보에
            기반한 이용자의 의사결정으로 발생한 손해에 대해 회사는 책임을 부담하지
            않습니다.
          </li>
          <li>
            <strong>시설 정보</strong>: 서비스에서 제공하는 어린이집/유치원 정보는 공공
            데이터를 기반으로 하며, 실시간 정보와 차이가 있을 수 있습니다. 정확한 정보는
            해당 시설에 직접 확인하시기 바랍니다.
          </li>
          <li>
            <strong>제3자 서비스</strong>: 외부 서비스(결제 대행, AI API 등)의 장애로
            인한 서비스 이용 불가에 대해 회사의 고의 또는 중대한 과실이 없는 한 책임을
            부담하지 않습니다.
          </li>
          <li>
            <strong>커뮤니티 게시물</strong>: 이용자가 커뮤니티에 게시한 내용의 정확성,
            신뢰성에 대한 책임은 해당 게시자에게 있습니다.
          </li>
        </ol>

        {/* 제9조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제9조 (저작권 및 지적재산권)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            서비스에 포함된 디자인, 텍스트, 소프트웨어, 데이터베이스, 이미지 등의
            저작권 및 지적재산권은 회사에 귀속됩니다.
          </li>
          <li>
            AI 상담을 통해 생성된 응답의 저작권은 관련 법령에 따르며, 이용자는 개인적
            목적 범위 내에서 자유롭게 활용할 수 있습니다.
          </li>
          <li>
            이용자가 서비스를 통해 제공한 리뷰, 게시물 등의 저작권은 해당 이용자에게
            있으며, 회사는 서비스 운영 목적 범위 내에서 이를 이용할 수 있는 비독점적
            라이선스를 보유합니다.
          </li>
          <li>
            이용자는 서비스의 콘텐츠를 회사의 사전 서면 동의 없이 상업적으로 이용하거나,
            제3자에게 이용하게 할 수 없습니다.
          </li>
        </ol>

        {/* 제10조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제10조 (계약 해지 및 회원 탈퇴)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            이용자는 언제든지 서비스 내 &quot;마이페이지 &gt; 설정&quot;을 통해 회원 탈퇴를
            신청할 수 있습니다.
          </li>
          <li>
            탈퇴 시 이용자의 개인정보는 개인정보처리방침에 따라 처리되며, 유료 구독
            중인 경우 환불 규정에 따라 처리합니다.
          </li>
          <li>
            회사는 이용자가 본 약관을 위반한 경우 사전 통보 후 이용 계약을 해지할 수
            있습니다. 다만, 긴급한 경우 즉시 해지 후 통보할 수 있습니다.
          </li>
        </ol>

        {/* 제11조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제11조 (분쟁 해결)</h2>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>
            본 약관과 서비스 이용에 관한 분쟁은 대한민국 법률을 준거법으로 합니다.
          </li>
          <li>
            서비스 이용과 관련하여 회사와 이용자 사이에 분쟁이 발생한 경우, 양 당사자는
            원만한 해결을 위해 성실히 협의합니다.
          </li>
          <li>
            협의가 이루어지지 않을 경우 관할법원은 민사소송법에 따른 법원으로 합니다.
          </li>
        </ol>

        {/* 제12조 */}
        <h2 className="text-base font-bold mt-8 mb-3">제12조 (약관의 변경)</h2>
        <p className="text-sm">
          회사는 관련 법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시
          적용일 7일 전(이용자에게 불리한 변경의 경우 30일 전)까지 서비스 내 공지합니다.
          변경된 약관에 동의하지 않는 이용자는 서비스 이용을 중단하고 탈퇴할 수 있으며,
          공지 기간 내 별도의 거부 의사를 표시하지 않은 경우 변경된 약관에 동의한 것으로
          간주합니다.
        </p>

        {/* 부칙 */}
        <h2 className="text-base font-bold mt-8 mb-3">부칙</h2>
        <p className="text-sm">이 약관은 2025년 7월 1일부터 시행합니다.</p>

        {/* 하단 링크 */}
        <div className="mt-10 pt-6 border-t border-border-subtle text-sm text-text-tertiary">
          <Link href="/privacy" className="underline hover:text-brand-500 transition-colors">
            개인정보처리방침 보기
          </Link>
        </div>
      </article>
    </div>
  );
}
