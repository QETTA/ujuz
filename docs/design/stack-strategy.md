# 디자인 스택 전략 (현재)

## 현재 채택
- Web: Tailwind v4 (`src/app/globals.css`)
- Mobile: NativeWind v4 + Tailwind v3 (`mobile/package.json`)
- 공통 토큰: `packages/tokens`에서 빌드된 CSS/CJS 산출물

## 마이그레이션 목표
- 장기적으로 Mobile을 NativeWind v5 + Tailwind v4로 맞춰 웹/모바일 토큰 소비 경로를 완전 동일화.

## 당장 유지하는 이유
- 현재 모바일 앱이 v4/v3 기반으로 안정 운영 중이라, 1차로는 SSOT 파이프라인을 먼저 고정하고 런타임 업그레이드는 분리 진행.
