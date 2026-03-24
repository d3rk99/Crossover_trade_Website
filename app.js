/*
============================================================
Google Sheets Dashboard Setup Guide
============================================================
1) In Google Sheets: File -> Share -> Publish to web.
2) Publish the entire document if you want multi-year tabs.
3) Copy your Sheet ID from the URL:
   https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=<GID>
4) For "published link mode", copy your /pubhtml URL instead.
5) Update CONFIG.sheetId or CONFIG.publishedDocUrl, then set useMockData.
6) Set CONFIG.useAllTabsAsYears = true to read every published tab.
7) Choose CONFIG.sourceType: "gviz" (recommended) or "csv".
7) Keep mock mode ON while styling, then set useMockData = false.
============================================================
*/

const CONFIG = {
  // Hard-baked sheet publish ID / tab ID from your provided document.
  sheetId: "2PACX-1vTDlLOzWU88kePqpnHktdWqCqepvHY7KWDNQz1i1mOH_jE8nVhs6v3KNCVh8Nf8fldkHGDvw5BL29yE",
  gid: "2038072277",
  publishedDocUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDlLOzWU88kePqpnHktdWqCqepvHY7KWDNQz1i1mOH_jE8nVhs6v3KNCVh8Nf8fldkHGDvw5BL29yE/pubhtml#gid=2038072277",
  // Optional: manually list tab gids when auto-discovery is blocked by browser/CORS.
  publishedTabGids: ["2038072277"],
  // Live mode by default.
  useMockData: false,
  // Keep false by default for reliability; set true once you add tab gids or discovery works.
  useAllTabsAsYears: false,
  sourceType: "csv", // "gviz" or "csv"
  sheetName: "",
  publishedUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTDlLOzWU88kePqpnHktdWqCqepvHY7KWDNQz1i1mOH_jE8nVhs6v3KNCVh8Nf8fldkHGDvw5BL29yE/pub?gid=2038072277&single=true&output=csv",
  columnMappings: {
    date: ["date", "trade_date"],
    month: ["month"],
    year: ["year"],
    day: ["day"],
    time: ["time"],
    result: ["result", "win_loss"],
    profit: ["profit", "gross_positive", "gross_plus"],
    loss: ["loss", "gross_negative", "gross_minus"],
    net: ["net", "pnl"],
    winRate: ["win_rate", "winrate"],
    wins: ["wins", "total_wins"],
    losses: ["losses", "total_losses"],
    drawdown: ["drawdown", "dd"],
    losingStreak: ["losing_streak", "loss_streak"],
    safetyWins: ["safety_wins"],
    endMarketWins: ["end_of_market_wins", "eom_wins"],
    fullTargetWins: ["full_target_wins"],
    notes: ["notes", "comment"],
    trader: ["trader", "name"],
    tabYear: ["tab_year", "__tab_year"],
    sourceTab: ["source_tab", "__tab_name", "tab_name"]
  }
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const MOCK_SHEET_ROWS = [
  ["Date", "Month", "Year", "Day", "Time", "Result", "Profit", "Loss", "Net", "Win Rate", "Losing Streak", "Drawdown", "Safety Wins", "End of Market Wins", "Full Target Wins", "Trader", "Notes"],
  ["2026-01-03", "January", "2026", "Mon", "09:35", "Win", "450", "0", "450", "100%", "0", "0", "1", "0", "1", "Alpha", "Strong open momentum"],
  ["2026-01-04", "January", "2026", "Tue", "10:05", "Loss", "0", "-220", "-220", "50%", "1", "220", "0", "0", "0", "Alpha", "Stopped out quickly"],
  ["2026-02-01", "February", "2026", "Thu", "09:50", "Win", "380", "0", "380", "66.7%", "0", "180", "1", "1", "0", "Alpha", "Follow-through trend"],
  ["2026-02-12", "February", "2026", "Mon", "10:20", "Win", "410", "0", "410", "75%", "0", "120", "1", "0", "1", "Alpha", "Clean retest entry"],
  ["2026-02-19", "February", "2026", "Mon", "11:00", "Loss", "0", "-280", "-280", "60%", "1", "280", "0", "0", "0", "Alpha", "Choppy session"],
  ["2026-03-03", "March", "2026", "Wed", "09:45", "Win", "525", "0", "525", "66.7%", "0", "165", "1", "1", "1", "Alpha", "Breakout continuation"],
  ["2026-03-08", "March", "2026", "Mon", "10:15", "Loss", "0", "-190", "-190", "57.1%", "1", "250", "0", "0", "0", "Alpha", "Late entry"],
  ["2026-03-12", "March", "2026", "Fri", "09:40", "Win", "610", "0", "610", "62.5%", "0", "190", "1", "1", "1", "Alpha", "High conviction open"],
  ["Monthly Summary", "March", "2026", "", "", "", "", "", "945", "62.5%", "", "250", "", "", "", "", "Monthly summary row"]
];

const state = {
  rawRows: [],
  records: [],
  filteredRecords: [],
  monthlySummary: [],
  sortMonthlyNewest: true,
  charts: {}
};

const els = {
  yearFilter: document.getElementById("yearFilter"),
  monthFilter: document.getElementById("monthFilter"),
  traderFilter: document.getElementById("traderFilter"),
  lastUpdated: document.getElementById("lastUpdated"),
  kpiGrid: document.getElementById("kpiGrid"),
  exportTradesBtn: document.getElementById("exportTradesBtn"),
  sortSummaryBtn: document.getElementById("sortSummaryBtn"),
  appMessage: document.getElementById("appMessage"),
  recentTradesBody: document.querySelector("#recentTradesTable tbody"),
  monthlySummaryBody: document.querySelector("#monthlySummaryTable tbody")
};

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  bindEvents();
  setLoadingState(true);

  try {
    const rows = await fetchSheetData();
    state.rawRows = rows;
    state.records = normalizeTradeData(rows);

    if (!state.records.length) {
      throw new Error("No valid rows found. Check your column mappings and published sheet format.");
    }

    populateFilters(state.records);
    applyFilters();
    els.lastUpdated.textContent = new Date().toLocaleString();
  } catch (error) {
    console.error(error);
    showMessage("Could not load live Google Sheet. Displaying mock sample data.");
    state.rawRows = MOCK_SHEET_ROWS;
    state.records = normalizeTradeData(MOCK_SHEET_ROWS);
    populateFilters(state.records);
    applyFilters();
    els.lastUpdated.textContent = `${new Date().toLocaleString()} (mock data)`;
  } finally {
    setLoadingState(false);
  }
}

function bindEvents() {
  [els.yearFilter, els.monthFilter, els.traderFilter].forEach((el) => {
    el.addEventListener("change", applyFilters);
  });

  els.exportTradesBtn.addEventListener("click", () => {
    exportRecordsAsCsv(state.filteredRecords, "filtered-trades.csv");
  });

  els.sortSummaryBtn.addEventListener("click", () => {
    state.sortMonthlyNewest = !state.sortMonthlyNewest;
    els.sortSummaryBtn.textContent = state.sortMonthlyNewest
      ? "Sort: Newest First"
      : "Sort: Oldest First";
    renderTables(state.filteredRecords);
  });
}

async function fetchSheetData() {
  if (CONFIG.useMockData) return MOCK_SHEET_ROWS;

  if (CONFIG.useAllTabsAsYears) {
    if (!CONFIG.publishedDocUrl) {
      throw new Error("Missing CONFIG.publishedDocUrl for all-tabs mode");
    }
    return fetchAllTabsFromPublishedDoc(CONFIG.publishedDocUrl);
  }

  if (CONFIG.sourceType === "csv") {
    if (!CONFIG.sheetId || CONFIG.sheetId === "REPLACE_ME") {
      throw new Error("Missing CONFIG.sheetId");
    }
    const csvUrl =
      CONFIG.publishedUrl ||
      `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/export?format=csv&gid=${CONFIG.gid}`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Failed to fetch CSV");
    const text = await response.text();
    return parseCsv(text);
  }

  if (!CONFIG.sheetId || CONFIG.sheetId === "REPLACE_ME") {
    throw new Error("Missing CONFIG.sheetId");
  }

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?gid=${CONFIG.gid}`;
  const response = await fetch(gvizUrl);
  if (!response.ok) throw new Error("Failed to fetch GViz");
  const text = await response.text();
  return parseGviz(text);
}

async function fetchAllTabsFromPublishedDoc(pubhtmlUrl) {
  let tabs = [];
  try {
    tabs = await discoverPublishedTabs(pubhtmlUrl);
  } catch (error) {
    console.warn("Tab discovery failed, falling back to CONFIG.publishedTabGids", error);
  }

  if (!tabs.length && Array.isArray(CONFIG.publishedTabGids) && CONFIG.publishedTabGids.length) {
    tabs = CONFIG.publishedTabGids.map((gid) => ({ gid: String(gid), name: `Tab ${gid}` }));
  }

  if (!tabs.length) {
    throw new Error("No published tabs available. Add CONFIG.publishedTabGids manually.");
  }

  const allTabObjects = [];

  for (const tab of tabs) {
    const csvUrl = buildPublishedTabCsvUrl(pubhtmlUrl, tab.gid);
    const response = await fetch(csvUrl);
    if (!response.ok) {
      console.warn(`Skipping tab "${tab.name}" (${tab.gid}) due to fetch error.`);
      continue;
    }

    const text = await response.text();
    const rows = parseCsv(text);
    if (!rows.length) continue;

    const records = rowsToObjects(rows, {
      sourceTab: tab.name,
      tabYear: inferYearFromTabName(tab.name)
    });
    allTabObjects.push(...records);
  }

  if (!allTabObjects.length) {
    throw new Error("All published tabs failed to load or were empty");
  }

  return objectsToRows(allTabObjects);
}

async function discoverPublishedTabs(pubhtmlUrl) {
  const response = await fetch(pubhtmlUrl);
  if (!response.ok) throw new Error("Failed to fetch published tab index");
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const tabCandidates = [];
  const links = [...doc.querySelectorAll("a[href*='gid=']")];
  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const name = (link.textContent || "").trim();
    const gidMatch = href.match(/gid=(\d+)/);
    if (!gidMatch) return;
    const gid = gidMatch[1];
    if (!gid || !name) return;
    tabCandidates.push({ gid, name });
  });

  const deduped = new Map();
  tabCandidates.forEach((tab) => {
    if (!deduped.has(tab.gid)) deduped.set(tab.gid, tab);
  });

  return [...deduped.values()];
}

function buildPublishedTabCsvUrl(pubhtmlUrl, gid) {
  const clean = pubhtmlUrl.split("#")[0];
  const base = clean.replace(/\/pubhtml(?:\?.*)?$/i, "/pub");
  return `${base}?gid=${gid}&single=true&output=csv`;
}

function inferYearFromTabName(name) {
  const match = String(name || "").match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function parseGviz(payload) {
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Invalid GViz response");
  const json = JSON.parse(payload.slice(start, end + 1));

  const headers = json.table.cols.map((col, idx) => col.label || col.id || `col_${idx}`);
  const rows = json.table.rows.map((row) =>
    (row.c || []).map((cell) => {
      if (!cell) return "";
      return cell.f ?? cell.v ?? "";
    })
  );

  return [headers, ...rows];
}

function parseCsv(csvText) {
  return csvText
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      line
        .split(",")
        .map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim())
    );
}

function rowsToObjects(rows, tabMeta = {}) {
  const [headers = [], ...dataRows] = rows;
  const normalizedHeaders = headers.map((header, idx) => normalizeHeader(header) || `col_${idx}`);

  return dataRows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => {
      const obj = {};
      normalizedHeaders.forEach((key, i) => {
        obj[key] = row[i] ?? "";
      });
      obj.__tab_name = tabMeta.sourceTab || "";
      obj.__tab_year = tabMeta.tabYear || "";
      return obj;
    });
}

function objectsToRows(items) {
  const headers = [];
  const seen = new Set();

  items.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });

  const rows = items.map((item) => headers.map((header) => item[header] ?? ""));
  return [headers, ...rows];
}

function normalizeTradeData(rows) {
  const [headers = [], ...dataRows] = rows;
  const headerMap = buildHeaderMap(headers);

  return dataRows
    .map((row) => mapRowToRecord(row, headerMap))
    .filter((record) => isValidRecord(record))
    .sort((a, b) => new Date(a.dateObj) - new Date(b.dateObj));
}

function buildHeaderMap(headers) {
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));
  const map = {};

  Object.entries(CONFIG.columnMappings).forEach(([key, aliases]) => {
    map[key] = normalizedHeaders.findIndex((header) => aliases.includes(header));
  });

  return map;
}

function mapRowToRecord(row, headerMap) {
  const get = (key) => {
    const idx = headerMap[key];
    return idx >= 0 ? row[idx] : "";
  };

  const dateRaw = get("date");
  const monthRaw = get("month");
  const yearRaw = get("year");
  const tabYearRaw = get("tabYear");

  const dateObj = parseDate(dateRaw, monthRaw, yearRaw);
  const month = normalizeMonth(monthRaw || (dateObj ? MONTHS[dateObj.getMonth()] : ""));

  const record = {
    date: dateObj ? formatDate(dateObj) : `${month || "Unknown"} ${yearRaw || ""}`.trim(),
    dateObj: dateObj || new Date(`${month || "January"} 1, ${yearRaw || new Date().getFullYear()}`),
    day: get("day") || (dateObj ? dateObj.toLocaleDateString(undefined, { weekday: "short" }) : ""),
    time: get("time") || "--",
    result: String(get("result") || "").trim(),
    profit: toNumber(get("profit")),
    loss: toNumber(get("loss")),
    net: toNumber(get("net")),
    winRate: toPercentValue(get("winRate")),
    wins: toInteger(get("wins")),
    losses: toInteger(get("losses")),
    drawdown: Math.abs(toNumber(get("drawdown"))),
    losingStreak: toInteger(get("losingStreak")),
    safetyWins: toInteger(get("safetyWins")),
    endMarketWins: toInteger(get("endMarketWins")),
    fullTargetWins: toInteger(get("fullTargetWins")),
    notes: get("notes") || "",
    trader: get("trader") || "Unknown",
    sourceTab: get("sourceTab") || "",
    month,
    year:
      toInteger(yearRaw) ||
      toInteger(tabYearRaw) ||
      (dateObj ? dateObj.getFullYear() : new Date().getFullYear())
  };

  if (!record.net && record.profit && record.loss) {
    record.net = record.profit + record.loss;
  }

  if (!record.result) {
    record.result = record.net >= 0 ? "Win" : "Loss";
  }

  return record;
}

function isValidRecord(record) {
  if (!record) return false;
  const isSummaryRow = /summary|total/i.test(record.date) || /summary|total/i.test(record.notes);
  if (isSummaryRow) return false;

  const hasEnoughData = record.month || record.year || record.net || record.result;
  return Boolean(hasEnoughData);
}

function applyFilters() {
  const selectedYear = els.yearFilter.value;
  const selectedMonth = els.monthFilter.value;
  const selectedTrader = els.traderFilter.value;

  state.filteredRecords = state.records.filter((record) => {
    const yearMatch = selectedYear === "all" || String(record.year) === selectedYear;
    const monthMatch = selectedMonth === "all" || record.month === selectedMonth;
    const traderMatch = selectedTrader === "all" || record.trader === selectedTrader;
    return yearMatch && monthMatch && traderMatch;
  });

  const summary = computeSummaryStats(state.filteredRecords);
  renderKpis(summary);
  renderCharts(state.filteredRecords);
  renderTables(state.filteredRecords);
}

function computeSummaryStats(records) {
  const totalNet = sumBy(records, "net");
  const totalProfit = sumBy(records, "profit");
  const totalLossMagnitude = Math.abs(sumBy(records, "loss"));

  const totalWins = records.filter((r) => r.net >= 0).length;
  const totalLosses = records.filter((r) => r.net < 0).length;
  const winRate = records.length ? (totalWins / records.length) * 100 : 0;

  let runningLosingStreak = 0;
  let maxLosingStreak = 0;
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  records.forEach((record) => {
    if (record.net < 0) {
      runningLosingStreak += 1;
      maxLosingStreak = Math.max(maxLosingStreak, runningLosingStreak);
    } else {
      runningLosingStreak = 0;
    }

    equity += record.net;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  return {
    totalNet,
    totalProfit,
    totalLossMagnitude,
    totalWins,
    totalLosses,
    winRate,
    currentLosingStreak: runningLosingStreak,
    maxLosingStreak,
    maxDrawdown,
    fullTargetWins: sumBy(records, "fullTargetWins"),
    safetyWins: sumBy(records, "safetyWins"),
    endMarketWins: sumBy(records, "endMarketWins")
  };
}

function renderKpis(summary) {
  const cards = [
    { label: "Net P&L", value: formatMoney(summary.totalNet), className: summary.totalNet >= 0 ? "positive" : "negative" },
    { label: "Win Rate", value: `${summary.winRate.toFixed(1)}%`, className: summary.winRate >= 50 ? "positive" : "negative" },
    { label: "Total Wins", value: summary.totalWins, className: "positive" },
    { label: "Total Losses", value: summary.totalLosses, className: "negative" },
    {
      label: "Losing Streak",
      value: `${summary.currentLosingStreak} / ${summary.maxLosingStreak}`,
      className: summary.currentLosingStreak > 1 ? "negative" : ""
    },
    { label: "Total Drawdown", value: formatMoney(-summary.maxDrawdown), className: "negative" },
    { label: "Full Target Wins", value: summary.fullTargetWins, className: "positive" },
    { label: "Safety Wins", value: summary.safetyWins, className: "positive" },
    { label: "End of Market Wins", value: summary.endMarketWins, className: "positive" }
  ];

  els.kpiGrid.innerHTML = cards
    .map(
      (card) => `
      <article class="panel kpi-card">
        <div class="kpi-label">${card.label}</div>
        <div class="kpi-value ${card.className}">${card.value}</div>
        <div class="kpi-subtext">Filtered live view</div>
      </article>
    `
    )
    .join("");
}

function renderCharts(records) {
  const equityData = buildEquitySeries(records);
  const drawdownData = buildDrawdownSeries(records);
  const monthly = buildMonthlySummary(records);

  const labels = equityData.map((p) => p.label);
  const equitySeries = equityData.map((p) => p.value);

  upsertChart("equityChart", {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Equity",
        data: equitySeries,
        borderColor: "#5bc0ff",
        backgroundColor: "rgba(91, 192, 255, 0.14)",
        fill: true,
        tension: 0.25
      }]
    }
  });

  upsertChart("drawdownChart", {
    type: "line",
    data: {
      labels: drawdownData.map((p) => p.label),
      datasets: [{
        label: "Drawdown",
        data: drawdownData.map((p) => p.value),
        borderColor: "#ff6b7a",
        backgroundColor: "rgba(255, 107, 122, 0.16)",
        fill: true,
        tension: 0.2
      }]
    }
  });

  upsertChart("monthlyNetChart", {
    type: "bar",
    data: {
      labels: monthly.map((m) => m.label),
      datasets: [{
        label: "Monthly Net",
        data: monthly.map((m) => m.net),
        backgroundColor: monthly.map((m) => (m.net >= 0 ? "rgba(45, 223, 140, 0.65)" : "rgba(255, 107, 122, 0.65)")),
        borderRadius: 8
      }]
    }
  });

  upsertChart("winRateChart", {
    type: "line",
    data: {
      labels: monthly.map((m) => m.label),
      datasets: [{
        label: "Win Rate %",
        data: monthly.map((m) => Number(m.winRate.toFixed(2))),
        borderColor: "#f4c95d",
        backgroundColor: "rgba(244, 201, 93, 0.14)",
        fill: true,
        tension: 0.28
      }]
    },
    options: {
      scales: {
        y: { suggestedMin: 0, suggestedMax: 100 }
      }
    }
  });
}

function renderTables(records) {
  const recent = [...records].sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj)).slice(0, 20);

  els.recentTradesBody.innerHTML = recent
    .map(
      (r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.day}</td>
        <td>${r.time}</td>
        <td class="${r.net >= 0 ? "positive" : "negative"}">${r.result}</td>
        <td class="positive">${formatMoney(r.profit)}</td>
        <td class="negative">${formatMoney(r.loss)}</td>
        <td class="${r.net >= 0 ? "positive" : "negative"}">${formatMoney(r.net)}</td>
        <td>${r.sourceTab || "--"}</td>
        <td>${r.notes || "--"}</td>
      </tr>
    `
    )
    .join("");

  const monthly = buildMonthlySummary(records);
  const sortedMonthly = [...monthly].sort((a, b) =>
    state.sortMonthlyNewest ? b.year - a.year || b.monthIndex - a.monthIndex : a.year - b.year || a.monthIndex - b.monthIndex
  );

  els.monthlySummaryBody.innerHTML = sortedMonthly
    .map(
      (m) => `
      <tr>
        <td>${m.label}</td>
        <td class="positive">${m.wins}</td>
        <td class="negative">${m.losses}</td>
        <td class="${m.net >= 0 ? "positive" : "negative"}">${formatMoney(m.net)}</td>
        <td class="${m.winRate >= 50 ? "positive" : "negative"}">${m.winRate.toFixed(1)}%</td>
        <td class="negative">${formatMoney(-m.drawdown)}</td>
      </tr>
    `
    )
    .join("");
}

function buildMonthlySummary(records) {
  const map = new Map();

  records.forEach((r) => {
    const monthIndex = MONTHS.indexOf(r.month);
    const key = `${r.year}-${String(monthIndex + 1).padStart(2, "0")}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        year: r.year,
        month: r.month,
        monthIndex,
        label: `${r.month} ${r.year}`,
        wins: 0,
        losses: 0,
        net: 0,
        drawdown: 0,
        count: 0
      });
    }

    const bucket = map.get(key);
    bucket.count += 1;
    bucket.net += r.net;
    bucket.drawdown = Math.max(bucket.drawdown, r.drawdown || 0);
    if (r.net >= 0) bucket.wins += 1;
    else bucket.losses += 1;
  });

  return [...map.values()].map((m) => ({
    ...m,
    winRate: m.count ? (m.wins / m.count) * 100 : 0
  }));
}

function buildEquitySeries(records) {
  let cumulative = 0;
  return records.map((r) => {
    cumulative += r.net;
    return { label: r.date, value: Number(cumulative.toFixed(2)) };
  });
}

function buildDrawdownSeries(records) {
  let equity = 0;
  let peak = 0;

  return records.map((r) => {
    equity += r.net;
    peak = Math.max(peak, equity);
    return { label: r.date, value: Number((peak - equity).toFixed(2)) };
  });
}

function upsertChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (state.charts[canvasId]) {
    state.charts[canvasId].destroy();
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#e9eef7" } }
    },
    scales: {
      x: { ticks: { color: "#99a7bf", maxRotation: 0, autoSkip: true }, grid: { color: "rgba(153,167,191,0.12)" } },
      y: { ticks: { color: "#99a7bf" }, grid: { color: "rgba(153,167,191,0.12)" } }
    }
  };

  state.charts[canvasId] = new Chart(ctx, {
    ...config,
    options: {
      ...defaultOptions,
      ...(config.options || {})
    }
  });
}

function populateFilters(records) {
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  const months = [...new Set(records.map((r) => r.month))].filter(Boolean);
  const traders = [...new Set(records.map((r) => r.trader))].sort();

  setSelectOptions(els.yearFilter, years.map(String), "All Years");
  setSelectOptions(
    els.monthFilter,
    months.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b)),
    "All Months"
  );
  setSelectOptions(els.traderFilter, traders, "All Traders");
}

function setSelectOptions(selectEl, values, defaultLabel) {
  selectEl.innerHTML = `<option value="all">${defaultLabel}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function exportRecordsAsCsv(records, filename) {
  if (!records.length) {
    showMessage("No rows available for export in the current filter.");
    return;
  }

  const headers = ["Date", "Day", "Time", "Result", "Profit", "Loss", "Net", "Month", "Year", "Trader", "Source Tab", "Notes"];
  const lines = records.map((r) =>
    [r.date, r.day, r.time, r.result, r.profit, r.loss, r.net, r.month, r.year, r.trader, r.sourceTab, r.notes]
      .map(csvEscape)
      .join(",")
  );

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? "").replace(/"/g, '""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
}

function showMessage(text) {
  els.appMessage.hidden = false;
  els.appMessage.textContent = text;
  setTimeout(() => {
    els.appMessage.hidden = true;
  }, 5000);
}

function setLoadingState(isLoading) {
  document.body.style.cursor = isLoading ? "progress" : "default";
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDate(dateRaw, monthRaw, yearRaw) {
  if (dateRaw) {
    const parsed = new Date(dateRaw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (monthRaw && yearRaw) {
    const fallback = new Date(`${normalizeMonth(monthRaw)} 1, ${yearRaw}`);
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

function normalizeMonth(value) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const lower = clean.toLowerCase();
  const direct = MONTHS.find((month) => month.toLowerCase() === lower);
  if (direct) return direct;

  const short = MONTHS.find((month) => month.toLowerCase().startsWith(lower.slice(0, 3)));
  return short || clean;
}

function formatDate(dateObj) {
  return dateObj.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/[$,%\s]/g, "").replace(/,/g, "");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function toPercentValue(value) {
  if (String(value).includes("%")) return toNumber(value);
  const n = toNumber(value);
  return n <= 1 && n !== 0 ? n * 100 : n;
}

function sumBy(rows, key) {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}
