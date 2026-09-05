/**
 * Formats a date for use in the API.
 * @param {*} date 
 * @returns 
 */
function formatForApi(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Formats a date for display in the UI.
 * @param {*} date 
 * @returns 
 */
function formatForDisplay(date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return isToday ? `${label} (Today)` : label;
}

/**
 * Checks if a game is live or final.
 * @param {*} statusText 
 * @returns 
 */
function isLiveOrFinal(statusText) {
  const lower = (statusText || '').toLowerCase();
  return lower.includes('final') || lower.includes('in progress') || lower.includes('top') || lower.includes('bot') || lower.includes('half') || lower.includes('end of') || lower.includes('delay');
}

/**
 * Creates a status badge for the given status text.
 * @param {*} statusText 
 * @returns 
 */
function statusBadge(statusText) {
  const lower = statusText.toLowerCase();
  let cls = 'bg-secondary';
  if (lower.includes('final')) cls = 'bg-dark';
  else if (lower.includes('in progress') || lower.includes('top') || lower.includes('bot')) cls = 'bg-success';
  else if (lower.includes(':') || lower.includes('am') || lower.includes('pm')) cls = 'bg-primary';
  return `<span class="badge ${cls}">${statusText}</span>`;
}

/**
 * Escapes HTML characters in a string.
 * @param {*} value 
 * @returns 
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

/**
 * formats the odds
 * @param {*} value 
 * @returns 
 */
function formatAmericanOdds(value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value);
  return /^[-+]/.test(text) ? text : `+${text}`;
}

/**
 * Formats a spread with its corresponding odds.
 * @param {*} value 
 * @param {*} price 
 * @returns 
 */
function formatSpread(value, price) {
  if (value === undefined || value === null || value === '') return '—';
  const number = Number(value);
  const spread = Number.isFinite(number) ? `${number > 0 ? '+' : ''}${number}` : String(value);
  const odds = formatAmericanOdds(price);
  return odds ? `${spread} (${odds})` : spread;
}

/**
 * Normalizes a sportsbook name for consistent comparison.
 * @param {*} name 
 * @returns 
 */
function normalizeSportsbookName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}