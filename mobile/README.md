# UjuZ Expo 개발 가이드

## 빠른 실행

- 로컬 의존성 설치

```bash
pnpm --dir mobile install
```

- WSL 한 줄 실행 (권장)

```bash
pnpm dev:mobile
```

- 백그라운드 실행 (터미널을 끊고도 유지)

```bash
pnpm dev:mobile:bg
```

- 진단만 실행 (실행 없이 adb/emulator/SDK/API 상태 점검)

```bash
pnpm check:mobile
```

- 에뮬레이터 바로 실행

```bash
pnpm dev:mobile:android
```

특정 환경변수로 실행할 때:

```bash
export MOBILE_ANDROID_EMULATOR_NAME="Pixel_7"
pnpm dev:mobile:android
```

- 터널 모드 (외부 네트워크에서도 연결)

```bash
pnpm dev:mobile:tunnel
```

- URL/QR 대상만 바로 확인

```bash
pnpm url:mobile
```

> 기본 포트: `8081`  
> `포트 충돌`이면 자동으로 `8082/8083`로 우회합니다.

- 고정 포트/캐시 초기화가 필요할 때

```bash
bash scripts/start-mobile.sh --port 8090 --clear
```

로그는 아래에서 확인 가능합니다.

```bash
tail -f /tmp/ujuz-expo-mobile.log
```

## 모바일 기기 연결

- WSL에서 보이는 IP 확인:

```bash
hostname -I | awk '{print $1}'
```

- QR로 연결: 터미널에 뜨는 `exp://<WSL_IP>:8081` 또는 `:포트` URL 스캔

- 백그라운드 실행 중 URL 확인:

```bash
pnpm url:mobile
```

- 백그라운드 종료:

```bash
pnpm stop:mobile
```

## 환경변수

- `MOBILE_API_BASE_URL`를 설정하면 Expo 실행 시 API 주소를 강제로 덮어씁니다.

```bash
export MOBILE_API_BASE_URL=http://192.168.200.180:3001
pnpm dev:mobile
```

## 에뮬레이터

- 안드로이드 에뮬레이터가 있는 환경에서 바로 실행:

```bash
pnpm dev:mobile:android
```

ADB/SDK가 안 잡히면 `pnpm check:mobile`로 진단하고, 진단에서 찾은 경로는 자동으로 PATH에 반영됩니다.
그래도 안 되면 WSL 경로를 임시로 잡고 다시 실행하세요.

```bash
export ANDROID_HOME="/mnt/c/Users/<Windows 사용자명>/AppData/Local/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

pnpm dev:mobile:android
```

특정 AVD를 지정해서 실행하려면:

```bash
MOBILE_ANDROID_EMULATOR_NAME="Pixel_7" bash scripts/start-mobile.sh --android
```

## 정리

- Expo 서버 종료: Ctrl + C
- 포트 강제 종료:

```bash
pkill -f "expo start --host"
```
