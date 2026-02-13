# GPT Pro 코드 리뷰 프롬프트

> 아래 프롬프트를 GPT Pro에 그대로 붙여넣고, 리뷰할 코드(diff 또는 파일)를 첨부하세요.
> ARCHITECTURE.md를 함께 첨부하면 더 정확한 리뷰를 받을 수 있습니다.

---

## 사용법

### 방법 1: diff 리뷰 (추천)
```bash
# 최근 커밋 diff 추출
git diff HEAD~1 > /tmp/review.diff

# 또는 특정 범위
git diff fa19858..87c68aa > /tmp/review.diff
```
→ GPT Pro에 `review.diff` + `ARCHITECTURE.md` 첨부

### 방법 2: 파일 단위 리뷰
→ 해당 파일 + `ARCHITECTURE.md` 첨부

### 방법 3: 전체 코드베이스 감사
→ `src/` 폴더를 zip으로 압축 후 `ARCHITECTURE.md`와 함께 첨부

---

## 프롬프트 (복사해서 사용)

```
당신은 시니어 풀스택 엔지니어이자 코드 리뷰어입니다.
첨부된 ARCHITECTURE.md를 먼저 읽고 프로젝트 컨텍스트를 파악하세요.

## 프로젝트 컨텍스트
- UjuZ: 어린이집 입소 예측 + TO 알림 + 커뮤니티 서비스
- Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Zustand + AI SDK v6
- MongoDB Atlas (native driver), Anthropic Claude 챗봇
- 한국어 서비스, 모바일 퍼스트

## 리뷰 기준 (모든 항목 체크)

### 1. 타입 안전성
- `any` 사용 여부 (금지, 불가피 시 주석 필수)
- Zod 스키마와 TypeScript 타입 정합성
- null/undefined 핸들링 (optional chaining, nullish coalescing)
- 제네릭 타입 활용도

### 2. React 패턴
- 'use client' 선언 필요성 (서버 컴포넌트 우선)
- useCallback/useMemo 적절성 (과도하거나 누락)
- useEffect 의존성 배열 정확성
- 컴포넌트 분리 수준 (너무 크거나 너무 작은 컴포넌트)
- 조건부 렌더링 순서: loading → error → empty → content

### 3. 상태 관리
- Zustand 스토어 설계 (책임 분리, 구독 최적화)
- 서버 상태 vs 클라이언트 상태 혼합 여부
- 낙관적 업데이트 정합성 (롤백 처리)

### 4. API/서버
- 입력 검증 (Zod 스키마 적용 여부)
- 에러 응답 형식 통일 ({ error, message, details })
- Rate limit 적용 여부
- MongoDB 쿼리 성능 (인덱스 활용, projection)
- 비동기 에러 핸들링 (try/catch, .catch())

### 5. 보안
- XSS: 사용자 입력 렌더링 시 이스케이프
- NoSQL Injection: 동적 쿼리 빌딩 시 Zod 검증
- 인증/인가: 보호된 라우트 확인
- 시크릿 노출: 하드코딩된 키/토큰/URL
- SSRF: 외부 URL fetch 시 검증

### 6. 접근성 (a11y)
- ARIA 속성 (role, aria-label, aria-modal)
- 키보드 네비게이션 (Tab, Enter, Escape, Arrow)
- 포커스 관리 (모달 포커스 트랩, 복원)
- 색상 대비 (WCAG 4.5:1)
- prefers-reduced-motion 대응
- 최소 폰트 크기 (12px 이상)

### 7. 성능
- 불필요한 리렌더링 (memo, useMemo, useCallback)
- 번들 크기 (동적 import 필요성)
- 이미지 최적화 (next/image)
- API 호출 최적화 (중복 호출, 캐싱)

### 8. 코드 품질
- 네이밍 일관성 (camelCase 변수, PascalCase 컴포넌트)
- 중복 코드 (DRY 원칙)
- 매직 넘버/문자열 (상수 추출)
- 에러 메시지 한국어 통일
- 불필요한 주석 vs 필요한 주석 누락

### 9. 디자인 시스템 준수
- 시맨틱 토큰 사용 (text-text-primary, bg-surface, NOT text-gray-600)
- Tailwind 유틸리티 일관성 (spacing: px-sm, gap-md)
- 다크모드 호환 (하드코딩 색상 금지)
- 모바일 퍼스트 반응형 (기본 모바일, lg: 데스크톱)

## 출력 형식

### 요약
전체 코드 품질을 한 문장으로 평가.

### 심각도별 이슈

#### 🔴 Critical (반드시 수정)
- 보안 취약점, 런타임 크래시, 데이터 유실 가능성

#### 🟡 Major (수정 권장)
- 타입 안전성, 접근성 누락, 성능 문제

#### 🔵 Minor (개선 권장)
- 코드 스타일, 네이밍, 중복

#### 💡 Suggestions (참고)
- 더 나은 패턴, 리팩토링 아이디어

### 각 이슈 형식
```
[심각도] 파일:라인 — 제목
문제: ...
수정안: ...
```

### 점수 (10점 만점)
| 항목 | 점수 | 코멘트 |
|------|------|--------|
| 타입 안전성 | /10 | |
| React 패턴 | /10 | |
| 상태 관리 | /10 | |
| API/서버 | /10 | |
| 보안 | /10 | |
| 접근성 | /10 | |
| 성능 | /10 | |
| 코드 품질 | /10 | |
| 디자인 시스템 | /10 | |
| **종합** | **/10** | |
```

---

## 빠른 리뷰용 축약 프롬프트

```
UjuZ 프로젝트(Next.js 15 + TS strict + Zustand + AI SDK v6 + MongoDB) 코드 리뷰.
첨부된 diff를 아래 기준으로 검토해줘:
1. 타입 안전성 (any 금지, null 핸들링)
2. React 패턴 (use client 최소화, 훅 의존성)
3. 보안 (XSS, 인증, 시크릿)
4. 접근성 (ARIA, 키보드, 포커스)
5. 디자인 시스템 (시맨틱 토큰, 다크모드)

이슈를 🔴 Critical / 🟡 Major / 🔵 Minor / 💡 Suggestion 으로 분류하고,
각각 파일:라인, 문제, 수정안을 알려줘.
```

---

## 특정 영역 전문 리뷰 프롬프트

### 스트리밍/AI 관련
```
Vercel AI SDK v6 스트리밍 구현을 리뷰해줘.
- createUIMessageStream 사용법
- message-metadata 청크 전송 타이밍
- onFinish 콜백 에러 핸들링
- 클라이언트 useChat 훅의 메타데이터 수신
- 비스트리밍 폴백 경로
```

### Zustand 스토어
```
Zustand 스토어를 리뷰해줘.
- 스토어 간 책임 분리
- 셀렉터 최적화 (불필요한 리렌더링)
- 비동기 액션 에러 핸들링
- 낙관적 업데이트 + 롤백 패턴
```

### 접근성 전문
```
WCAG 2.1 AA 기준으로 접근성을 리뷰해줘.
- 모달/시트 포커스 트랩
- 탭 키보드 네비게이션 (WAI-ARIA Tabs 패턴)
- aria-live 영역
- prefers-reduced-motion
- 색상 대비 4.5:1
- 최소 터치 타겟 44x44px
```
