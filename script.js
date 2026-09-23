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
    const availableItems = menuItems.filter((item) => item.status === "ok");
    showMessage(`McDonald's menu loaded: ${availableItems.length} items with complete nutrition data (${menuItems.length} total).`);
    return;
  }

  if (matches.length === 0) {
    showMessage(`No McDonald's menu items matched "${query}".`);
    return;
  }

  const preview = matches
    .slice(0, 3)
    .map((item) => {
      if (item.status !== "ok") {
        return `${item.name} (nutrition unavailable)`;
      }

      return `${item.name} (${item.calories} cal, ${item.proteinGrams}g protein, ${item.carbsGrams}g carbs, ${item.fatGrams}g fat)`;
    })
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
