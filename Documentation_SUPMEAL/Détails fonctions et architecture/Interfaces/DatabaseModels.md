# Database Models

## `User`

Modèle de données pour la table `users`.

```typescript
interface User {
    id: string; // UUID
    name: string;
    email: string;
    password_hash?: string; // Jamais retourné dans les API
    avatar_url?: string;
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601, maintenu par trigger
}
```

**Contraintes :**
- `name` : UNIQUE, NOT NULL
- `email` : UNIQUE, NOT NULL
- `password_hash` : NULL si le compte a été créé via OAuth uniquement
- `updated_at` : mis à jour automatiquement par le trigger `trg_users_updated_at`

**Relations :**
- Référencé par `oauth_accounts.user_id`, `user_preferences.user_id`, `user_allergies.user_id`, `user_diets.user_id`, `user_cuisines.user_id`
- Référencé par `cookbooks.created_by`, `cookbook_members.user_id`
- Référencé par `recipes.owner_id`, `comments.user_id`, `messages.user_id`

**Utilisation :**
- Création de compte : `POST /api/auth/register`
- Connexion : `POST /api/auth/login`, `GET /api/auth/google/callback`
- Lecture du profil courant : `GET /api/auth/me`
- Mise à jour du profil : `PATCH /api/users/me`, `PATCH /api/users/me/password`
- Suppression de compte : `DELETE /api/users/me`

## `OauthAccount`

Modèle de données pour la table `oauth_accounts`.

```typescript
interface OauthAccount {
    id: string; // UUID
    user_id: string; // Foreign Key vers User.id
    provider: 'google' | 'microsoft' | 'github';
    provider_user_id: string;
    created_at: string; // ISO 8601
}
```

**Contraintes :**
- `user_id` : NOT NULL, ON DELETE CASCADE
- `provider` : NOT NULL, CHECK IN ('google', 'microsoft', 'github')
- `provider_user_id` : NOT NULL
- UNIQUE (`provider`, `provider_user_id`)

**Relations :**
- `user_id` : référence `users.id`
- Un utilisateur peut posséder plusieurs comptes OAuth (un par fournisseur)

**Utilisation :**
- Création/lecture lors de l'authentification Google : `GET /api/auth/google`, `GET /api/auth/google/callback`
- Exposé de manière agrégée (liste de fournisseurs) dans `User.oauthProviders` via `getUserById`

## `UserPreferences`

Modèle de données pour la table `user_preferences`.

```typescript
interface UserPreferences {
    user_id: string; // Primary Key, Foreign Key vers User.id
    default_servings: number;
}
```

**Contraintes :**
- `user_id` : clé primaire, ON DELETE CASCADE
- `default_servings` : NOT NULL, DEFAULT 2, CHECK (`default_servings` > 0)

**Relations :**
- `user_id` : référence `users.id` (relation 1—1, une ligne créée à l'inscription)

**Utilisation :**
- Créée à l'inscription : `POST /api/auth/register`
- Lue et modifiée via `PATCH /api/users/me/preferences`

## `UserAllergy`

Modèle pour la table de liaison `user_allergies`.

```typescript
interface UserAllergy {
    user_id: string; // Foreign Key vers User.id
    allergy: string;
}
```

**Contraintes :**
- `user_id`, `allergy` : NOT NULL, ON DELETE CASCADE
- **Clé primaire composite :** (user_id, allergy)

**Relations :**
- `user_id` : référence `users.id`

**Utilisation :**
- Remplacée intégralement à chaque mise à jour des préférences : `PATCH /api/users/me/preferences`

## `UserDiet`

Modèle pour la table de liaison `user_diets`.

```typescript
interface UserDiet {
    user_id: string; // Foreign Key vers User.id
    diet: string;
}
```

**Contraintes :**
- `user_id`, `diet` : NOT NULL, ON DELETE CASCADE
- **Clé primaire composite :** (user_id, diet)

**Relations :**
- `user_id` : référence `users.id`

**Utilisation :**
- Remplacée intégralement à chaque mise à jour des préférences : `PATCH /api/users/me/preferences`

## `UserCuisine`

Modèle pour la table de liaison `user_cuisines`.

```typescript
interface UserCuisine {
    user_id: string; // Foreign Key vers User.id
    cuisine: string;
}
```

**Contraintes :**
- `user_id`, `cuisine` : NOT NULL, ON DELETE CASCADE
- **Clé primaire composite :** (user_id, cuisine)

**Relations :**
- `user_id` : référence `users.id`

**Utilisation :**
- Remplacée intégralement à chaque mise à jour des préférences : `PATCH /api/users/me/preferences`

## `Cookbook`

Modèle de données pour la table `cookbooks`.

```typescript
interface Cookbook {
    id: string; // UUID
    name: string;
    description: string;
    created_by?: string; // Foreign Key vers User.id
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601, maintenu par trigger
}
```

**Contraintes :**
- `description` : NOT NULL, DEFAULT ''
- `created_by` : ON DELETE SET NULL (le cookbook survit à la suppression de son créateur)
- `updated_at` : mis à jour automatiquement par le trigger `trg_cookbooks_updated_at`

**Relations :**
- `created_by` : référence `users.id`
- Référencé par `cookbook_members.cookbook_id`, `recipes.cookbook_id`, `messages.cookbook_id`

**Utilisation :**
- Création : `POST /api/cookbooks`
- Lecture (liste et détail) : `GET /api/cookbooks`, `GET /api/cookbooks/:id`
- Mise à jour : `PATCH /api/cookbooks/:id`
- Suppression : `DELETE /api/cookbooks/:id`

## `CookbookMember`

Modèle pour la table de liaison `cookbook_members`.

```typescript
interface CookbookMember {
    cookbook_id: string; // Foreign Key vers Cookbook.id
    user_id: string; // Foreign Key vers User.id
    role: 'creator' | 'editor' | 'reader' | 'commenter';
    joined_at: string; // ISO 8601
}
```

**Contraintes :**
- `cookbook_id`, `user_id` : NOT NULL, ON DELETE CASCADE
- `role` : NOT NULL, DEFAULT 'reader', type ENUM Postgres `cookbook_role`
- **Clé primaire composite :** (cookbook_id, user_id)

**Relations :**
- `cookbook_id` : référence `cookbooks.id`
- `user_id` : référence `users.id`
- Le rôle `'creator'` est attribué automatiquement au créateur lors de `POST /api/cookbooks` et ne peut plus être modifié ni retiré

**Utilisation :**
- Ajout d'un membre : `POST /api/cookbooks/:id/members`
- Modification d'un rôle : `PATCH /api/cookbooks/:id/members/:userId`
- Retrait d'un membre : `DELETE /api/cookbooks/:id/members/:userId`
- Contrôle d'accès aux recettes et aux discussions d'un cookbook (`getMemberRole`)

## `Ingredient`

Modèle de données pour la table `ingredients`.

```typescript
interface Ingredient {
    id: string; // UUID
    name: string;
}
```

**Contraintes :**
- `name` : UNIQUE, NOT NULL
- Index GIN `pg_trgm` sur `name` pour la recherche approchante

**Relations :**
- Référencé par `recipe_ingredients.ingredient_id`

**Utilisation :**
- Créé ou réutilisé à la volée (`findOrCreateIngredient`) lors de la création/mise à jour d'une recette : `POST /api/recipes`, `PATCH /api/recipes/:id`
- Filtré par nom lors de la recherche de recettes : `GET /api/recipes?ingredient=...`

## `Tag`

Modèle de données pour la table `tags`.

```typescript
interface Tag {
    id: string; // UUID
    name: string;
}
```

**Contraintes :**
- `name` : UNIQUE, NOT NULL
- Index GIN `pg_trgm` sur `name` pour la recherche approchante

**Relations :**
- Référencé par `recipe_tags.tag_id`

**Utilisation :**
- Créé ou réutilisé à la volée (`findOrCreateTag`) lors de la création/mise à jour d'une recette : `POST /api/recipes`, `PATCH /api/recipes/:id`
- Filtré par nom lors de la recherche de recettes : `GET /api/recipes?tags=...`

## `Recipe`

Modèle de données pour la table `recipes`.

```typescript
interface Recipe {
    id: string; // UUID
    title: string;
    owner_id: string; // Foreign Key vers User.id
    cookbook_id?: string; // Foreign Key vers Cookbook.id
    image_url?: string;
    prep_time_minutes: number;
    cook_time_minutes: number;
    servings: number;
    source: string;
    favorite: boolean;
    difficulty?: string;
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601, maintenu par trigger
}
```

**Contraintes :**
- `owner_id` : NOT NULL, ON DELETE CASCADE
- `cookbook_id` : ON DELETE SET NULL (la recette redevient personnelle si le cookbook est supprimé)
- `prep_time_minutes`, `cook_time_minutes` : NOT NULL, DEFAULT 0, CHECK (>= 0)
- `servings` : NOT NULL, DEFAULT 1, CHECK (> 0)
- `source` : NOT NULL, DEFAULT ''
- `favorite` : NOT NULL, DEFAULT false
- `updated_at` : mis à jour automatiquement par le trigger `trg_recipes_updated_at`
- Index GIN `pg_trgm` sur `title` pour la recherche approchante

**Relations :**
- `owner_id` : référence `users.id`
- `cookbook_id` : référence `cookbooks.id`
- Référencé par `recipe_ingredients.recipe_id`, `recipe_tags.recipe_id`, `recipe_steps.recipe_id`, `recipe_planned_dates.recipe_id`, `comments.recipe_id`

**Utilisation :**
- Liste/recherche filtrée : `GET /api/recipes`
- Création : `POST /api/recipes`, `POST /api/recipes/import-url`
- Détail : `GET /api/recipes/:id`
- Mise à jour : `PATCH /api/recipes/:id`
- Suppression : `DELETE /api/recipes/:id`
- Bascule favori : `POST /api/recipes/:id/toggle-favorite`
- Suggestions personnalisées : `GET /api/recipes/suggestions`

## `RecipeIngredient`

Modèle pour la table de liaison `recipe_ingredients`.

```typescript
interface RecipeIngredient {
    id: string; // UUID
    recipe_id: string; // Foreign Key vers Recipe.id
    ingredient_id: string; // Foreign Key vers Ingredient.id
    quantity?: string;
    unit: string;
    position: number;
}
```

**Contraintes :**
- `recipe_id` : NOT NULL, ON DELETE CASCADE
- `ingredient_id` : NOT NULL, ON DELETE RESTRICT (empêche la suppression d'un ingrédient encore utilisé)
- `unit` : NOT NULL, DEFAULT ''
- `position` : NOT NULL, DEFAULT 0 (ordre d'affichage)

**Relations :**
- `recipe_id` : référence `recipes.id`
- `ingredient_id` : référence `ingredients.id`

**Utilisation :**
- Remplacée intégralement à chaque création/mise à jour d'une recette (`replaceRecipeChildren`) : `POST /api/recipes`, `PATCH /api/recipes/:id`
- Agrégée pour construire la liste de courses : `GET /api/planning/shopping-list`

## `RecipeTag`

Modèle pour la table de liaison `recipe_tags`.

```typescript
interface RecipeTag {
    recipe_id: string; // Foreign Key vers Recipe.id
    tag_id: string; // Foreign Key vers Tag.id
}
```

**Contraintes :**
- `recipe_id`, `tag_id` : NOT NULL, ON DELETE CASCADE
- **Clé primaire composite :** (recipe_id, tag_id)

**Relations :**
- `recipe_id` : référence `recipes.id`
- `tag_id` : référence `tags.id`

**Utilisation :**
- Remplacée intégralement à chaque création/mise à jour d'une recette : `POST /api/recipes`, `PATCH /api/recipes/:id`
- Filtrage des recettes par tag : `GET /api/recipes?tags=...`

## `RecipeStep`

Modèle de données pour la table `recipe_steps`.

```typescript
interface RecipeStep {
    id: string; // UUID
    recipe_id: string; // Foreign Key vers Recipe.id
    position: number;
    instruction: string;
}
```

**Contraintes :**
- `recipe_id` : NOT NULL, ON DELETE CASCADE
- `position` : NOT NULL
- UNIQUE (`recipe_id`, `position`)
- Index GIN `pg_trgm` sur `instruction` pour la recherche approchante

**Relations :**
- `recipe_id` : référence `recipes.id`

**Utilisation :**
- Remplacée intégralement à chaque création/mise à jour d'une recette : `POST /api/recipes`, `PATCH /api/recipes/:id`
- Recherche plein texte sur les instructions : `GET /api/recipes?query=...`

## `RecipePlannedDate`

Modèle de données pour la table `recipe_planned_dates`.

```typescript
interface RecipePlannedDate {
    id: string; // UUID
    recipe_id: string; // Foreign Key vers Recipe.id
    planned_date: string; // Date au format YYYY-MM-DD
}
```

**Contraintes :**
- `recipe_id` : NOT NULL, ON DELETE CASCADE
- `planned_date` : NOT NULL
- UNIQUE (`recipe_id`, `planned_date`) : une recette ne peut être planifiée qu'une fois par jour

**Relations :**
- `recipe_id` : référence `recipes.id`

**Utilisation :**
- Ajout/retrait d'une date de planification : `POST /api/recipes/:id/planned-dates`, `DELETE /api/recipes/:id/planned-dates/:date`
- Base du calcul de la liste de courses hebdomadaire : `GET /api/planning/shopping-list`

## `Comment`

Modèle de données pour la table `comments`.

```typescript
interface Comment {
    id: string; // UUID
    recipe_id: string; // Foreign Key vers Recipe.id
    user_id: string; // Foreign Key vers User.id
    text: string;
    created_at: string; // ISO 8601
    edited_at?: string; // ISO 8601, présent uniquement si le commentaire a été modifié
}
```

**Contraintes :**
- `recipe_id`, `user_id` : NOT NULL, ON DELETE CASCADE
- `text` : NOT NULL
- `edited_at` : NULL tant que le commentaire n'a pas été modifié

**Relations :**
- `recipe_id` : référence `recipes.id`
- `user_id` : référence `users.id`

**Utilisation :**
- Ajout : `POST /api/recipes/:id/comments`
- Modification : `PATCH /api/recipes/:id/comments/:commentId` (auteur uniquement)
- Suppression : `DELETE /api/recipes/:id/comments/:commentId` (auteur uniquement)
- Renvoyés avec le détail de la recette lorsque `includeComments` est demandé : `GET /api/recipes/:id`

## `Message`

Modèle de données pour la table `messages`.

```typescript
interface Message {
    id: string; // UUID
    cookbook_id: string; // Foreign Key vers Cookbook.id
    user_id: string; // Foreign Key vers User.id
    text: string;
    created_at: string; // ISO 8601
    edited_at?: string; // ISO 8601, présent uniquement si le message a été modifié
}
```

**Contraintes :**
- `cookbook_id`, `user_id` : NOT NULL, ON DELETE CASCADE
- `text` : NOT NULL
- `edited_at` : NULL tant que le message n'a pas été modifié

**Relations :**
- `cookbook_id` : référence `cookbooks.id`
- `user_id` : référence `users.id`

**Utilisation :**
- Historique chargé via `GET /api/cookbooks/:id/messages`
- Créés/modifiés/supprimés en temps réel via Socket.IO (`message:send`, `message:edit`, `message:delete`) dans `server/sockets/chat.js`, diffusés à la room `cookbook:<id>`
