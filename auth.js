// ===================================================================
// Auth: 회원가입 / 로그인 / 구글 로그인 / 닉네임 관리
// ===================================================================

// 현재 로그인된 유저의 프로필 (메모리 캐시)
window.currentUserProfile = null;

// ===== Auth 상태 감지 - 페이지 로드 시 자동 실행 =====
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // 로그인 됨 → 닉네임 있는지 확인
    console.log('[Auth] 로그인 됨:', user.email);
    const profile = await loadUserProfile(user.uid);

    if (!profile || !profile.nickname) {
      // 닉네임 없음 → 닉네임 입력 화면
      window.currentUserProfile = { uid: user.uid, email: user.email };
      goto('nickname');
    } else {
      // 닉네임 있음 → 허브
      window.currentUserProfile = profile;
      updateUserUI();
      goto('hub');
    }
  } else {
    // 로그아웃 상태 → 타이틀 화면 (기본)
    console.log('[Auth] 로그아웃 상태');
    window.currentUserProfile = null;
  }
});

// ===== 프로필 불러오기 =====
async function loadUserProfile(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      return { uid, ...doc.data() };
    }
    return null;
  } catch (e) {
    console.error('[Auth] 프로필 로드 실패:', e);
    return null;
  }
}

// ===== 회원가입 (이메일) =====
async function signupEmail() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    toast('이메일과 비밀번호를 입력해줘', 'error');
    return;
  }
  if (password.length < 6) {
    toast('비밀번호는 6자 이상이어야 해', 'error');
    return;
  }

  const btn = document.getElementById('auth-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '가입 중...'; }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    toast('가입 완료! 닉네임을 정해줘 ✨', 'success');
    // onAuthStateChanged가 자동으로 닉네임 화면으로 보냄
  } catch (e) {
    const msg = getFirebaseErrorMsg(e);
    if (msg) toast(msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '가입하기'; }
  }
}

// ===== 로그인 (이메일) =====
async function loginEmail() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    toast('이메일과 비밀번호를 입력해줘', 'error');
    return;
  }

  const btn = document.getElementById('auth-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '로그인 중...'; }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged가 자동으로 다음 화면 결정
  } catch (e) {
    const msg = getFirebaseErrorMsg(e);
    if (msg) toast(msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '로그인'; }
  }
}

// ===== 구글 로그인 =====
async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    // onAuthStateChanged가 자동 처리
  } catch (e) {
    const msg = getFirebaseErrorMsg(e);
    if (msg) toast(msg, 'error');
  }
}

// ===== 모드 전환 (회원가입 ↔ 로그인) =====
let authMode = 'login'; // 'login' | 'signup'

function toggleAuthMode() {
  authMode = (authMode === 'login') ? 'signup' : 'login';
  updateAuthModeUI();
}

function updateAuthModeUI() {
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleLink = document.getElementById('auth-toggle-link');
  const toggleText = document.getElementById('auth-toggle-text');

  if (authMode === 'login') {
    if (title) title.textContent = '로그인';
    if (submitBtn) submitBtn.textContent = '로그인';
    if (toggleText) toggleText.textContent = '아직 계정이 없어?';
    if (toggleLink) toggleLink.textContent = '회원가입';
  } else {
    if (title) title.textContent = '회원가입';
    if (submitBtn) submitBtn.textContent = '가입하기';
    if (toggleText) toggleText.textContent = '이미 계정이 있어?';
    if (toggleLink) toggleLink.textContent = '로그인';
  }
}

function authSubmit() {
  if (authMode === 'login') {
    loginEmail();
  } else {
    signupEmail();
  }
}

// ===== 닉네임 저장 (중복 체크 포함) =====
async function saveNickname() {
  const input = document.getElementById('nickname-input');
  const nickname = input.value.trim();

  // 유효성 검사
  if (!nickname) {
    toast('닉네임을 입력해줘', 'error');
    return;
  }
  if (nickname.length < 2 || nickname.length > 12) {
    toast('닉네임은 2~12자야', 'error');
    return;
  }
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    toast('한글, 영문, 숫자, _ 만 사용할 수 있어', 'error');
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    toast('로그인이 필요해', 'error');
    return;
  }

  const btn = document.getElementById('nickname-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = '확인 중...'; }

  try {
    const nicknameLower = nickname.toLowerCase();

    // 1. 중복 체크: usernames/{nicknameLower} 문서 확인
    const dupCheck = await db.collection('usernames').doc(nicknameLower).get();
    if (dupCheck.exists) {
      toast('이미 사용 중인 닉네임이야', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '시작하기'; }
      return;
    }

    // 2. 트랜잭션으로 닉네임 + 프로필 동시 저장
    const batch = db.batch();
    const userRef = db.collection('users').doc(user.uid);
    const nameRef = db.collection('usernames').doc(nicknameLower);

    batch.set(userRef, {
      nickname: nickname,
      nicknameLower: nicknameLower,
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    batch.set(nameRef, {
      uid: user.uid
    });

    await batch.commit();

    // 메모리 업데이트
    window.currentUserProfile = {
      uid: user.uid,
      nickname: nickname,
      nicknameLower: nicknameLower,
      email: user.email
    };

    toast(`반가워, ${nickname}님! ✨`, 'success');
    updateUserUI();
    goto('hub');
  } catch (e) {
    console.error('[Nickname] 저장 실패:', e);
    toast('저장 중 오류가 났어. 다시 시도해줘', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '시작하기'; }
  }
}

// ===== 허브 화면의 닉네임 + 사용자 UI 업데이트 =====
function updateUserUI() {
  const profile = window.currentUserProfile;
  if (!profile) return;

  const nameEl = document.getElementById('hub-username');
  if (nameEl) {
    nameEl.textContent = profile.nickname || '플레이어';
  }
}

// ===== 로그아웃 =====
async function logout() {
  if (!confirm('정말 로그아웃 할까?')) return;
  try {
    await auth.signOut();
    window.currentUserProfile = null;
    toast('로그아웃 됐어', 'success');
    goto('title');
  } catch (e) {
    toast('로그아웃 실패: ' + e.message, 'error');
  }
}

// ===== 타이틀에서 시작 버튼 (TAP TO START) =====
// 기존: 바로 hub로 가던 걸 → 로그인 상태에 따라 분기
function startGame() {
  if (auth.currentUser) {
    // 이미 로그인 됨 → onAuthStateChanged가 처리했을 거임
    goto('hub');
  } else {
    // 로그아웃 → 인증 화면으로
    goto('auth');
  }
}
