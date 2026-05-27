// ===================================================================
// UI 렌더링 + 화면 전환 + 이벤트
//   - index.html의 ID/함수명에 맞춰 정리한 버전
// ===================================================================

const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ===== 카드 일러스트 렌더링 =====
// 이미지가 있으면 사진 카드, 없거나 로드 실패하면 컨셉 카드로 자동 fallback
function makeArt(card){
  if(card.image){
    return `<div class="card-art">
      <img src="${card.image}" alt="${card.name}"
           onerror="handleImageError(this, '${card.id}')">
    </div>`;
  }
  return makeConceptArt(card);
}

function makeConceptArt(card){
  const t = card.theme || { c1:'#444', c2:'#111', icon:'★', symbol:'?' };
  return `<div class="card-art" style="background: linear-gradient(135deg, ${t.c1} 0%, ${t.c2} 100%);">
    <div class="concept-art">
      <div class="symbol-bg">${t.symbol}</div>
      <div class="ip-tag">${card.ip}</div>
      <div class="big-icon">${t.icon}</div>
      <div class="char-name">${card.name}</div>
    </div>
  </div>`;
}

// 이미지 로드 실패 → 다른 확장자 시도 → 모두 실패시 컨셉카드로
function handleImageError(imgEl, cardId){
  const card = getCard(cardId);
  if(!card) return;
  if(!card.image) { fallbackToConcept(imgEl, card); return; }

  const m = card.image.match(/\.([^.]+)$/);
  const originalExt = m ? '.' + m[1] : '';
  const base = card.image.replace(/\.[^.]+$/, '');

  const variants = ['.jpg', '.JPG', '.png', '.PNG', '.jpeg', '.JPEG', '.webp', '.WEBP']
    .filter(e => e !== originalExt);

  const tryIdx = parseInt(imgEl.dataset.tryIdx || '0', 10);
  if(tryIdx >= variants.length) {
    fallbackToConcept(imgEl, card);
    return;
  }

  imgEl.dataset.tryIdx = String(tryIdx + 1);
  imgEl.src = base + variants[tryIdx];
}

function fallbackToConcept(imgEl, card){
  const wrap = imgEl.closest('.card-art');
  if(wrap) wrap.outerHTML = makeConceptArt(card);
}

// ===== 화면 전환 =====
function goto(screen){
  $$('.screen').forEach(s => s.classList.remove('active'));
  $(screen + '-screen').classList.add('active');
  if(screen === 'hub')        refreshHub();
  if(screen === 'collection') renderCollection();
  if(screen === 'select')     renderSelect();
}

// ===== 토스트 =====
function toast(msg, rarity){
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show';
  if(rarity === 5) t.classList.add('s5');
  if(rarity === 4) t.classList.add('s4');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== 메인 허브 =====
let cooldownTimer = null;

function refreshHub(){
  $('hub-collection').textContent = `${ownedCount()} / ${CARDS.length}`;
  $('hub-streak').textContent = `${state.streak} 🔥`;

  const now = Date.now();
  const remaining = state.nextFreeAt - now;
  const pack = $('hub-pack');
  const statusEl = $('cooldown-status');
  const timeEl = $('cooldown-time');

  if(state.bonusPulls > 0){
    statusEl.textContent = `BONUS PULL × ${state.bonusPulls}`;
    statusEl.classList.add('ready');
    timeEl.textContent = 'READY!';
    pack.classList.remove('disabled');
  } else if(remaining <= 0){
    statusEl.textContent = 'TAP TO PULL';
    statusEl.classList.add('ready');
    timeEl.textContent = 'READY!';
    pack.classList.remove('disabled');
  } else {
    statusEl.textContent = 'NEXT FREE PULL';
    statusEl.classList.remove('ready');
    const sec = Math.ceil(remaining / 1000);
    const mm = String(Math.floor(sec/60)).padStart(2,'0');
    const ss = String(sec%60).padStart(2,'0');
    timeEl.innerHTML = `${mm}<span class="colon">:</span>${ss}`;
    pack.classList.add('disabled');
  }
}

function startCooldownLoop(){
  if(cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    if($('hub-screen').classList.contains('active')) refreshHub();
  }, 1000);
}

// ===== 가챠 인터랙션 =====
function tryPull(){
  if(!canPull()){
    toast('아직 쿨타임이야!');
    return;
  }
  goto('gacha');
  resetGachaScreen();
}

function resetGachaScreen(){
  $('gacha-stage1').style.display = 'flex';
  $('gacha-stage2').style.display = 'none';

  const screen = $('gacha-screen');
  screen.className = screen.className
    .replace(/\bis-pack-(pressed|charging|opening)\b/g, '')
    .replace(/\brarity-\d+\b/g, '')
    .replace(/\bis-revealing\b/g, '')
    .trim();

  const pack = $('opening-pack');
  pack.classList.remove('opening', 'burst', 'is-pressed', 'is-charging', 'is-opening', 'is-locked');

  $('card-reveal').className = 'card-reveal';
  $('reveal-info').classList.remove('show');
  $('gacha-instruction').textContent = '탭해서 팩을 열어!';

  const stage2 = $('gacha-stage2');
  stage2.className = stage2.className.replace(/\brarity-\d+\b/g, '').trim();
}

function openPack(){
  const pack = $('opening-pack');
  const screen = $('gacha-screen');

  // 연타 방지
  if(pack.classList.contains('is-locked')) return;
  pack.classList.add('is-locked');

  $('gacha-instruction').textContent = '두근두근...';

  // 1) Press (220ms) → 2) Charge (600ms) → 3) Open (680ms) → 4) Reveal
  screen.classList.add('is-pack-pressed');
  pack.classList.add('is-pressed');

  setTimeout(() => {
    screen.classList.remove('is-pack-pressed');
    screen.classList.add('is-pack-charging');
    pack.classList.remove('is-pressed');
    pack.classList.add('is-charging');
    $('gacha-instruction').textContent = '빛이 모이고 있어...';
  }, 220);

  setTimeout(() => {
    screen.classList.remove('is-pack-charging');
    screen.classList.add('is-pack-opening');
    pack.classList.remove('is-charging');
    pack.classList.add('is-opening');
    $('gacha-instruction').textContent = 'OPEN!';
  }, 820);

  setTimeout(() => {
    const result = pullCard();
    showReveal(result);
  }, 1500);
}

function showReveal({ card, isNew }){
  const screen = $('gacha-screen');
  screen.className = screen.className
    .replace(/\bis-pack-(pressed|charging|opening)\b/g, '')
    .replace(/\brarity-\d+\b/g, '')
    .trim();
  screen.classList.add('is-revealing', 'rarity-' + card.stars);

  $('gacha-stage1').style.display = 'none';
  $('gacha-stage2').style.display = 'flex';

  const stage2 = $('gacha-stage2');
  stage2.className = stage2.className.replace(/\brarity-\d+\b/g, '').trim();
  stage2.classList.add('rarity-' + card.stars);

  const reveal = $('card-reveal');
  reveal.className = 'card-reveal';
  $('reveal-content').innerHTML = makeArt(card);
  $('reveal-stars').textContent = '★'.repeat(card.stars);

  setTimeout(() => {
    reveal.classList.add('show', 'is-revealing', 'rarity-' + card.stars, 's' + card.stars);
  }, 100);

  setTimeout(() => {
    $('reveal-info').innerHTML = `${card.name} (${card.stars}★)` +
      (isNew ? '<span class="new-tag">NEW!</span>'
             : '<span class="dupe-tag">중복</span>');
    $('reveal-info').classList.add('show');
  }, 700);

  setTimeout(() => {
    if(card.stars >= 4){
      toast(`✨ ${card.stars}성 ${card.name} 획득!`, card.stars);
    }
  }, 1200);
}

function skipCooldown(){
  skipCooldownAction();
  refreshHub();
  toast('⏩ 쿨타임 스킵');
}

// ===== 컬렉션 =====
let collectionFilter = 'all';

// index.html이 `filterCollection('all', this)` 형태로 호출함
function filterCollection(f, btn){
  collectionFilter = f;
  $$('#collection-filters .filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderCollection();
}

function renderCollection(){
  $('collection-stats').innerHTML = `
    <span class="chip s5">★5  ${ownedByStar(5)}/${totalByStar(5)}</span>
    <span class="chip s4">★4  ${ownedByStar(4)}/${totalByStar(4)}</span>
    <span class="chip s3">★3  ${ownedByStar(3)}/${totalByStar(3)}</span>
    <span class="chip">총 ${ownedCount()} / ${CARDS.length} · 누적 ${state.totalPulls}회 · 최고 ${state.maxStreak}연승</span>
  `;

  const grid = $('collection-grid'); grid.innerHTML = '';
  const sorted = [...CARDS].sort((a,b) => b.stars - a.stars || a.id.localeCompare(b.id));

  for(const c of sorted){
    if(collectionFilter !== 'all' && c.stars !== collectionFilter) continue;
    const count = state.inventory[c.id] || 0;
    const el = document.createElement('div');
    if(count > 0){
      el.className = `col-card s${c.stars}`;
      el.innerHTML = `
        ${makeArt(c)}
        <div class="count-badge">×${count}</div>
        <div class="attr-badge">${ATTR_EMOJI[c.attr]}</div>
        <div class="stars-mini">${'★'.repeat(c.stars)}</div>
      `;
      el.onclick = () => openCardModal(c);
    } else {
      el.className = `col-card empty s${c.stars}`;
      el.innerHTML = `<div class="lock">🔒</div><div class="hint">${'★'.repeat(c.stars)}</div>`;
    }
    grid.appendChild(el);
  }
}

function openCardModal(card){
  const count = state.inventory[card.id] || 0;
  $('modal-card-content').innerHTML = `
    ${makeArt(card)}
    <div class="modal-info">
      <div class="modal-name">${card.name}</div>
      <div class="modal-ip">${card.ip}</div>
      <div class="modal-stars">${'★'.repeat(card.stars)}</div>
      <div class="modal-attr">속성: ${ATTR_KR[card.attr]} ${ATTR_EMOJI[card.attr]}</div>
      <div class="modal-owned">보유 ×${count}</div>
    </div>
  `;
  $('card-modal').classList.add('show');
}

// index.html이 `closeCardModal()` 호출함
function closeCardModal(){
  $('card-modal').classList.remove('show');
}

// ===== 배틀 진입 =====
let selectedCard = null;
let enemyCard = null;

function goBattle(){
  if(!hasAnyCard()){
    toast('카드를 먼저 뽑아야 해!');
    goto('hub'); return;
  }
  goto('select');
}

function renderSelect(){
  $('select-streak').textContent = `${state.streak} 🔥`;
  const grid = $('select-grid');
  grid.innerHTML = '';

  if(!hasAnyCard()){
    grid.innerHTML = '<div class="empty-msg" style="grid-column:1/-1;text-align:center;padding:40px;opacity:0.6;">카드를 먼저 뽑아야 해!</div>';
    return;
  }

  const owned = CARDS.filter(c => (state.inventory[c.id] || 0) > 0)
                     .sort((a,b) => b.stars - a.stars);

  owned.forEach(c => {
    const count = state.inventory[c.id];
    const el = document.createElement('div');
    el.className = `col-card s${c.stars}`;
    el.style.cursor = 'pointer';
    el.innerHTML = `
      ${makeArt(c)}
      <div class="count-badge">×${count}</div>
      <div class="attr-badge">${ATTR_EMOJI[c.attr]}</div>
      <div class="stars-mini">${'★'.repeat(c.stars)}</div>
    `;
    el.onclick = () => { selectedCard = c; doBattle(); };
    grid.appendChild(el);
  });
}

// ===== 배틀 진행 =====
function doBattle(){
  enemyCard = CARDS[Math.floor(Math.random() * CARDS.length)];

  goto('battle');
  $('battle-streak').textContent = `${state.streak} 🔥`;

  // 내 카드는 바로 공개
  $('my-card').className = 'battle-card';
  $('my-card').innerHTML = `${makeArt(selectedCard)}<div class="stars">${'★'.repeat(selectedCard.stars)}</div>`;

  // 상대 카드는 처음엔 뒷면
  $('opp-card').className = 'battle-card back';
  $('opp-card').innerHTML = '';
  $('battle-vs').textContent = 'VS';

  // 상대 카드 공개
  setTimeout(() => {
    $('opp-card').className = 'battle-card';
    $('opp-card').innerHTML = `${makeArt(enemyCard)}<div class="stars">${'★'.repeat(enemyCard.stars)}</div>`;
  }, 1200);

  // RPS 공개 (battle-vs 영역에)
  setTimeout(() => {
    $('battle-vs').innerHTML =
      `<span class="rps-emoji opp">${ATTR_EMOJI[enemyCard.attr]}</span>` +
      ` <span class="vs-sep">VS</span> ` +
      `<span class="rps-emoji me">${ATTR_EMOJI[selectedCard.attr]}</span>`;
  }, 2000);

  // 결과
  setTimeout(() => {
    showResult();
  }, 3200);
}

function showResult(){
  const result = judge(selectedCard, enemyCard);
  const { earnedBonus } = applyBattleResult(result);

  // 이전 결과 클래스 제거
  const body = document.querySelector('#result-screen .result-body');
  if(body) body.classList.remove('win', 'lose', 'draw');

  let iconText = '', titleText = '', infoText = '', streakText = '';

  if(result === 'win'){
    iconText = '🏆';
    titleText = 'VICTORY!';
    if(body) body.classList.add('win');
    infoText = `<strong>${selectedCard.name}</strong>(${ATTR_KR[selectedCard.attr]}, ${selectedCard.stars}★)이(가)<br>` +
               `<strong>${enemyCard.name}</strong>(${ATTR_KR[enemyCard.attr]}, ${enemyCard.stars}★)을(를) 격파!`;
    streakText = `🔥 <strong>${state.streak}연승</strong>`;
    if(earnedBonus){
      streakText += `<div class="ticket-banner">🎁 10연승 보상! 보너스 가챠 1회 적립!</div>`;
    }
  } else if(result === 'lose'){
    iconText = '😭';
    titleText = 'DEFEAT';
    if(body) body.classList.add('lose');
    infoText = `<strong>${enemyCard.name}</strong>에게 패배...`;
    streakText = `연승 끊겼어`;
  } else {
    iconText = '🤝';
    titleText = 'DRAW';
    if(body) body.classList.add('draw');
    infoText = `둘 다 <strong>${ATTR_KR[selectedCard.attr]}</strong>, 등급도 <strong>${selectedCard.stars}★</strong>으로 동일`;
    streakText = `무승부! 연승 유지: <strong>${state.streak}</strong>`;
  }
  $('result-icon').textContent = iconText;
  $('result-title').textContent = titleText;
  $('result-info').innerHTML = infoText;
  $('result-streak').innerHTML = streakText;

  goto('result');
}

// ===== 초기화 =====
function init(){
  loadState();
  startCooldownLoop();
  refreshHub();
}

document.addEventListener('DOMContentLoaded', init);
