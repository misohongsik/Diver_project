import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

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
    const targetApps = ['kr.co.dver.rider', 'hk.gogovan.GoGoDriver', 'com.insung.insung1data', 'com.logiway.isplex'];
    const isTargetApp = targetApps.includes(parsedNotification.app);

    // 저장된 키워드 불러오기
    const savedKeywords = await AsyncStorage.getItem('DVER_KEYWORDS');
    const keywords = savedKeywords ? JSON.parse(savedKeywords) : [];

    // 로그 저장 (최신 20개 유지)
    const rawLogs = await AsyncStorage.getItem('DVER_DEBUG_LOG');
    let logs = rawLogs ? JSON.parse(rawLogs) : [];
    
    // 도착지 추출 로직 (->, →, =>, - 등 대응)
    const title = parsedNotification.title || "";
    const text = parsedNotification.text || "";
    const textToSearchFull = `${title} ${text}`.toLowerCase();
    
    let destinationText = "";
    const arrowPattern = /->|→|=>| - /;
    
    if (arrowPattern.test(textToSearchFull)) {
      const parts = textToSearchFull.split(arrowPattern);
      destinationText = parts[parts.length - 1].trim(); 
    } else {
      destinationText = textToSearchFull;
    }

    // 로그 등록
    const newLog = {
      time: new Date().toLocaleTimeString(),
      app: parsedNotification.app,
      title: parsedNotification.title,
      text: parsedNotification.text,
      detectedDest: destinationText
    };
    logs.unshift(newLog);
    if (logs.length > 20) logs.pop();
    await AsyncStorage.setItem('DVER_DEBUG_LOG', JSON.stringify(logs));

    // 키워드 검사 (어절 단위 전체 일치 - Exact Match)
    const isMatch = keywords.some((kw: string) => {
      const targetKw = kw.trim().toLowerCase();
      if (targetKw === "") return false;
      
      // 도착지 텍스트를 공백이나 특수문자로 분리하여 단어 목록 생성
      const words = destinationText.split(/[\s,\[\]\(\)\-\.]+/);
      return words.some(word => word === targetKw); // 단어 하나가 키워드와 정확히 일치해야 함
    });

    // 마스터 스위치 상태 확인
    const isAlarmEnabledStr = await AsyncStorage.getItem('DVER_ALARM_ENABLED');
    const isAlarmEnabled = isAlarmEnabledStr !== "false";

    if (isMatch && isTargetApp && isAlarmEnabled) {
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
             { shouldPlay: true, isLooping: true }
           );

           const checkStop = setInterval(async () => {
             const status = await AsyncStorage.getItem('DVER_ALARM_IS_RINGING');
             if (status === "false") {
               await sound.stopAsync();
               await sound.unloadAsync();
               clearInterval(checkStop);
             }
           }, 1000);
         } catch (error) {
           console.error('Audio Play Error:', error);
         }
    }
  } catch (e) {
    console.error('Headless Error:', e);
  }
};
