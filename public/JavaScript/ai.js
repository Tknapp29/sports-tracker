/**
 * Fetches a game prediction from the AI service.
 * @param {*} sport the sport to fetch
 * @param {*} matchup the current matchup
 * @param {*} context the context for the prediction
 * @returns 
 */
async function fetchGamePrediction(sport, matchup, context) {
  const res = await fetch('/api/game-prediction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport, matchup, context }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.details || error.error || `Failed to fetch game prediction: ${res.status}`);
  }
  return res.json();
}

/**
 * Builds the HTML for the AI prediction card based on the current state.
 * @param {*} aiState the current state of the AI prediction (loading, prediction, error)
 * @returns {string} the HTML string for the prediction card
 */
function buildPredictionCardHtml(aiState = {}) {
  if (aiState.loading) {
    return `
      <div class="prediction-card">
        <div class="d-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm" role="status"></div>
          <span>Analyzing team and player stats…</span>
        </div>
      </div>`;
  }

  if (aiState.prediction) {
    const { winner, confidence, rationale, dataAvailability } = aiState.prediction;
    return `
      <section class="prediction-card">
        <div class="prediction-label">AI prediction</div>
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-2">
          <div class="prediction-winner">${escapeHtml(winner)} to win</div>
          <div class="prediction-confidence">${escapeHtml(confidence)}% confidence</div>
        </div>
        <p class="prediction-rationale">${escapeHtml(rationale)}</p>
      </section>`;
  }

  return `
    <div class="alert alert-secondary small mb-3">
      <span class="fw-semibold">Prediction unavailable.</span>
      ${escapeHtml(aiState.error || 'Try again after configuring the AI service.')}
    </div>`;
}

// Define the factors that influence the AI's prediction.
const PREDICTION_FACTORS = [
  'Team form — recent results over the last 5-10 games',
  'Injuries and lineups — missing or limited star/starting players',
  'Home vs. away — whether either team performs notably better in this setting',
  'Head-to-head history — patterns from recent meetings between these teams',
  'Schedule and rest — fatigue, back-to-backs, or travel',
  'Offense/defense rankings — points or goals scored versus allowed',
  'Tactical matchups — whether one team\'s style exposes the other\'s weaknesses',
  'Motivation and stakes — playoff, standings, or other situational stakes',
  'Market odds — what bookmakers/betting models imply, if provided',
];
/**
 * Builds the request payload for the Claude AI prediction service.
 * @param {*} context the context data for the prediction
 * @param {*} model the Claude model to use
 * @returns {object} the request payload for the AI service
 */
function buildClaudePredictionRequest(context, model) {
  const prompt = 
`You are a careful sports analyst. Predict the winner of this matchup using ONLY the 
supplied ESPN context below. Never invent injuries, form, odds, rankings, or any 
other data that isn't present in the payload. Before answering, reason through 
each of these factors internally, using only the data actually present in the 
payload for that factor. Skip any factor with no supporting data rather than 
guessing at it: ${PREDICTION_FACTORS.map((f, i) => `${i + 1}. ${f}`).join('\n')} 
Weigh the factors you do have data for together to reach a single winner and 
confidence level. If the game is underway or final, treat the live/final score and 
status as decisive and say so plainly. Do not show your factor-by-factor reasoning
 — only return the final JSON. Return ONLY valid JSON with this exact shape, no
markdown fences, no commentary: {"winner":"team name or Unclear","confidence":0,
"rationale":"2-4 concise sentences citing the specific factors that drove the pick",
"dataAvailability":"short note naming which of the factors above had no data and 
were skipped"} Confidence must be an integer from 0 to 100. DATA: ${JSON.stringify(context)}`;

  return {
    model,
    max_tokens: 400,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  };
}
/**
 * Parses the AI service's response into a structured prediction object.
 * @param {*} response the raw response from the AI service
 * @returns {object} the parsed prediction object
 */
function parseClaudePrediction(response) {
  const text = (response.content || [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();

  let prediction;
  try {
    prediction = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    throw new Error('Claude returned an invalid prediction format.');
  }

  if (!prediction || typeof prediction.winner !== 'string' || typeof prediction.rationale !== 'string') {
    throw new Error('Claude returned an incomplete prediction.');
  }

  return {
    winner: prediction.winner,
    confidence: Math.max(0, Math.min(100, Math.round(Number(prediction.confidence) || 0))),
    rationale: prediction.rationale,
    dataAvailability: typeof prediction.dataAvailability === 'string' ? prediction.dataAvailability : '',
  };
}

// Expose the build and parse functions for testing or server-side use.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildClaudePredictionRequest, parseClaudePrediction };
}