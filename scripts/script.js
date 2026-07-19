const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// persisted habits
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let badges = JSON.parse(localStorage.getItem('badges') || '[]');

function save() {
  localStorage.setItem('habits', JSON.stringify(habits));
}
function saveBadges() {
  localStorage.setItem('badges', JSON.stringify(badges));
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

// installed badges (all possible)
const allBadges = [
  { id: 'first', name: 'First Habit', desc: 'Added your first habit', icon: '🏅' },
  { id: 'collector', name: 'Habit Collector', desc: 'Added 5 habits', icon: '🎖️' }
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function awardBadge(b) {
  if (badges.find(x => x.id === b.id)) return false; // already earned
  const earned = { ...b, earnedAt: new Date().toISOString() };
  badges.push(earned);
  saveBadges();
  renderBadges();
  showToast(`Badge earned: ${b.name}`);
  launchConfetti();
  return true;
}

function awardBadgeIfNeeded() {
  // simple rules: first habit, five habits
  if (habits.length === 1) awardBadge(allBadges.find(b => b.id === 'first'));
  if (habits.length === 5) awardBadge(allBadges.find(b => b.id === 'collector'));
}

function renderBadges() {
  const container = document.getElementById('badgesList');
  if (!container) return;
  container.innerHTML = '';
  allBadges.forEach(b => {
    const owned = !!badges.find(x => x.id === b.id);
    const el = document.createElement('div');
    el.className = 'badge-card' + (owned ? '' : ' locked');
    el.innerHTML = `
      <div class="badge-icon">${b.icon}</div>
      <div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>
    `;
    container.appendChild(el);
  });
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
  // check for badges after adding
  awardBadgeIfNeeded();
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

// --- lightweight confetti ---
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // size canvas
  function fit() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  fit();
  window.addEventListener('resize', fit);

  const colors = ['#f94144', '#f3722c', '#f8961e', '#90be6d', '#577590', '#4d908e', '#277da1'];
  const particles = [];
  const count = 80;
  const now = Date.now();
  const duration = 1600;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 6 + 2,
      r: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3
    });
  }

  function draw() {
    const t = Date.now();
    const dt = t - now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy + 0.5 * (dt / duration); // slight gravity
      p.vy += 0.02; // gravity
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r * 0.6);
      ctx.restore();
    });

    if (dt < duration) {
      requestAnimationFrame(draw);
    } else {
      // clear after animation
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 200);
      window.removeEventListener('resize', fit);
    }
  }
  requestAnimationFrame(draw);
}

function init() {
  // date pill
  const dp = document.getElementById('datePill');
  if (dp) dp.textContent = formatDateReadable(new Date());

  // daily quote
  const dq = document.getElementById('dailyQuote');
  if (dq) dq.textContent = pickRandom(quotes);

  // load badges & quick suggestions
  renderBadges();
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
  renderBadges();
}

// initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}