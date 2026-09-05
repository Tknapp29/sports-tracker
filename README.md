<h1>Live Sports Tracker</h1>
<p>
    This is a web-based live sports tracker for MLB, NBA, NFL, and NHL, featuring real-time scores, standings, game details, favorites, betting odds, and AI-powered game predictions using ESPN data and Claude.
</p>
<h2>Files</h2>
<h3>Styles</h3>
<ul>
    <li><strong>styles.css:</strong> Contains all the styles for this project</li>
</ul>
<h3>HTML</h3>
<ul>
    <li><strong>index.html:</strong> HTML source file for all pages</li>
</ul>
<h3>JavaScript</h3>
<ul>
    <li><strong>ai.js:</strong> Sends matchup context to the AI endpoint, builds and validates predictions, and displays the results</li>
    <li><strong>data.js:</strong> Fetches games, standings, team schedules, statistics, odds, and league data</li>
    <li><strong>favorites.js:</strong> Manages user favorites using localStorage, including saving, removing, toggling, and filtering favorites</li>
    <li><strong>navigation.js:</strong> Connects buttons and view controls for league loading, data navigation, rankings, and league viewing</li>
    <li><strong>render.js:</strong> Renders game rows, scores, team information, player statistics, odds, rankings, favorites, and game detail content</li>
    <li><strong>utils.js:</strong> Contains helper functions for various tasks and formatting</li>
    <li><strong>server.js:</strong> Runs the Express server, serves the frontend, retrieves ESPN data, and handles AI prediction requests</li>
</ul>
<h2>Required Before Running</h2>
<ul>
    <li>Node.js</li>
    <li>VS Code</li>
    <li>An <code>.env</code> file containing an Anthropic API key for AI predictions</li>
</ul>
<h2>How to Run</h2>
<ol>
    <li>Open the terminal and navigate to the project directory once the project is loaded on your device</li>
    <li>In the terminal, type <code>npm start</code></li>
    <li>Open a browser and navigate to <code>localhost</code> using the specified port</li>
</ol>
