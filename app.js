// ===== DATA LAYER =====
const STORAGE_KEYS = {
    staff: 'breakSystem_staff',
    checks: 'breakSystem_checks',
    history: 'breakSystem_history',
};

function loadData(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ===== STATE =====
let staffList = loadData(STORAGE_KEYS.staff) || [];
let breakChecks = loadData(STORAGE_KEYS.checks) || [];
let historyList = loadData(STORAGE_KEYS.history) || [];

function persist() {
    saveData(STORAGE_KEYS.staff, staffList);
    saveData(STORAGE_KEYS.checks, breakChecks);
    saveData(STORAGE_KEYS.history, historyList);
}

// ===== TAB NAVIGATION =====
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const tabIndicator = document.getElementById('tabIndicator');

function switchTab(tabName) {
    tabBtns.forEach((btn, i) => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        if (isActive) {
            tabIndicator.style.transform = `translateX(${i * 100}%)`;
        }
    });

    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });

    // Refresh tab content
    if (tabName === 'roster') renderRoster();
    if (tabName === 'check') renderCheckList();
    if (tabName === 'order') clearOrderResult();
    if (tabName === 'history') renderHistory();
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ===== TAB 1: 名簿管理 =====
const staffNameInput = document.getElementById('staffNameInput');
const addStaffBtn = document.getElementById('addStaffBtn');
const pharmacistListEl = document.getElementById('pharmacistList');
const clerkListEl = document.getElementById('clerkList');
const pharmacistCountEl = document.getElementById('pharmacistCount');
const clerkCountEl = document.getElementById('clerkCount');

function getStaffByRole(role) {
    return staffList.filter(s => s.role === role);
}

function renderRoster() {
    const pharmacists = getStaffByRole('pharmacist');
    const clerks = getStaffByRole('clerk');

    pharmacistCountEl.textContent = pharmacists.length;
    clerkCountEl.textContent = clerks.length;

    pharmacistListEl.innerHTML = pharmacists.map(s => staffItemHTML(s)).join('');
    clerkListEl.innerHTML = clerks.map(s => staffItemHTML(s)).join('');

    // Attach events
    document.querySelectorAll('.edit-staff-btn').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.delete-staff-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteStaff(btn.dataset.id));
    });
}

function staffItemHTML(staff) {
    return `
    <li class="staff-item">
      <span class="name">${escapeHTML(staff.name)}</span>
      <div class="actions">
        <button class="icon-btn edit-staff-btn" data-id="${staff.id}" title="編集">✎</button>
        <button class="icon-btn delete-btn delete-staff-btn" data-id="${staff.id}" title="削除">✕</button>
      </div>
    </li>`;
}

function addStaff() {
    const name = staffNameInput.value.trim();
    if (!name) {
        staffNameInput.focus();
        return;
    }
    const role = document.querySelector('input[name="staffRole"]:checked').value;
    staffList.push({ id: generateId(), name, role });
    persist();
    staffNameInput.value = '';
    staffNameInput.focus();
    renderRoster();
}

function deleteStaff(id) {
    if (!confirm('このスタッフを削除しますか？')) return;
    staffList = staffList.filter(s => s.id !== id);
    breakChecks = breakChecks.filter(cid => cid !== id);
    persist();
    renderRoster();
}

addStaffBtn.addEventListener('click', addStaff);
staffNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addStaff();
});

// ===== EDIT MODAL =====
const editModal = document.getElementById('editModal');
const editNameInput = document.getElementById('editNameInput');
const editStaffIdInput = document.getElementById('editStaffId');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

function openEditModal(id) {
    const staff = staffList.find(s => s.id === id);
    if (!staff) return;
    editStaffIdInput.value = id;
    editNameInput.value = staff.name;
    document.querySelector(`input[name="editRole"][value="${staff.role}"]`).checked = true;
    editModal.classList.add('show');
    editNameInput.focus();
}

function closeEditModal() {
    editModal.classList.remove('show');
}

saveEditBtn.addEventListener('click', () => {
    const id = editStaffIdInput.value;
    const name = editNameInput.value.trim();
    if (!name) return;
    const role = document.querySelector('input[name="editRole"]:checked').value;
    const staff = staffList.find(s => s.id === id);
    if (staff) {
        staff.name = name;
        staff.role = role;
        persist();
        renderRoster();
    }
    closeEditModal();
});

cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => {
    if (e.target === editModal) closeEditModal();
});

// ===== TAB 2: 休憩チェック =====
const pharmacistCheckListEl = document.getElementById('pharmacistCheckList');
const clerkCheckListEl = document.getElementById('clerkCheckList');
const pharmacistCheckCountEl = document.getElementById('pharmacistCheckCount');
const clerkCheckCountEl = document.getElementById('clerkCheckCount');
const checkAllBtn = document.getElementById('checkAllBtn');
const uncheckAllBtn = document.getElementById('uncheckAllBtn');

function renderCheckList() {
    const pharmacists = getStaffByRole('pharmacist');
    const clerks = getStaffByRole('clerk');

    const checkedPharmacists = pharmacists.filter(s => breakChecks.includes(s.id));
    const checkedClerks = clerks.filter(s => breakChecks.includes(s.id));

    pharmacistCheckCountEl.textContent = `${checkedPharmacists.length}/${pharmacists.length}`;
    clerkCheckCountEl.textContent = `${checkedClerks.length}/${clerks.length}`;

    pharmacistCheckListEl.innerHTML = pharmacists.map(s => checkItemHTML(s)).join('');
    clerkCheckListEl.innerHTML = clerks.map(s => checkItemHTML(s)).join('');

    // Attach events
    document.querySelectorAll('.check-item').forEach(item => {
        item.addEventListener('click', () => toggleCheck(item.dataset.id));
    });
}

function checkItemHTML(staff) {
    const isChecked = breakChecks.includes(staff.id);
    return `
    <li class="check-item ${isChecked ? 'checked' : ''}" data-id="${staff.id}">
      <span class="cyber-checkbox">${isChecked ? '✓' : ''}</span>
      <span class="name">${escapeHTML(staff.name)}</span>
    </li>`;
}

function toggleCheck(id) {
    if (breakChecks.includes(id)) {
        breakChecks = breakChecks.filter(cid => cid !== id);
    } else {
        breakChecks.push(id);
    }
    persist();
    renderCheckList();
}

checkAllBtn.addEventListener('click', () => {
    breakChecks = staffList.map(s => s.id);
    persist();
    renderCheckList();
});

uncheckAllBtn.addEventListener('click', () => {
    breakChecks = [];
    persist();
    renderCheckList();
});

// ===== TAB 3: 順番表示 =====
const generateBtn = document.getElementById('generateBtn');
const orderResult = document.getElementById('orderResult');
const pharmacistOrderListEl = document.getElementById('pharmacistOrderList');
const clerkOrderListEl = document.getElementById('clerkOrderList');

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateOrder() {
    const checkedStaff = staffList.filter(s => breakChecks.includes(s.id));
    if (checkedStaff.length === 0) {
        alert('休憩チェックされているスタッフがいません。\n「休憩チェック」タブでチェックしてください。');
        return;
    }

    const pharmacists = shuffleArray(checkedStaff.filter(s => s.role === 'pharmacist'));
    const clerks = shuffleArray(checkedStaff.filter(s => s.role === 'clerk'));

    // Display results
    orderResult.style.display = 'block';

    pharmacistOrderListEl.innerHTML = pharmacists.length > 0
        ? pharmacists.map((s, i) => orderItemHTML(s, i + 1)).join('')
        : '<li class="empty-message">該当なし</li>';

    clerkOrderListEl.innerHTML = clerks.length > 0
        ? clerks.map((s, i) => orderItemHTML(s, i + 1)).join('')
        : '<li class="empty-message">該当なし</li>';

    // Save to history
    const entry = {
        id: generateId(),
        timestamp: new Date().toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
        pharmacists: pharmacists.map(s => s.name),
        clerks: clerks.map(s => s.name),
    };

    historyList.unshift(entry);
    persist();
}

function orderItemHTML(staff, num) {
    return `
    <li class="order-item">
      <span class="order-number">${num}</span>
      <span class="name">${escapeHTML(staff.name)}</span>
    </li>`;
}

function clearOrderResult() {
    orderResult.style.display = 'none';
    pharmacistOrderListEl.innerHTML = '';
    clerkOrderListEl.innerHTML = '';
}

generateBtn.addEventListener('click', generateOrder);

// ===== TAB 4: 履歴 =====
const historyListEl = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function renderHistory() {
    if (historyList.length === 0) {
        historyListEl.innerHTML = '<p class="empty-message">履歴がありません</p>';
        return;
    }

    historyListEl.innerHTML = historyList.map(entry => `
    <div class="history-entry">
      <div class="history-timestamp">${escapeHTML(entry.timestamp)}</div>
      <div class="history-columns">
        <div>
          <div class="history-col-title pharmacist">💊 薬剤師</div>
          <ol class="history-names">
            ${entry.pharmacists.length > 0
            ? entry.pharmacists.map(n => `<li>${escapeHTML(n)}</li>`).join('')
            : '<li style="color:var(--text-secondary)">なし</li>'}
          </ol>
        </div>
        <div>
          <div class="history-col-title clerk">📋 事務</div>
          <ol class="history-names">
            ${entry.clerks.length > 0
            ? entry.clerks.map(n => `<li>${escapeHTML(n)}</li>`).join('')
            : '<li style="color:var(--text-secondary)">なし</li>'}
          </ol>
        </div>
      </div>
    </div>
  `).join('');
}

clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('すべての履歴を削除しますか？')) return;
    historyList = [];
    persist();
    renderHistory();
});

// ===== UTILS =====
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== INIT =====
renderRoster();
