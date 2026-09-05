//Event listeners for buttons and dropdowns
document.addEventListener('DOMContentLoaded', () => {
  refreshBtn.addEventListener('click', loadGames);

  prevDayBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    loadGames();
  });

  nextDayBtn.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    loadGames();
  });

  leagueToggle.addEventListener('change', (e) => {
    if (e.target.name === 'league') {
      switchToLeague(e.target.value);
    }
  });

  rankingsNav.addEventListener('change', (e) => {
    if (e.target.name === 'view') {
      currentView = e.target.value;
      if (currentView === 'rankings') {
        showRankingsView();
      } else {
        showResultsView();
      }
    }
  });

  switchToLeague(currentLeague);
});