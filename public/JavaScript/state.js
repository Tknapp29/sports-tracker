// various DOM elements that are looked up once the document is parsed. These are
let tableBody, statusMsg, refreshBtn, prevDayBtn, nextDayBtn, currentDateLabel,
  table, leagueToggle, dayNav, resultsSection, noUpcomingMsg, noUpcomingText,
  gameStatsModalEl, gameStatsModal, gameStatsModalLabel, gameStatsModalBody,
  gameOddsModalBody, statsTab, rankingsNav, rankingsSection, rankingsBody; 

let activeModalRequest = 0;

// Constants for league labels and initial state
const LEAGUE_LABELS = { mlb: 'MLB', nba: 'NBA', nfl: 'NFL', nhl: 'NHL' };

// Tracks which day is currently shown. Starts at today.
let currentDate = new Date();

// Tracks which league is currently selected. Starts at MLB.
let currentLeague = 'mlb';

// Tracks which view is currently selected. Starts at the games view.
let currentView = 'games';

// DOM elements for the modal that shows game stats and betting odds. These are looked up once the document is parsed.
document.addEventListener('DOMContentLoaded', () => {
  tableBody = document.getElementById('gamesTableBody');
  statusMsg = document.getElementById('statusMsg');
  refreshBtn = document.getElementById('refreshBtn');
  prevDayBtn = document.getElementById('prevDayBtn');
  nextDayBtn = document.getElementById('nextDayBtn');
  currentDateLabel = document.getElementById('currentDateLabel');
  table = document.getElementById('gamesTable');
  leagueToggle = document.getElementById('leagueToggle');
  dayNav = document.getElementById('dayNav');
  resultsSection = document.getElementById('resultsSection');
  noUpcomingMsg = document.getElementById('noUpcomingMsg');
  noUpcomingText = document.getElementById('noUpcomingText');
  gameStatsModalEl = document.getElementById('gameStatsModal');
  gameStatsModal = new bootstrap.Modal(gameStatsModalEl);
  gameStatsModalLabel = document.getElementById('gameStatsModalLabel');
  gameStatsModalBody = document.getElementById('gameStatsModalBody');
  gameOddsModalBody = document.getElementById('gameOddsModalBody');
  statsTab = document.getElementById('stats-tab');

  rankingsNav = document.getElementById('rankingsNav');       // ← these three
  rankingsSection = document.getElementById('rankingsSection'); // ← need to be
  rankingsBody = document.getElementById('rankingsBody');       // ← present
});