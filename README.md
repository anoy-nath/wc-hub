# World Cup 2026 — Live Hub

A live FIFA World Cup 2026 dashboard: today's matches, live win probabilities,
group tables with simulated advancement odds, a projected knockout bracket,
a Golden Boot race, and a team-vs-team comparison tool.

Live data comes from the open, public-domain openfootball feed (no API key).
Times auto-convert to each visitor's local timezone.

## Run locally
    npm install
    npm run dev

## Build
    npm run build      # outputs to /dist

## Data source
Edit `FEED_URL` at the top of `src/App.jsx` to switch feeds
(an optional faster-updating mirror is included as a comment).
