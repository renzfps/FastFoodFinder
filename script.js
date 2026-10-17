// ---------------------------------------------------------------------------
// FastFoodFinder
// Data layer:    data/<restaurant>.js files fill window.FASTFOODFINDER_DATA.
// Service layer: the functions under "Menu service" search, filter and sort.
// UI layer:      everything under "Rendering" and "Events".
// ---------------------------------------------------------------------------

const RESTAURANTS = {
  mcdonalds: { name: "McDonald's", logo: "M", className: "logo-mcdonalds", aliases: ["mcdonalds", "mcdonald", "mcd", "mcds", "mickey d"] },
  tacobell: { name: "Taco Bell", logo: "T", className: "logo-tacobell", aliases: ["taco bell", "tacobell"] },
  chipotle: { name: "Chipotle", logo: "C", className: "logo-chipotle", aliases: ["chipotle", "chipotle mexican grill"] }
};

// Categories hidden by the "Meals only" toggle (drinks, desserts, single ingredients).
const NON_MEAL_CATEGORIES = new Set(["Drinks", "McCafé®", "Sweets & Treats", "Sweets", "Build Your Own"]);

const GOAL_PRESETS = {
  highProtein: { label: "High protein", detail: "25g+ protein", filters: { minProtein: 25 } },
  lowCalorie: { label: "Under 500 cal", detail: "500 calories or less", filters: { maxCalories: 500 } },
  lowCarb: { label: "Low carb", detail: "30g carbs or less", filters: { maxCarbs: 30 } },
  lowFat: { label: "Low fat", detail: "15g fat or less", filters: { maxFat: 15 } }
};

const FILTER_FIELDS = {
  minProtein: { key: "proteinGrams", compare: "min", label: (v) => `${v}g+ protein` },
  maxCalories: { key: "calories", compare: "max", label: (v) => `≤ ${v} cal` },
  maxCarbs: { key: "carbsGrams", compare: "max", label: (v) => `≤ ${v}g carbs` },
  maxFat: { key: "fatGrams", compare: "max", label: (v) => `≤ ${v}g fat` }
};

const SORTS = {
  proteinDensity: { label: "Best protein per calorie", value: (item) => proteinPer100(item), direction: -1 },
  calories: { label: "Calories: low to high", value: (item) => item.calories, direction: 1 },
  proteinGrams: { label: "Protein: high to low", value: (item) => item.proteinGrams, direction: -1 },
  carbsGrams: { label: "Carbs: low to high", value: (item) => item.carbsGrams, direction: 1 },
  fatGrams: { label: "Fat: low to high", value: (item) => item.fatGrams, direction: 1 },
  name: { label: "Name: A to Z", value: (item) => item.name, direction: 1 }
};

const PAGE_SIZE = 24;
const MAX_COMPARE = 3;

const recommendationImages = {
  "204386": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202605_25157_3PieceMcCrispyStrips_Protein_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200486": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0004-999_DoubleCheeseburgerv2_Alt_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200491": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0592-999_McDouble_Alt_Protein_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200567": "https://corporate.mcdonalds.com/content/dam/sites/corp/nfl/newsroom/menu-items-2023/NR_202208_5280_10McNuggets_Stacked_2000x2000.png",
  "203747": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202012_0383_CrispyChickenSandwich_PotatoBun_1564x1564-1:nutrition-calculator-tile?resmode=sharp2"
};

// ------------------------------------------------------------------ Data layer

function loadMenu() {
  const sources = window.FASTFOODFINDER_DATA ?? {};
  const items = [];
  const meta = {};
  Object.entries(sources).forEach(([restaurantId, dataset]) => {
    if (!RESTAURANTS[restaurantId]) return;
    meta[restaurantId] = { sourceUrl: dataset.sourceUrl, scrapedAt: dataset.scrapedAt, note: dataset.note, unavailable: 0 };
    (dataset.items ?? []).forEach((item) => {
      if (item.status !== "ok") {
        meta[restaurantId].unavailable += 1;
        return;
      }
      items.push({ ...item, uid: `${restaurantId}:${item.id}`, restaurantId, restaurant: RESTAURANTS[restaurantId].name });
    });
  });
  return { items, meta };
}

const { items: menuItems, meta: restaurantMeta } = loadMenu();
const itemsByUid = new Map(menuItems.map((item) => [item.uid, item]));

// ---------------------------------------------------------------- Menu service

function normalize(text) {
  return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[®™'’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function proteinPer100(item) {
  return item.calories > 0 ? (item.proteinGrams / item.calories) * 100 : 0;
}

function isMeal(item) {
  return !NON_MEAL_CATEGORIES.has(item.category);
}

// Splits a free-text search into a restaurant (if one is named) and the rest of the words.
function parseSearch(query) {
  let text = ` ${normalize(query)} `;
  let restaurantId = "all";
  Object.entries(RESTAURANTS).forEach(([id, restaurant]) => {
    if (restaurantId !== "all") return;
    const alias = restaurant.aliases.map(normalize).find((name) => text.includes(` ${name} `));
    if (alias) {
      restaurantId = id;
      text = text.replace(` ${alias} `, " ");
    }
  });
  return { restaurantId, text: text.trim() };
}

function matchesText(item, text) {
  if (!text) return true;
  const haystack = normalize(`${item.name} ${item.category} ${item.restaurant} ${item.serving}`);
  return text.split(" ").every((word) => haystack.includes(word));
}

function matchesNutrition(item, filters) {
  return Object.entries(filters).every(([field, value]) => {
    const rule = FILTER_FIELDS[field];
    if (!rule || value === null || value === undefined) return true;
    return rule.compare === "min" ? item[rule.key] >= value : item[rule.key] <= value;
  });
}

function sortItems(items, sortKey) {
  const sort = SORTS[sortKey] ?? SORTS.proteinDensity;
  return [...items].sort((a, b) => {
    const left = sort.value(a);
    const right = sort.value(b);
    const result = typeof left === "string" ? left.localeCompare(right) : (left - right);
    return result * sort.direction || a.name.localeCompare(b.name);
  });
}

function queryMenu({ restaurantId, text, category, mealsOnly, filters, sort }) {
  const matches = menuItems.filter((item) => (
    (restaurantId === "all" || item.restaurantId === restaurantId)
    && (!category || item.category === category)
    && (!mealsOnly || isMeal(item))
    && matchesText(item, text)
    && matchesNutrition(item, filters)
  ));
  return sortItems(matches, sort);
}

// Goal chips and typed limits can overlap; the stricter value wins.
function combinedFilters() {
  const merged = {};
  const add = (field, value) => {
    if (merged[field] === undefined) merged[field] = value;
    else merged[field] = FILTER_FIELDS[field].compare === "min" ? Math.max(merged[field], value) : Math.min(merged[field], value);
  };
  state.goals.forEach((goal) => Object.entries(GOAL_PRESETS[goal].filters).forEach(([field, value]) => add(field, value)));
  Object.entries(state.customFilters).forEach(([field, value]) => add(field, value));
  return merged;
}

// ---------------------------------------------------------------------- State

const state = {
  restaurantId: "all",
  text: "",
  category: "",
  mealsOnly: true,
  goals: new Set(),
  customFilters: {},
  sort: "proteinDensity",
  visible: PAGE_SIZE,
  compare: []
};

// ------------------------------------------------------------------ Elements

const $ = (selector) => document.querySelector(selector);
const searchForm = $("#restaurant-search");
const searchInput = $("#search-input");
const toast = $("#toast");
const resultsSection = $("#results");
const resultsGrid = $("#results-grid");
const resultsSummary = $("#results-summary");
const resultsTitle = $("#results-title");
const resultsEyebrow = $("#results-eyebrow");
const resultsQuery = $("#results-query");
const restaurantTabs = $("#restaurant-tabs");
const categorySelect = $("#category-filter");
const mealsOnlyToggle = $("#meals-only");
const filtersForm = $("#nutrition-filters");
const goalChips = $("#goal-chips");
const activeFiltersBar = $("#active-filters");
const sortBy = $("#sort-by");
const loadMoreButton = $("#load-more");
const recommendationsGrid = $("#recommendations-grid");
const itemDialog = $("#item-dialog");
const compareTray = $("#compare-tray");
const compareDialog = $("#compare-dialog");
const homeSections = [".hero", ".recommendations-section", ".feature-section", ".restaurant-section"].map((s) => $(s));
let toastTimer;
let filterTimer;

// ----------------------------------------------------------------- Rendering

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function restaurantBadge(item) {
  const restaurant = RESTAURANTS[item.restaurantId];
  return `<span class="restaurant-badge"><span class="mini-logo ${restaurant.className}" aria-hidden="true">${restaurant.logo}</span>${escapeHtml(restaurant.name)}</span>`;
}

function itemTags(item) {
  const tags = [];
  if (item.proteinGrams >= 25) tags.push(["High protein", "tag-protein-chip"]);
  if (item.calories <= 500 && item.calories >= 150 && isMeal(item)) tags.push(["Under 500 cal", "tag-calorie-chip"]);
  if (item.carbsGrams <= 30 && item.calories >= 150) tags.push(["Low carb", "tag-carb-chip"]);
  return tags.map(([label, className]) => `<span class="item-tag ${className}">${label}</span>`).join("");
}

function servingLabel(item) {
  return item.serving && item.serving !== "Standard ingredients" ? item.serving : "";
}

function renderStats() {
  $("#stat-items").textContent = String(menuItems.length);
  $("#stat-restaurants").textContent = Object.keys(restaurantMeta).length;
}

function renderRecommendations() {
  const perRestaurant = {};
  const picks = sortItems(menuItems.filter((item) => (
    isMeal(item) && item.calories >= 250 && item.calories <= 500 && item.proteinGrams >= 20
  )), "proteinDensity").filter((item) => {
    perRestaurant[item.restaurantId] = (perRestaurant[item.restaurantId] ?? 0) + 1;
    return perRestaurant[item.restaurantId] <= 2;
  }).slice(0, 6);

  recommendationsGrid.innerHTML = picks.map((item, index) => {
    const restaurant = RESTAURANTS[item.restaurantId];
    const image = recommendationImages[item.id];
    const callout = item.id === "204386" ? " has-image-callout" : item.id === "200491" ? " has-protein-callout" : "";
    return `
    <article class="recommendation-card" data-uid="${escapeHtml(item.uid)}" tabindex="0" role="button" aria-label="View nutrition for ${escapeHtml(item.name)}">
      <div class="recommendation-image${callout}${image ? "" : ` placeholder-image ${restaurant.className}-tint`}">
        ${image
          ? `<img src="${image}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />`
          : `<span class="placeholder-logo ${restaurant.className}" aria-hidden="true">${restaurant.logo}</span>`}
        <div class="recommendation-protein-badge"><span>Protein</span><strong>${item.proteinGrams}g</strong></div>
      </div>
      <div class="recommendation-content">
        <div class="recommendation-rank">RECOMMENDATION 0${index + 1}</div>
        <span class="recommendation-category">${escapeHtml(restaurant.name)} · ${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.name)}</h3>
      </div>
      <div class="recommendation-macros">
        <div><strong>${item.calories}</strong><small>calories</small></div>
        <div><strong>${item.proteinGrams}g</strong><small>protein</small></div>
      </div>
    </article>`;
  }).join("");

  // If a photo fails to load (offline, moved), fall back to the restaurant logo tile.
  recommendationsGrid.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      const card = img.closest(".recommendation-card");
      const restaurant = RESTAURANTS[itemsByUid.get(card.dataset.uid).restaurantId];
      const frame = img.parentElement;
      frame.className = `recommendation-image placeholder-image ${restaurant.className}-tint`;
      img.outerHTML = `<span class="placeholder-logo ${restaurant.className}" aria-hidden="true">${restaurant.logo}</span>`;
    }, { once: true });
  });
}

function renderRestaurantTabs() {
  const base = menuItems.filter((item) => (!state.mealsOnly || isMeal(item)));
  const tabs = [["all", "All restaurants", base.length]].concat(
    Object.keys(restaurantMeta).map((id) => [id, RESTAURANTS[id].name, base.filter((item) => item.restaurantId === id).length])
  );
  restaurantTabs.innerHTML = tabs.map(([id, label, count]) => `
    <button type="button" role="tab" class="restaurant-tab${state.restaurantId === id ? " active" : ""}" data-restaurant="${id}" aria-selected="${state.restaurantId === id}">
      ${id === "all" ? "" : `<span class="mini-logo ${RESTAURANTS[id].className}" aria-hidden="true">${RESTAURANTS[id].logo}</span>`}
      ${escapeHtml(label)} <span class="tab-count">${count}</span>
    </button>`).join("");
}

function renderCategoryOptions() {
  const categories = [...new Set(menuItems
    .filter((item) => state.restaurantId === "all" || item.restaurantId === state.restaurantId)
    .filter((item) => !state.mealsOnly || isMeal(item))
    .map((item) => item.category))].sort((a, b) => a.localeCompare(b));
  if (state.category && !categories.includes(state.category)) state.category = "";
  categorySelect.innerHTML = `<option value="">All categories</option>${categories.map((category) => (
    `<option value="${escapeHtml(category)}"${category === state.category ? " selected" : ""}>${escapeHtml(category)}</option>`
  )).join("")}`;
}

function renderGoalChips() {
  goalChips.innerHTML = Object.entries(GOAL_PRESETS).map(([id, goal]) => `
    <button type="button" class="goal-chip${state.goals.has(id) ? " active" : ""}" data-goal="${id}" aria-pressed="${state.goals.has(id)}">
      <strong>${goal.label}</strong><small>${goal.detail}</small>
    </button>`).join("");
}

function renderActiveFilters() {
  const chips = [];
  if (state.text) chips.push(["text", `“${state.text}”`]);
  if (state.category) chips.push(["category", state.category]);
  state.goals.forEach((goal) => chips.push([`goal:${goal}`, GOAL_PRESETS[goal].label]));
  Object.entries(state.customFilters).forEach(([field, value]) => chips.push([`custom:${field}`, FILTER_FIELDS[field].label(value)]));
  activeFiltersBar.hidden = chips.length === 0;
  const filterCount = state.goals.size + Object.keys(state.customFilters).length + (state.category ? 1 : 0);
  $("#filter-count").textContent = filterCount ? `(${filterCount})` : "";
  activeFiltersBar.innerHTML = chips.length
    ? `${chips.map(([key, label]) => `<button type="button" class="active-chip" data-remove="${escapeHtml(key)}" aria-label="Remove filter ${escapeHtml(label)}">${escapeHtml(label)} <span aria-hidden="true">×</span></button>`).join("")}
       <button type="button" class="clear-all" data-remove="all">Clear all</button>`
    : "";
}

function resultCard(item) {
  const inCompare = state.compare.includes(item.uid);
  const serving = servingLabel(item);
  return `
    <article class="result-card">
      <button type="button" class="result-open" data-uid="${escapeHtml(item.uid)}" aria-label="View nutrition for ${escapeHtml(item.name)}">
        <span class="result-card-top">
          ${state.restaurantId === "all" ? restaurantBadge(item) : ""}
          <span class="result-category">${escapeHtml(item.category)}</span>
        </span>
        <span class="result-name">${escapeHtml(item.name)}</span>
        ${serving ? `<span class="result-serving">${escapeHtml(serving)}</span>` : ""}
        <span class="result-tags">${itemTags(item)}</span>
        <span class="result-macros">
          <span class="macro-calories"><strong>${item.calories}</strong><small>calories</small></span>
          <span><strong>${item.proteinGrams}g</strong><small>protein</small></span>
          <span><strong>${item.carbsGrams}g</strong><small>carbs</small></span>
          <span><strong>${item.fatGrams}g</strong><small>fat</small></span>
        </span>
      </button>
      <div class="result-footer">
        <span class="density" title="Grams of protein per 100 calories">${proteinPer100(item).toFixed(1)}g protein / 100 cal</span>
        <button type="button" class="compare-toggle${inCompare ? " active" : ""}" data-compare="${escapeHtml(item.uid)}" aria-pressed="${inCompare}">${inCompare ? "✓ Comparing" : "+ Compare"}</button>
      </div>
    </article>`;
}

function renderResults() {
  const filters = combinedFilters();
  const results = queryMenu({ ...state, filters });
  const shown = results.slice(0, state.visible);
  const restaurantName = state.restaurantId === "all" ? "All restaurants" : RESTAURANTS[state.restaurantId].name;

  resultsEyebrow.textContent = `${restaurantName} nutrition`;
  resultsTitle.textContent = state.restaurantId === "all" ? "Choose your fit." : `${restaurantName}, sorted for you.`;
  resultsSummary.textContent = results.length
    ? `Showing ${shown.length} of ${results.length} items, sorted by ${SORTS[state.sort].label.toLowerCase()}.`
    : "No items match yet.";

  if (results.length) {
    resultsGrid.innerHTML = shown.map(resultCard).join("");
  } else {
    const withoutMealsOnly = state.mealsOnly ? queryMenu({ ...state, mealsOnly: false, filters }).length : 0;
    resultsGrid.innerHTML = `
      <div class="empty-results">
        <strong>Nothing fits those filters.</strong>
        <p>${withoutMealsOnly ? `${withoutMealsOnly} drink, dessert or add-on item${withoutMealsOnly === 1 ? "" : "s"} match. Turn off “Meals only” to see ${withoutMealsOnly === 1 ? "it" : "them"}.` : "Try removing a filter or loosening a limit."}</p>
        <div class="empty-actions">
          ${withoutMealsOnly ? '<button type="button" class="filter-submit" data-action="show-all-types">Include everything</button>' : ""}
          <button type="button" class="filter-clear" data-remove="all">Clear filters</button>
        </div>
      </div>`;
  }
  loadMoreButton.hidden = shown.length >= results.length;
  loadMoreButton.textContent = `Show ${Math.min(PAGE_SIZE, results.length - shown.length)} more`;
  renderActiveFilters();
}

function refresh({ resetPage = true } = {}) {
  if (resetPage) state.visible = PAGE_SIZE;
  renderRestaurantTabs();
  renderCategoryOptions();
  renderGoalChips();
  renderResults();
  renderCompareTray();
}

function macroSplit(item) {
  const proteinCal = item.proteinGrams * 4;
  const carbCal = item.carbsGrams * 4;
  const fatCal = item.fatGrams * 9;
  const total = proteinCal + carbCal + fatCal || 1;
  return [["protein", proteinCal / total], ["carbs", carbCal / total], ["fat", fatCal / total]];
}

function openItem(uid) {
  const item = itemsByUid.get(uid);
  if (!item) return;
  const meta = restaurantMeta[item.restaurantId];
  const inCompare = state.compare.includes(uid);
  const split = macroSplit(item);
  $("#item-dialog-body").innerHTML = `
    <div class="dialog-head">
      ${restaurantBadge(item)}
      <span class="result-category">${escapeHtml(item.category)}</span>
    </div>
    <h2 id="item-dialog-title">${escapeHtml(item.name)}</h2>
    ${servingLabel(item) ? `<p class="dialog-serving">${escapeHtml(servingLabel(item))}</p>` : ""}
    <div class="result-tags">${itemTags(item)}</div>
    <div class="dialog-macros">
      <div class="dialog-calories"><strong>${item.calories}</strong><small>calories</small></div>
      <div><strong>${item.proteinGrams}g</strong><small>protein</small></div>
      <div><strong>${item.carbsGrams}g</strong><small>carbs</small></div>
      <div><strong>${item.fatGrams}g</strong><small>fat</small></div>
    </div>
    <div class="split">
      <div class="split-label"><span>Where the calories come from</span><span>${proteinPer100(item).toFixed(1)}g protein per 100 cal</span></div>
      <div class="split-bar" role="img" aria-label="${split.map(([name, share]) => `${Math.round(share * 100)}% ${name}`).join(", ")}">
        ${split.map(([name, share]) => `<span class="split-${name}" style="width:${(share * 100).toFixed(1)}%"></span>`).join("")}
      </div>
      <div class="split-legend">${split.map(([name, share]) => `<span><i class="split-${name}"></i>${Math.round(share * 100)}% ${name}</span>`).join("")}</div>
    </div>
    <p class="dialog-source">Source: <a href="${escapeHtml(meta.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(item.restaurant)} nutrition</a>, collected ${escapeHtml(meta.scrapedAt)}. Values can change.</p>
    <div class="dialog-actions">
      <button type="button" class="filter-submit" data-compare="${escapeHtml(uid)}">${inCompare ? "Remove from compare" : "Add to compare"}</button>
      <button type="button" class="filter-clear" data-close>Back to results</button>
    </div>`;
  if (!itemDialog.open) itemDialog.showModal();
}

function renderCompareTray() {
  const items = state.compare.map((uid) => itemsByUid.get(uid)).filter(Boolean);
  compareTray.hidden = items.length === 0 || resultsSection.hidden;
  compareTray.innerHTML = `
    <div class="container compare-inner">
      <div class="compare-items">
        <strong>Compare <span>${items.length}/${MAX_COMPARE}</span></strong>
        ${items.map((item) => `<button type="button" class="compare-pill" data-compare="${escapeHtml(item.uid)}" aria-label="Remove ${escapeHtml(item.name)} from compare">${escapeHtml(item.name)} <span aria-hidden="true">×</span></button>`).join("")}
      </div>
      <button type="button" class="filter-submit" id="open-compare"${items.length < 2 ? " disabled" : ""}>${items.length < 2 ? "Pick one more" : "Compare now"}</button>
    </div>`;
}

function toggleCompare(uid) {
  if (state.compare.includes(uid)) {
    state.compare = state.compare.filter((value) => value !== uid);
  } else if (state.compare.length >= MAX_COMPARE) {
    showMessage(`You can compare up to ${MAX_COMPARE} items. Remove one first.`);
    return;
  } else {
    state.compare.push(uid);
  }
  renderResults();
  renderCompareTray();
  if (itemDialog.open) openItem(uid);
  if (compareDialog.open) {
    if (state.compare.length < 2) compareDialog.close(); else openCompare();
  }
}

function openCompare() {
  const items = state.compare.map((uid) => itemsByUid.get(uid)).filter(Boolean);
  if (items.length < 2) return;
  const rows = [
    ["Calories", "calories", "", "min"],
    ["Protein", "proteinGrams", "g", "max"],
    ["Carbs", "carbsGrams", "g", "min"],
    ["Fat", "fatGrams", "g", "min"],
    ["Protein per 100 cal", null, "g", "max"]
  ];
  const value = (item, key) => (key ? item[key] : Number(proteinPer100(item).toFixed(1)));
  $("#compare-dialog-body").innerHTML = `
    <h2 id="compare-dialog-title">Side by side</h2>
    <p class="dialog-serving">The best value in each row is highlighted.</p>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th scope="col"><span class="sr-only">Nutrient</span></th>${items.map((item) => `<th scope="col">${restaurantBadge(item)}<span class="compare-name">${escapeHtml(item.name)}</span></th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map(([label, key, unit, best]) => {
            const values = items.map((item) => value(item, key));
            const target = best === "max" ? Math.max(...values) : Math.min(...values);
            return `<tr><th scope="row">${label}</th>${values.map((v) => `<td class="${v === target ? "best" : ""}">${v}${unit}</td>`).join("")}</tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="dialog-actions"><button type="button" class="filter-clear" data-close>Back to results</button></div>`;
  if (!compareDialog.open) compareDialog.showModal();
}

// --------------------------------------------------------------- Navigation

function showResults() {
  homeSections.forEach((section) => { section.hidden = true; });
  resultsSection.hidden = false;
  resultsQuery.value = state.text;
  refresh();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showHome() {
  resultsSection.hidden = true;
  compareTray.hidden = true;
  homeSections.forEach((section) => { section.hidden = false; });
  $("#discover").scrollIntoView({ behavior: "smooth" });
}

function submitSearch(value) {
  const query = value.trim();
  if (!query) {
    searchInput.focus();
    showMessage("Type a restaurant or meal to get started.");
    return;
  }
  const { restaurantId, text } = parseSearch(query);
  const inScope = (item) => (restaurantId === "all" || item.restaurantId === restaurantId) && matchesText(item, text);
  if (!menuItems.some(inScope)) {
    const available = Object.keys(restaurantMeta).map((id) => RESTAURANTS[id].name).join(", ");
    showMessage(`Nothing matched “${query}”. Try a menu item, or one of: ${available}.`);
    return;
  }
  state.restaurantId = restaurantId;
  state.text = text;
  state.category = "";
  // A specific search like "coke" should not be hidden by "Meals only".
  state.mealsOnly = text ? menuItems.some((item) => isMeal(item) && inScope(item)) : true;
  mealsOnlyToggle.checked = state.mealsOnly;
  showResults();
}

function clearAll() {
  state.text = "";
  state.category = "";
  state.goals.clear();
  state.customFilters = {};
  state.mealsOnly = true;
  mealsOnlyToggle.checked = true;
  resultsQuery.value = "";
  filtersForm.reset();
  refresh();
}

function removeFilter(key) {
  if (key === "all") return clearAll();
  if (key === "text") { state.text = ""; resultsQuery.value = ""; }
  if (key === "category") state.category = "";
  if (key.startsWith("goal:")) state.goals.delete(key.slice(5));
  if (key.startsWith("custom:")) {
    const field = key.slice(7);
    delete state.customFilters[field];
    filtersForm.elements[field].value = "";
  }
  return refresh();
}

// -------------------------------------------------------------------- Events

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch(searchInput.value);
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.search;
    submitSearch(button.dataset.search);
  });
});

resultsQuery.addEventListener("input", () => {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    const { restaurantId, text } = parseSearch(resultsQuery.value);
    if (restaurantId !== "all") state.restaurantId = restaurantId;
    state.text = text;
    refresh();
  }, 160);
});

restaurantTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-restaurant]");
  if (!tab) return;
  state.restaurantId = tab.dataset.restaurant;
  refresh();
});

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  refresh();
});

mealsOnlyToggle.addEventListener("change", () => {
  state.mealsOnly = mealsOnlyToggle.checked;
  refresh();
});

goalChips.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-goal]");
  if (!chip) return;
  const goal = chip.dataset.goal;
  if (state.goals.has(goal)) state.goals.delete(goal); else state.goals.add(goal);
  refresh();
});

// Typed limits apply as you type (short debounce), no "Apply" button needed.
filtersForm.addEventListener("input", (event) => {
  if (!FILTER_FIELDS[event.target.name]) return;
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(() => {
    state.customFilters = Object.fromEntries([...new FormData(filtersForm)]
      .filter(([field, value]) => FILTER_FIELDS[field] && value !== "" && Number(value) >= 0)
      .map(([field, value]) => [field, Number(value)]));
    refresh();
  }, 220);
});
filtersForm.addEventListener("submit", (event) => event.preventDefault());

$("#clear-filters").addEventListener("click", clearAll);

// On small screens the filter panel starts collapsed behind a "Filters" button.
$("#toggle-filters").addEventListener("click", (event) => {
  const open = filtersForm.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

sortBy.addEventListener("change", () => {
  state.sort = sortBy.value;
  refresh();
});

loadMoreButton.addEventListener("click", () => {
  state.visible += PAGE_SIZE;
  renderResults();
});

// One delegated handler for buttons inside re-rendered markup.
document.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove]");
  if (remove) return removeFilter(remove.dataset.remove);
  const compare = event.target.closest("[data-compare]");
  if (compare) return toggleCompare(compare.dataset.compare);
  if (event.target.closest("#open-compare")) return openCompare();
  if (event.target.closest("[data-action='show-all-types']")) {
    state.mealsOnly = false;
    mealsOnlyToggle.checked = false;
    return refresh();
  }
  const close = event.target.closest("[data-close]");
  if (close) return close.closest("dialog").close();
  const open = event.target.closest(".result-open, .recommendation-card");
  if (open) return openItem(open.dataset.uid);
  return undefined;
});

recommendationsGrid.addEventListener("keydown", (event) => {
  const card = event.target.closest(".recommendation-card");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openItem(card.dataset.uid);
  }
});

// Clicking the dimmed backdrop closes a dialog.
[itemDialog, compareDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

$("#back-to-home").addEventListener("click", showHome);

// Header and footer links point at home-page sections, so leave the results view first.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (resultsSection.hidden) return;
    event.preventDefault();
    showHome();
    const target = document.querySelector(link.getAttribute("href"));
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
});

// ---------------------------------------------------------------------- Init

sortBy.innerHTML = Object.entries(SORTS).map(([value, sort]) => `<option value="${value}">${sort.label}</option>`).join("");
sortBy.value = state.sort;
renderStats();
renderRecommendations();
