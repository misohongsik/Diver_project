# Diver Notification Filter App (Diver_project)

## 프로젝트 개요
'디버 파트너스' 앱(`kr.co.dver.rider`)의 안드로이드 푸시 알림을 감지하여, 지정된 도착지 키워드(예: "용인시")가 포함되어 있을 경우 기기 화면에 알람 해제 모달을 띄우고 알람 소리를 강제로 발생시키는 유틸리티 앱입니다. 추가로, 웹 UI 빌드 없이 Cloudflare Pages를 활용해 APK 파일과 버전 정보만 배포할 수 있는 배포 스크립트가 세팅되어 있습니다.

## 주요 기능
- **백그라운드 푸시 알람 감지:** `react-native-android-notification-listener` 기반 Headless JS 연동
- **설정된 키워드 필터링:** `AsyncStorage`를 통한 로컬 키워드 등록/삭제 (기본: "용인시")
- **오디오 알람 및 UI 제어:** 조건에 맞는 알림이 스캐닝되면 백그라운드에서 `expo-av` 알람 무한 재생, 사용자가 앱을 켜서 모달을 끌 때까지 유지
- **AWS S3를 통한 정적 배포:** 무거운 APK 용량을 수용하기 위해 AWS 버킷에 배포 (`version.json` 포함)

## 빌드 및 배포 방법

### 1. APK 빌드 방법 (EAS Build)
본 프로젝트는 **커스텀 네이티브 서비스**(Notification Listener Service)를 `AndroidManifest.xml`에 직접 주입하여 사용합니다. 따라서 **일반 Expo Go 앱에서는 정상 작동하지 않으므로, 반드시 APK로 빌드하여 안드로이드 폰에 설치해야 합니다.**

다음 명령어를 통해 Production(APK) 안드로이드 빌드를 클라우드에서 실행하세요:
```bash
eas build -p android --profile production
```
*(사전에 `npm install -g eas-cli` 설치 및 `eas login`으로 Expo 계정 상태를 확인해야 합니다)*

### 2. 프로젝트 APK 호스팅 배포 (AWS S3)
`public` 디렉토리 내에 있는 `.apk` 파일과 `version.json`을 AWS S3 버킷에 자동 업로드(동기화)하는 명령어입니다. 
EAS에서 다운로드한 진짜 앱 파일을 `public/app.apk` 로 덮어씌운 뒤 윈도우 터미널에서 아래 명령어를 구동하세요.

```bash
npm run deploy
```
*(사전에 `aws configure` 명령어로 Access Key 등 인증이 완료되어 있어야 합니다)*
