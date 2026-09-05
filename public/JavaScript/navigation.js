/**
 * Opens the game stats modal for the given game.
 * @param {*} game 
 * @returns 
 */
async function openGameStats(game) {
  const league = game.league || currentLeague; 
  const requestId = ++activeModalRequest;
  gameStatsModalLabel.textContent = `${game.awayTeam} @ ${game.homeTeam}`;
  gameStatsModalBody.innerHTML = buildGameStatsHtml(league, game, null);
  gameOddsModalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted small mt-2 mb-0">Loading odds…</p>
    </div>`;
  bootstrap.Tab.getOrCreateInstance(statsTab).show();
  gameStatsModal.show();

  try {
    const res = await fetch(`/api/game-details?sport=${league}&id=${game.id}`);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const rawDetails = await res.json();
    if (requestId !== activeModalRequest) return;

    const details = formatGameDetails(rawDetails, league);
    const matchup = getMatchupContext(rawDetails);

    gameStatsModalBody.innerHTML = buildGameStatsHtml(league, game, details);
    gameOddsModalBody.innerHTML = buildOddsHtml(game, details.odds, { loading: true });

    try {
      const prediction = await fetchGamePrediction(league, matchup, details);
      if (requestId === activeModalRequest) {
        gameOddsModalBody.innerHTML = buildOddsHtml(game, details.odds, { prediction });
      }
    } catch (predictionErr) {
      if (requestId === activeModalRequest) {
        gameOddsModalBody.innerHTML = buildOddsHtml(game, details.odds, { error: predictionErr.message });
      }
    }
  } catch (err) {
    gameStatsModalBody.innerHTML = `<p class="text-danger text-center py-5 mb-0">Couldn't load stats: ${err.message}</p>`;
    gameOddsModalBody.innerHTML = `<p class="text-danger mb-0">Couldn't load betting odds: ${err.message}</p>`;
    console.error(err);
  }
}

/**
 * Loads the games for the current date and displays them.
 */
async function loadGames() {
  showResultsView();
  statusMsg.textContent = 'Loading games…';
  currentDateLabel.textContent = formatForDisplay(currentDate);
  tableBody.innerHTML = '';

  try {
    const games = currentLeague === 'all' ? await fetchGamesForAllLeagues(currentDate)
      : currentLeague === 'favorites' ? await fetchFavoriteGamesForDate(currentDate)
      : await fetchGamesForDate(currentLeague, currentDate);

    if (games.length === 0) {
      statusMsg.textContent = currentLeague === 'favorites' && getFavoriteKeys().size === 0
        ? 'No favorite teams yet — star a team to add one.'
        : 'No games found for this day.';
      return;
    }

    renderGames(games);
    statusMsg.textContent = `Showing ${games.length} game(s). Last updated ${new Date().toLocaleTimeString()}.`;
  } catch (err) {
    statusMsg.textContent = `Couldn't load game data: ${err.message}`;
    console.error(err);
  }
}

/**
 * Switches the active league and reloads the games.
 * @param {*} league 
 * @returns if the fetch was successful, or false if there was an error.
 */
async function switchToLeague(league) {
  currentLeague = league;
  currentDate = new Date();
  showResultsView();
  statusMsg.textContent = 'Loading games…';
  currentDateLabel.textContent = formatForDisplay(currentDate);
  tableBody.innerHTML = '';
  currentView = 'games';
  document.getElementById('view-games').checked = true;
  rankingsNav.style.display = (league === 'all' || league === 'favorites') ? 'none' : '';

  try {
    if (league === 'favorites' && getFavoriteKeys().size === 0) {
      statusMsg.textContent = 'No favorite teams yet — star a team to add one.';
      renderGames([]);
      return;
    }

    const todayGames = league === 'all' ? await fetchGamesForAllLeagues(currentDate)
      : league === 'favorites' ? await fetchFavoriteGamesForDate(currentDate)
      : await fetchGamesForDate(league, currentDate);

    if (todayGames.length > 0) {
      renderGames(todayGames);
      statusMsg.textContent = `Showing ${todayGames.length} game(s). Last updated ${new Date().toLocaleTimeString()}.`;
      return;
    }

    statusMsg.textContent = 'No games today — looking for the next scheduled game…';
    const upcoming = league === 'all' ? await findNextUpcomingAllLeagues(currentDate)
      : league === 'favorites' ? await findNextUpcomingFavorites(currentDate)
      : await findNextUpcoming(league, currentDate);

    if (upcoming) {
      currentDate = upcoming.date;
      currentDateLabel.textContent = formatForDisplay(currentDate);
      renderGames(upcoming.games);
      statusMsg.textContent = `Showing the next scheduled game day: ${upcoming.games.length} game(s).`;
    } else {
      showNoUpcomingView(league);
    }
  } catch (err) {
    statusMsg.textContent = `Couldn't load game data: ${err.message}`;
    console.error(err);
  }
}

/** 
// Finds the next upcoming game for the specified league.
// @param {*} league 
// @param {*} startDate 
// @param {number} maxWindows 
// @param {number} windowDays 
// @returns {Promise<{date: Date, games: Array}>} The date and games for the next upcoming game, or null if none found.
// */
async function findNextUpcoming(league, startDate, maxWindows = 10, windowDays = 14) {
  let windowStart = new Date(startDate);

  for (let w = 0; w < maxWindows; w++) {
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + windowDays - 1);

    const rangeParam = `${formatForApi(windowStart)}-${formatForApi(windowEnd)}`;

    try {
      const res = await fetch(`/api/games?sport=${league}&date=${rangeParam}`);
      if (res.ok) {
        const data = await res.json();
        const games = (data.events || []).map(formatEvent);

        if (games.length > 0) {
          // Find the earliest date represented among the returned games.
          let earliest = null;
          games.forEach(g => {
            if (!g.rawDate) return;
            const d = new Date(g.rawDate);
            if (!earliest || d < earliest) earliest = d;
          });

          if (earliest) {
            const earliestDayGames = games.filter(g => {
              if (!g.rawDate) return false;
              return new Date(g.rawDate).toDateString() === earliest.toDateString();
            });
            return { date: earliest, games: earliestDayGames };
          }
        }
      }
    } catch (err) {
      console.error('Error searching for upcoming games:', err);
    }

    windowStart.setDate(windowStart.getDate() + windowDays);
  }

  return null;
}

/**
 * Displays the rankings view for the current league.
 */
async function showRankingsView() {
  dayNav.style.display = 'none';
  resultsSection.style.display = 'none';
  statusMsg.style.display = 'none';
  noUpcomingMsg.style.display = 'none';
  rankingsSection.style.display = '';
  rankingsBody.innerHTML = `<p class="text-muted text-center py-4 mb-0">Loading standings…</p>`;

  try {
    const groups = await fetchStandings(currentLeague);
    rankingsBody.innerHTML = buildStandingsHtml(groups, currentLeague);
    attachFavoriteStarHandlers(rankingsBody);
  } catch (err) {
    rankingsBody.innerHTML = `<p class="text-danger text-center py-4 mb-0">Couldn't load standings: ${err.message}</p>`;
    console.error(err);
  }
}