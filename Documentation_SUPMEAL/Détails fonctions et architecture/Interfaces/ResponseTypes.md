# API Response Interfaces

## `RecipeResponse`

Interface pour les réponses contenant une recette, produite par `shapeRecipes()`. Cette forme diffère du modèle `Recipe` de la base : les colonnes SQL en `snake_case` sont converties en `camelCase` et les tables de liaison (`recipe_ingredients`, `recipe_tags`, `recipe_steps`, `recipe_planned_dates`, `comments`) sont agrégées en tableaux imbriqués.

```typescript
interface RecipeResponse {
    id: string;
    title: string;
    ownerId: string; // Foreign Key vers User.id
    cookbookId?: string; // Foreign Key vers Cookbook.id
    image?: string;
    prepTime: number; // minutes
    cookTime: number; // minutes
    servings: number;
    source: string;
    favorite: boolean;
    difficulty?: string;
    tags: string[];
    ingredients: RecipeIngredientResponse[];
    steps: string[];
    plannedDates: string[]; // dates au format YYYY-MM-DD
    comments?: RecipeCommentResponse[]; // présent uniquement si demandé via l'option includeComments
}
```

**Champs spéciaux :**
- `ingredients`, `tags` et `steps` sont toujours des tableaux (vides si la recette n'en a pas), triés par `position`
- `comments` n'est inclus que sur les routes qui appellent `shapeRecipes(ids, { includeComments: true })`

**Relations :**
- `ownerId` : correspond à `users.id`
- `cookbookId` : correspond à `cookbooks.id`, absent si la recette est personnelle

**Utilisation :** réponses des endpoints `/api/recipes/*`
- `GET /api/recipes` : `RecipeResponse[]`
- `POST /api/recipes`, `GET /api/recipes/:id`, `PATCH /api/recipes/:id` : `RecipeResponse` unique
- `POST /api/recipes/:id/toggle-favorite`, `POST /api/recipes/:id/planned-dates`, `DELETE /api/recipes/:id/planned-dates/:date`
- `POST /api/recipes/:id/comments`, `PATCH /api/recipes/:id/comments/:commentId`, `DELETE /api/recipes/:id/comments/:commentId` (avec `comments` inclus)
- `GET /api/recipes/suggestions` : sous-ensemble de `RecipeResponse[]`

## `RecipeIngredientResponse`

Interface pour un ingrédient tel qu'imbriqué dans une réponse de recette.

```typescript
interface RecipeIngredientResponse {
    name: string;
    quantity?: string; // null si non renseignée à la création de la recette
    unit: string;
}
```

**Utilisation :** tableau `RecipeResponse.ingredients`, également utilisé comme base de calcul de `ShoppingListItemResponse`

## `RecipeCommentResponse`

Interface pour un commentaire tel qu'imbriqué dans une réponse de recette.

```typescript
interface RecipeCommentResponse {
    id: string;
    userId: string; // Foreign Key vers User.id
    text: string;
    createdAt: string; // ISO 8601
    editedAt?: string; // ISO 8601, présent uniquement si le commentaire a été modifié
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
}
```

**Relations :**
- `userId` et `user.id` : correspondent à `users.id`

**Utilisation :** tableau `RecipeResponse.comments`, renvoyé par `GET /api/recipes/:id` et par les routes `POST/PATCH/DELETE /api/recipes/:id/comments*`

## `UserResponse`

Interface pour les réponses contenant les informations du compte utilisateur, produite par `getUserById()`. Cette forme diffère du modèle `User` de la base : le mot de passe n'est jamais exposé, les jeux de préférences (`user_allergies`, `user_diets`, `user_cuisines`, `user_preferences`) sont regroupés dans un objet `preferences`, et les comptes OAuth liés sont réduits à la liste de leurs fournisseurs.

```typescript
interface UserResponse {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    hasPassword: boolean; // true si un mot de passe local est défini
    oauthProviders: ('google' | 'microsoft' | 'github')[];
    preferences: UserPreferencesResponse;
}
```

**Contraintes :**
- `password_hash` n'apparaît jamais dans cette interface : seul le booléen `hasPassword` est exposé
- `hasPassword` : dérivé de `password_hash IS NOT NULL` en base

**Relations :**
- `oauthProviders` : dérivé de `oauth_accounts.provider` pour cet utilisateur
- `preferences` : dérivé de `user_preferences`, `user_allergies`, `user_diets`, `user_cuisines`

**Utilisation :** réponses des endpoints `/api/auth/*` et `/api/users/*`
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (imbriqué dans `{ user }`)
- `PATCH /api/users/me`, `PATCH /api/users/me/preferences` (imbriqué dans `{ user }`)

## `UserPreferencesResponse`

Interface pour l'objet `preferences` imbriqué dans `UserResponse`.

```typescript
interface UserPreferencesResponse {
    diets: string[];
    allergies: string[];
    favoriteCuisines: string[];
    defaultServings: number;
}
```

**Contraintes :**
- `defaultServings` : DEFAULT 2 si aucune préférence n'a encore été enregistrée
- `diets`, `allergies`, `favoriteCuisines` : tableaux vides (`[]`) si aucune valeur n'est enregistrée, jamais `null`

**Utilisation :** champ `UserResponse.preferences`, également utilisé côté serveur pour scorer les suggestions de recettes (`GET /api/recipes/suggestions`)

## `CookbookResponse`

Interface pour les réponses contenant le détail d'un cookbook, produite par `getCookbookDetail()`. Cette forme diffère du modèle `Cookbook` de la base : la table de liaison `cookbook_members` est enrichie avec les informations publiques de chaque membre, et les recettes du cookbook sont réduites à leurs identifiants.

```typescript
interface CookbookResponse {
    id: string;
    name: string;
    description: string;
    members: CookbookMemberResponse[];
    recipeIds: string[];
}
```

**Champs spéciaux :**
- `recipeIds` : identifiants des recettes dont `cookbook_id` correspond à ce cookbook ; le détail de chaque recette doit être récupéré séparément via `GET /api/recipes/:id`

**Utilisation :** réponses des endpoints `/api/cookbooks/*`
- `POST /api/cookbooks`, `GET /api/cookbooks/:id`, `PATCH /api/cookbooks/:id`
- `POST /api/cookbooks/:id/members`, `PATCH /api/cookbooks/:id/members/:userId`, `DELETE /api/cookbooks/:id/members/:userId`

## `CookbookMemberResponse`

Interface pour un membre tel qu'imbriqué dans une réponse de cookbook.

```typescript
interface CookbookMemberResponse {
    userId: string; // Foreign Key vers User.id
    role: 'creator' | 'editor' | 'reader' | 'commenter';
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
}
```

**Relations :**
- `userId` et `user.id` : correspondent à `users.id`
- `role` : reflète `cookbook_members.role`, contrôle les droits de lecture/écriture/commentaire sur les recettes du cookbook

**Utilisation :** tableau `CookbookResponse.members`

## `ShoppingListItemResponse`

Interface pour un article de la liste de courses, produite par `getShoppingList()`. Cette forme agrège les `RecipeIngredientResponse` de toutes les recettes planifiées sur la semaine demandée, fusionnés par nom et unité.

```typescript
interface ShoppingListItemResponse {
    key: string; // `${nom en minuscules}|${unité en minuscules}`, identifiant de fusion
    name: string;
    unit: string;
    qty?: number; // null si au moins une occurrence a une quantité non numérique
    mixed: boolean; // true si des quantités numériques et non numériques ont été mélangées
}
```

**Champs spéciaux :**
- `qty` : somme des quantités numériques des occurrences fusionnées ; `null` dès qu'une occurrence n'a pas de quantité exploitable
- `mixed` : signale à l'affichage qu'un total fiable n'a pas pu être calculé

## `ShoppingChecksResponse`

Interface pour l'état des cases cochées de la liste de courses, produite par `getShoppingChecks()` et acceptée en entrée par `PUT /api/planning/shopping-checks`. Persistée en base (table `shopping_checks`), par utilisateur et par semaine.

```typescript
interface ShoppingChecksResponse {
    [itemKey: string]: true | number; // itemKey = ShoppingListItemResponse.key
}
```

**Champs spéciaux :**
- clé : identique à `ShoppingListItemResponse.key`, permet de faire correspondre chaque entrée à sa ligne dans la liste de courses
- valeur `true` : ingrédient à quantité non homogène (`mixed: true`) entièrement coché
- valeur `number` : quantité déjà cochée d'un ingrédient à quantité numérique (peut être inférieure à `qty` si seule une partie a été cochée)
- absence de clé pour un `itemKey` donné : ingrédient non coché

**Utilisation :** réponse de `GET /api/planning/shopping-checks?weekStart=YYYY-MM-DD` ; corps `{ checked: ShoppingChecksResponse }` attendu par `PUT /api/planning/shopping-checks?weekStart=YYYY-MM-DD` (remplacement complet, pas de fusion)

**Relations :**
- Calculé à partir de `RecipeResponse.ingredients` et `RecipeResponse.plannedDates` pour toutes les recettes accessibles à l'utilisateur

**Utilisation :** réponse (tableau `ShoppingListItemResponse[]`) de `GET /api/planning/shopping-list?weekStart=YYYY-MM-DD`
