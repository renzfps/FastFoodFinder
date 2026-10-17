"""Build the Taco Bell and Chipotle data files used by FastFoodFinder.

Writes data/<restaurant>.json and data/<restaurant>.js in the same shape as
data/mcdonalds.json: a restaurant header plus an "items" list where each item
has id, name, category, calories, proteinGrams, carbsGrams, fatGrams, serving
and status.

Run from the project folder:  python tools/build_restaurant_data.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def item(prefix, name, category, cal, protein, carbs, fat, serving="Standard ingredients"):
    return {
        "id": f"{prefix}-{slug(name)}",
        "name": name,
        "category": category,
        "calories": round(cal),
        "proteinGrams": round(protein),
        "carbsGrams": round(carbs),
        "fatGrams": round(fat),
        "serving": serving,
        "status": "ok",
    }


# ---------------------------------------------------------------- Chipotle
# Official US nutrition facts (chipotle.com nutrition PDF).
# name: (portion, calories, fat, carbs, protein)
CMG = {
    "Flour Tortilla (burrito)": ("1 tortilla", 320, 9, 50, 8),
    "Flour Tortilla (taco)": ("1 tortilla", 80, 2.5, 13, 2),
    "Crispy Corn Tortilla": ("1 tortilla", 70, 3, 10, 1),
    "Cilantro-Lime Brown Rice": ("4 oz", 210, 6, 36, 4),
    "Cilantro-Lime White Rice": ("4 oz", 210, 4, 40, 4),
    "Black Beans": ("4 oz", 130, 1.5, 22, 8),
    "Pinto Beans": ("4 oz", 130, 1.5, 21, 8),
    "Fajita Veggies": ("2 oz", 20, 0, 5, 1),
    "Barbacoa": ("4 oz", 170, 7, 2, 24),
    "Chicken": ("4 oz", 180, 7, 0, 32),
    "Carnitas": ("4 oz", 210, 12, 0, 23),
    "Steak": ("4 oz", 150, 6, 1, 21),
    "Sofritas": ("4 oz", 150, 10, 9, 8),
    "Fresh Tomato Salsa": ("4 oz", 25, 0, 4, 0),
    "Roasted Chili-Corn Salsa": ("4 oz", 80, 1.5, 16, 3),
    "Tomatillo-Green Chili Salsa": ("2 fl oz", 15, 0, 4, 0),
    "Tomatillo-Red Chili Salsa": ("2 fl oz", 30, 0, 4, 0),
    "Cheese": ("1 oz", 110, 8, 1, 6),
    "Sour Cream": ("2 oz", 110, 9, 2, 2),
    "Guacamole": ("4 oz", 230, 22, 8, 2),
    "Queso Blanco": ("2 oz", 120, 9, 4, 5),
    "Supergreens Salad Mix": ("3 oz", 15, 0, 3, 1),
    "Romaine Lettuce": ("1 oz", 5, 0, 1, 0),
    "Chipotle-Honey Vinaigrette": ("2 fl oz", 220, 16, 18, 1),
}
CMG_SIDES = [
    ("Chips", "4 oz", 540, 25, 73, 7),
    ("Large Chips", "6 oz", 810, 38, 110, 11),
    ("Side of Guacamole", "4 oz", 230, 22, 8, 2),
    ("Large Guacamole", "8 oz", 460, 44, 16, 4),
    ("Side of Queso Blanco", "4 oz", 240, 18, 7, 10),
    ("Large Queso Blanco", "8 oz", 480, 37, 14, 20),
]
CMG_DRINKS = [
    ("Coca-Cola (22 fl oz)", (260, 0, 70, 0)),
    ("Coca-Cola (32 fl oz)", (380, 0, 105, 0)),
    ("Diet Coke (22 fl oz)", (0, 0, 0, 0)),
    ("Coca-Cola Zero (22 fl oz)", (0, 0, 0, 0)),
    ("Sprite (22 fl oz)", (260, 0, 70, 0)),
    ("Lemonade (22 fl oz)", (280, 0, 75, 0)),
    ("Iced Tea, Unsweetened (22 fl oz)", (10, 0, 3, 0)),
    ("Sweet Iced Tea (22 fl oz)", (150, 0, 45, 0)),
    ("Tractor Lemonade (22 fl oz)", (170, 0, 43, 0)),
    ("Tractor Berry Agua Fresca (22 fl oz)", (200, 0, 50, 0)),
    ("Organic Milk (8 oz)", (110, 2.5, 12, 8)),
    ("Organic Chocolate Milk (8 oz)", (160, 3, 24, 9)),
]

PROTEINS = ["Chicken", "Steak", "Barbacoa", "Carnitas", "Sofritas"]
CLASSIC = ["Cilantro-Lime White Rice", "Black Beans", "Fresh Tomato Salsa", "Cheese", "Romaine Lettuce"]


def build(parts):
    """Sum a list of (ingredient, multiplier) pairs."""
    cal = fat = carbs = protein = 0
    for name, mult in parts:
        _, c, f, cb, p = CMG[name]
        cal += c * mult; fat += f * mult; carbs += cb * mult; protein += p * mult
    return cal, protein, carbs, fat


def recipe(parts):
    return ", ".join(("Double " if m == 2 else "Light " if m == 0.5 else "") + n for n, m in parts)


def chipotle_items():
    items = []

    def add_build(name, category, parts):
        cal, p, c, f = build(parts)
        items.append(item("cmg", name, category, cal, p, c, f, serving=recipe(parts)))

    for prot in PROTEINS:
        add_build(f"{prot} Burrito Bowl", "Burrito Bowls", [(prot, 1)] + [(x, 1) for x in CLASSIC])
        add_build(f"{prot} Burrito", "Burritos",
                  [("Flour Tortilla (burrito)", 1), (prot, 1)] + [(x, 1) for x in CLASSIC])
        add_build(f"{prot} Salad", "Salads",
                  [("Supergreens Salad Mix", 1), (prot, 1), ("Black Beans", 1), ("Fajita Veggies", 1),
                   ("Fresh Tomato Salsa", 1), ("Chipotle-Honey Vinaigrette", 1)])
        add_build(f"{prot} Tacos (3 soft)", "Tacos",
                  [("Flour Tortilla (taco)", 3), (prot, 1), ("Fresh Tomato Salsa", 1), ("Cheese", 1), ("Romaine Lettuce", 1)])
        add_build(f"{prot} Tacos (3 crispy)", "Tacos",
                  [("Crispy Corn Tortilla", 3), (prot, 1), ("Fresh Tomato Salsa", 1), ("Cheese", 1), ("Romaine Lettuce", 1)])
        add_build(f"{prot} Quesadilla", "Quesadillas",
                  [("Flour Tortilla (burrito)", 1), (prot, 1), ("Cheese", 2), ("Fajita Veggies", 1)])

    add_build("Veggie Burrito Bowl", "Burrito Bowls",
              [("Cilantro-Lime Brown Rice", 1), ("Black Beans", 1), ("Fajita Veggies", 1), ("Fresh Tomato Salsa", 1),
               ("Roasted Chili-Corn Salsa", 1), ("Guacamole", 1), ("Romaine Lettuce", 1)])

    # Chipotle's own high protein menu builds (totals match chipotle.com/high-protein-meals).
    add_build("Double High Protein Bowl", "High Protein Menu",
              [("Chicken", 2), ("Cilantro-Lime White Rice", 0.5), ("Black Beans", 1), ("Fajita Veggies", 1),
               ("Fresh Tomato Salsa", 1), ("Cheese", 1), ("Romaine Lettuce", 2)])
    add_build("Double High Protein Burrito", "High Protein Menu",
              [("Flour Tortilla (burrito)", 1), ("Chicken", 2), ("Fajita Veggies", 1), ("Fresh Tomato Salsa", 1),
               ("Cheese", 1), ("Romaine Lettuce", 1)])
    add_build("High Protein-Low Calorie Bowl", "High Protein Menu",
              [("Chicken", 1), ("Supergreens Salad Mix", 1), ("Fajita Veggies", 1), ("Fresh Tomato Salsa", 1),
               ("Guacamole", 1)])
    add_build("High Protein-High Fiber Bowl", "High Protein Menu",
              [("Chicken", 1), ("Cilantro-Lime Brown Rice", 0.5), ("Black Beans", 1), ("Fajita Veggies", 1),
               ("Roasted Chili-Corn Salsa", 1), ("Fresh Tomato Salsa", 1), ("Romaine Lettuce", 1)])
    for prot, label in (("Chicken", "Chicken"), ("Steak", "Steak")):
        _, c, f, cb, p = CMG[prot]
        items.append(item("cmg", f"High Protein Cup - {label}", "High Protein Menu", c, p, cb, f, serving="4 oz"))

    for name, (portion, c, f, cb, p) in CMG.items():
        if name in ("Flour Tortilla (burrito)", "Flour Tortilla (taco)"):
            continue
        items.append(item("cmg", name, "Build Your Own", c, p, cb, f, serving=portion))
    for name, portion, c, f, cb, p in CMG_SIDES:
        items.append(item("cmg", name, "Chips & Sides", c, p, cb, f, serving=portion))
    for name, vals in CMG_DRINKS:
        c, f, cb, p = vals
        size = re.search(r"\(([^)]*)\)$", name)
        items.append(item("cmg", name, "Drinks", c, p, cb, f, serving=size.group(1) if size else "Standard ingredients"))
    return items


# ---------------------------------------------------------------- Taco Bell
# Menu items and calories from tacobell.com menu pages (checked 2026-10-17).
# Protein, carbs and fat from FatSecret's Taco Bell listing, used only where its
# calories match the official calories.
# (name, category, calories, fat, carbs, protein)
TACO_BELL = [
    ("Crunchy Taco", "Tacos", 170, 9, 13, 7),
    ("Crunchy Taco Supreme®", "Tacos", 190, 10, 16, 8),
    ("Soft Taco", "Tacos", 180, 8, 18, 9),
    ("Soft Taco Supreme®", "Tacos", 200, 9, 21, 9),
    ("Nacho Cheese Doritos® Locos Tacos", "Tacos", 170, 10, 13, 7),
    ("Nacho Cheese Doritos® Locos Tacos Supreme®", "Tacos", 190, 11, 15, 8),
    ("Spicy Potato Soft Taco", "Tacos", 240, 11, 28, 5),
    ("Bean Burrito", "Burritos", 360, 10, 54, 13),
    ("Beefy 5-Layer Burrito", "Burritos", 490, 18, 65, 17),
    ("Cheesy Bean and Rice Burrito", "Burritos", 400, 16, 56, 9),
    ("Burrito Supreme®", "Burritos", 390, 14, 52, 16),
    ("Cheesy Double Beef Burrito", "Burritos", 560, 25, 64, 20),
    ("Grilled Cheese Burrito", "Burritos", 690, 36, 68, 25),
    ("Black Bean Grilled Cheese Burrito", "Burritos", 680, 33, 72, 23),
    ("Crunchwrap Supreme®", "Specialties", 530, 20, 74, 15),
    ("Black Bean Crunchwrap Supreme®", "Specialties", 520, 17, 78, 13),
    ("Cheesy Gordita Crunch", "Specialties", 480, 26, 44, 20),
    ("Chalupa Supreme®", "Specialties", 350, 20, 32, 12),
    ("Black Bean Chalupa Supreme®", "Specialties", 340, 17, 36, 10),
    ("3-Cheese Chicken Flatbread Melt", "Specialties", 320, 14, 30, 20),
    ("Cheesy Roll Up", "Specialties", 170, 8, 18, 8),
    ("Avocado Ranch Chicken Stacker", "Specialties", 350, 15, 40, 16),
    ("Creamy Chipotle Crispy Chicken Crunchwrap Slider", "Specialties", 320, 12, 36, 16),
    ("Beefy Potato Loaded Griller", "Specialties", 480, 23, 56, 12),
    ("Chicken Quesadilla", "Quesadillas", 490, 23, 44, 26),
    ("Steak Quesadilla", "Quesadillas", 500, 24, 44, 26),
    ("Cheese Quesadilla", "Quesadillas", 440, 22, 43, 18),
    ("Nachos BellGrande®", "Nachos & Fries", 730, 38, 81, 17),
    ("Chips and Nacho Cheese Sauce", "Nachos & Fries", 220, 13, 24, 3),
    ("Nacho Fries", "Nachos & Fries", 350, 21, 36, 4),
    ("Pintos N Cheese", "Sides", 170, 6, 19, 9),
    ("Cheesy Fiesta Potatoes", "Sides", 240, 12, 29, 3),
    ("Black Beans", "Sides", 50, 1.5, 7, 3),
    ("Black Beans and Rice", "Sides", 160, 4.5, 25, 4),
    ("Cinnamon Twists", "Sweets", 170, 6, 27, 2),
    ("Cinnabon Delights® 2 Pack", "Sweets", 170, 11, 15, 2),
    ("Cinnabon Delights® 12 Pack", "Sweets", 1010, 68, 88, 11),
    ("Breakfast Crunchwrap - Bacon", "Breakfast", 660, 40, 54, 21),
    ("Breakfast Crunchwrap - Sausage", "Breakfast", 740, 49, 55, 21),
    ("Breakfast California Crunchwrap", "Breakfast", 640, 38, 54, 21),
    ("Breakfast Quesadilla - Bacon", "Breakfast", 500, 26, 42, 25),
    ("Breakfast Quesadilla - Sausage", "Breakfast", 500, 27, 42, 23),
    ("Breakfast Quesadilla - Steak", "Breakfast", 500, 23, 43, 28),
    ("Hash Brown", "Breakfast", 170, 11, 14, 2),
    ("Mtn Dew® Baja Blast® Freeze (16 oz)", "Drinks", 150, 0, 41, 0),
    ("MTN DEW® Baja Blast® Freeze", "Drinks", 190, 0, 51, 0),
    ("Lipton® Unsweetened Iced Tea", "Drinks", 0, 0, 0, 0),
    ("Brisk® Mango Fiesta", "Drinks", 170, 0, 45, 0),
    ("Strawberry Passionfruit Agua Refresca", "Drinks", 170, 0, 43, 0),
    ("Hot Cinnabon Delights® Coffee", "Drinks", 160, 2, 34, 1),
    ("Iced Cinnabon Delights® Coffee", "Drinks", 160, 2, 34, 1),
]


def taco_bell_items():
    out = []
    for name, category, cal, fat, carbs, protein in TACO_BELL:
        size = re.search(r"\(([^)]*oz)\)$", name)
        out.append(item("tb", name, category, cal, protein, carbs, fat,
                        serving=size.group(1) if size else "Standard ingredients"))
    return out


def write(key, header, items):
    payload = dict(header, items=items)
    text = json.dumps(payload, indent=4, ensure_ascii=False)
    (DATA / f"{key}.json").write_text(text + "\n", encoding="utf-8")
    js = ("window.FASTFOODFINDER_DATA = window.FASTFOODFINDER_DATA || {};\n"
          f'window.FASTFOODFINDER_DATA["{key}"] = {text};\n')
    (DATA / f"{key}.js").write_text(js, encoding="utf-8")
    print(f"{key}: {len(items)} items")


if __name__ == "__main__":
    write("chipotle", {
        "restaurant": "Chipotle",
        "source": "https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf",
        "sourceUrl": "https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf",
        "scrapedAt": "2026-10-17",
        "note": "Official per-ingredient nutrition from Chipotle's US nutrition facts. Bowls, burritos, tacos, salads and quesadillas are standard builds summed from those ingredients; the High Protein Menu builds match the totals published on chipotle.com/high-protein-meals. Values can change.",
    }, chipotle_items())
    write("tacobell", {
        "restaurant": "Taco Bell",
        "source": "https://www.tacobell.com/food",
        "sourceUrl": "https://www.tacobell.com/food",
        "scrapedAt": "2026-10-17",
        "note": "Menu items and calories from tacobell.com. Protein, carbs and fat from FatSecret's Taco Bell listing (https://www.fatsecret.com/calories-nutrition/taco-bell), kept only where its calories match tacobell.com. Values can change.",
    }, taco_bell_items())
