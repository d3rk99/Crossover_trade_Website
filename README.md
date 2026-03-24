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
2. Update `CONFIG.sheetId` and `CONFIG.gid`.
3. Set `CONFIG.useMockData = false`.
4. Choose `CONFIG.sourceType = "gviz"` (recommended) or `"csv"`.
5. Reload the page.

### How to host the site
Because this is static, you can host on:
- **GitHub Pages** (push to repo and enable Pages)
- **Netlify** (drag and drop folder or connect repo)
- **Vercel** (import repo as static site)

No build step is required.
