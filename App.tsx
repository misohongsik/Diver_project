import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity, Modal, Switch, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';

const CITY_DATA: { [key: string]: string[] } = {
  "용인": [
    "남사읍", "이동읍", "역북동", "삼가동", "중앙동", "김량장동", "남동", "동부동", "마평동", "운학동", "유림동", "고림동", "유방동", "포곡읍", "모현읍", "양지면", "원삼면", "백암면",
    "고매동", "공세동", "보라동", "지곡동", "상하동", "신갈동", "구갈동", "상갈동", "하갈동", "영덕동", "마북동", "보정동", "서농동", "서천동", "농서동",
    "풍덕천동", "죽전동", "동천동", "상현동", "성복동"
  ],
  "화성": [
    "오산동", "청계동", "영천동", "중동", "목동", "산척동", "방교동", "송동", "장지동", "신동", "반송동", "석우동",
    "병점동", "진안동", "반월동", "기산동", "화산동", "황계동", "송산동", "정남면", "동탄면"
  ],
  "오산": [
    "오산시", "오산동", "원동", "갈곶동", "청학동", "가수동", "금암동", "수청동", "세교동", "외삼미동", "누읍동", "궐동"
  ],
  "평택": [
    "진위면", "서탄면", "송탄동", "신장동", "서정동", "이충동", "지산동", "독곡동", "장당동", "고덕동", "고덕면", "세교동", "동삭동", "비전동", "칠원동"
  ],
  "안성": [
    "원곡면", "양성면", "공도읍", "고삼면", "대덕면", "미양면", "대천동", "영동", "봉산동", "숭인동", "도기동"
  ],
  "수원": [
    "망포동", "영통동", "매탄동", "원천동", "하동", "광교", "권선동", "세류동", "곡선동", "곡반정동"
  ]
};

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAlarmModalVisible, setAlarmModalVisible] = useState(false);
  const [alarmDest, setAlarmDest] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    checkPermission();
    loadInitialData();
    
    const interval = setInterval(async () => {
      const isRinging = await AsyncStorage.getItem('DVER_ALARM_IS_RINGING');
      if (isRinging === "true") {
        setAlarmModalVisible(true);
        const dest = await AsyncStorage.getItem('DVER_ALARM_DESTINATION');
        setAlarmDest(dest || "정보 없음");
      } else {
        setAlarmModalVisible(false);
      }

      const savedLogs = await AsyncStorage.getItem('DVER_DEBUG_LOG');
      if (savedLogs) setLogs(JSON.parse(savedLogs));

      checkPermission();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const checkPermission = async () => {
    try {
      const status: any = await RNAndroidNotificationListener.getPermissionStatus();
      setHasPermission(status === 'authorized' || status === 'granted' || status === true);
    } catch (e) {
      setHasPermission(false);
    }
  };

  const loadInitialData = async () => {
    const savedKeywords = await AsyncStorage.getItem('DVER_KEYWORDS');
    if (savedKeywords) {
      setKeywords(JSON.parse(savedKeywords));
    } else {
      const allKeywords = Object.values(CITY_DATA).flat();
      setKeywords(allKeywords);
      await AsyncStorage.setItem('DVER_KEYWORDS', JSON.stringify(allKeywords));
    }

    const savedActive = await AsyncStorage.getItem('DVER_ALARM_ENABLED');
    setIsAlarmActive(savedActive !== "false");
  };

  const toggleAlarmActive = async (value: boolean) => {
    setIsAlarmActive(value);
    await AsyncStorage.setItem('DVER_ALARM_ENABLED', value ? "true" : "false");
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || keywords.includes(newKeyword.trim())) return;
    const updated = [newKeyword.trim(), ...keywords];
    setKeywords(updated);
    setNewKeyword('');
    await AsyncStorage.setItem('DVER_KEYWORDS', JSON.stringify(updated));
  };

  const removeKeyword = async (target: string) => {
    const updated = keywords.filter(k => k !== target);
    setKeywords(updated);
    await AsyncStorage.setItem('DVER_KEYWORDS', JSON.stringify(updated));
  };

  const toggleCityBatch = async (cityName: string) => {
    const cityKeywords = CITY_DATA[cityName];
    const isAllPresent = cityKeywords.every(k => keywords.includes(k));

    let updated;
    if (isAllPresent) {
      updated = keywords.filter(k => !cityKeywords.includes(k));
    } else {
      const filteredCityKws = cityKeywords.filter(k => !keywords.includes(k));
      updated = [...filteredCityKws, ...keywords];
    }
    
    setKeywords(updated);
    await AsyncStorage.setItem('DVER_KEYWORDS', JSON.stringify(updated));
  };

  const clearAllKeywords = async () => {
    setKeywords([]);
    await AsyncStorage.setItem('DVER_KEYWORDS', JSON.stringify([]));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>전체 오더 알림 필터</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>전체 알람 기능 활성화</Text>
          <Switch value={isAlarmActive} onValueChange={toggleAlarmActive} />
        </View>
        <Text style={[styles.statusText, { color: hasPermission ? '#4CAF50' : '#F44336' }]}>
          권한 상태: {hasPermission ? "✅ 허용됨" : "❌ 거부됨"}
        </Text>
        {!hasPermission && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => RNAndroidNotificationListener.requestPermission()}>
            <Text style={styles.btnText}>권한 설정하러 가기</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>도시별 묶음 관리</Text>
        <View style={styles.cityGrid}>
          {Object.keys(CITY_DATA).map(city => {
            const isAllIn = CITY_DATA[city].every(k => keywords.includes(k));
            return (
              <TouchableOpacity 
                key={city} 
                style={[styles.cityBtn, isAllIn && styles.cityBtnActive]} 
                onPress={() => toggleCityBatch(city)}
              >
                <Text style={[styles.cityBtnText, isAllIn && styles.cityBtnTextActive]}>{city}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.btnClear} onPress={clearAllKeywords}>
          <Text style={styles.btnClearText}>전체 키워드 삭제</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TextInput 
          style={styles.input} 
          value={newKeyword} 
          onChangeText={setNewKeyword} 
          placeholder="개별 키워드 추가 (예: 수지구)" 
        />
        <TouchableOpacity style={styles.btnAdd} onPress={addKeyword}>
          <Text style={styles.btnAddText}>추가</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={keywords}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.keywordCard}>
            <Text style={styles.keywordText}>{item}</Text>
            <TouchableOpacity onPress={() => removeKeyword(item)}>
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
        style={{ maxHeight: 200 }}
        initialNumToRender={20}
      />

      <Text style={styles.logHeader}>🔍 최근 알림 로그 (최대 20개)</Text>
      <FlatList
        data={logs}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <Text style={styles.logTime}>{item.time} - {item.app}</Text>
            <Text style={styles.logTitle}>{item.title}</Text>
            <Text style={styles.logText}>{item.text}</Text>
            {item.detectedDest && (
              <Text style={styles.logDest}>📍 인식된 도착지: {item.detectedDest}</Text>
            )}
          </View>
        )}
      />

      <Modal visible={isAlarmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🚨</Text>
            <Text style={styles.modalTitle}>목표 지역 오더 발생!</Text>
            <Text style={styles.modalDestLabel}>📍 도착지: {alarmDest}</Text>
            <TouchableOpacity 
              style={styles.modalBtn} 
              onPress={async () => await AsyncStorage.setItem('DVER_ALARM_IS_RINGING', "false")}
            >
              <Text style={styles.modalBtnText}>알람 끄기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8F9FA' },
  title: { fontSize: 26, fontWeight: '900', color: '#212529', textAlign: 'center', marginTop: 30, marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 3, marginBottom: 15 },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6C757D', marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 16, fontWeight: '600' },
  statusText: { fontSize: 13, marginBottom: 5 },
  btnPrimary: { backgroundColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 5 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cityBtn: { borderWidth: 1, borderColor: '#DEE2E6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  cityBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  cityBtnText: { fontSize: 13, color: '#495057' },
  cityBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  btnClear: { marginTop: 15, alignItems: 'flex-end' },
  btnClearText: { color: '#ADB5BD', fontSize: 12, textDecorationLine: 'underline' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DEE2E6' },
  btnAdd: { backgroundColor: '#212529', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  btnAddText: { color: '#fff', fontWeight: 'bold' },
  keywordCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', marginBottom: 6, borderRadius: 8, borderWidth: 1, borderColor: '#F1F3F5' },
  keywordText: { fontSize: 15, color: '#212529' },
  deleteText: { color: '#FA5252', fontWeight: 'bold' },
  logHeader: { fontSize: 14, fontWeight: 'bold', color: '#495057', marginTop: 15, marginBottom: 10 },
  logCard: { padding: 12, backgroundColor: '#E9ECEF', marginBottom: 8, borderRadius: 8 },
  logTime: { fontSize: 11, color: '#6C757D', marginBottom: 4 },
  logTitle: { fontSize: 14, fontWeight: 'bold', color: '#212529' },
  logText: { fontSize: 13, color: '#495057' },
  logDest: { fontSize: 13, color: '#D32F2F', fontWeight: 'bold', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 40, borderRadius: 24, alignItems: 'center', width: '80%' },
  modalEmoji: { fontSize: 60, marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalDestLabel: { fontSize: 20, color: '#D32F2F', fontWeight: 'bold', marginBottom: 30 },
  modalBtn: { backgroundColor: '#D32F2F', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 12 },
  modalBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
