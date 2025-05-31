# comidasimple
Comidas fáciles, saludables y económicas. Menú semanal + compras en minutos.

### 🥗 **Comida Simple – Family Meal Planning App**

**Comida Simple** is a full-stack web app that helps families plan their weekly lunches and dinners in a smart, healthy, and cost-effective way. Each user can generate a personalized meal plan based on their preferences and their family's needs, and the app will suggest recipes, avoid repetition, and build a complete grocery list. It's ideal for busy families who want to simplify meal prep without sacrificing health or budget.

---

### 🔑 Key Features

1. **User login** (email + Google Sign-In)
2. **Family system:** One user can create a family and add members; members can create their own user accounts and join an existing family.
3. **Weekly lunch & dinner planner only**
4. **Customizable meal selection:**

   * User selects how many meals they want to plan for (e.g., just dinners, or both lunch and dinner).
   * User defines food preferences via tags (e.g., vegetarian, low-carb).
5. **Smart recipe suggestions:**

   * The system uses user ratings (1–5 stars) to suggest favorite meals more often.
   * Meals with a low rating (1–2 stars) will be excluded from future planning.
   * The system avoids repeating the same recipes from the last 2 weeks, unless the user overrides this.
6. **Grocery list generation:** After the plan is confirmed, the app builds a detailed shopping list with quantities for the week’s meals.
7. **Nutritional analysis:** Each recipe has a complete breakdown of calories, protein, carbs, fiber, etc.
8. **Batch cooking and seasonal cooking:** Future features will prioritize ingredients that are in season and suitable for batch cooking, to reduce cost and time.
9. **Recipe system:**

   * Users can create and edit recipes.
   * Recipes contain ingredients, preparation steps, nutritional values, image, and tags.
10. **Favorites system:** Users can favorite and tag recipes for quicker access.
11. **Scalable database**: Built on PostgreSQL (from Supabase schema), with relationships between users, families, recipes, ingredients, nutrients, and tags.

---

### 🗂️ Database Structure Summary

* **Users & Families:**

  * `usuarios`, `familias`, `miembros_familia`
* **Planning & Meals:**

  * `comidas_semana`, `recetas_favoritas`, `recetas`, `receta_ingredientes`
* **Nutritional Data:**

  * `ingredientes`, `nutrientes`, `ingrediente_nutriente`
* **Tags & Preferences:**

  * `tags`, `usuario_tag`, `receta_tag`
* **Recipes Ratings:** (To be added) `receta_rating` table: `usuario_id`, `receta_id`, `rating` (1 to 5)
* **Media Storage:** `storage.objects` for recipe images

---
