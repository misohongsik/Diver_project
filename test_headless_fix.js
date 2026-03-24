// Mocking AsyncStorage
const mockStorage = {};
const AsyncStorage = {
    getItem: async (key) => mockStorage[key] || null,
    setItem: async (key, value) => { mockStorage[key] = value; },
};

// Simple Mock for headlessNotificationListener logic (extracted from headlessTask.ts)
const testHeadlessLogic = async (notification) => {
    try {
        // --- 하단이 실제 반영된 로직입니다 ---
        const rawData = (notification && typeof notification === 'object' && notification.notification)
            ? notification.notification
            : notification;

        const parsedNotification = typeof rawData === 'string' 
            ? JSON.parse(rawData) 
            : rawData;

        if (!parsedNotification || !parsedNotification.app) {
            console.log("❌ Failed to parse or missing app field");
            return;
        }

        // 로그 저장 로직
        const rawLogs = await AsyncStorage.getItem('DVER_DEBUG_LOG');
        let logs = rawLogs ? JSON.parse(rawLogs) : [];
        
        const newLog = {
            time: "18:00:00",
            app: parsedNotification.app,
            title: parsedNotification.title,
            text: parsedNotification.text,
        };
        logs.unshift(newLog);
        await AsyncStorage.setItem('DVER_DEBUG_LOG', JSON.stringify(logs));
        
        console.log("✅ Successfully logged:", newLog);
    } catch (e) {
        console.error("🔥 Error during test:", e);
    }
};

// 🧪 TEST CASE: 라이브러리 v5.x에서 보내는 실제 데이터 구조
const inputFromLibrary = {
    notification: '{"app": "kr.co.dver.rider", "title": "역북동 -> 남사읍", "text": "배차 대기 중"}'
};

console.log("🚀 Testing with nested structure...");
testHeadlessLogic(inputFromLibrary).then(() => {
    AsyncStorage.getItem('DVER_DEBUG_LOG').then(log => {
        console.log("📦 Saved Logs in Storage:", JSON.parse(log));
    });
});
