const zarFormatter = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 });
const amountFormatter = new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const countrySelect = document.querySelector("#countrySelect");
const amountInput = document.querySelector("#amountInput");
const amountSlider = document.querySelector("#amountSlider");
const serviceFeeEl = document.querySelector("#serviceFee");
const taxChargedEl = document.querySelector("#taxCharged");
const exchangeRateEl = document.querySelector("#exchangeRate");
const sendAmountEl = document.querySelector("#sendAmount");
const receiverGetsEl = document.querySelector("#receiverGets");
const rateDetails = document.querySelector("#rateDetails");
const countryTable = document.querySelector("#countryTable");
const countrySearch = document.querySelector("#countrySearch");
const countryRateBoards = document.querySelector("#countryRateBoards");
const liveRateSource = document.querySelector("#liveRateSource");

let liveRoutes = [];
const dailyLimitZar = 5000;
const baseReceiverAmounts = [11, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 260, 270, 275, 280];
const fallbackLiveRoutes = [
  { countryName: "ZIMBABWE", isoCode: "ZWE", paymentTypeId: "541", paymentTypeName: "Cash Pay", currencyCode: "USD" },
  { countryName: "ZIMBABWE", isoCode: "ZWE", paymentTypeId: "1437", paymentTypeName: "Ecocash", currencyCode: "USD" },
  { countryName: "ZIMBABWE", isoCode: "ZWE", paymentTypeId: "1440", paymentTypeName: "ZB Rand Wallet", currencyCode: "ZAR" }
];
const sendhomeShownCountries = [
  { code: "ZW", isoCode: "ZWE", name: "Zimbabwe" },
  { code: "MW", isoCode: "MWI", name: "Malawi" },
  { code: "ZM", isoCode: "ZMB", name: "Zambia" },
  { code: "BW", isoCode: "BWA", name: "Botswana" },
  { code: "MZ", isoCode: "MOZ", name: "Mozambique" },
  { code: "KE", isoCode: "KEN", name: "Kenya" },
  { code: "UG", isoCode: "UGA", name: "Uganda" },
  { code: "TZ", isoCode: "TZA", name: "Tanzania" },
  { code: "GH", isoCode: "GHA", name: "Ghana" },
  { code: "AU", isoCode: "AUS", name: "Australia" },
  { code: "BI", isoCode: "BDI", name: "Burundi" },
  { code: "BD", isoCode: "BGD", name: "Bangladesh" },
  { code: "CN", isoCode: "CHN", name: "China" },
  { code: "DE", isoCode: "DEU", name: "Germany" },
  { code: "EG", isoCode: "EGY", name: "Egypt" },
  { code: "FR", isoCode: "FRA", name: "France" },
  { code: "GB", isoCode: "GBR", name: "United Kingdom" },
  { code: "IN", isoCode: "IND", name: "India" },
  { code: "NG", isoCode: "NGA", name: "Nigeria" },
  { code: "PK", isoCode: "PAK", name: "Pakistan" },
  { code: "SO", isoCode: "SOM", name: "Somalia" },
  { code: "US", isoCode: "USA", name: "United States" },
  { code: "CD", isoCode: "COD", name: "DRC Congo" },
  { code: "SZ", isoCode: "SWZ", name: "Eswatini" },
  { code: "LS", isoCode: "LSO", name: "Lesotho" },
  { code: "NA", isoCode: "NAM", name: "Namibia" }
];

function dayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function updateLiveRateSource() {
  const now = new Date();
  liveRateSource.textContent = `Source: SendHome live rates checked ${now.toLocaleString("en-ZA")}.`;
}

function routeKey(route) {
  return `${route.isoCode}|${route.paymentTypeId}`;
}

function routeLabel(route) {
  return `${route.countryName} - ${route.paymentTypeName} (${route.currencyCode})`;
}

function clampAmount(value) {
  return Math.min(5000, Math.max(10, Number(value) || 10));
}

function money(value) {
  return zarFormatter.format(Number(value) || 0);
}

function destinationAmount(value, currency) {
  return `${currency} ${amountFormatter.format(Number(value) || 0)}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Could not read SendHome response.");
  }

  if (!response.ok || data.code === "1" || data.type === "error") {
    throw new Error(data.message || "SendHome rate request failed.");
  }

  return data;
}

async function loadRoutes() {
  countryTable.innerHTML = `<tr><td colspan="5">Loading live SendHome rates...</td></tr>`;
  countryRateBoards.innerHTML = `<p class="empty-note">Loading live country rate boards...</p>`;

  try {
    liveRoutes = await fetchJson("/api/sendhome/countries");
  } catch {
    liveRoutes = fallbackLiveRoutes;
    liveRateSource.textContent = "Source: using SendHome route fallback while live country list loads.";
  }

  updateLiveRateSource();
  liveRoutes.sort((a, b) => routeLabel(a).localeCompare(routeLabel(b)));

  renderCountrySelect();

  document.querySelector("#countryCount").textContent = String(liveRoutes.length);
  renderTable();
  calculate();
  renderCountryRateBoards().catch(() => {
    countryRateBoards.innerHTML = `<p class="empty-note">Could not load live country rate boards. The calculator above is still available.</p>`;
  });
}

function selectedRoute() {
  if (countrySelect.value.startsWith("unsupported-")) {
    return null;
  }
  return liveRoutes.find((route) => routeKey(route) === countrySelect.value) || liveRoutes[0];
}

function renderCountrySelect() {
  const liveIsoCodes = new Set(liveRoutes.map((route) => route.isoCode));
  const unavailableCountries = sendhomeShownCountries.filter((country) => !liveIsoCodes.has(country.isoCode));

  countrySelect.innerHTML = `
    <optgroup label="Live SendHome calculator rates">
      ${liveRoutes.map((route) => `<option value="${routeKey(route)}">${routeLabel(route)}</option>`).join("")}
    </optgroup>
    <optgroup label="Other countries shown on SendHome">
      ${unavailableCountries
        .map((country) => `<option value="unsupported-${country.isoCode}">${country.name} - live rate not available yet</option>`)
        .join("")}
    </optgroup>
  `;
}

async function sendhomeCalculate(route, amount) {
  return fetchJson("/api/sendhome/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(amount),
      country: route.isoCode,
      paymentMethodMappingId: route.paymentTypeId
    })
  });
}

async function renderTable() {
  const query = countrySearch.value.trim().toLowerCase();
  const routes = liveRoutes.filter((route) => {
    return routeLabel(route).toLowerCase().includes(query);
  });

  countryTable.innerHTML = routes
    .map(
      (route) => `
        <tr>
          <td>${route.countryName}</td>
          <td>${route.paymentTypeName}</td>
          <td>${route.currencyCode}</td>
          <td class="route-rate" data-route="${routeKey(route)}">Loading</td>
          <td class="route-total" data-route="${routeKey(route)}">Loading</td>
        </tr>
      `
    )
    .join("");

  await Promise.all(routes.map(updateTableQuote));
}

function quoteCellId(route, amount) {
  return `route-${route.isoCode}-${route.currencyCode}-${route.paymentTypeId}-${amount}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function rateCellId(groupKey, amount) {
  return `rate-${groupKey}-${amount}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function boardBodyId(groupKey) {
  return `board-body-${groupKey}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function routeGroups() {
  const groups = new Map();
  liveRoutes.forEach((route) => {
    const key = `${route.countryName}|${route.currencyCode}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        countryName: route.countryName,
        currencyCode: route.currencyCode,
        routes: []
      });
    }
    groups.get(key).routes.push(route);
  });

  return Array.from(groups.values()).sort((a, b) => {
    return `${a.countryName} ${a.currencyCode}`.localeCompare(`${b.countryName} ${b.currencyCode}`);
  });
}

async function renderCountryRateBoards() {
  const groups = routeGroups();
  if (groups.length === 0) {
    countryRateBoards.innerHTML = `<p class="empty-note">No live SendHome rate routes are available right now.</p>`;
    return;
  }

  const boardData = groups.map((group) => ({
    ...group,
    maxAmount: null,
    amounts: baseReceiverAmounts
  }));

  countryRateBoards.innerHTML = boardData.map(renderCountryRateBoard).join("");
  boardData.forEach((group) => {
    group.amounts.forEach((amount) => {
      group.routes.forEach((route) => updateBoardQuote(group, route, amount));
    });
    addLimitRow(group);
  });
}

function renderCountryRateBoard(group) {
  return `
    <section class="rate-board">
      <div class="rate-board-heading">
        <div>
          <p class="eyebrow">${group.currencyCode} payout</p>
          <h3>${group.countryName}</h3>
        </div>
        <span class="limit-badge">Limit R5,000</span>
      </div>
      <div class="table-wrap country-board-wrap">
        <table>
          <thead>
            <tr>
              <th>They get</th>
              ${group.routes.map((route) => `<th>${route.paymentTypeName} amount to pay</th>`).join("")}
              <th>Rate</th>
            </tr>
          </thead>
          <tbody id="${boardBodyId(group.key)}">
            ${group.amounts
              .map(
                (amount) => `
                  <tr data-amount="${amount}">
                    ${renderBoardRowCells(group, amount, amount === group.maxAmount)}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderBoardRowCells(group, amount, isLimitRow) {
  return `
    <td>${isLimitRow ? "Daily limit max: " : ""}${group.currencyCode} ${amountFormatter.format(amount)}</td>
    ${group.routes.map((route) => `<td id="${quoteCellId(route, amount)}">Loading</td>`).join("")}
    <td id="${rateCellId(group.key, amount)}">Loading</td>
  `;
}

async function addLimitRow(group) {
  const tableBody = document.querySelector(`#${boardBodyId(group.key)}`);
  if (!tableBody) {
    return;
  }

  try {
    const maxAmount = await findLimitAmount(group.routes);
    tableBody.querySelectorAll("tr[data-amount]").forEach((row) => {
      const rowAmount = Number(row.dataset.amount);
      if (rowAmount > maxAmount) {
        row.remove();
      }
    });

    if (baseReceiverAmounts.includes(maxAmount)) {
      const firstCell = tableBody.querySelector(`tr[data-amount="${maxAmount}"] td:first-child`);
      if (firstCell) {
        firstCell.textContent = `Daily limit max: ${group.currencyCode} ${amountFormatter.format(maxAmount)}`;
      }
      return;
    }

    const row = document.createElement("tr");
    row.dataset.amount = String(maxAmount);
    row.innerHTML = renderBoardRowCells(group, maxAmount, true);
    tableBody.appendChild(row);
    group.routes.forEach((route) => updateBoardQuote(group, route, maxAmount));
  } catch {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="${group.routes.length + 2}">Daily limit max could not be loaded right now.</td>`;
    tableBody.appendChild(row);
  }
}

async function findLimitAmount(routes) {
  let low = 1;
  let high = 1000;

  while (await allRoutesWithinLimit(routes, high)) {
    low = high;
    high *= 2;
    if (high > 10000) {
      break;
    }
  }

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (await allRoutesWithinLimit(routes, middle)) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

async function allRoutesWithinLimit(routes, amount) {
  try {
    const quotes = await Promise.allSettled(routes.map((route) => sendhomeCalculate(route, amount)));
    const successfulQuotes = quotes
      .filter((quote) => quote.status === "fulfilled")
      .map((quote) => quote.value);

    if (successfulQuotes.length === 0) {
      return false;
    }

    return successfulQuotes.every((quote) => Number(quote.totalAmount) <= dailyLimitZar);
  } catch {
    return false;
  }
}

async function updateBoardQuote(group, route, amount) {
  const cell = document.querySelector(`#${quoteCellId(route, amount)}`);
  const rateCell = document.querySelector(`#${rateCellId(group.key, amount)}`);
  if (!cell) {
    return;
  }

  try {
    const quote = await sendhomeCalculate(route, amount);
    cell.textContent = money(quote.totalAmount);
    if (rateCell && rateCell.textContent === "Loading") {
      rateCell.textContent = `1 ${quote.receivingCurrencyCode} = ${money(1 / Number(quote.exchangeRate || 1))}`;
    }
  } catch {
    cell.textContent = "Unavailable";
    if (rateCell && rateCell.textContent === "Loading") {
      rateCell.textContent = "Unavailable";
    }
  }
}

async function updateTableQuote(route) {
  const rateCell = document.querySelector(`.route-rate[data-route="${routeKey(route)}"]`);
  const totalCell = document.querySelector(`.route-total[data-route="${routeKey(route)}"]`);
  if (!rateCell || !totalCell) {
    return;
  }

  try {
    const quote = await sendhomeCalculate(route, 100);
    rateCell.textContent = `1 ${quote.receivingCurrencyCode} = ${money(1 / Number(quote.exchangeRate || 1))}`;
    totalCell.textContent = money(quote.totalAmount);
  } catch {
    rateCell.textContent = "Unavailable";
    totalCell.textContent = "Unavailable";
  }
}

async function calculate() {
  const route = selectedRoute();
  if (!route) {
    rateDetails.textContent = "Live rates are not available for this country yet. Please choose a live Zimbabwe payout method.";
    serviceFeeEl.textContent = "Unavailable";
    taxChargedEl.textContent = "Unavailable";
    exchangeRateEl.textContent = "Unavailable";
    sendAmountEl.textContent = "Unavailable";
    receiverGetsEl.textContent = "Unavailable";
    return;
  }

  const amount = clampAmount(amountInput.value);
  amountInput.value = amount;
  amountSlider.value = amount;
  rateDetails.textContent = "Fetching live SendHome rate...";

  try {
    const quote = await sendhomeCalculate(route, amount);
    serviceFeeEl.textContent = money(quote.remittanceFee);
    taxChargedEl.textContent = `${quote.taxType || "VAT"} ${money(quote.taxCharged)}`;
    exchangeRateEl.textContent = `1 ${quote.receivingCurrencyCode} = ${money(1 / Number(quote.exchangeRate || 1))}`;
    sendAmountEl.textContent = money(quote.remittanceAmount);
    receiverGetsEl.textContent = money(quote.totalAmount);
    rateDetails.textContent = `Receiver gets ${destinationAmount(quote.estimatedReceivingAmount, quote.receivingCurrencyCode)} via ${route.paymentTypeName}. Rate date ${dayKey()}.`;
  } catch (error) {
    rateDetails.textContent = error.message || "Could not fetch SendHome rate.";
    serviceFeeEl.textContent = "Unavailable";
    taxChargedEl.textContent = "Unavailable";
    exchangeRateEl.textContent = "Unavailable";
    sendAmountEl.textContent = "Unavailable";
    receiverGetsEl.textContent = "Unavailable";
  }
}

amountInput.addEventListener("input", calculate);
amountSlider.addEventListener("input", () => {
  amountInput.value = amountSlider.value;
  calculate();
});
countrySelect.addEventListener("change", calculate);
countrySearch.addEventListener("input", renderTable);

document.querySelector("#todayLabel").textContent = dayKey();
loadRoutes().catch(() => {
  liveRoutes = fallbackLiveRoutes;
  renderCountrySelect();
  document.querySelector("#countryCount").textContent = String(liveRoutes.length);
  liveRateSource.textContent = "Source: SendHome live rates could not be reached.";
  rateDetails.textContent = "Using fallback Zimbabwe routes. Amounts still call the live rate calculator.";
  renderTable();
  calculate();
  renderCountryRateBoards();
});
