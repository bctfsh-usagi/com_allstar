// ===================================================================
// UI 렌더링 + 화면 전환 + 이벤트
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

// 이미지 로드 실패 → 확장자 자동 변경 시도 → 모두 실패시 컨셉카드로
function handleImageError(imgEl, cardId){
  const card = getCard(cardId);
  if(!card) return;
  if(!card.image) { fallbackToConcept(imgEl, card); return; }

  // 원본 확장자 (이미 실패함)
  const m = card.image.match(/\.([^.]+)$/);
  const originalExt = m ? '.' + m[1] : '';
  const base = card.image.replace(/\.[^.]+$/, '');

  // 다른 확장자 변형들 자동 시도
  // (대소문자 구분 + 흔한 확장자들)
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
  $('hub-streak').textContent = state.streak;

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
  const pack = $('opening-pack');
  // 기존 + 새 상태 클래스 모두 리셋
  pack.classList.remove('opening', 'burst', 'is-pressed', 'is-charging', 'is-opening');
  $('card-reveal').className = 'card-reveal';
  $('reveal-info').classList.remove('show');
  $('gacha-instruction').textContent = '탭해서 팩을 열어!';
  // gacha-stage2의 rarity 클래스 리셋
  const stage2 = $('gacha-stage2');
  stage2.className = stage2.className.replace(/\brarity-\d+\b/g, '').trim();
}

function openPack(){
  const pack = $('opening-pack');
  $('gacha-instruction').textContent = '두근두근...';

  // ===== 디자이너 핸드오프 단계 =====
  // 1) Tap/Press (220ms) → 2) Charge (600ms) → 3) Open/Tear (720ms) → 4) Reveal
  pack.classList.add('is-pressed');

  setTimeout(() => {
    pack.classList.remove('is-pressed');
    pack.classList.add('is-charging');
  }, 220);

  setTimeout(() => {
    pack.classList.remove('is-charging');
    pack.classList.add('is-opening');
  }, 820);

  setTimeout(() => {
    // 결과 계산은 기존 그대로
    const result = pullCard();
    showReveal(result);
  }, 1500);
}

function showReveal({ card, isNew }){
  $('gacha-stage1').style.display = 'none';
  $('gacha-stage2').style.display = 'flex';

  // gacha-stage2에 rarity-N 클래스 → CSS의 burst 글로우 효과 발동
  const stage2 = $('gacha-stage2');
  stage2.className = stage2.className.replace(/\brarity-\d+\b/g, '').trim();
  stage2.classList.add('rarity-' + card.stars);

  const reveal = $('card-reveal');
  reveal.className = 'card-reveal'; // 리셋
  $('reveal-content').innerHTML = makeArt(card);
  $('reveal-stars').textContent = '★'.repeat(card.stars);

  // 카드 등장 + rarity glow (디자이너 핸드오프: is-revealing + rarity-N)
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

function setFilter(f){
  collectionFilter = f;
  $$('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === f);
  });
  renderCollection();
}

function renderCollection(){
  $('col-sub').textContent =
    `${ownedCount()} / ${CARDS.length} 종류 · 누적 ${state.totalPulls}회 뽑기 · 최고 ${state.maxStreak}연승`;

  $('col-stats').innerHTML = `
    <div class="chip s5">★5  ${ownedByStar(5)}/${totalByStar(5)}</div>
    <div class="chip s4">★4  ${ownedByStar(4)}/${totalByStar(4)}</div>
    <div class="chip s3">★3  ${ownedByStar(3)}/${totalByStar(3)}</div>
  `;

  const grid = $('col-grid'); grid.innerHTML = '';
  const sorted = [...CARDS].sort((a,b) => b.stars - a.stars || a.id.localeCompare(b.id));

  for(const c of sorted){
    if(collectionFilter !== 'all' && String(c.stars) !== collectionFilter) continue;
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
  $('modal-card-art').innerHTML = makeArt(card);
  $('modal-name').textContent = card.name;
  $('modal-ip').textContent = card.ip;
  $('modal-stars').textContent = '★'.repeat(card.stars);
  $('modal-attr').textContent = `속성: ${ATTR_KR[card.attr]} ${ATTR_EMOJI[card.attr]}`;
  const count = state.inventory[card.id] || 0;
  $('modal-owned').textContent = `보유 ×${count}`;
  $('card-modal').classList.add('show');
}
function closeModal(e){ if(e.target.classList.contains('modal-overlay')) closeModalForce(); }
function closeModalForce(){ $('card-modal').classList.remove('show'); }

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
  $('sel-streak').textContent = state.streak;
  const grid = $('sel-grid');
  const empty = $('sel-empty');

  if(!hasAnyCard()){
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  grid.style.display = 'grid';
  empty.style.display = 'none';
  grid.innerHTML = '';

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
  $('bat-streak').textContent = state.streak;

  $('my-card').innerHTML = `${makeArt(selectedCard)}<div class="stars">${'★'.repeat(selectedCard.stars)}</div>`;
  $('enemy-card').className = 'battle-card back';
  $('enemy-card').innerHTML = '';

  setTimeout(() => {
    $('enemy-card').className = 'battle-card';
    $('enemy-card').innerHTML = `${makeArt(enemyCard)}<div class="stars">${'★'.repeat(enemyCard.stars)}</div>`;
  }, 1200);

  setTimeout(() => {
    $('my-rps').textContent = ATTR_EMOJI[selectedCard.attr];
    $('enemy-rps').textContent = ATTR_EMOJI[enemyCard.attr];
    $('rps-reveal').classList.add('show');
  }, 2000);

  setTimeout(() => {
    $('rps-reveal').classList.remove('show');
    showResult();
  }, 3200);
}

function showResult(){
  const result = judge(selectedCard, enemyCard);
  const { earnedBonus } = applyBattleResult(result);

  const banner = $('result-banner');
  const detail = $('result-detail');

  let bannerText = '', detailText = '';
  if(result === 'win'){
    bannerText = 'WIN!';
    banner.className = 'result-banner win';
    detailText = `<strong>${selectedCard.name}</strong>(${ATTR_KR[selectedCard.attr]}, ${selectedCard.stars}★)이(가)<br>` +
                 `<strong>${enemyCard.name}</strong>(${ATTR_KR[enemyCard.attr]}, ${enemyCard.stars}★)을(를) 격파!<br><br>` +
                 `🔥 <strong>${state.streak}연승</strong>`;
    if(earnedBonus){
      detailText += `<span class="ticket-banner">🎁 10연승 보상! 보너스 가챠 1회 적립!</span>`;
    }
  } else if(result === 'lose'){
    bannerText = 'LOSE...';
    banner.className = 'result-banner lose';
    detailText = `<strong>${enemyCard.name}</strong>에게 패배...<br>연승 끊겼어 😭`;
  } else {
    bannerText = 'DRAW';
    banner.className = 'result-banner draw';
    detailText = `둘 다 <strong>${ATTR_KR[selectedCard.attr]}</strong>, 등급도 <strong>${selectedCard.stars}★</strong>으로 동일<br>` +
                 `무승부! 연승 유지: <strong>${state.streak}</strong>`;
  }
  banner.textContent = bannerText;
  detail.innerHTML = detailText;
  goto('result');
}

// ===== 초기화 =====
function init(){
  loadState();
  startCooldownLoop();
  refreshHub();
}

document.addEventListener('DOMContentLoaded', init);
