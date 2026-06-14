const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let habits = JSON.parse(localStorage.getItem('habits') || '[]')

function save() {
  localStorage.setItem('habits', JSON.stringify(habita))
}

function todayKey() {
  return new Date().toISOString().slice(0,10)
}