// Constants
require('dotenv').config();
const express = require('express');
const { buildClaudePredictionRequest, parseClaudePrediction } = require('./public/JavaScript/ai');
const app = express();
const PORT = process.env.PORT || 3000;

// Load the Anthropic API key from an environment variable.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // your key goes here

// The Claude model to use for predictions
const CLAUDE_MODEL = 'claude-sonnet-4-6';

if (!ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. /api/game-prediction will return 503 until it is configured.');
}

app.use(express.static(__dirname));
app.use(express.json());

// maps sport keys to ESPN API paths
const SPORT_MAP = {
  mlb: { sport: 'baseball', league: 'mlb' },
  nba: { sport: 'basketball', league: 'nba' },
  nfl: { sport: 'football', league: 'nfl' },
  nhl: { sport: 'hockey', league: 'nhl' },
};

/**
 * Fetches JSON data from an ESPN API endpoint.
 * @param {*} url 
 * @returns 
 */
async function fetchEspnJson(url) {
  const espnRes = await fetch(url);
  if (!espnRes.ok) {
    throw new Error(`ESPN API responded with status ${espnRes.status}`);
  }
  return espnRes.json();
}

/**
 * Proxies ESPN's scoreboard endpoint for the specified sport and optional date range.
 */
app.get('/api/games', async (req, res) => {
  const sportKey = (req.query.sport || 'mlb').toLowerCase();
  const mapping = SPORT_MAP[sportKey];
  if (!mapping) {
    return res.status(400).json({
      error: `Unsupported sport "${sportKey}". Supported: ${Object.keys(SPORT_MAP).join(', ')}`
    });
  }
  const dateParam = req.query.date ? `?dates=${req.query.date}` : '';
  const url = `https://site.api.espn.com/apis/site/v2/sports/${mapping.sport}/${mapping.league}/scoreboard${dateParam}`;
  try {
    const data = await fetchEspnJson(url);
    res.json({ sport: sportKey, events: data.events || [] });
  } catch (err) {
    console.error('Error fetching scoreboard data:', err.message);
    res.status(502).json({ error: 'Failed to fetch data from sports API', details: err.message });
  }
});

/**
 * Gets ESPN's game details endpoint for a specific game ID.
 */
app.get('/api/game-details', async (req, res) => {
  const sportKey = (req.query.sport || '').toLowerCase();
  const id = req.query.id;
  const mapping = SPORT_MAP[sportKey];
  if (!mapping || !id) {
    return res.status(400).json({ error: 'Both "sport" and "id" query params are required.' });
  }
  const url = `https://site.api.espn.com/apis/site/v2/sports/${mapping.sport}/${mapping.league}/summary?event=${id}`;
  try {
    const data = await fetchEspnJson(url);
    res.json(data);
  } catch (err) {
    console.error('Error fetching game details:', err.message);
    res.status(502).json({ error: 'Failed to fetch game details', details: err.message });
  }
});

/**
 * Gets ESPN's team schedule endpoint for a specific team ID.
 */
app.get('/api/team-schedule', async (req, res) => {
  const sportKey = (req.query.sport || '').toLowerCase();
  const teamId = req.query.teamId;
  const mapping = SPORT_MAP[sportKey];
  if (!mapping || !teamId) {
    return res.status(400).json({ error: 'Both "sport" and "teamId" query params are required.' });
  }
  const url = `https://site.api.espn.com/apis/site/v2/sports/${mapping.sport}/${mapping.league}/teams/${teamId}/schedule`;
  try {
    const data = await fetchEspnJson(url);
    res.json(data);
  } catch (err) {
    console.error('Error fetching team schedule:', err.message);
    res.status(502).json({ error: 'Failed to fetch team schedule', details: err.message });
  }
});

// Proxies ESPN's standings endpoint — the source for offense/defense
// rankings and playoff/standings stakes (motivation). Returned as-is;
// pulling out the two teams relevant to a given matchup happens client-side.
app.get('/api/standings', async (req, res) => {
  const sportKey = (req.query.sport || '').toLowerCase();
  const mapping = SPORT_MAP[sportKey];
  if (!mapping) {
    return res.status(400).json({ error: '"sport" query param is required.' });
  }
  const url = `https://site.api.espn.com/apis/v2/sports/${mapping.sport}/${mapping.league}/standings`;
  try {
    const data = await fetchEspnJson(url);
    res.json(data);
  } catch (err) {
    console.error('Error fetching standings:', err.message);
    res.status(502).json({ error: 'Failed to fetch standings', details: err.message });
  }
});

/**
 * Generates an AI prediction for a given matchup using the Anthropic Claude API.
 */
app.post('/api/game-prediction', async (req, res) => {
  const { sport: sportKey, matchup, context } = req.body || {};
  if (!sportKey || !context) {
    return res.status(400).json({ error: '"sport" and "context" are required in the request body.' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI predictions are not configured. Set ANTHROPIC_API_KEY on the server.' });
  }

  try {
    const claudeRequest = buildClaudePredictionRequest({ sport: sportKey, matchup, ...context }, CLAUDE_MODEL);
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(claudeRequest),
    });
    if (!claudeRes.ok) {
      const body = await claudeRes.text();
      throw new Error(`Claude API responded with status ${claudeRes.status}: ${body.slice(0, 300)}`);
    }

    const prediction = parseClaudePrediction(await claudeRes.json());
    res.json({ ...prediction, model: CLAUDE_MODEL });
  } catch (err) {
    console.error('Error generating game prediction:', err.message);
    res.status(502).json({ error: 'Failed to generate AI prediction', details: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});