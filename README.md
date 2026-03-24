# Crossover_trade_Website

## Trader Dashboard Starter

This project is a production-minded vanilla HTML/CSS/JS trading dashboard that reads from Google Sheets (GViz or CSV) with mock fallback data for development.

### How to publish a Google Sheet for web access
1. Open your sheet in Google Sheets.
2. Go to **File → Share → Publish to web**.
3. Publish the specific tab that has your dashboard data.
4. Keep the sheet link handy.

### How to get the Sheet ID and gid
Given a sheet URL like:

`https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=123456789`

- `SHEET_ID` is the long token after `/d/`.
- `gid` is the number after `#gid=`.

### How to switch from mock mode to live mode
1. Open `app.js`.
2. Pick one live mode:
   - **Single tab mode**: set `CONFIG.sheetId` + `CONFIG.gid`.
   - **All tabs as years mode**: set `CONFIG.publishedDocUrl` to your `/pubhtml` link and set `CONFIG.useAllTabsAsYears = true`.
     - If browser tab auto-discovery fails, add tab gids in `CONFIG.publishedTabGids`.
3. Set `CONFIG.useMockData = false`.
4. If using single tab mode, choose `CONFIG.sourceType = "gviz"` (recommended) or `"csv"`.
5. Reload the page.

### Using different Google Sheet tabs for different years
- Yes — this starter supports reading the entire published workbook and treating tabs like year buckets.
- Name tabs with a 4-digit year (for example: `2023`, `2024`, `2025`) so year inference is automatic.
- The app will:
  - discover all published tabs from the `pubhtml` page,
  - or use `publishedTabGids` as a fallback list when discovery is blocked,
  - fetch each tab as CSV,
  - merge rows into one dataset,
  - infer `year` from tab names when row-level year is missing.

### How to host the site
Because this is static, you can host on:
- **GitHub Pages** (push to repo and enable Pages)
- **Netlify** (drag and drop folder or connect repo)
- **Vercel** (import repo as static site)

No build step is required.
