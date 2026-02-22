/* ============================================================
   BREAK//ORDER — Application Logic
   ============================================================ */

// ===== AMBIENT BACKGROUND ====================================
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// Subtle floating dots with soft connections
const dots = [];
const DOT_COUNT = 45;

class Dot {
    constructor() { this.init(); }
    init() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.r = Math.random() * 1.2 + .4;
        this.vx = (Math.random() - .5) * .18;
        this.vy = (Math.random() - .5) * .18;
        this.alpha = Math.random() * .3 + .08;
        this.hue = Math.random() > .75 ? 330 : 185;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -20 || this.x > canvas.width + 20 ||
            this.y < -20 || this.y > canvas.height + 20) this.init();
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue},80%,65%,${this.alpha})`;
        ctx.fill();
    }
}

for (let i = 0; i < DOT_COUNT; i++) dots.push(new Dot());

function renderBg() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach(d => { d.update(); d.draw(); });
    // connections
    for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
            const dx = dots[i].x - dots[j].x;
            const dy = dots[i].y - dots[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                ctx.beginPath();
                ctx.moveTo(dots[i].x, dots[i].y);
                ctx.lineTo(dots[j].x, dots[j].y);
                ctx.strokeStyle = `rgba(34,211,238,${.03 * (1 - dist / 100)})`;
                ctx.lineWidth = .4;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(renderBg);
}
renderBg();

// ===== LIVE CLOCK ============================================
const clockEl = document.getElementById('liveClock');
function tickClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

// ===== DATA LAYER ============================================
const KEYS = {
    staff: 'bo_staff',
    checks: 'bo_checks',
    history: 'bo_history',
};

const load = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

let staff = load(KEYS.staff) || [];
let checks = load(KEYS.checks) || [];
let history = load(KEYS.history) || [];

function persist() { save(KEYS.staff, staff); save(KEYS.checks, checks); save(KEYS.history, history); }

// ===== TABS ==================================================
const tabBtns = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const tabInk = document.getElementById('tabInk');

function switchTab(name) {
    tabBtns.forEach((b, i) => {
        const on = b.dataset.tab === name;
        b.classList.toggle('active', on);
        if (on) tabInk.style.transform = `translateX(${i * 100}%)`;
    });
    panels.forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));

    if (name === 'roster') renderRoster();
    if (name === 'check') renderChecks();
    if (name === 'history') renderHistory();
}

tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

// ===== ROSTER ================================================
const nameInput = document.getElementById('staffNameInput');
const addBtn = document.getElementById('addStaffBtn');
const pharmaList = document.getElementById('pharmacistList');
const clerkList = document.getElementById('clerkList');
const pharmaCount = document.getElementById('pharmacistCount');
const clerkCount = document.getElementById('clerkCount');
const pharmaEmpty = document.getElementById('pharmacistEmpty');
const clerkEmpty = document.getElementById('clerkEmpty');

const byRole = r => staff.filter(s => s.role === r);

function renderRoster() {
    const ph = byRole('pharmacist'), cl = byRole('clerk');
    pharmaCount.textContent = ph.length;
    clerkCount.textContent = cl.length;
    pharmaList.innerHTML = ph.map((s, i) => rosterRow(s, i)).join('');
    clerkList.innerHTML = cl.map((s, i) => rosterRow(s, i)).join('');
    pharmaEmpty.classList.toggle('show', !ph.length);
    clerkEmpty.classList.toggle('show', !cl.length);

    document.querySelectorAll('.edit-btn').forEach(b =>
        b.addEventListener('click', () => openEdit(b.dataset.id)));
    document.querySelectorAll('.del-btn').forEach(b =>
        b.addEventListener('click', () => delStaff(b.dataset.id)));
}

function rosterRow(s, i) {
    return `<li class="staff-row" style="animation-delay:${i * .03}s">
    <span class="name">${esc(s.name)}</span>
    <span class="row-actions">
      <button class="ico-btn edit-btn" data-id="${s.id}" title="編集">✎</button>
      <button class="ico-btn del del-btn" data-id="${s.id}" title="削除">✕</button>
    </span>
  </li>`;
}

function addStaff() {
    const n = nameInput.value.trim();
    if (!n) { nameInput.focus(); return; }
    const r = document.querySelector('[name=staffRole]:checked').value;
    staff.push({ id: uid(), name: n, role: r });
    persist();
    nameInput.value = '';
    nameInput.focus();
    renderRoster();
}

function delStaff(id) {
    if (!confirm('このスタッフを削除しますか？')) return;
    staff = staff.filter(s => s.id !== id);
    checks = checks.filter(c => c !== id);
    persist();
    renderRoster();
}

addBtn.addEventListener('click', addStaff);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addStaff(); });

// ===== EDIT MODAL ============================================
const modal = document.getElementById('editModal');
const editIdEl = document.getElementById('editStaffId');
const editNameEl = document.getElementById('editNameInput');
const saveBtn = document.getElementById('saveEditBtn');
const cancelBtn = document.getElementById('cancelEditBtn');
const closeBtn = document.getElementById('modalCloseBtn');

function openEdit(id) {
    const s = staff.find(x => x.id === id);
    if (!s) return;
    editIdEl.value = id;
    editNameEl.value = s.name;
    document.querySelector(`[name=editRole][value=${s.role}]`).checked = true;
    modal.classList.add('show');
    setTimeout(() => editNameEl.focus(), 80);
}

function closeModal() { modal.classList.remove('show'); }

saveBtn.addEventListener('click', () => {
    const id = editIdEl.value, n = editNameEl.value.trim();
    if (!n) return;
    const r = document.querySelector('[name=editRole]:checked').value;
    const s = staff.find(x => x.id === id);
    if (s) { s.name = n; s.role = r; persist(); renderRoster(); }
    closeModal();
});

cancelBtn.addEventListener('click', closeModal);
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

// ===== CHECKS ================================================
const phCheckList = document.getElementById('pharmacistCheckList');
const clCheckList = document.getElementById('clerkCheckList');
const phCheckCount = document.getElementById('pharmacistCheckCount');
const clCheckCount = document.getElementById('clerkCheckCount');
const checkAllBtn = document.getElementById('checkAllBtn');
const uncheckBtn = document.getElementById('uncheckAllBtn');

function renderChecks() {
    const ph = byRole('pharmacist'), cl = byRole('clerk');
    const phOn = ph.filter(s => checks.includes(s.id));
    const clOn = cl.filter(s => checks.includes(s.id));
    phCheckCount.textContent = `${phOn.length}/${ph.length}`;
    clCheckCount.textContent = `${clOn.length}/${cl.length}`;
    phCheckList.innerHTML = ph.map((s, i) => chkRow(s, i)).join('');
    clCheckList.innerHTML = cl.map((s, i) => chkRow(s, i)).join('');
    document.querySelectorAll('.chk-row').forEach(el =>
        el.addEventListener('click', () => toggle(el.dataset.id)));
}

function chkRow(s, i) {
    const on = checks.includes(s.id);
    return `<li class="chk-row ${on ? 'on' : ''}" data-id="${s.id}" style="animation-delay:${i * .03}s">
    <span class="chk-box">${on ? '✓' : ''}</span>
    <span class="name">${esc(s.name)}</span>
  </li>`;
}

function toggle(id) {
    checks = checks.includes(id) ? checks.filter(c => c !== id) : [...checks, id];
    persist();
    renderChecks();
}

checkAllBtn.addEventListener('click', () => { checks = staff.map(s => s.id); persist(); renderChecks(); });
uncheckBtn.addEventListener('click', () => { checks = []; persist(); renderChecks(); });

// ===== ORDER =================================================
const genBtn = document.getElementById('generateBtn');
const genHint = document.getElementById('genHint');
const orderResult = document.getElementById('orderResult');
const orderStamp = document.getElementById('orderStamp');
const phOrderList = document.getElementById('pharmacistOrderList');
const clOrderList = document.getElementById('clerkOrderList');

function shuffle(a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function generate() {
    const sel = staff.filter(s => checks.includes(s.id));
    if (!sel.length) {
        genHint.textContent = '⚠ チェック済みスタッフがいません';
        genHint.style.color = 'var(--red)';
        setTimeout(() => { genHint.textContent = ''; genHint.style.color = ''; }, 2500);
        return;
    }

    const ph = shuffle(sel.filter(s => s.role === 'pharmacist'));
    const cl = shuffle(sel.filter(s => s.role === 'clerk'));
    const ts = new Date().toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    orderResult.style.display = 'block';
    orderStamp.textContent = `Generated: ${ts}`;

    phOrderList.innerHTML = ph.length
        ? ph.map((s, i) => `<li class="order-row" style="animation-delay:${i * .07}s">
        <span class="order-num">${i + 1}</span><span class="name">${esc(s.name)}</span></li>`).join('')
        : '<li class="col-empty show">該当なし</li>';

    clOrderList.innerHTML = cl.length
        ? cl.map((s, i) => `<li class="order-row" style="animation-delay:${i * .07}s">
        <span class="order-num">${i + 1}</span><span class="name">${esc(s.name)}</span></li>`).join('')
        : '<li class="col-empty show">該当なし</li>';

    history.unshift({ id: uid(), timestamp: ts, pharmacists: ph.map(s => s.name), clerks: cl.map(s => s.name) });
    persist();

    genHint.textContent = '✓ 生成完了 — 履歴に保存しました';
    genHint.style.color = 'var(--green)';
    setTimeout(() => { genHint.textContent = ''; genHint.style.color = ''; }, 2500);
}

function hideOrder() { orderResult.style.display = 'none'; }

genBtn.addEventListener('click', generate);

// ===== HISTORY ===============================================
const histListEl = document.getElementById('historyList');
const clearBtn = document.getElementById('clearHistoryBtn');

function renderHistory() {
    if (!history.length) {
        histListEl.innerHTML = `<div class="empty-state">
      <div class="empty-glyph">⏳</div>
      <p class="empty-msg">履歴がありません</p></div>`;
        return;
    }
    histListEl.innerHTML = history.map((e, i) => `
    <div class="history-card" style="animation-delay:${i * .04}s">
      <div class="hist-time">${esc(e.timestamp)}</div>
      <div class="hist-cols">
        <div>
          <div class="hist-col-head ph">💊 薬剤師</div>
          <ol class="hist-names">${e.pharmacists.length
            ? e.pharmacists.map(n => `<li>${esc(n)}</li>`).join('')
            : '<li style="color:var(--text-3)">なし</li>'}</ol>
        </div>
        <div>
          <div class="hist-col-head ck">📋 事務</div>
          <ol class="hist-names">${e.clerks.length
            ? e.clerks.map(n => `<li>${esc(n)}</li>`).join('')
            : '<li style="color:var(--text-3)">なし</li>'}</ol>
        </div>
      </div>
    </div>`).join('');
}

clearBtn.addEventListener('click', () => {
    if (!confirm('すべての履歴を削除しますか？')) return;
    history = [];
    persist();
    renderHistory();
});

// ===== INIT ==================================================
renderRoster();
