# 프로젝트 방향 메모리 (2026-02, v2)

## 현재 위치
- TRL 5~6 (통합 프로토타입)
- 7개 서브시스템: 데이터파이프라인(95%), 입소엔진(95%), AI상담(90%), TO알림(40%), 커뮤니티(20%), 모바일(10%), 구독/과금(5%)

## 핵심 가치
- **(a) 시설 탐색(지도/주변) + (b) TO 알림의 '즉시성'** = 제품 코어
- 네이티브 앱 = 과한 선택이 아니라 PMF에 직접 기여하는 구조적 선택
- iOS 웹 푸시 "홈 화면 추가" 제약 → 네이티브 필수

## 전략 원칙
- **신뢰 → 재방문 → 유료전환** 순서
- 키즈노트와 경쟁 회피: "입소 전 단계"에 집중
- 웹 = 유입 채널 (SEO/결제), 모바일 = 핵심 경험 (지도/알림/채팅)
- 결제는 웹 전용 (Toss 3.5%) → IAP는 Phase 4+

## 4-Phase 로드맵
1. **Phase 1 (0~2개월)**: 신뢰 기반 + Expo 리스크 검증 ← **현재 진행 중**
2. **Phase 2 (2~4개월)**: 네이티브 핵심 화면 + TO 푸시 + 지도
3. **Phase 3 (4~6개월)**: Toss 결제 + 스토어 배포 + AI 고도화
4. **Phase 4 (6~12개월)**: B2B API, 파트너십, 스케일

## Phase 1 진행 현황
- ✅ CI/CD, 개인정보/면책, Evidence/Disclaimer 컴포넌트, CHANGELOG, Expo 스캐폴드
- 🔲 대기: 캐시 레이어, 입소 테스트 확장, UI 통합, API 표준화, AUTH_BYPASS 검증, Expo PoC

## 기술 결정 (ADR 12건)
- `tech-decisions.md` 참조
- 핵심: Expo + react-native-maps + Expo Push + Toss(웹) + MongoDB TTL → LRU → Redis

## 벤치마크
- 키즈노트/brightwheel/Lillio/Winnie: 보호자 앱 무료, 기관/플랫폼 과금
- UjuZ BM: B2C 프리미엄 구독 + B2B2C 제휴 + 데이터 서비스

## 상세 문서
- `PROJECT-DIRECTION.md` 참조 (v2, 네이티브 확장 전략 반영)
