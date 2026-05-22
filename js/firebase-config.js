// ===================================================================
// Firebase 초기화
// 사용자: comallstar 프로젝트
// ===================================================================
// CDN modular SDK를 사용하지만, 일반 script로 로드되어
// 글로벌 변수로 접근 (다른 js 파일에서 쓰기 위해)

// 이 파일은 index.html에서 firebase SDK 다음, auth.js 이전에 로드됨

const firebaseConfig = {
  apiKey: "AIzaSyCZdrY0QEdeyjo_djOoAGF0QvF84dmlVWc",
  authDomain: "comallstar-c8e58.firebaseapp.com",
  projectId: "comallstar-c8e58",
  storageBucket: "comallstar-c8e58.firebasestorage.app",
  messagingSenderId: "749606419198",
  appId: "1:749606419198:web:4b507053183fefd40f43af"
};

// Firebase 초기화 (글로벌 firebase 객체 사용 - compat 모드)
firebase.initializeApp(firebaseConfig);

// 전역에서 쓸 수 있도록 노출
window.auth = firebase.auth();
window.db = firebase.firestore();

// 한국어 에러 메시지 (Firebase 영어 에러를 친근하게 변환)
window.firebaseErrorMessages = {
  'auth/email-already-in-use': '이미 가입된 이메일이야',
  'auth/invalid-email': '이메일 형식이 올바르지 않아',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해',
  'auth/wrong-password': '비밀번호가 틀렸어',
  'auth/user-not-found': '가입된 계정이 없어',
  'auth/invalid-credential': '이메일 또는 비밀번호가 틀렸어',
  'auth/too-many-requests': '시도가 너무 많아. 잠시 후 다시 해줘',
  'auth/network-request-failed': '네트워크 연결을 확인해줘',
  'auth/popup-closed-by-user': '', // 사용자가 팝업 닫음 - 무시
  'auth/cancelled-popup-request': '', // 무시
};

window.getFirebaseErrorMsg = function(error) {
  const code = error?.code || '';
  if (window.firebaseErrorMessages[code] !== undefined) {
    return window.firebaseErrorMessages[code];
  }
  return error?.message || '알 수 없는 오류가 발생했어';
};
