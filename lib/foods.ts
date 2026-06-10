import type { Food } from "./types";

// A catalog of 50+ common Indian foods. Calories/macros are reasonable
// per-serving estimates for home-style portions — handy for quick logging,
// not lab-precise. Values are per the serving described.
export const FOODS: Food[] = [
  // ---------- Grains & Breads ----------
  { id: "roti", name: "Roti / Chapati", category: "Grains & Breads", serving: "1 roti (~40g)", calories: 104, protein: 3, carbs: 22, fat: 1 },
  { id: "plain-rice", name: "Steamed Rice", category: "Grains & Breads", serving: "1 cup cooked (~150g)", calories: 205, protein: 4, carbs: 45, fat: 0.4 },
  { id: "jeera-rice", name: "Jeera Rice", category: "Grains & Breads", serving: "1 cup (~150g)", calories: 240, protein: 4, carbs: 44, fat: 6 },
  { id: "veg-biryani", name: "Veg Biryani", category: "Grains & Breads", serving: "1 plate (~250g)", calories: 290, protein: 7, carbs: 50, fat: 7 },
  { id: "chicken-biryani", name: "Chicken Biryani", category: "Grains & Breads", serving: "1 plate (~300g)", calories: 480, protein: 22, carbs: 55, fat: 18 },
  { id: "naan", name: "Naan", category: "Grains & Breads", serving: "1 naan (~90g)", calories: 262, protein: 9, carbs: 45, fat: 5 },
  { id: "butter-naan", name: "Butter Naan", category: "Grains & Breads", serving: "1 naan (~95g)", calories: 320, protein: 9, carbs: 46, fat: 11 },
  { id: "aloo-paratha", name: "Aloo Paratha", category: "Grains & Breads", serving: "1 paratha (~120g)", calories: 290, protein: 6, carbs: 40, fat: 12 },
  { id: "plain-paratha", name: "Plain Paratha", category: "Grains & Breads", serving: "1 paratha (~80g)", calories: 260, protein: 5, carbs: 36, fat: 10 },
  { id: "puri", name: "Puri", category: "Grains & Breads", serving: "1 puri (~25g)", calories: 100, protein: 2, carbs: 12, fat: 5 },
  { id: "bhature", name: "Bhatura", category: "Grains & Breads", serving: "1 piece (~90g)", calories: 330, protein: 7, carbs: 45, fat: 13 },
  { id: "poha", name: "Poha", category: "Grains & Breads", serving: "1 bowl (~180g)", calories: 250, protein: 5, carbs: 40, fat: 8 },
  { id: "upma", name: "Upma", category: "Grains & Breads", serving: "1 bowl (~180g)", calories: 250, protein: 6, carbs: 38, fat: 9 },

  // ---------- Dals & Legumes ----------
  { id: "dal-tadka", name: "Dal Tadka", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 180, protein: 9, carbs: 22, fat: 6 },
  { id: "dal-makhani", name: "Dal Makhani", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 290, protein: 11, carbs: 24, fat: 16 },
  { id: "rajma", name: "Rajma", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 230, protein: 12, carbs: 32, fat: 6 },
  { id: "chole", name: "Chole (Chana Masala)", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 270, protein: 12, carbs: 35, fat: 9 },
  { id: "sambar", name: "Sambar", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 140, protein: 7, carbs: 20, fat: 4 },
  { id: "moong-dal", name: "Moong Dal", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 160, protein: 10, carbs: 22, fat: 4 },
  { id: "kadhi", name: "Kadhi", category: "Dals & Legumes", serving: "1 bowl (~150g)", calories: 190, protein: 7, carbs: 18, fat: 10 },

  // ---------- Sabzis & Paneer ----------
  { id: "palak-paneer", name: "Palak Paneer", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 270, protein: 12, carbs: 12, fat: 20 },
  { id: "paneer-butter-masala", name: "Paneer Butter Masala", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 340, protein: 13, carbs: 14, fat: 26 },
  { id: "shahi-paneer", name: "Shahi Paneer", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 350, protein: 13, carbs: 15, fat: 27 },
  { id: "aloo-gobi", name: "Aloo Gobi", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 180, protein: 4, carbs: 22, fat: 9 },
  { id: "bhindi-masala", name: "Bhindi Masala", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 160, protein: 3, carbs: 14, fat: 11 },
  { id: "baingan-bharta", name: "Baingan Bharta", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 150, protein: 3, carbs: 14, fat: 10 },
  { id: "mix-veg", name: "Mixed Vegetable Curry", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 170, protein: 4, carbs: 18, fat: 9 },
  { id: "matar-paneer", name: "Matar Paneer", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 300, protein: 13, carbs: 18, fat: 20 },
  { id: "aloo-matar", name: "Aloo Matar", category: "Sabzis & Paneer", serving: "1 bowl (~150g)", calories: 180, protein: 5, carbs: 26, fat: 7 },
  { id: "paneer-tikka", name: "Paneer Tikka", category: "Sabzis & Paneer", serving: "5 pieces (~120g)", calories: 280, protein: 16, carbs: 8, fat: 20 },

  // ---------- Non-Veg ----------
  { id: "chicken-curry", name: "Chicken Curry", category: "Non-Veg", serving: "1 bowl (~150g)", calories: 290, protein: 26, carbs: 8, fat: 17 },
  { id: "butter-chicken", name: "Butter Chicken", category: "Non-Veg", serving: "1 bowl (~150g)", calories: 350, protein: 24, carbs: 10, fat: 24 },
  { id: "chicken-tikka", name: "Chicken Tikka", category: "Non-Veg", serving: "5 pieces (~120g)", calories: 220, protein: 30, carbs: 4, fat: 9 },
  { id: "tandoori-chicken", name: "Tandoori Chicken", category: "Non-Veg", serving: "2 pieces (~150g)", calories: 260, protein: 33, carbs: 3, fat: 13 },
  { id: "grilled-chicken", name: "Grilled Chicken Breast", category: "Non-Veg", serving: "100g", calories: 165, protein: 31, carbs: 0, fat: 4 },
  { id: "mutton-curry", name: "Mutton Curry", category: "Non-Veg", serving: "1 bowl (~150g)", calories: 360, protein: 25, carbs: 6, fat: 26 },
  { id: "fish-curry", name: "Fish Curry", category: "Non-Veg", serving: "1 bowl (~150g)", calories: 240, protein: 24, carbs: 8, fat: 12 },
  { id: "fish-fry", name: "Fish Fry", category: "Non-Veg", serving: "2 pieces (~120g)", calories: 250, protein: 22, carbs: 8, fat: 14 },
  { id: "egg-curry", name: "Egg Curry", category: "Non-Veg", serving: "2 eggs + gravy (~200g)", calories: 280, protein: 16, carbs: 9, fat: 20 },
  { id: "keema", name: "Mutton Keema", category: "Non-Veg", serving: "1 bowl (~150g)", calories: 330, protein: 24, carbs: 6, fat: 23 },

  // ---------- Eggs ----------
  { id: "boiled-egg", name: "Boiled Egg", category: "Eggs", serving: "1 large egg (~50g)", calories: 78, protein: 6, carbs: 0.6, fat: 5 },
  { id: "egg-omelette", name: "Egg Omelette", category: "Eggs", serving: "2 eggs (~120g)", calories: 220, protein: 14, carbs: 2, fat: 17 },
  { id: "egg-bhurji", name: "Egg Bhurji", category: "Eggs", serving: "2 eggs (~130g)", calories: 240, protein: 14, carbs: 4, fat: 18 },

  // ---------- Snacks & Street Food ----------
  { id: "samosa", name: "Samosa", category: "Snacks & Street Food", serving: "1 piece (~60g)", calories: 160, protein: 3, carbs: 18, fat: 9 },
  { id: "pakora", name: "Pakora", category: "Snacks & Street Food", serving: "4 pieces (~80g)", calories: 220, protein: 5, carbs: 22, fat: 13 },
  { id: "idli", name: "Idli", category: "Snacks & Street Food", serving: "2 pieces (~120g)", calories: 120, protein: 4, carbs: 26, fat: 0.5 },
  { id: "dosa", name: "Plain Dosa", category: "Snacks & Street Food", serving: "1 dosa (~120g)", calories: 168, protein: 4, carbs: 28, fat: 4 },
  { id: "masala-dosa", name: "Masala Dosa", category: "Snacks & Street Food", serving: "1 dosa (~200g)", calories: 290, protein: 6, carbs: 44, fat: 10 },
  { id: "vada", name: "Medu Vada", category: "Snacks & Street Food", serving: "2 pieces (~90g)", calories: 220, protein: 6, carbs: 26, fat: 11 },
  { id: "dhokla", name: "Dhokla", category: "Snacks & Street Food", serving: "3 pieces (~120g)", calories: 160, protein: 6, carbs: 24, fat: 4 },
  { id: "pav-bhaji", name: "Pav Bhaji", category: "Snacks & Street Food", serving: "1 plate (~250g)", calories: 400, protein: 9, carbs: 52, fat: 17 },
  { id: "vada-pav", name: "Vada Pav", category: "Snacks & Street Food", serving: "1 piece (~140g)", calories: 290, protein: 7, carbs: 42, fat: 11 },
  { id: "aloo-tikki", name: "Aloo Tikki", category: "Snacks & Street Food", serving: "2 pieces (~120g)", calories: 220, protein: 4, carbs: 30, fat: 9 },
  { id: "chole-bhature-plate", name: "Pani Puri", category: "Snacks & Street Food", serving: "6 pieces (~120g)", calories: 180, protein: 4, carbs: 30, fat: 5 },

  // ---------- Dairy ----------
  { id: "paneer-raw", name: "Paneer (plain)", category: "Dairy", serving: "50g", calories: 145, protein: 9, carbs: 2, fat: 11 },
  { id: "curd", name: "Curd / Dahi", category: "Dairy", serving: "1 cup (~150g)", calories: 100, protein: 6, carbs: 8, fat: 5 },
  { id: "lassi", name: "Sweet Lassi", category: "Dairy", serving: "1 glass (~250ml)", calories: 220, protein: 7, carbs: 32, fat: 7 },
  { id: "buttermilk", name: "Buttermilk (Chaas)", category: "Dairy", serving: "1 glass (~250ml)", calories: 60, protein: 3, carbs: 6, fat: 2 },
  { id: "milk", name: "Milk (full fat)", category: "Dairy", serving: "1 glass (~250ml)", calories: 150, protein: 8, carbs: 12, fat: 8 },
  { id: "ghee", name: "Ghee", category: "Dairy", serving: "1 tbsp (~14g)", calories: 123, protein: 0, carbs: 0, fat: 14 },

  // ---------- Fruits ----------
  { id: "banana", name: "Banana", category: "Fruits", serving: "1 medium (~120g)", calories: 105, protein: 1, carbs: 27, fat: 0.4 },
  { id: "apple", name: "Apple", category: "Fruits", serving: "1 medium (~180g)", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: "mango", name: "Mango", category: "Fruits", serving: "1 cup sliced (~165g)", calories: 99, protein: 1.4, carbs: 25, fat: 0.6 },
  { id: "orange", name: "Orange", category: "Fruits", serving: "1 medium (~130g)", calories: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { id: "papaya", name: "Papaya", category: "Fruits", serving: "1 cup cubed (~145g)", calories: 62, protein: 0.7, carbs: 16, fat: 0.4 },
  { id: "guava", name: "Guava", category: "Fruits", serving: "1 fruit (~100g)", calories: 68, protein: 2.6, carbs: 14, fat: 1 },
];
