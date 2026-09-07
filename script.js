const searchForm = document.querySelector("#restaurant-search");
const searchInput = document.querySelector("#search-input");
const toast = document.querySelector("#toast");
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

  showMessage(`We'll help you find smarter choices at ${query}.`);
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
