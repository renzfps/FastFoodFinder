const searchForm = document.querySelector("#restaurant-search");
const searchInput = document.querySelector("#search-input");
const toast = document.querySelector("#toast");
const menuItems = window.FASTFOODFINDER_DATA?.items ?? [];
const resultsSection = document.querySelector("#results");
const resultsGrid = document.querySelector("#results-grid");
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
        ${item.status === "ok" ? `<div class="result-macros">
          <div><strong>${item.calories}</strong><small>calories</small></div>
          <div><strong>${item.proteinGrams}g</strong><small>protein</small></div>
          <div><strong>${item.carbsGrams}g</strong><small>carbs</small></div>
          <div><strong>${item.fatGrams}g</strong><small>fat</small></div>
        </div>` : '<div class="nutrition-unavailable">Nutrition varies by selected meal components.</div>'}
      </article>`).join("")
    : '<p class="empty-results">No complete nutrition options match those filters. Try lowering a minimum or raising a maximum.</p>';
}

function showResults() {
  resultsSection.hidden = false;
  document.querySelector(".hero").hidden = true;
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
    item.status !== "ok"
      ? `${item.name} (nutrition unavailable)`
      : `${item.name} (${item.calories} cal, ${item.proteinGrams}g protein, ${item.carbsGrams}g carbs, ${item.fatGrams}g fat)`
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

document.querySelector("#back-to-home").addEventListener("click", () => {
  resultsSection.hidden = true;
  document.querySelector(".hero").hidden = false;
  document.querySelector(".feature-section").hidden = false;
  document.querySelector(".restaurant-section").hidden = false;
  document.querySelector("#discover").scrollIntoView({ behavior: "smooth" });
});
