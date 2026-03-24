import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

/**
 * Headless JS Task for Background Notifications
 * Handles logic for filtering target apps, parsing destination/price, and triggering alarms.
 */
export const headlessNotificationListener = async (notification: any) => {
  try {
    // ⚠️ 중요: 라이브러리(v5.x)는 데이터를 { notification: '{"app": "..."}' } 형태로 전달합니다.
    const rawData = (notification && typeof notification === 'object' && notification.notification)
      ? notification.notification
      : notification;

    // JSON 글자라면 객체로 변환합니다.
    const parsedNotification = typeof rawData === 'string' 
      ? JSON.parse(rawData) 
      : rawData;

    if (!parsedNotification || !parsedNotification.app) return;

    // 필터링 대상 앱 확인 (디버, 고고엑스, 인성 1 등)
    const targetApps = [
      'kr.co.dver.rider', 
      'hk.gogovan.GoGoDriver', 
      'com.insung.insung1data', 
      'com.logiway.isplex', 
      'kr.gogovan.android.gogodriver' // GO GO Driver (Korean marketplace)
    ];
    const isTargetApp = targetApps.includes(parsedNotification.app);

    // 💡 로그 저장 및 매칭 로직: 오직 대상 앱일 때만 작동 (시스템 알림/충전기 로그 제외)
    if (isTargetApp) {
      // 전처리: 고고봇(GOGOBOT) 등 목적지 뒤에 붙는 불필요한 링크/버튼 텍스트 제거
      let title = parsedNotification.title || "";
      let text = (parsedNotification.text || "")
        .replace(/\| - \|.*/, "")
        .replace(/\| 오더 확인하기.*/, "")
        .replace(/오더 상세보기.*/, "");

      let textToSearchFull = `${title} ${text}`.toLowerCase();
      
      let destinationText = "";
      const arrowPattern = /->|→|=>| - /;
      
      if (arrowPattern.test(textToSearchFull)) {
        const parts = textToSearchFull.split(arrowPattern);
        destinationText = parts[parts.length - 1].trim(); 
        // 맨 구석의 '|' 기호 등 추가 정리 (홍제동 | 인앱 결제 -> 홍제동...)
        destinationText = destinationText.replace(/^\|/, "").trim();
      } else {
        destinationText = textToSearchFull;
      }

      // 로그 저장 (최신 20개 유지)
      const rawLogs = await AsyncStorage.getItem('DVER_DEBUG_LOG');
      let logs = rawLogs ? JSON.parse(rawLogs) : [];
      
      const newLog = {
        time: new Date().toLocaleTimeString(),
        app: parsedNotification.app,
        title: title,
        text: text,
        detectedDest: destinationText
      };
      logs.unshift(newLog);
      if (logs.length > 20) logs.pop();
      await AsyncStorage.setItem('DVER_DEBUG_LOG', JSON.stringify(logs));

      // 저장된 매칭 키워드 불러오기
      const savedKeywords = await AsyncStorage.getItem('DVER_KEYWORDS');
      const keywords = savedKeywords ? JSON.parse(savedKeywords) : [];

      // 키워드 검사 (어절 단위 전체 일치 - Exact Match)
      // '|' 기호도 구분을 위해 Separator에 추가
      const isMatch = keywords.some((kw: string) => {
        const targetKw = kw.trim().toLowerCase();
        if (targetKw === "") return false;
        
        const words = destinationText.split(/[\s,\[\]\(\)\-\.\|]+/);
        return words.some(word => word === targetKw);
      });

      // 마스터 스위치 상태 확인
      const isAlarmEnabledStr = await AsyncStorage.getItem('DVER_ALARM_ENABLED');
      const isAlarmEnabled = isAlarmEnabledStr !== "false";

      if (isMatch && isAlarmEnabled) {
         await AsyncStorage.setItem('DVER_ALARM_IS_RINGING', "true");
         await AsyncStorage.setItem('DVER_ALARM_DESTINATION', destinationText);

         try {
           await Audio.setAudioModeAsync({
             allowsRecordingIOS: false,
             staysActiveInBackground: true,
             playsInSilentModeIOS: true,
             shouldDuckAndroid: true,
             playThroughEarpieceAndroid: false,
           });
           
           const { sound } = await Audio.Sound.createAsync(
             { uri: 'https://actions.google.com/sounds/v1/science_fiction/klaxon_alarm_loop.ogg' },
             { shouldPlay: true, isLooping: true, volume: 1.0 }
           );

           // 💡 중요: setInterval 대신 while 루프를 사용하여 Headless JS 작업이 종료되지 않게 유지합니다.
           // 그렇지 않으면 소리가 시작되자마자 작업이 끝나 Android가 소리를 차단할 수 있습니다.
           let isRinging = true;
           while (isRinging) {
             const status = await AsyncStorage.getItem('DVER_ALARM_IS_RINGING');
             if (status === "false") {
               isRinging = false;
               await sound.stopAsync();
               await sound.unloadAsync();
             } else {
               // 1초마다 상태를 확인하며 대기 (이 대기 상태가 Headless JS 작업을 유지시킵니다)
               await new Promise(resolve => setTimeout(resolve, 1000));
             }
           }
         } catch (error) {
           console.error('Audio Play Error:', error);
         }
      }
    }
  } catch (e) {
    console.error('Headless Error:', e);
  }
};
