# mtr-game

A **Match 5** puzzle game in the browser — swap adjacent tiles to make lines of 5+ matching colors, clear objectives, and win before you run out of steps.

**Play online:** https://potat2201.github.io/mtr-game/

## How to play

- **Board:** 8×8 grid with 4 colors (red, blue, green, yellow)
- **Match:** Swap two neighbors to form a horizontal or vertical line of **5 or more** of the same color
- **Steps:** You start with **10** moves; only successful swaps count
- **Win:** Erase at least **10** tiles of each color
- **Lose:** Steps reach 0 before all objectives are complete
- If no swap can create a match, the board refreshes automatically

## Run locally

```bash
git clone https://github.com/potat2201/mtr-game.git
cd mtr-game
python3 -m http.server 9876 --bind 0.0.0.0
```

Open http://localhost:9876/ (or your machine’s LAN IP on the same port).

You can also open `index.html` directly in a browser.

## GitHub Pages

This repo is set up for **GitHub Pages** from the `main` branch (root folder).

1. Push to `main`
2. In the repo: **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**
4. Save — the site will be at `https://potat2201.github.io/mtr-game/`

The `.nojekyll` file ensures static assets are served as-is.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure and HUD |
| `style.css` | Layout, colors, animations |
| `script.js` | Game logic |

## License

TBD.
