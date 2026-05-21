// ===================================================================
// 카드 마스터 데이터
// 카드 에디터로 생성 · 2026. 5. 21. 오후 6:00:49
// 카드 수: 12장 (★5 6 · ★4 3 · ★3 3)
// ===================================================================

const CARDS = [
  // ===== 5성 =====
  { id:'new_card_1', name:'아르타미엘(바위)', ip:'서머너즈워', stars:5, attr:'rock', image:'assets/cards/new_card_1.jpg' },
  { id:'new_card_1_v2', name:'아르타미엘(가위)', ip:'서머너즈워', stars:5, attr:'scissors', image:'assets/cards/new_card_1_v2.jpg' },
  { id:'new_card_1_v2_v2', name:'아르타미엘(보)', ip:'서머너즈워', stars:5, attr:'paper', image:'assets/cards/new_card_1_v2_v2.jpg' },
  { id:'new_card_4', name:'천사(보)', ip:'서머너즈워', stars:5, attr:'paper', image:'assets/cards/new_card_4.jpg' },
  { id:'new_card_4_v2', name:'천사(가위)', ip:'서머너즈워', stars:5, attr:'scissors', image:'assets/cards/new_card_4_v2.jpg' },
  { id:'new_card_4_v2_v2', name:'천사(바위)', ip:'서머너즈워', stars:5, attr:'rock', image:'assets/cards/new_card_4_v2_v2.jpg' },

  // ===== 4성 =====
  { id:'new_card_3', name:'캐릭터1(바위)', ip:'서머너즈워', stars:4, attr:'rock', image:'assets/cards/new_card_3.jpg' },
  { id:'new_card_3_v2', name:'캐릭터1(가위)', ip:'서머너즈워', stars:4, attr:'scissors', image:'assets/cards/new_card_3_v2.jpg' },
  { id:'new_card_3_v2_v2', name:'캐릭터1(보)', ip:'서머너즈워', stars:4, attr:'paper', image:'assets/cards/new_card_3_v2_v2.jpg' },

  // ===== 3성 =====
  { id:'new_card_2', name:'캐릭터1(보)', ip:'컴투스프로야구', stars:3, attr:'paper', image:'assets/cards/new_card_2.jpg' },
  { id:'new_card_2_v2', name:'캐릭터1(가위)', ip:'컴투스프로야구', stars:3, attr:'scissors', image:'assets/cards/new_card_2_v2.jpg' },
  { id:'new_card_2_v2_v2', name:'캐릭터1(바위)', ip:'컴투스프로야구', stars:3, attr:'rock', image:'assets/cards/new_card_2_v2_v2.jpg' },

];

// 속성 메타데이터
const ATTR_EMOJI = { rock:'✊', scissors:'✌️', paper:'🖐️' };
const ATTR_KR    = { rock:'바위', scissors:'가위', paper:'보' };

// 등급별 출현 확률 (%) · 합 100
const RARITY_PROB = { 5: 5, 4: 25, 3: 70 };

// 가챠 쿨다운 (밀리초)
const COOLDOWN_MS = 30 * 1000;
