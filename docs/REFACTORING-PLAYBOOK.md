# 리팩토링 스킬 & 도구 세팅 가이드

이 문서는 이 저장소에서 리팩토링할 때 바로 사용할 수 있는 **실전 스킬(절차)** 과 **도구(명령어/스크립트)** 를 정리합니다.

## 1) 리팩토링 스킬(작업 절차)

1. **범위 고정**
   - 먼저 변경 대상 파일을 고정합니다.
   - 권장: `rg -n "<키워드>" src docs scripts`

2. **의존성 파악**
   - 변경 대상이 import/호출되는 지점을 확인합니다.
   - 권장: `rg -n "from '@/...|<함수명>|<컴포넌트명>'" src`

3. **작은 단위로 분리**
   - 대규모 한 번 수정 대신, 의미 있는 단위(네이밍/분리/중복 제거)로 나눠 커밋합니다.

4. **품질 게이트 즉시 실행**
   - 각 단위 수정 직후 `pnpm typecheck`를 실행합니다.
   - 기능 영향이 있으면 `pnpm test`까지 함께 실행합니다.

5. **회귀 검증 + 문서 동기화**
   - API 시그니처/행동이 변하면 `docs/` 문서도 같이 갱신합니다.

## 2) 도구 세팅

### 필수 도구
- TypeScript 타입 검증: `pnpm typecheck`
- 테스트: `pnpm test`
- 빠른 코드 탐색: `rg` (ripgrep)

### 보조 도구
- 리팩토링 점검 스크립트: `bash scripts/refactor-toolkit.sh`
  - 변경 파일 요약: `changed`
  - 타입체크(옵션 테스트): `verify [--with-test]`
  - 현재 리팩토링 진행상황 스냅샷: `track [--out <path>]`
  - 전범위 파일 분할 계획(병렬 실행용): `plan --workers <n> [--out-dir <path>]`
  - 워커 단위 실제 실행: `run --worker <n> [--keep-going] [--max-files <n>] -- <command-template>`
  - 전 워커 병렬 실행: `run-all --workers <n> [--fail-fast] [--keep-going] [--max-files <n>] -- <command-template>`
  - **원샷 폴리싱 파이프라인 실행**: `polish --workers <n> [--keep-going] [--max-files <n>] -- <command-template>`
  - 레포 오류 안정성 점검: `doctor [--with-test]`

## 3) 4개 병렬 기준 권장 실행 흐름

```bash
# 1) 전범위 리팩토링 대상 분할 (4개 워커)
bash scripts/refactor-toolkit.sh plan --workers 4

# 2) 워커별 실행 (파일별 명령 적용)
bash scripts/refactor-toolkit.sh run-all --workers 4 -- "echo refactor {file}"

# 3) 실패 파일을 남기고 계속 처리하고 싶을 때
bash scripts/refactor-toolkit.sh run-all --workers 4 --keep-going -- "echo refactor {file}"

# 4) 중간 진행상황 스냅샷
bash scripts/refactor-toolkit.sh track

# 5) 최종 품질 게이트 + 병합 전 안정화
bash scripts/refactor-toolkit.sh verify --with-test
bash scripts/refactor-toolkit.sh doctor --with-test
```

또는 대규모 폴리싱을 한 번에:

```bash
bash scripts/refactor-toolkit.sh polish --workers 4 -- "echo refactor {file}"
```

`plan --workers 4`는 `src/`, `docs/`, `scripts/`의 리팩토링 대상 파일을 균등 분배해 `docs/refactoring/plans/worker-*.txt`로 저장합니다. 생성 산출물(`docs/refactoring/plans/*`, `docs/refactoring/logs/*`, `current-status.md`)은 샤딩 대상에서 자동 제외됩니다.

`run/run-all/polish`의 `<command-template>`은 `{file}` 플레이스홀더를 지원합니다. `{file}`를 쓰지 않으면 파일 경로가 마지막 인자로 자동 추가됩니다.

실패가 발생하면 워커별 실패 파일 목록이 `docs/refactoring/logs/worker-<n>.failed.txt`에 기록됩니다.

## 4) 체크리스트

- [ ] 변경 범위가 명확한가?
- [ ] 공용 타입/유틸 변경 시 사용처를 모두 확인했는가?
- [ ] 전범위 리팩토링은 `plan --workers 4`로 샤딩했는가?
- [ ] 워커 실행(`run`/`run-all`) 로그를 확보했는가?
- [ ] 실패 파일 로그(`docs/refactoring/logs/*`)를 확인했는가?
- [ ] 진행상황 스냅샷(`track`)을 남겼는가?
- [ ] `pnpm typecheck` 통과했는가?
- [ ] 필요 시 `pnpm test` 통과했는가?
- [ ] 병합 전 `doctor --with-test`로 안정성 점검을 완료했는가?
- [ ] API/동작 변경이 문서에 반영되었는가?
