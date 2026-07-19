// Unified script: base app + badges + confetti
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let badges = JSON.parse(localStorage.getItem('badges') || '[]');

function save() {
  localStorage.setItem('habits', JSON.stringify(habits));
}
function saveBadges() {
  localStorage.setItem('badges', JSON.stringify(badges));
}

function getLocalYMD(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPillDate() {
  const d = new Date();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
}

function getCurrentWeekDays() {
  const list = [];
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - currentDayOfWeek + i);
    
    list.push({
      dateStr: getLocalYMD(d),
      dayLabel: days[d.getDay()],
      dateNum: d.getDate(),
      dayOfWeek: d.getDay(),
      isFuture: getLocalYMD(d) > getLocalYMD(today)
    });
  }
  return list;
}

function isHabitScheduled(habit, dayOfWeek) {
  if (habit.trackingDays) {
    return habit.trackingDays.includes(dayOfWeek);
  }
  if (habit.freq === 'daily') return true;
  if (habit.freq === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (habit.freq === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  return true;
}

function getFrequencyLabel(trackingDays) {
  if (!trackingDays || trackingDays.length === 0) return 'no days';
  if (trackingDays.length === 7) return 'daily';
  
  const weekdays = [1, 2, 3, 4, 5];
  const weekends = [0, 6];
  
  const hasAllWeekdays = weekdays.every(d => trackingDays.includes(d)) && weekdays.length === trackingDays.length;
  if (hasAllWeekdays) return 'weekdays';
  
  const hasAllWeekends = weekends.every(d => trackingDays.includes(d)) && weekends.length === trackingDays.length;
  if (hasAllWeekends) return 'weekends';
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sortedDays = [...trackingDays].sort((a, b) => a - b);
  return sortedDays.map(d => dayNames[d]).join(', ');
}

function showToast(message) {
  clearTimeout(window._toastTimeout);
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  window._toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2500);
}

function getHabitStreak(habit) {
  const history = new Set(habit.history || []);
  if (history.size === 0) return 0;

  let streak = 0;
  let checkDate = new Date();
  const todayStr = getLocalYMD(checkDate);
  
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalYMD(yesterday);

  if (!history.has(todayStr) && !history.has(yesterdayStr)) {
    return 0;
  }

  let startCheck = history.has(todayStr) ? checkDate : yesterday;

  while (true) {
    const checkStr = getLocalYMD(startCheck);
    
    if (history.has(checkStr)) {
      streak++;
    } else {
      const dayOfWeek = startCheck.getDay();
      if (isHabitScheduled(habit, dayOfWeek)) {
        break;
      }
    }
    
    startCheck.setDate(startCheck.getDate() - 1);
    if (streak > 3650) break;
  }

  return streak;
}

function updateStats() {
  const todayStr = getLocalYMD();
  const todayDayOfWeek = new Date().getDay();
  
  let activeCount = 0;
  let completedCount = 0;
  
  habits.forEach(habit => {
    if (isHabitScheduled(habit, todayDayOfWeek)) {
      activeCount++;
      if ((habit.history || []).includes(todayStr)) {
        completedCount++;
      }
    }
  });
  
  const statToday = document.getElementById('stat-Progress') || document.getElementById('statTodayProgress');
  const statBest = document.getElementById('statBestStreak');
  const statWeekly = document.getElementById('statWeeklyRate');
  if (statToday) statToday.textContent = `${completedCount}/${activeCount}`;
  
  let bestStreak = 0;
  habits.forEach(habit => {
    const streak = getHabitStreak(habit);
    if (streak > bestStreak) {
      bestStreak = streak;
    }
  });
  
  if (statBest) statBest.textContent = bestStreak;
  
  const currentWeek = getCurrentWeekDays();
  let totalScheduledOccurrences = 0;
  let totalCompletions = 0;
  
  habits.forEach(habit => {
    const historySet = new Set(habit.history || []);
    currentWeek.forEach(day => {
      if (!day.isFuture && isHabitScheduled(habit, day.dayOfWeek)) {
        totalScheduledOccurrences++;
        if (historySet.has(day.dateStr)) {
          totalCompletions++;
        }
      }
    });
  });
  
  const weeklyRate = totalScheduledOccurrences > 0 
    ? Math.round((totalCompletions / totalScheduledOccurrences) * 100) 
    : 0;
    
  if (statWeekly) statWeekly.textContent = `${weeklyRate}%`;
}

function toggleHabitDay(habitId, dateStr) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  
  const index = (habit.history || []).indexOf(dateStr);
  const todayStr = getLocalYMD();
  
  if (index > -1) {
    habit.history.splice(index, 1);
    save();
    updateStats();
    renderHabits();
    if (dateStr === todayStr) {
      showToast(`Marked "${habit.name}" incomplete for today.`);
    }
  } else {
    habit.history = habit.history || [];
    habit.history.push(dateStr);
    save();
    updateStats();
    renderHabits();
    
    if (dateStr === todayStr) {
      const currentStreak = getHabitStreak(habit);
      if (currentStreak > 0) {
        showToast(`Keep it up! "${habit.name}" completed! Streak: ${currentStreak} days 🔥`);
      } else {
        showToast(`"${habit.name}" completed!`);
      }
    } else {
      showToast(`Updated history for "${habit.name}".`);
    }
  }
}

function deleteHabit(habitId) {
  const habitIndex = habits.findIndex(h => h.id === habitId);
  if (habitIndex === -1) return;
  
  const habitName = habits[habitIndex].name;
  
  if (confirm(`Are you sure you want to delete "${habitName}"?`)) {
    habits.splice(habitIndex, 1);
    save();
    updateStats();
    renderHabits();
    showToast(`"${habitName}" was deleted.`);
  }
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

function renderHabits() {
  const habitsListContainer = document.querySelector('.habits-list');
  const emptyState = document.getElementById('emptyState');
  habitsListContainer.innerHTML = '';
  
  if (habits.length === 0) {
    if (emptyState) emptyState.classList.add('visible');
    return;
  }
  
  if (emptyState) emptyState.classList.remove('visible');
  const currentWeek = getCurrentWeekDays();
  
  habits.forEach(habit => {
    const streak = getHabitStreak(habit);
    const card = document.createElement('div');
    card.className = 'habit-card';
    
    const header = document.createElement('div');
    header.className = 'habit-header';
    
    const infoGroup = document.createElement('div');
    infoGroup.className = 'habit-info-group';
    
    const details = document.createElement('div');
    details.className = 'habit-details';
    
    const name = document.createElement('div');
    name.className = 'habit-name';
    name.textContent = habit.name;
    
    const meta = document.createElement('div');
    meta.className = 'habit-meta';
    
    const freqSpan = document.createElement('span');
    const trackingDays = habit.trackingDays || (habit.freq === 'weekdays' ? [1,2,3,4,5] : (habit.freq === 'weekends' ? [0,6] : [0,1,2,3,4,5,6]));
    freqSpan.textContent = getFrequencyLabel(trackingDays);
    meta.appendChild(freqSpan);
    
    if (streak > 0) {
      const divider = document.createElement('div');
      divider.className = 'habit-meta-divider';
      meta.appendChild(divider);
      
      const streakSpan = document.createElement('span');
      streakSpan.className = 'habit-streak';
      streakSpan.innerHTML = `<i class=\"ri-fire-line\"></i> ${streak}d streak`;
      meta.appendChild(streakSpan);
    }
    
    details.appendChild(name);
    details.appendChild(meta);
    infoGroup.appendChild(details);
    
    const actions = document.createElement('div');
    actions.className = 'habit-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.title = 'Delete Habit';
    deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    deleteBtn.addEventListener('click', () => deleteHabit(habit.id));
    
    actions.appendChild(deleteBtn);
    header.appendChild(infoGroup);
    header.appendChild(actions);
    card.appendChild(header);
    
    const historyGrid = document.createElement('div');
    historyGrid.className = 'habit-history';
    
    currentWeek.forEach(day => {
      const isCompleted = (habit.history || []).includes(day.dateStr);
      const isScheduled = isHabitScheduled(habit, day.dayOfWeek);
      
      const dayCol = document.createElement('div');
      dayCol.className = 'history-day';
      
      const label = document.createElement('div');
      label.className = 'day-label';
      label.textContent = day.dayLabel;
      
      const bubble = document.createElement('div');
      bubble.className = 'day-bubble';
      bubble.textContent = day.dateNum;
      
      if (isCompleted) {
        bubble.classList.add('completed');
      }
      
      if (day.isFuture) {
        bubble.classList.add('disabled');
        bubble.title = 'Future day';
      } else if (!isScheduled) {
        bubble.classList.add('not-scheduled');
        bubble.title = 'Not scheduled for this day';
      } else {
        bubble.title = isCompleted ? 'Completed' : 'Mark complete';
      }
      
      if (!day.isFuture) {
        bubble.addEventListener('click', () => {
          toggleHabitDay(habit.id, day.dateStr);
        });
      }
      
      const dateText = document.createElement('div');
      dateText.className = 'day-date';
      
      if (day.dateStr === getLocalYMD()) {
        label.style.color = 'var(--primary)';
        label.style.fontWeight = 'bold';
        dateText.textContent = 'today';
        dateText.style.color = 'var(--primary)';
        dateText.style.fontWeight = '600';
      } else {
        dateText.textContent = day.dateStr.slice(5);
      }
      
      dayCol.appendChild(label);
      dayCol.appendChild(bubble);
      dayCol.appendChild(dateText);
      historyGrid.appendChild(dayCol);
    });
    
    card.appendChild(historyGrid);
    habitsListContainer.appendChild(card);
  });
}

// small utilities / UI data
function todayKey() { return getLocalYMD(); }

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

const allBadges = [
  { id: 'first', name: 'First Habit', desc: 'Added your first habit', icon: '🏅' },
  { id: 'collector', name: 'Habit Collector', desc: 'Added 5 habits', icon: '🎖️' }
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function awardBadge(b) {
  if (badges.find(x => x.id === b.id)) return false;
  const earned = { ...b, earnedAt: new Date().toISOString() };
  badges.push(earned);
  saveBadges();
  renderBadges();
  showToast(`Badge earned: ${b.name}`);
  launchConfetti();
  return true;
}

function awardBadgeIfNeeded() {
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
    id: 'habit_' + Date.now(),
    name: name.trim(),
    trackingDays: opts.trackingDays || (opts.freq ? (opts.freq === 'weekdays' ? [1,2,3,4,5] : (opts.freq === 'weekends' ? [0,6] : [0,1,2,3,4,5,6])) : [0,1,2,3,4,5,6]),
    history: [],
    createdAt: new Date().toISOString()
  };
  habits.push(habit);
  save();
  updateStats();
  renderHabits();
  showToast(`Added "${habit.name}"`);
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
  function fit() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
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
      p.y += p.vy + 0.5 * (dt / duration);
      p.vy += 0.02;
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
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 200);
      window.removeEventListener('resize', fit);
    }
  }
  requestAnimationFrame(draw);
}

function init() {
  const dp = document.getElementById('datePill');
  if (dp) dp.textContent = formatPillDate();

  const dq = document.getElementById('dailyQuote');
  if (dq) dq.textContent = pickRandom(quotes);

  renderBadges();
  initSuggestions();

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
        const selected = Array.from(document.querySelectorAll('.day-select-btn.selected')).map(b => parseInt(b.dataset.day));
        if (selected && selected.length > 0) {
          addHabit(name, { trackingDays: selected });
        } else {
          addHabit(name);
        }
        input.value = '';
        overlay.classList.remove('open');
      } else {
        showToast('Please enter a habit name');
      }
    });
  }

  updateStats();
  renderHabits();
  renderBadges();
}

window.addEventListener('DOMContentLoaded', init);
