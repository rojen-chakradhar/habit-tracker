let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let toastTimeout;

const datePill = document.getElementById('datePill');
const openModalBtn = document.getElementById('openModal');
const closeModalBtn = document.getElementById('closeModal');
const saveHabitBtn = document.getElementById('saveHabit');
const modalOverlay = document.getElementById('modalOverlay');
const habitNameInput = document.getElementById('habitName');
const habitsListContainer = document.querySelector('.habits-list');
const emptyState = document.getElementById('emptyState');
const toast = document.getElementById('toast');

const statTodayProgress = document.getElementById('statTodayProgress');
const statBestStreak = document.getElementById('statBestStreak');
const statWeeklyRate = document.getElementById('statWeeklyRate');

function save() {
  localStorage.setItem('habits', JSON.stringify(habits));
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
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
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
      if (habit.history.includes(todayStr)) {
        completedCount++;
      }
    }
  });
  
  statTodayProgress.textContent = `${completedCount}/${activeCount}`;
  
  let bestStreak = 0;
  habits.forEach(habit => {
    const streak = getHabitStreak(habit);
    if (streak > bestStreak) {
      bestStreak = streak;
    }
  });
  
  statBestStreak.textContent = bestStreak;
  
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
    
  statWeeklyRate.textContent = `${weeklyRate}%`;
}

function toggleHabitDay(habitId, dateStr) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  
  const index = habit.history.indexOf(dateStr);
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

function renderHabits() {
  habitsListContainer.innerHTML = '';
  
  if (habits.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  
  emptyState.classList.remove('visible');
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
      streakSpan.innerHTML = `<i class="ri-fire-line"></i> ${streak}d streak`;
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
      const isCompleted = habit.history.includes(day.dateStr);
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

openModalBtn.addEventListener('click', () => {
  habitNameInput.value = '';
  document.querySelectorAll('.day-select-btn').forEach(btn => btn.classList.add('selected'));
  modalOverlay.classList.add('open');
  setTimeout(() => habitNameInput.focus(), 150);
});

closeModalBtn.addEventListener('click', () => {
  modalOverlay.classList.remove('open');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('open');
  }
});

saveHabitBtn.addEventListener('click', () => {
  const name = habitNameInput.value.trim();
  
  if (!name) {
    showToast('Please enter a habit name!');
    habitNameInput.focus();
    return;
  }
  
  const selectedDays = Array.from(document.querySelectorAll('.day-select-btn.selected'))
    .map(btn => parseInt(btn.dataset.day));
    
  if (selectedDays.length === 0) {
    showToast('Please select at least one day to track!');
    return;
  }
  
  const newHabit = {
    id: 'habit_' + Date.now(),
    name: name,
    trackingDays: selectedDays,
    history: [],
    createdAt: new Date().toISOString()
  };
  
  habits.push(newHabit);
  save();
  updateStats();
  renderHabits();
  modalOverlay.classList.remove('open');
  showToast(`"${name}" added successfully! ✨`);
});

habitNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    saveHabitBtn.click();
  }
});

function init() {
  datePill.textContent = formatPillDate();
  
  const daySelectBtns = document.querySelectorAll('.day-select-btn');
  daySelectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
    });
  });
  
  updateStats();
  renderHabits();
}

window.addEventListener('DOMContentLoaded', init);