const searchForm = document.querySelector("#restaurant-search");
const searchInput = document.querySelector("#search-input");
const toast = document.querySelector("#toast");
const menuItems = (window.FASTFOODFINDER_DATA?.items ?? [])
  .filter((item) => item.status === "ok");
const recommendationImages = {
  "204386": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202605_25157_3PieceMcCrispyStrips_Protein_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200486": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0004-999_DoubleCheeseburgerv2_Alt_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200491": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202302_0592-999_McDouble_Alt_Protein_1564x1564:nutrition-calculator-tile?resmode=sharp2",
  "200567": "https://corporate.mcdonalds.com/content/dam/sites/corp/nfl/newsroom/menu-items-2023/NR_202208_5280_10McNuggets_Stacked_2000x2000.png",
  "203747": "https://s7d1.scene7.com/is/image/mcdonalds/DC_202012_0383_CrispyChickenSandwich_PotatoBun_1564x1564-1:nutrition-calculator-tile?resmode=sharp2"
};
const recommendedItems = menuItems
  .filter((item) => item.calories <= 500 && item.proteinGrams >= 20)
  .sort((a, b) => (b.proteinGrams / b.calories) - (a.proteinGrams / a.calories))
  .slice(0, 5);
const resultsSection = document.querySelector("#results");
const resultsGrid = document.querySelector("#results-grid");
const recommendationsGrid = document.querySelector("#recommendations-grid");
const resultsSummary = document.querySelector("#results-summary");
const filtersForm = document.querySelector("#nutrition-filters");
const sortBy = document.querySelector("#sort-by");
let toastTimer;
let activeFilters = {};

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function renderRecommendations() {
  recommendationsGrid.innerHTML = recommendedItems.map((item, index) => `
    <article class="recommendation-card">
      <div class="recommendation-image${item.id === "204386" ? " has-image-callout" : item.id === "200491" ? " has-protein-callout" : ""}">
        <img src="${recommendationImages[item.id]}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" />
        <div class="recommendation-protein-badge">
          <span>Protein</span>
          <strong>${item.proteinGrams}g</strong>
        </div>
      </div>
      <div class="recommendation-content">
        <div class="recommendation-rank">RECOMMENDATION 0${index + 1}</div>
        <span class="recommendation-category">${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        ${item.serving && item.serving !== "Standard ingredients" ? `<span class="recommendation-serving">${escapeHtml(item.serving)}</span>` : ""}
      </div>
      <div class="recommendation-macros">
        <div><strong>${item.calories}</strong><small>calories</small></div>
        <div><strong>${item.proteinGrams}g</strong><small>protein</small></div>
      </div>
    </article>`).join("");
}

function renderResults() {
  const filtered = menuItems.filter((item) => Object.entries(activeFilters).every(([key, value]) => {
    if (item.status !== "ok") return false;
    return key === "proteinGrams" ? item[key] >= value : item[key] <= value;
  }));
  const sorted = [...filtered].sort((a, b) => {
    const key = sortBy.value;
    const direction = key === "proteinGrams" ? -1 : 1;
    return ((a[key] ?? Number.POSITIVE_INFINITY) - (b[key] ?? Number.POSITIVE_INFINITY)) * direction;
  });

  resultsSummary.textContent = `${sorted.length} of ${menuItems.length} options shown. Complete nutrition data is required for filters.`;
  resultsGrid.innerHTML = sorted.length
    ? sorted.map((item) => `
      <article class="result-card">
        <div class="result-card-heading"><h3>${escapeHtml(item.name)}</h3><span>${item.serving || "Standard"}</span></div>
        <div class="result-macros">
          <div><strong>${item.calories}</strong><small>calories</small></div>
          <div><strong>${item.proteinGrams}g</strong><small>protein</small></div>
          <div><strong>${item.carbsGrams}g</strong><small>carbs</small></div>
          <div><strong>${item.fatGrams}g</strong><small>fat</small></div>
        </div>
      </article>`).join("")
    : '<p class="empty-results">No nutrition options match those filters. Try lowering a minimum or raising a maximum.</p>';
}

function showResults() {
  resultsSection.hidden = false;
  document.querySelector(".hero").hidden = true;
  document.querySelector(".recommendations-section").hidden = true;
  document.querySelector(".feature-section").hidden = true;
  document.querySelector(".restaurant-section").hidden = true;
  renderResults();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function submitSearch(value) {
  const query = value.trim();
  if (!query) {
    searchInput.focus();
    showMessage("Type a restaurant or meal to get started.");
    return;
  }

  const normalizedQuery = query.toLowerCase();
  if (normalizedQuery.replace(/[^a-z]/g, "").includes("mcdonald")) {
    showResults();
    return;
  }

  const matches = menuItems.filter((item) => (
    item.name.toLowerCase().includes(normalizedQuery)
    || item.category.toLowerCase().includes(normalizedQuery)
  ));
  if (matches.length === 0) {
    showMessage(`No McDonald's menu items matched "${query}".`);
    return;
  }

  const preview = matches.slice(0, 3).map((item) => (
    `${item.name} (${item.calories} cal, ${item.proteinGrams}g protein, ${item.carbsGrams}g carbs, ${item.fatGrams}g fat)`
  )).join(", ");
  const suffix = matches.length > 3 ? ` + ${matches.length - 3} more` : "";
  showMessage(`${matches.length} match${matches.length === 1 ? "" : "es"}: ${preview}${suffix}`);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch(searchInput.value);
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.search;
    searchInput.focus();
    submitSearch(button.dataset.search);
  });
});

document.querySelector("#apply-filters").addEventListener("click", () => {
  activeFilters = Object.fromEntries([...new FormData(filtersForm)]
    .filter(([, value]) => value !== "")
    .map(([key, value]) => [key, Number(value)]));
  renderResults();
});

sortBy.addEventListener("change", renderResults);

document.querySelector("#clear-filters").addEventListener("click", () => {
  filtersForm.reset();
  activeFilters = {};
  renderResults();
});

renderRecommendations();

document.querySelector("#back-to-home").addEventListener("click", () => {
  resultsSection.hidden = true;
  document.querySelector(".hero").hidden = false;
  document.querySelector(".recommendations-section").hidden = false;
  document.querySelector(".feature-section").hidden = false;
  document.querySelector(".restaurant-section").hidden = false;
  document.querySelector("#discover").scrollIntoView({ behavior: "smooth" });
});
