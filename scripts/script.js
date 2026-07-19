const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// persisted habits
let habits = JSON.parse(localStorage.getItem('habits') || '[]');

function save() {
  localStorage.setItem('habits', JSON.stringify(habits));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateReadable(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase();
}

function showToast(message) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function renderHabits() {
  const list = document.querySelector('.habits-list');
  list.innerHTML = '';
  habits.forEach(h => {
    const el = document.createElement('div');
    el.className = 'habit-card';
    el.innerHTML = `
      <div class="habit-main">
        <div class="habit-icon">${h.icon || '🔖'}</div>
        <div class="habit-info">
          <div class="habit-name">${h.name}</div>
          <div class="habit-freq">${h.freq}</div>
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

function updateEmptyState() {
  const empty = document.getElementById('emptyState');
  const list = document.querySelector('.habits-list');
  if (!empty || !list) return;
  if (habits.length === 0) {
    empty.classList.add('visible');
    list.style.display = 'none';
  } else {
    empty.classList.remove('visible');
    list.style.display = 'flex';
    renderHabits();
  }
}

const quotes = [
  "Build something small today — consistency beats intensity.",
  "Ship, learn, iterate. The smallest step is still progress.",
  "Make this week count: one habit at a time.",
  "Be kind to your future self — start a streak.",
  "Creativity loves constraints. Try a tiny challenge today."
];

const suggestions = [
  'Read 10 pages',
  '15-min walk',
  '30-min coding',
  'Cold shower',
  '5-minute journaling'
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addHabit(name, opts = {}) {
  if (!name || !name.trim()) return;
  const habit = {
    id: Date.now(),
    name: name.trim(),
    icon: opts.icon || '✨',
    freq: opts.freq || 'daily',
    created: todayKey()
  };
  habits.push(habit);
  save();
  updateEmptyState();
  showToast(`Added "${habit.name}"`);
}

function initSuggestions() {
  const container = document.getElementById('suggestions');
  if (!container) return;
  container.innerHTML = '';
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suggest-btn';
    btn.type = 'button';
    btn.textContent = s;
    btn.addEventListener('click', () => addHabit(s));
    container.appendChild(btn);
  });
}

function init() {
  // date pill
  const dp = document.getElementById('datePill');
  if (dp) dp.textContent = formatDateReadable(new Date());

  // daily quote
  const dq = document.getElementById('dailyQuote');
  if (dq) dq.textContent = pickRandom(quotes);

  // quick suggestions
  initSuggestions();

  // modal open/close
  const open = document.getElementById('openModal');
  const overlay = document.getElementById('modalOverlay');
  const close = document.getElementById('closeModal');
  const saveBtn = document.getElementById('saveHabit');
  const input = document.getElementById('habitName');

  if (open && overlay) {
    open.addEventListener('click', () => overlay.classList.add('open'));
  }
  if (close && overlay) {
    close.addEventListener('click', () => overlay.classList.remove('open'));
  }
  if (saveBtn && input && overlay) {
    saveBtn.addEventListener('click', () => {
      const name = input.value || '';
      if (name.trim()) {
        addHabit(name);
        input.value = '';
        overlay.classList.remove('open');
      } else {
        showToast('Please enter a habit name');
      }
    });
  }

  updateEmptyState();
}

// initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}