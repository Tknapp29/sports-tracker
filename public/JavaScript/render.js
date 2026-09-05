/**
 * Shows the result view (games table) and hides the rankings view.
 */
function showResultsView() {
  dayNav.style.display = '';
  resultsSection.style.display = '';
  statusMsg.style.display = '';
  noUpcomingMsg.style.display = 'none';
  if (rankingsSection) rankingsSection.style.display = 'none';
}

/**
 * Renders a list of games into the main table body.
 * @param {*} games 
 */
function renderGames(games) {
  tableBody.innerHTML = '';
  games.forEach(game => {
    const row = document.createElement('tr');
    row.classList.add('clickable-row');
    row.innerHTML = `
      <td>${game.time}</td>
      <td>
        <div class="team-cell">
          ${game.awayLogo ? `<img class="team-logo" src="${game.awayLogo}" alt="${game.awayTeam} logo">` : ''}
          <span>${game.awayTeam}</span> @ ${game.homeLogo ? `<img class="team-logo" src="${game.homeLogo}" alt="${game.homeTeam} logo">` : ''}
          <span>${game.homeTeam}</span>
        </div>
      </td>
      <td>${game.awayScore} - ${game.homeScore}</td>
      <td>${statusBadge(game.status)}</td>
      <td>
        <ul class="watch-list">
          ${game.whereToWatch.map(channel => `<li>${escapeHtml(channel)}</li>`).join('')}
        </ul>
      </td>
    `;
    row.addEventListener('click', () => openGameStats(game));
    tableBody.appendChild(row);
  });
  attachHoverHandlers();
}

/**
 * Renders a single team's favorite-star toggle button, or an empty
 * string if the team has no ID.
 * @param {string} league
 * @param {string} teamId
 * @param {string} teamName
 * @returns {string} HTML for the star button, or '' if no teamId.
 */
function favoriteStarHtml(league, teamId, teamName) {
  if (!teamId) return '';
  const filled = isFavoriteTeam(league, teamId);
  return `
    <button
      type="button"
      class="favorite-star-btn ${filled ? 'is-favorite' : ''}"
      data-league="${escapeHtml(league)}"
      data-team-id="${escapeHtml(String(teamId))}"
      data-team-name="${escapeHtml(teamName)}"
      aria-pressed="${filled}"
      aria-label="${filled ? 'Remove' : 'Add'} ${escapeHtml(teamName)} as a favorite"
      title="${filled ? 'Remove from favorites' : 'Add to favorites'}"
    >${filled ? '★' : '☆'}</button>`;
}

/**
 * Wires click handling for every star button inside `container`
 * @param {HTMLElement} container The container element that holds the star buttons.
 */
function attachFavoriteStarHandlers(container) {
  container.querySelectorAll('.favorite-star-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { league, teamId, teamName } = btn.dataset;
      const nowFavorited = toggleFavoriteTeam(league, teamId, { name: teamName, logo: '' });

      container.querySelectorAll(`.favorite-star-btn[data-league="${league}"][data-team-id="${teamId}"]`).forEach(match => {
        match.classList.toggle('is-favorite', nowFavorited);
        match.textContent = nowFavorited ? '★' : '☆';
        match.setAttribute('aria-pressed', String(nowFavorited));
        match.title = nowFavorited ? 'Remove from favorites' : 'Add to favorites';
      });
    });
  });
}

/**
 * Adds hover effects to all rows in the main table body, so that when a row is hovered
 */
function attachHoverHandlers() {
  const rows = tableBody.querySelectorAll('tr');

  rows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.querySelectorAll('td').forEach(el => el.classList.add('row-hover'));
    });
    row.addEventListener('mouseleave', () => {
      row.querySelectorAll('td').forEach(el => el.classList.remove('row-hover'));
    });
  });
}

/**
 * Builds the HTML for a game's score display.
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the score display.
 */
function buildScoreHtml(game, details) {
  const teamsHtml = `
    <div class="d-flex justify-content-between align-items-center gap-3">
      <div class="text-center flex-fill">
        ${game.awayLogo ? `<img class="team-logo mb-1" src="${game.awayLogo}" alt="${escapeHtml(game.awayTeam)} logo">` : ''}
        <div class="score-line">${escapeHtml(game.awayTeam)}</div>
      </div>
      ${details.state === 'pre'
      ? `<div class="score-line px-2">@</div>`
      : `<div class="score-line px-2">${escapeHtml(String(game.awayScore))} - ${escapeHtml(String(game.homeScore))}</div>`
    }
      <div class="text-center flex-fill">
        ${game.homeLogo ? `<img class="team-logo mb-1" src="${game.homeLogo}" alt="${escapeHtml(game.homeTeam)} logo">` : ''}
        <div class="score-line">${escapeHtml(game.homeTeam)}</div>
      </div>
    </div>`;

  if (details.state === 'pre') {
    const when = [game.time, game.date].filter(Boolean).map(escapeHtml).join(' on ');
    return `
      <div class="stats-scoreboard">
        ${teamsHtml}
        <div class="game-meta text-center mt-2">Starts at ${when || 'a time TBD'}</div>
      </div>`;
  }

  const status = (details.gameInfo && details.gameInfo.status) || game.status || '';
  const location = details.gameInfo
    ? [details.gameInfo.venue, details.gameInfo.city, details.gameInfo.state].filter(Boolean).join(', ')
    : '';

  return `
    <div class="stats-scoreboard">
      ${teamsHtml}
      ${status || location ? `<div class="game-meta text-center mt-2">${[status, location].filter(Boolean).map(escapeHtml).join(' &middot; ')}</div>` : ''}
    </div>`;
}

/**
 * Builds the HTML for the game information section.
 * @param {*} details 
 * @returns {string} The HTML for the game information section.
 */
function buildGameInfoHtml(details) {
  const gi = details.gameInfo || {};
  const location = [gi.venue, gi.city, gi.state].filter(Boolean).join(', ');
  const rows = [
    location ? `<tr><td class="stat-label">Venue</td><td class="stat-value">${escapeHtml(location)}</td></tr>` : '',
    gi.attendance ? `<tr><td class="stat-label">Attendance</td><td class="stat-value">${Number(gi.attendance).toLocaleString()}</td></tr>` : '',
    gi.coverage && gi.coverage.length ? `<tr><td class="stat-label">Coverage</td><td class="stat-value">${gi.coverage.map(escapeHtml).join(', ')}</td></tr>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="stat-section">
      <h6 class="stat-section-title">Game Information</h6>
      ${rows
      ? `<table class="table stats-table mb-0"><tbody>${rows}</tbody></table>`
      : `<p class="text-muted small mb-0 p-3">No game info available.</p>`}
    </div>`;
}

/**
 * Builds the HTML for the probable starting pitchers section.
 * @param {*} details 
 * @returns {string} The HTML for the probable starting pitchers section.
 */
function buildProbablePitchersHtml(details) {
  const list = (details.probablePitchers || []).filter(p => p.pitcher);
  const rows = list.map(p => `
    <tr>
      <td class="stat-label">${p.homeAway === 'home' ? 'Home' : 'Away'}</td>
      <td class="stat-value">${escapeHtml(p.pitcher)}</td>
    </tr>`).join('');

  return `
    <div class="stat-section">
      <h6 class="stat-section-title">Probable Starting Pitchers</h6>
      ${rows
      ? `<table class="table stats-table mb-0"><tbody>${rows}</tbody></table>`
      : `<p class="text-muted small mb-0 p-3">Not yet announced.</p>`}
    </div>`;
}

/**
 * Builds the HTML for a game's betting odds section.
 * @param {*} details 
 * @returns 
 */
function buildTeamStatsHtml(details) {
  if (!details.teams || !details.teams.length) return '';

  if (details.teams.length < 2) {
    const only = details.teams[0];
    const label = only.team ? (only.team.shortDisplayName || only.team.displayName) : only.homeAway;
    const rows = only.stats.flatMap(cat => cat.stats.map(s => `
      <tr><td class="stat-label">${escapeHtml(s.label)}</td><td class="stat-value">${escapeHtml(String(s.value))}</td></tr>`)).join('');
    return `
      <div class="stat-section">
        <h6 class="stat-section-title">Team Stats — ${escapeHtml(label)}</h6>
        <table class="table stats-table mb-0"><tbody>${rows}</tbody></table>
      </div>`;
  }

  const away = details.teams.find(t => t.homeAway === 'away') || details.teams[0];
  const home = details.teams.find(t => t.homeAway === 'home') || details.teams[1];
  const awayLabel = away.team ? (away.team.shortDisplayName || away.team.displayName) : 'Away';
  const homeLabel = home.team ? (home.team.shortDisplayName || home.team.displayName) : 'Home';

  const categoryCount = Math.max(away.stats.length, home.stats.length);
  const tables = [];

  for (let i = 0; i < categoryCount; i++) {
    const awayCat = away.stats[i];
    const homeCat = home.stats[i];
    const catName = (awayCat && awayCat.name) || (homeCat && homeCat.name) || 'Stats';

    const awayByLabel = new Map((awayCat ? awayCat.stats : []).map(s => [s.label, s.value]));
    const homeByLabel = new Map((homeCat ? homeCat.stats : []).map(s => [s.label, s.value]));
    const allLabels = [...new Set([...awayByLabel.keys(), ...homeByLabel.keys()])];

    const rows = allLabels.map(label => `
      <tr>
        <td class="stat-value text-end">${escapeHtml(String(awayByLabel.get(label) ?? '—'))}</td>
        <td class="stat-label text-center">${escapeHtml(label)}</td>
        <td class="stat-value">${escapeHtml(String(homeByLabel.get(label) ?? '—'))}</td>
      </tr>`).join('');

    tables.push(`
      <div class="stat-section">
        <h6 class="stat-section-title">${escapeHtml(catName)}</h6>
        <table class="table stats-table mb-0">
          <thead>
            <tr>
              <th class="text-end">${escapeHtml(awayLabel)}</th>
              <th></th>
              <th>${escapeHtml(homeLabel)}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`);
  }

  return tables.join('');
}

/**
 * Builds the HTML for a player's stats section.
 * @param {*} details 
 * @param {*} league 
 * @returns {string} The HTML for the player stats section.
 */
function buildPlayerStatsHtml(details, league) {
  if (details.state === 'pre') {
    return `<div></div>`;
  }

  if (!details.playerTeams || !details.playerTeams.length) {
    return '';
  }

  const sections = details.playerTeams.map(teamEntry => {
    const label = teamEntry.team
      ? (teamEntry.team.shortDisplayName || teamEntry.team.displayName)
      : teamEntry.homeAway;

    const categories = (teamEntry.categories || []).map(cat => {
      const columnLabels = cat.players?.[0]
        ? cat.players[0].stats.map(s => s.label)
        : [];

      // ESPN category label (Batting, Pitching, etc.)
      const categoryLabel =
        cat.name || cat.displayName || cat.text || cat.type || 'Player';

      // Always use "Player" as the first column header
      const firstColumnLabel = 'Player';

      const rows = (cat.players || []).map(p => `
        <tr class="${p.didNotPlay ? 'did-not-play' : ''}">
          <td>
            ${escapeHtml(p.name)}
            ${p.position
          ? ` <span class="player-position">${escapeHtml(p.position)}</span>`
          : ''}
          </td>
          ${(p.stats || [])
          .map(s => `<td class="text-end">${escapeHtml(String(s.value))}</td>`)
          .join('')}
        </tr>
      `).join('');

      return `
        <div class="player-category">
          <h6 class="player-category-title">
            ${escapeHtml(categoryLabel)}
          </h6>

          <div class="table-responsive">
            <table class="table player-stat-table mb-0">
              <thead>
                <tr>
                  <th>${escapeHtml(firstColumnLabel)}</th>
                  ${columnLabels
          .map(l => `<th class="text-end">${escapeHtml(l)}</th>`)
          .join('')}
                </tr>
              </thead>

              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="mb-3">
        <div class="stats-heading mb-2">
          ${escapeHtml(label)}
        </div>

        ${categories || `
          <p class="mb-0"
             style="color: var(--color-text-secondary); font-size: .8rem;">
            No player stats available.
          </p>
        `}
      </div>
    `;
  }).join('');

  return `<div class="player-section">${sections}</div>`;
}

/**
 * Builds the HTML for a game's MLB stats section.
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the MLB stats section.
 */
function buildMlbStatsHtml(game, details) {
  if (details.state === 'pre') {
    return [buildScoreHtml(game, details), buildProbablePitchersHtml(details), buildPlayerStatsHtml(details, 'mlb'), buildGameInfoHtml(details)].join('');
  }
  return [buildScoreHtml(game, details), buildTeamStatsHtml(details), buildPlayerStatsHtml(details, 'mlb'), buildGameInfoHtml(details)].join('');
}

/**
 * Builds the HTML for a game's standard stats section.
 * @param {*} game 
 * @param {*} details 
 * @param {*} league 
 * @returns {string} The HTML for the standard stats section.
 */
function buildStandardStatsHtml(game, details, league) {
  if (details.state === 'pre') {
    return [buildScoreHtml(game, details), buildPlayerStatsHtml(details, league), buildGameInfoHtml(details)].join('');
  }
  return [buildScoreHtml(game, details), buildTeamStatsHtml(details), buildPlayerStatsHtml(details, league), buildGameInfoHtml(details)].join('');
}

/**
 * Builds the HTML for a game's NFL stats section.
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the NFL stats section.
 */
function buildNflStatsHtml(game, details) { return buildStandardStatsHtml(game, details, 'nfl'); }

/**
 * Builds the HTML for a game's NBA stats section.
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the NBA stats section.
 */
function buildNbaStatsHtml(game, details) { return buildStandardStatsHtml(game, details, 'nba'); }

/**
 * Builds the HTML for a game's NHL stats section.
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the NHL stats section.
 */
function buildNhlStatsHtml(game, details) { return buildStandardStatsHtml(game, details, 'nhl'); }

// Stats builders for each league, used to select the appropriate builder function.
const STATS_BUILDERS = {
  mlb: buildMlbStatsHtml,
  nfl: buildNflStatsHtml,
  nba: buildNbaStatsHtml,
  nhl: buildNhlStatsHtml,
};

/**
 * Builds the HTML for a game's stats section based on the league.
 * @param {*} league 
 * @param {*} game 
 * @param {*} details 
 * @returns {string} The HTML for the game's stats section.
 */
function buildGameStatsHtml(league, game, details) {
  if (!details) {
    return `<p class="text-muted text-center py-5 mb-0">Loading stats…</p>`;
  }
  const builder = STATS_BUILDERS[league] || buildStandardStatsHtml;
  const html = builder(game, details);
  return html || `<p class="text-muted text-center py-5 mb-0">No stats available for this game yet.</p>`;
}

/**
 * Builds the HTML for a game's odds section.
 * @param {*} game 
 * @param {*} odds 
 * @param {*} aiState 
 * @returns {string} The HTML for the game's odds section.
 */
function buildOddsHtml(game, odds, aiState = {}) {
  const predictionHtml = buildPredictionCardHtml(aiState);

  if (!odds.length) {
    return `${predictionHtml}<p class="text-muted mb-0">No DraftKings line is currently available for this game.</p>`;
  }

  const availableCount = odds.filter(line => line.available).length;

  const rows = odds.map(line => {
    const rowClass = line.available ? '' : 'text-muted';
    const unavailableBadge = line.available ? '' : ' <span class="badge text-bg-light border ms-1">Unavailable</span>';

    return `
      <tr class="${rowClass}">
        <td class="fw-semibold" rowspan="2">${escapeHtml(line.sportsbook)}${unavailableBadge}</td>
        <td>${escapeHtml(game.awayTeam)}</td>
        <td class="text-end">${escapeHtml(line.awayMoneyline)}</td>
        <td class="text-end">
          <div>o${escapeHtml(String(line.total.value))}</div>
          <div class="text-muted small">${escapeHtml(line.total.overOdds)}</div>
        </td>
<td class="text-end">
  <div>${escapeHtml(line.awaySpread.value)}</div>
  ${line.awaySpread.odds !== '—' ? `<div class="text-muted small">${escapeHtml(line.awaySpread.odds)}</div>` : ''}
</td>
      </tr>
      <tr class="${rowClass}">
        <td>${escapeHtml(game.homeTeam)}</td>
        <td class="text-end">${escapeHtml(line.homeMoneyline)}</td>
        <td class="text-end">
          <div>u${escapeHtml(String(line.total.value))}</div>
          <div class="text-muted small">${escapeHtml(line.total.underOdds)}</div>
        </td>
<td class="text-end">
  <div>${escapeHtml(line.homeSpread.value)}</div>
  ${line.homeSpread.odds !== '—' ? `<div class="text-muted small">${escapeHtml(line.homeSpread.odds)}</div>` : ''}
</td>
      </tr>`;
  }).join('');

  return `
    ${predictionHtml}
    <div class="odds-card">
    <div class="mb-3">
      <div class="fw-semibold fs-5">${escapeHtml(game.awayTeam)} @ ${escapeHtml(game.homeTeam)}</div>
      <div class="text-muted small">ESPN PickCenter &middot; DraftKings line. Odds can change before game time.</div>
    </div>
    ${availableCount ? '' : '<p class="text-muted small">ESPN has not published a DraftKings line for this game.</p>'}
    <div class="table-responsive">
      <table class="table table-sm table-striped align-middle mb-0">
        <thead>
          <tr>
            <th>Sportsbook</th>
            <th>Team</th>
            <th class="text-end">ML</th>
            <th class="text-end">Total</th>
            <th class="text-end">RL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div></div>`;
}

/**
 * Displays the "no upcoming games" view for the specified league.
 * @param {*} league 
 */
function showNoUpcomingView(league) {
  dayNav.style.display = 'none';
  resultsSection.style.display = 'none';
  statusMsg.style.display = 'none';
  if (rankingsNav) rankingsNav.style.display = 'none'; // ← also add this
  if (rankingsSection) rankingsSection.style.display = 'none';
  noUpcomingText.textContent = league === 'favorites'
    ? 'There are no upcoming games for your favorite teams.'
    : `There are no upcoming ${LEAGUE_LABELS[league] || league.toUpperCase()} games scheduled.`;
  noUpcomingMsg.style.display = '';
}

/**
 * Builds the HTML for the standings section.
 * @param {*} groups 
 * @param {*} league 
 * @returns {string} The HTML for the standings section.
 */
function buildStandingsHtml(groups, league) {
  if (!groups || !groups.length) {
    return `<p class="text-muted text-center py-4 mb-0">No standings available.</p>`;
  }
  return groups.map(group => `
    <div class="standings-group mb-4">
      <h6 class="stat-section-title">${escapeHtml(group.name)}</h6>
      <div class="table-responsive">
        <table class="table table-sm standings-table mb-0">
          <thead>
            <tr><th></th><th>#</th><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>Streak</th></tr>
          </thead>
          <tbody>
            ${group.teams.map((t, i) => `
              <tr>
                <td>${favoriteStarHtml(league, t.teamId, t.name)}</td>
                <td>${escapeHtml(t.rank || String(i + 1))}</td>
                <td>
                  <div class="d-flex align-items-center gap-2">
                    ${t.logo ? `<img class="team-logo" src="${escapeHtml(t.logo)}" alt="${escapeHtml(t.name)} logo">` : ''}
                    <span>${escapeHtml(t.name)}</span>
                  </div>
                </td>
                <td>${escapeHtml(String(t.wins))}</td>
                <td>${escapeHtml(String(t.losses))}</td>
                <td>${escapeHtml(String(t.winPct))}</td>
                <td>${escapeHtml(String(t.gamesBehind))}</td>
                <td>${escapeHtml(String(t.streak))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`).join('');
}