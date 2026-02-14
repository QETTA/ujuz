# 입소.i 토큰 파이프라인

## SSOT
- 원본: `packages/tokens/src/tokens.ipsoi.json`
- 검증: `node packages/tokens/scripts/validate.mjs`
- 빌드: `node packages/tokens/scripts/build.mjs`
- 산출물:
  - `packages/tokens/dist/tokens.css`
  - `packages/tokens/dist/theme.css`
  - `packages/tokens/dist/mobile-tailwind-theme.cjs`

## 소비 경로
- Web: `src/app/globals.css`에서 `tokens.css`, `theme.css` import
- Mobile: `mobile/global.css`에서 `tokens.css` import
- Mobile Tailwind(v3): `mobile/tailwind-theme.js`가 generated CJS를 직접 require

## 운영 규칙
1. 토큰 변경은 `tokens.ipsoi.json`만 직접 수정
2. 변경 후 반드시 `npm run tokens:build`
3. PR 전 `npm run tokens:check`로 drift 확인
4. `dist/*`는 수동 수정 금지 (빌드 산출물)

## 검증 규칙
- color token: `#RRGGBB`, `#RRGGBBAA`, `rgba(r,g,b,a)` 형식 허용
- radius token: `px` 단위 필수
- motion token: `ms` 단위 필수
