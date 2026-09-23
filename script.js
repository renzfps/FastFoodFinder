const searchForm = document.querySelector("#restaurant-search");
const searchInput = document.querySelector("#search-input");
const toast = document.querySelector("#toast");
const menuItems = window.FASTFOODFINDER_DATA?.items ?? [];
let toastTimer;

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function submitSearch(value) {
  const query = value.trim();
  if (!query) {
    searchInput.focus();
    showMessage("Type a restaurant or meal to get started.");
    return;
  }

  const normalizedQuery = query.toLowerCase();
  const matches = menuItems.filter((item) => (
    item.name.toLowerCase().includes(normalizedQuery)
    || item.category.toLowerCase().includes(normalizedQuery)
  ));

  if (normalizedQuery.includes("mcdonald")) {
    showMessage(`McDonald's menu loaded: ${menuItems.length} items ready to filter.`);
    return;
  }

  if (matches.length === 0) {
    showMessage(`No McDonald's menu items matched "${query}".`);
    return;
  }

  const preview = matches
    .slice(0, 3)
    .map((item) => `${item.name}${item.calories === null ? "" : ` (${item.calories} cal)`}`)
    .join(", ");
  const suffix = matches.length > 3 ? ` + ${matches.length - 3} more` : "";
  showMessage(`${matches.length} match${matches.length === 1 ? "" : "es"}: ${preview}${suffix}`);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch(searchInput.value);
});

document.querySelectorAll("[data-search]").forEach((button) => {
  button.addEventListener("click", () => {
    const query = button.dataset.search;
    searchInput.value = query;
    searchInput.focus();
    submitSearch(query);
  });
});
