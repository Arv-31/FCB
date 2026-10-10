# MatchIntel — Sports Match Intelligence

Search two teams or fighters, see their full head-to-head history, and open any match for a
summary, sport-specific statistics, a timeline of key events and an automated analysis.

**Live site:** https://arv-31.github.io/FCB/

| Sport | Source (free, open) | Coverage |
|---|---|---|
| Cricket | [Cricsheet](https://cricsheet.org) ball-by-ball data | ~9,900 men's & women's international Tests, ODIs, T20Is |
| Football | [StatsBomb Open Data](https://github.com/statsbomb/open-data) | ~4,000 matches (World Cups, Euros, many La Liga seasons incl. 31 Clásicos, 2015/16 Premier League, …) |
| UFC | [UFCStats.com](http://ufcstats.com) via [scrape_ufc_stats](https://github.com/Greco1899/scrape_ufc_stats) | ~8,900 fights, round-by-round |
| Images | [TheSportsDB](https://www.thesportsdb.com) | Club badges & fighter photos (exact sport + name matches only) |

No API keys or paid services. Data is rebuilt weekly by GitHub Actions.

## Run locally

```bash
npm install
npm run setup     # downloads the open data (~75 MB) and builds public/data (~2 min)
npm run dev       # http://localhost:5199
```


## Deploy

`.github/workflows/deploy.yml` downloads the data, builds it, validates it and deploys to GitHub Pages
on every push to `main`, every Monday, and on demand (Actions → *Build data & deploy* → Run workflow).
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.
`netlify.toml` and `vercel.json` are included for those hosts too.

