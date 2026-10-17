# FastFoodFinder

Find healthier fast food without reading every menu.

FastFoodFinder puts McDonald's, Taco Bell and Chipotle nutrition in one place so you can search, filter and compare menu items by calories, protein, carbs and fat.

## The problem

Most fast food chains publish nutrition data, but each one formats it differently and buries it in long tables or calculators. Someone trying to eat high-protein, low-calorie or low-carb has to dig through every item by hand. FastFoodFinder does that sorting for them.

## Features

- **Search** by restaurant, item or both ("chipotle chicken", "taco bell", "nuggets").
- **Restaurant tabs** with live item counts.
- **Quick goals**: High protein, Under 500 cal, Low carb, Low fat. Goals stack with your own limits; the stricter value wins.
- **Live filters**: min protein, max calories, max carbs, max fat, category, and a "Meals only" switch that hides drinks, desserts and single add-ons.
- **Sorting** by protein per calorie, calories, protein, carbs, fat or name.
- **Item details** with a calorie breakdown (protein / carbs / fat) and the data source.
- **Compare** up to three items side by side, with the best value in each row highlighted.
- Responsive layout for phones and desktops.

## Running it

No build step or server is needed. Open `index.html` in a browser.

## Project structure

```
index.html                      Page markup (home, results, dialogs)
styles.css                      All styles
script.js                       Data layer, menu service (search/filter/sort) and UI
data/mcdonalds.js|json          McDonald's menu
data/tacobell.js|json           Taco Bell menu
data/chipotle.js|json           Chipotle menu
tools/build_restaurant_data.py  Rebuilds the Taco Bell and Chipotle data files
assets/                         Images
```

Every data file has the same shape:

```json
{
  "restaurant": "Chipotle",
  "sourceUrl": "...",
  "scrapedAt": "2026-10-17",
  "items": [
    { "id": "cmg-chicken-burrito-bowl", "name": "Chicken Burrito Bowl", "category": "Burrito Bowls",
      "calories": 660, "proteinGrams": 50, "carbsGrams": 68, "fatGrams": 20,
      "serving": "Chicken, Cilantro-Lime White Rice, ...", "status": "ok" }
  ]
}
```

The `.js` copy registers the same object on `window.FASTFOODFINDER_DATA["<restaurant>"]` so the app works straight from the file system. To add a restaurant, add a data file, a `<script>` tag in `index.html`, and an entry in `RESTAURANTS` at the top of `script.js`.

## Data sources

- **McDonald's**: the official McDonald's nutrition calculator (September 2026 snapshot).
- **Chipotle**: Chipotle's official US nutrition facts PDF. Bowls, burritos, tacos, salads and quesadillas are standard builds summed from the official per-ingredient values. The High Protein Menu builds match the totals Chipotle publishes.
- **Taco Bell**: item names and calories from tacobell.com. Protein, carbs and fat come from FatSecret's Taco Bell listing, kept only where its calories match tacobell.com.

Menus and recipes change, so treat values as estimates and check the restaurant for the latest.
