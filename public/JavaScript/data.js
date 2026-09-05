/**
 * Adds the game to the table
 *
 * @param {Object} event - Raw ESPN event object from the scoreboard endpoint.
 * @returns {{
 *   id: string,
 *   rawDate: string|null,
 *   date: string,
 *   time: string,
 *   homeTeam: string,
 *   awayTeam: string,
 *   homeLogo: string,
 *   awayLogo: string,
 *   homeScore: string|number,
 *   awayScore: string|number,
 *   status: string,
 *   whereToWatch: string[],
 * }}
 */
function formatEvent(event) {
  const competition = event.competitions && event.competitions[0];
  const competitors = (competition && competition.competitors) || [];
  const home = competitors.find(c => c.homeAway === 'home') || {};
  const away = competitors.find(c => c.homeAway === 'away') || {};
  const gameDate = event.date ? new Date(event.date) : null;
  const whereToWatch = (competition && competition.broadcasts && competition.broadcasts
    .flatMap(broadcast => broadcast.names || [])
    .filter(Boolean)) || [];

  return {
    id: event.id,
    rawDate: event.date || null,
    date: gameDate ? gameDate.toLocaleDateString() : 'TBD',
    time: gameDate ? gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD',
    homeTeam: home.team ? (home.team.shortDisplayName || home.team.displayName) : 'TBD',
    awayTeam: away.team ? (away.team.shortDisplayName || away.team.displayName) : 'TBD',
    homeTeamId: home.team ? home.team.id : null, // ← new
    awayTeamId: away.team ? away.team.id : null, // ← new
    homeLogo: home.team ? (home.team.logo || (home.team.logos && home.team.logos[0] && home.team.logos[0].href) || '') : '',
    awayLogo: away.team ? (away.team.logo || (away.team.logos && away.team.logos[0] && away.team.logos[0].href) || '') : '',
    homeScore: home.score ?? '-',
    awayScore: away.score ?? '-',
    status: (event.status && event.status.type && event.status.type.shortDetail) || 'Unknown',
    whereToWatch: whereToWatch.length ? whereToWatch : ['TBD'],
    venue: (competition && competition.venue && competition.venue.fullName) || 'TBD',
  };
}

/**
 * Fetches the games for a given league and date from the server, then formats them
 *
 * @param {string} league - League key as expected by /api/games (e.g. 'mlb', 'nba').
 * @param {Date} date - Date to fetch games for.
 * @returns {Promise<Array<Object>>} Array of formatted games (possibly empty).
 * @throws {Error} If the server responds with a non-OK status.
 */
async function fetchGamesForDate(league, date) {
  const res = await fetch(`/api/games?sport=${league}&date=${formatForApi(date)}`);
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  const data = await res.json();
  return (data.events || []).map(formatEvent);
}

// Stat normalization helpers for the game details modal. 
const CATEGORY_STAT_PICKS = {
  batting: ['runs', 'hits', 'homeRuns', 'RBIs', 'walks', 'strikeouts', 'avg', 'onBasePct', 'slugAvg'],
  pitching: ['innings', 'hits', 'runs', 'earnedRuns', 'walks', 'strikeouts', 'ERA'],
  fielding: ['errors', 'assists', 'putouts'],
};

const PLAYER_STAT_PICKS = {
  batting: ['AB', 'R', 'H', 'RBI', 'BB', 'SO', 'HR'],
  pitching: ['IP', 'H', 'R', 'ER', 'BB', 'SO', 'HR'],
  fielding: ['PO', 'A', 'E'],
};
/**
 * Normalizes a team's boxscore "statistics" array — which ESPN shapes
 * differently per sport (flat stats vs. grouped categories) — into a
 * single consistent list of stat categories.
 *
 * @param {Array<Object>} statistics - Raw `boxscore.teams[n].statistics` from ESPN.
 * @returns {Array<{name: string, stats: Array<{label: string, value: string}>}>}
 *   Normalized categories, e.g. [{ name: 'Batting', stats: [{ label: 'H', value: '8' }] }].
 *   Grouped categories (MLB) are filtered down via CATEGORY_STAT_PICKS; flat
 *   stats (NBA/NFL/NHL) are collected under an implicit "Team Stats" category.
 */
function normalizeTeamStatistics(statistics) {
  const categories = [];
  const flatStats = [];

  (statistics || []).forEach(entry => {
    if (Array.isArray(entry.stats)) {
      const categoryKey = (entry.name || entry.displayName || '').toLowerCase();
      const pick = CATEGORY_STAT_PICKS[categoryKey];
      const stats = entry.stats
        .filter(s => !pick || pick.includes(s.name))
        .map(s => ({ label: s.shortDisplayName || s.abbreviation || s.displayName || s.name, value: s.displayValue }));
      if (stats.length > 0) {
        categories.push({ name: entry.displayName || entry.name || 'Stats', stats });
      }
    } else if (entry.displayValue !== undefined) {
      flatStats.push({ label: entry.label || entry.displayName || entry.name, value: entry.displayValue });
    }
  });
  if (flatStats.length > 0) {
    categories.unshift({ name: 'Team Stats', stats: flatStats });
  }
  return categories;
}

/**
 * Capitalizes a category type string (e.g. "batting" -> "Batting").
 * @param {string} type - The category type to capitalize.
 * @returns {string} The capitalized category type.
 */
function capitalizeCategoryType(type) {
  if (!type) return 'Players';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Normalizes the player categories from the raw ESPN data.
 * @param {*} statistics 
 * @returns 
 */
function normalizePlayerCategories(statistics) {
  return (statistics || []).map(category => {
    const key = (category.type || category.name || category.displayName || '').toLowerCase();
    const name = category.displayName || category.name || capitalizeCategoryType(category.type);
    const allowed = PLAYER_STAT_PICKS[key];
    const selectedIndexes = (category.labels || [])
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => !allowed || allowed.includes(label));

    const players = (category.athletes || [])
      .filter(entry => entry && entry.athlete)
      .map(entry => {
        const athlete = entry.athlete;
        const values = entry.stats || [];
        return {
          name: athlete.displayName || athlete.fullName || athlete.shortName || 'Unknown player',
          position: (athlete.position && (athlete.position.abbreviation || athlete.position.displayName || athlete.position.name)) || '',
          didNotPlay: Boolean(entry.didNotPlay),
          stats: selectedIndexes.map(({ label, index }) => ({
            label,
            value: values[index] === undefined || values[index] === '' ? '—' : values[index],
          })),
        };
      });
    return { name, key, players };
  }).filter(category => category.players.length > 0);
}

/**
 * Derives a starting lineup for MLB games from the already-normalized
 * batting category
 *
 * @param {Array<Object>} categories - Output of normalizePlayerCategories().
 * @returns {{starters: Array<Object>, outfield: Array<Object>}}
 *   `starters` is the first nine active batters; `outfield` is the subset
 *   of starters playing LF/CF/RF.
 */
function buildBaseballLineup(categories) {
  const batting = categories.find(category => category.key === 'batting');
  const starters = batting ? batting.players.filter(player => !player.didNotPlay).slice(0, 9) : [];
  const outfield = starters.filter(player => ['LF', 'CF', 'RF'].includes(String(player.position).toUpperCase()));
  return { starters, outfield };
}

// ESPN Sportsbook
const REQUESTED_SPORTSBOOKS = [
  { name: 'DraftKings', aliases: ['draftkings', 'draftkingssportsbook', 'dk'] },
];

/**
 * Normalizes ESPN's PickCenter odds entries into one row per requested
 * sportsbook (currently just DraftKings), regardless of how many books
 * ESPN actually returned data for.
 *
 * @param {Array<Object>} [pickcenter] - Raw `pickcenter` (or `odds`) array from ESPN.
 * @returns {Array<{
 *   sportsbook: string,
 *   awaySpread: string,
 *   homeSpread: string,
 *   total: string,
 *   awayMoneyline: string,
 *   homeMoneyline: string,
 *   available: boolean,
 * }>} One entry per REQUESTED_SPORTSBOOKS, in that fixed order. If a book
 *   has no line published yet, its row is returned with `available: false`
 *   and placeholder '—' values instead of being omitted.
 */
function normalizeOdds(pickcenter) {
  const availableLines = (pickcenter || []).map(line => {
    const home = line.homeTeamOdds || {};
    const away = line.awayTeamOdds || {};
    const rawSpread = line.spread;
    const hasNumericSpread = Number.isFinite(Number(rawSpread));
    const magnitude = hasNumericSpread ? Math.abs(Number(rawSpread)) : undefined;
    const homeSpreadNum = home.spread !== undefined
      ? home.spread
      : hasNumericSpread && home.favorite ? -magnitude : hasNumericSpread && away.favorite ? magnitude : undefined;
    const awaySpreadNum = away.spread !== undefined
      ? away.spread
      : hasNumericSpread && away.favorite ? -magnitude : hasNumericSpread && home.favorite ? magnitude : undefined;

    const totalValue = line.overUnder ?? line.total;
    const overOdds = formatAmericanOdds(line.overOdds);
    const underOdds = formatAmericanOdds(line.underOdds);

    return {
      sportsbook: (line.provider && (line.provider.name || line.provider.displayName)) || line.providerName || 'Sportsbook',
      awaySpread: {
        value: awaySpreadNum === undefined ? '—' : signedNumber(awaySpreadNum),
        odds: formatAmericanOdds(away.spreadOdds) || '—',
      },
      homeSpread: {
        value: homeSpreadNum === undefined ? '—' : signedNumber(homeSpreadNum),
        odds: formatAmericanOdds(home.spreadOdds) || '—',
      },
      total: {
        value: totalValue === undefined || totalValue === null || totalValue === '' ? '—' : totalValue,
        overOdds: overOdds || '—',
        underOdds: underOdds || '—',
      },
      awayMoneyline: formatAmericanOdds(away.moneyLine ?? away.moneyline) || '—',
      homeMoneyline: formatAmericanOdds(home.moneyLine ?? home.moneyline) || '—',
      available: true,
    };
  });

  return REQUESTED_SPORTSBOOKS.map(book => {
    const line = availableLines.find(candidate => {
      const provider = normalizeSportsbookName(candidate.sportsbook);
      return book.aliases.some(alias => provider.includes(alias));
    });
    return line ? { ...line, sportsbook: book.name } : {
      sportsbook: book.name,
      awaySpread: { value: '—', odds: '—' },
      homeSpread: { value: '—', odds: '—' },
      total: { value: '—', overOdds: '—', underOdds: '—' },
      awayMoneyline: '—',
      homeMoneyline: '—',
      available: false,
    };
  });
}

/**
 * Formats a number to include a sign (e.g. 1.5 -> "+1.5", -1.5 -> "-1.5").
 * @param {*} n - The number to format.
 * @returns {string} The formatted number.
 */
function signedNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num > 0 ? `+${num}` : `${num}`;
}

/**
 * Normalizes ESPN's raw game-summary payload into the data required by
 * the game's stats and odds modal. The normalized result includes betting
 * odds, game state, team statistics, player statistics, game information,
 * and probable starting pitchers for MLB games.
 *
 * @param {Object} data - Raw ESPN game-summary payload from the game
 *   summary endpoint.
 * @param {string} league - League key (e.g. 'mlb', 'nba', 'nfl', 'nhl').
 *   MLB receives additional handling for probable starting pitchers.
 *
 * @returns {{
 *   odds: Array<Object>,
 *   state: string|undefined,
 *   teams: Array<Object>,
 *   playerTeams: Array<Object>,
 *   probablePitchers: Array<{
 *     homeAway: string,
 *     pitcher: string|null
 *   }>,
 *   gameInfo: {
 *     venue: string|null,
 *     city: string|null,
 *     state: string|null,
 *     attendance: number|null,
 *     coverage: Array<string>
 *   }
 * }} Normalized game details used by the stats and odds modal.
 */
function formatGameDetails(data, league) {
  const competition =
    data.header &&
    data.header.competitions &&
    data.header.competitions[0];

  const state =
    competition &&
    competition.status &&
    competition.status.type &&
    competition.status.type.state;

  const boxscoreTeams = (data.boxscore && data.boxscore.teams) || [];
  const boxscorePlayers = (data.boxscore && data.boxscore.players) || [];

  const teams = boxscoreTeams.map(entry => ({
    team: entry.team,
    homeAway: entry.homeAway,
    stats: normalizeTeamStatistics(entry.statistics),
  }));

  const playerTeams = boxscorePlayers.map(entry => ({
    team: entry.team,
    homeAway: entry.homeAway,
    categories: normalizePlayerCategories(entry.statistics),
  }));

  const gameInfo = data.gameInfo || {};
  const venue = (competition && competition.venue) || gameInfo.venue || {};
  const address = venue.address || {};
  const broadcasts = (competition && competition.broadcasts) || [];
  const coverage = broadcasts
    .flatMap(b => b.names || [])
    .filter(Boolean);

  const probablePitchers =
    league === 'mlb'
      ? ((competition && competition.competitors) || []).map(c => {
          const probable = c.probables && c.probables[0];

          return {
            homeAway: c.homeAway,
            pitcher:
              probable && probable.athlete
                ? (
                    probable.athlete.shortName ||
                    probable.athlete.displayName
                  )
                : null,
          };
        })
      : [];

  console.log(JSON.stringify(data.pickcenter?.[0], null, 2));

  return {
    odds: normalizeOdds(data.pickcenter || data.odds),
    state,
    teams,
    playerTeams,
    probablePitchers,
    gameInfo: {
      venue: venue.fullName || venue.name || null,
      city: address.city || null,
      state: address.state || null,
      attendance: gameInfo.attendance || null,
      coverage,
    },
  };
}

/**
 * Extracts score/status/records context out of ESPN's raw summary payload.
 *
 * @param {Object} data - Raw ESPN summary payload (same input as formatGameDetails).
 * @returns {{
 *   status: string|undefined,
 *   date: string|undefined,
 *   venue: string|undefined,
 *   teams: Array<{
 *     name: string|undefined,
 *     homeAway: string,
 *     score: string,
 *     records: Array<string>,
 *     rank: number|undefined,
 *   }>,
 * }}
 */
function getMatchupContext(data) {
  const competition = data.header && data.header.competitions && data.header.competitions[0];
  return {
    status: competition && competition.status && competition.status.type && competition.status.type.shortDetail,
    date: competition && competition.date,
    venue: competition && competition.venue && competition.venue.fullName,
    teams: ((competition && competition.competitors) || []).map(competitor => ({
      name: competitor.team && (competitor.team.displayName || competitor.team.name),
      homeAway: competitor.homeAway,
      score: competitor.score,
      records: (competitor.records || []).map(record => record.summary),
      rank: competitor.curatedRank && competitor.curatedRank.current,
    })),
  };
}

// Leagues helper
const ALL_LEAGUES = Object.keys(LEAGUE_LABELS); // ['mlb', 'nba', 'nfl', 'nhl']

/**
 * Fetches and formats games for every league on a given date, tagging
 * each with its league key so "All Teams" can render badges correctly
 * and route modal clicks to the right sport's endpoints.
 *
 * @param {Date} date
 * @returns {Promise<Array<Object>>} Combined, chronologically-sorted games.
 */
async function fetchGamesForAllLeagues(date) {
  const results = await Promise.allSettled(
    ALL_LEAGUES.map(league => fetchGamesForDate(league, date))
  );

  const games = [];
  results.forEach((result, i) => {
    const league = ALL_LEAGUES[i];
    if (result.status === 'fulfilled') {
      result.value.forEach(game => games.push({ ...game, league }));
    } else {
      console.error(`Error fetching ${league} games:`, result.reason);
    }
  });

  games.sort((a, b) => {
    if (!a.rawDate) return 1;
    if (!b.rawDate) return -1;
    return new Date(a.rawDate) - new Date(b.rawDate);
  });

  return games;
}

/**
 * Same idea as findNextUpcoming(), but searches across every league at
 * once and returns the earliest date on which ANY league has a game.
 */
async function findNextUpcomingAllLeagues(startDate, maxWindows = 10, windowDays = 14) {
  let windowStart = new Date(startDate);

  for (let w = 0; w < maxWindows; w++) {
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + windowDays - 1);
    const rangeParam = `${formatForApi(windowStart)}-${formatForApi(windowEnd)}`;

    const results = await Promise.allSettled(
      ALL_LEAGUES.map(async league => {
        const res = await fetch(`/api/games?sport=${league}&date=${rangeParam}`);
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        return (data.events || []).map(event => ({ ...formatEvent(event), league }));
      })
    );

    const games = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') games.push(...result.value);
      else console.error('Error searching for upcoming games:', result.reason);
    });

    if (games.length > 0) {
      let earliest = null;
      games.forEach(g => {
        if (!g.rawDate) return;
        const d = new Date(g.rawDate);
        if (!earliest || d < earliest) earliest = d;
      });

      if (earliest) {
        const earliestDayGames = games
          .filter(g => g.rawDate && new Date(g.rawDate).toDateString() === earliest.toDateString())
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        return { date: earliest, games: earliestDayGames };
      }
    }

    windowStart.setDate(windowStart.getDate() + windowDays);
  }

  return null;
}

/**
 * Fetches games across every league for a date, then filters to only
 * those involving a favorited team.
 *
 * @param {Date} date
 * @returns {Promise<Array<Object>>}
 */
async function fetchFavoriteGamesForDate(date) {
  const allGames = await fetchGamesForAllLeagues(date);
  return filterGamesToFavorites(allGames);
}

/**
 * Searches forward across all leagues for the next date on which a
 * favorited team plays.
 */
async function findNextUpcomingFavorites(startDate, maxWindows = 10, windowDays = 14) {
  let windowStart = new Date(startDate);

  for (let w = 0; w < maxWindows; w++) {
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + windowDays - 1);
    const rangeParam = `${formatForApi(windowStart)}-${formatForApi(windowEnd)}`;

    const results = await Promise.allSettled(
      ALL_LEAGUES.map(async league => {
        const res = await fetch(`/api/games?sport=${league}&date=${rangeParam}`);
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const data = await res.json();
        return (data.events || []).map(event => ({ ...formatEvent(event), league }));
      })
    );

    let games = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') games.push(...result.value);
      else console.error('Error searching for upcoming favorite games:', result.reason);
    });

    games = filterGamesToFavorites(games);

    if (games.length > 0) {
      let earliest = null;
      games.forEach(g => {
        if (!g.rawDate) return;
        const d = new Date(g.rawDate);
        if (!earliest || d < earliest) earliest = d;
      });

      if (earliest) {
        const earliestDayGames = games
          .filter(g => g.rawDate && new Date(g.rawDate).toDateString() === earliest.toDateString())
          .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
        return { date: earliest, games: earliestDayGames };
      }
    }

    windowStart.setDate(windowStart.getDate() + windowDays);
  }

  return null;
}

/**
 * Fetches ESPN standings for a league and normalizes the response into a flat list of groups, each with
 * a display name (division/conference) and a sorted list of teams.
 *
 * @param {string} league
 * @returns {Promise<Array<{name: string, teams: Array<Object>}>>}
 */
async function fetchStandings(league) {
  const res = await fetch(`/api/standings?sport=${league}`);
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  const data = await res.json();
  return normalizeStandings(data);
}

/**
 * Recursively collects all standings groups from a nested structure.
 * @param {*} node the current node in the standings tree
 * @param {*} groups the array to collect groups into
 */
function collectStandingsGroups(node, groups) {
  if (node.standings && Array.isArray(node.standings.entries) && node.standings.entries.length) {
    groups.push({
      name: node.name || node.displayName || node.abbreviation || 'Standings',
      entries: node.standings.entries,
    });
  }
  if (Array.isArray(node.children)) {
    node.children.forEach(child => collectStandingsGroups(child, groups));
  }
}

/**
 * Normalizes ESPN standings data into a flat list of groups.
 * @param {*} data 
 * @returns {Array<{name: string, teams: Array<Object>}>}
 */
function normalizeStandings(data) {
  const groups = [];
  collectStandingsGroups(data, groups);

  return groups.map(group => {
    const teams = group.entries.map(entry => {
      const statByName = {};
      (entry.stats || []).forEach(s => { statByName[s.name] = s; });
      const get = name => statByName[name];
      const rank = get('divisionRank') || get('playoffSeed') || get('rank');

      return {
        teamId: entry.team && entry.team.id,
        name: entry.team ? (entry.team.shortDisplayName || entry.team.displayName) : 'TBD',
        logo: entry.team && entry.team.logos && entry.team.logos[0] && entry.team.logos[0].href,
        wins: get('wins') ? get('wins').displayValue : '-',
        losses: get('losses') ? get('losses').displayValue : '-',
        winPct: get('winPercent') ? get('winPercent').displayValue : '-',
        gamesBehind: get('gamesBehind') ? get('gamesBehind').displayValue : '-',
        streak: get('streak') ? get('streak').displayValue : '-',
        rank: rank ? rank.displayValue : null,
      };
    });

    teams.sort((a, b) => {
      const ra = parseFloat(a.rank), rb = parseFloat(b.rank);
      if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
      return 0;
    });

    return { name: group.name, teams };
  });
}