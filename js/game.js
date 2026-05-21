// ===================================================================
// 게임 로직 + 상태 관리
//   - 가챠, 배틀 판정, 인벤토리
//   - localStorage 자동 저장/로드
// ===================================================================

const STORAGE_KEY = 'com2us-card-battle-v1';

// 게임 상태 (전역)
const state = {
  inventory: {},          // { cardId: count }
  streak: 0,              // 현재 연승
  bonusPulls: 0,          // 10연승 보상 등 적립된 무료 가챠
  nextFreeAt: Date.now(), // 다음 무료 가챠 가능 시각
  totalPulls: 0,          // 누적 가챠 횟수
  totalBattles: 0,        // 누적 배틀 횟수
  totalWins: 0,           // 누적 승수
  maxStreak: 0,           // 최고 연승 기록
};

// ===== 영속화 =====
function saveState(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.warn('저장 실패:', e); }
}
function loadState(){
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if(!data) return;
    const loaded = JSON.parse(data);
    Object.assign(state, loaded);
  } catch(e){ console.warn('로드 실패:', e); }
}
function resetGameState(){
  if(!confirm('정말 모든 진행도를 초기화할까요? (보유 카드, 연승 등 전부 삭제)')) return;
  state.inventory = {};
  state.streak = 0;
  state.bonusPulls = 0;
  state.nextFreeAt = Date.now();
  state.totalPulls = 0;
  state.totalBattles = 0;
  state.totalWins = 0;
  state.maxStreak = 0;
  saveState();
  location.reload();
}

// ===== 카드 조회 =====
function getCard(id){ return CARDS.find(c => c.id === id); }
function ownedCount(){ return CARDS.filter(c => (state.inventory[c.id] || 0) > 0).length; }
function ownedByStar(star){ return CARDS.filter(c => c.stars === star && (state.inventory[c.id] || 0) > 0).length; }
function totalByStar(star){ return CARDS.filter(c => c.stars === star).length; }
function hasAnyCard(){ return Object.values(state.inventory).some(n => n > 0); }

// ===== 가챠 =====
function canPull(){
  return state.bonusPulls > 0 || Date.now() >= state.nextFreeAt;
}
function pullCard(){
  // 보너스 가챠 우선 소모
  if(state.bonusPulls > 0){
    state.bonusPulls -= 1;
  } else {
    state.nextFreeAt = Date.now() + COOLDOWN_MS;
  }
  state.totalPulls++;

  // 등급 추첨
  const r = Math.random() * 100;
  let star;
  if(r < RARITY_PROB[5]) star = 5;
  else if(r < RARITY_PROB[5] + RARITY_PROB[4]) star = 4;
  else star = 3;

  // 같은 등급 내 균등 추첨
  const candidates = CARDS.filter(c => c.stars === star);
  const card = candidates[Math.floor(Math.random() * candidates.length)];

  // 인벤토리 추가
  state.inventory[card.id] = (state.inventory[card.id] || 0) + 1;
  const isNew = state.inventory[card.id] === 1;

  saveState();
  return { card, isNew };
}

// ===== 배틀 판정 =====
// 가위 > 보 > 바위 > 가위
// 같은 속성: 별 등급 높은 쪽 승, 등급도 같으면 무승부
function judge(me, enemy){
  if(me.attr === enemy.attr){
    if(me.stars > enemy.stars) return 'win';
    if(me.stars < enemy.stars) return 'lose';
    return 'draw';
  }
  const wins = { scissors:'paper', paper:'rock', rock:'scissors' };
  return wins[me.attr] === enemy.attr ? 'win' : 'lose';
}

function applyBattleResult(result){
  state.totalBattles++;
  let earnedBonus = false;
  if(result === 'win'){
    state.streak++;
    state.totalWins++;
    if(state.streak > state.maxStreak) state.maxStreak = state.streak;
    if(state.streak >= 10){
      state.bonusPulls += 1;
      state.streak = 0;
      earnedBonus = true;
    }
  } else if(result === 'lose'){
    state.streak = 0;
  }
  saveState();
  return { earnedBonus };
}

// 데모용 - 쿨타임 스킵
function skipCooldownAction(){
  state.nextFreeAt = Date.now();
  saveState();
}
