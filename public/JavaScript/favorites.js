// This file manages the user's favorite teams in localStorage. It stores a set of "league:teamId" keys, and optionally richer team details for display purposes.
const FAVORITES_STORAGE_KEY = 'sportsApp.favoriteTeams';

/**
 * Generates a unique key for a team based on its league and team ID.
 * @param {string} league - The league identifier (e.g., 'mlb', 'nba').
 * @param {string} teamId - The unique team identifier.
 * @returns {string} A string key in the format "league:teamId".
 */
function favoriteKey(league, teamId) {
  return `${league}:${teamId}`;
}

/**
 * @returns {Set<string>} Set of "league:teamId" keys.
 */
function getFavoriteKeys() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    console.error('Error reading favorites from localStorage:', err);
    return new Set();
  }
}

/**
 * Saves the set of favorite keys to localStorage.
 * @param {Set<string>} keysSet 
 */
function saveFavoriteKeys(keysSet) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...keysSet]));
  } catch (err) {
    console.error('Error saving favorites to localStorage:', err);
  }
}

/**
 * Retrieves the details of all favorite teams from localStorage.
 * @returns {Array<{league: string, teamId: string, name: string, logo: string}>}
 * 
 */
function getFavoriteTeamDetails() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY + '.details');
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.values(parsed);
  } catch (err) {
    console.error('Error reading favorite team details:', err);
    return [];
  }
}

/**
 * Saves the details of a favorite team to localStorage.
 * @param {string} key - The favorite key (e.g., "league:teamId").
 * @param {{league: string, teamId: string, name: string, logo: string}} detail - The team details.
 */
function saveFavoriteTeamDetail(key, detail) {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY + '.details');
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = detail;
    localStorage.setItem(FAVORITES_STORAGE_KEY + '.details', JSON.stringify(parsed));
  } catch (err) {
    console.error('Error saving favorite team detail:', err);
  }
}

/**
 * Removes the details of a favorite team from localStorage.
 * @param {string} key - The favorite key (e.g., "league:teamId").
 */
function removeFavoriteTeamDetail(key) {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY + '.details');
    const parsed = raw ? JSON.parse(raw) : {};
    delete parsed[key];
    localStorage.setItem(FAVORITES_STORAGE_KEY + '.details', JSON.stringify(parsed));
  } catch (err) {
    console.error('Error removing favorite team detail:', err);
  }
}

/**
 * Checks if a team is favorited.
 * @param {string} league 
 * @param {string} teamId 
 * @returns {boolean}
 */
function isFavoriteTeam(league, teamId) {
  if (!teamId) return false;
  return getFavoriteKeys().has(favoriteKey(league, teamId));
}

/**
 * Toggles a team's favorite status and returns the new state.
 *
 * @param {string} league
 * @param {string} teamId
 * @param {{name: string, logo: string}} [detail] - Stored alongside the
 *   key so the UI can list favorite teams without a network round trip.
 * @returns {boolean} True if the team is now favorited, false if removed.
 */
function toggleFavoriteTeam(league, teamId, detail) {
  if (!teamId) return false;
  const key = favoriteKey(league, teamId);
  const keys = getFavoriteKeys();

  if (keys.has(key)) {
    keys.delete(key);
    saveFavoriteKeys(keys);
    removeFavoriteTeamDetail(key);
    return false;
  }

  keys.add(key);
  saveFavoriteKeys(keys);
  if (detail) saveFavoriteTeamDetail(key, { league, teamId, ...detail });
  return true;
}

/**
 * Filters a combined multi-league game list down to games involving at
 * least one favorited team.
 *
 * @param {Array<Object>} games - Games with `league`, `homeTeamId`, `awayTeamId`.
 * @returns {Array<Object>}
 */
function filterGamesToFavorites(games) {
  const keys = getFavoriteKeys();
  if (keys.size === 0) return [];
  return games.filter(game =>
    keys.has(favoriteKey(game.league, game.homeTeamId)) ||
    keys.has(favoriteKey(game.league, game.awayTeamId))
  );
}