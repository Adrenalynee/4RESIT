## Configuration de la base de données PostgreSQL

### Pool de connexions

* **Configuration**

  * `connectionString` : depuis variable d'environnement `DATABASE_URL`
  * Type : Pool de connexions PostgreSQL (`pg.Pool`)
  * Usage : pool global exporté et réutilisé dans tous les contrôleurs et fichiers `utils/*.js`

* **Lignes importantes**

  * import du driver : `import { Pool } from 'pg';`
  * instanciation unique du pool : `export const pool = new Pool({ connectionString: process.env.DATABASE_URL });`
  * export nommé `pool` : permet à chaque module (`utils/cookbooks.js`, `utils/recipes.js`, `utils/messages.js`, `config/passport.js`, etc.) d'importer la même instance sans en recréer une

### Initialisation du schéma (`db/init/001_schema.sql`)

SUPMEAL délègue la création du schéma à des scripts SQL montés dans le conteneur PostgreSQL au premier démarrage (dossier `db/init`, exécuté automatiquement par l'image officielle `postgres` via `docker-entrypoint-initdb.d`). Le fichier `db.js` ne fait donc qu'ouvrir le pool ; la structure de la base est décrite ci-dessous à titre de référence.

#### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

* **`pgcrypto`** : fournit `gen_random_uuid()` utilisé comme valeur par défaut de toutes les clés primaires
* **`pg_trgm`** : fournit les opérateurs de similarité trigram utilisés par les index `GIN` de recherche texte (titres de recettes, noms d'ingrédients, tags, étapes)

#### Table `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

* **Contraintes** : `name` et `email` uniques
* **Usage** : comptes utilisateurs pour l'authentification classique (`password_hash`) et OAuth (compte créé sans mot de passe)
* **Trigger** : `updated_at` maintenu automatiquement par `set_updated_at()` (voir `002_triggers.sql`)

#### Table `oauth_accounts`

```sql
CREATE TABLE oauth_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'github')),
  provider_user_id TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);
```

* **Relations** : `user_id` → `users(id)` avec suppression en cascade
* **Contraintes** : couple `(provider, provider_user_id)` unique, `provider` restreint par `CHECK`
* **Usage** : liaison entre un compte SUPMEAL et un compte tiers (Google notamment, voir `Passport.md`)

#### Table `user_preferences`

```sql
CREATE TABLE user_preferences (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_servings  SMALLINT NOT NULL DEFAULT 2 CHECK (default_servings > 0)
);
```

* **Relations** : `user_id` → `users(id)` avec suppression en cascade, clé primaire = clé étrangère (relation 1-1)
* **Contraintes** : `default_servings` strictement positif
* **Usage** : préférences globales de l'utilisateur (nombre de portions par défaut)

#### Table `user_allergies`

```sql
CREATE TABLE user_allergies (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergy TEXT NOT NULL,
  PRIMARY KEY (user_id, allergy)
);
```

* **Type** : table de liaison à clé primaire composite
* **Relations** : `user_id` → `users(id)` avec suppression en cascade
* **Usage** : liste des allergies déclarées par l'utilisateur

#### Table `user_diets`

```sql
CREATE TABLE user_diets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diet    TEXT NOT NULL,
  PRIMARY KEY (user_id, diet)
);
```

* **Type** : table de liaison à clé primaire composite
* **Relations** : `user_id` → `users(id)` avec suppression en cascade
* **Usage** : régimes alimentaires suivis par l'utilisateur (végétarien, sans gluten, etc.)

#### Table `user_cuisines`

```sql
CREATE TABLE user_cuisines (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cuisine TEXT NOT NULL,
  PRIMARY KEY (user_id, cuisine)
);
```

* **Type** : table de liaison à clé primaire composite
* **Relations** : `user_id` → `users(id)` avec suppression en cascade
* **Usage** : cuisines préférées de l'utilisateur (italienne, asiatique, etc.)

#### Type énuméré `cookbook_role`

```sql
CREATE TYPE cookbook_role AS ENUM ('creator', 'editor', 'reader', 'commenter');
```

* **Usage** : niveau de permission d'un membre au sein d'un cookbook, utilisé par `cookbook_members.role` et exploité par les middlewares `requireCookbookRole` et `requireRecipeAccess`

#### Table `cookbooks`

```sql
CREATE TABLE cookbooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

* **Relations** : `created_by` → `users(id)`, mis à `NULL` si le créateur est supprimé (pas de cascade, pour conserver le cookbook)
* **Usage** : carnet de recettes partagé entre plusieurs utilisateurs
* **Trigger** : `updated_at` maintenu automatiquement

#### Table `cookbook_members` (liaison)

```sql
CREATE TABLE cookbook_members (
  cookbook_id UUID NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        cookbook_role NOT NULL DEFAULT 'reader',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cookbook_id, user_id)
);
CREATE INDEX idx_cookbook_members_user ON cookbook_members(user_id);
```

* **Type** : table de liaison many-to-many avec attribut (`role`)
* **Relations** : double référence avec suppression en cascade
* **Usage** : appartenance d'un utilisateur à un cookbook et rôle associé (`creator`, `editor`, `reader`, `commenter`)

#### Table `ingredients`

```sql
CREATE TABLE ingredients (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING GIN (name gin_trgm_ops);
```

* **Contraintes** : nom unique
* **Index** : index trigram `GIN` pour la recherche approchée par nom
* **Usage** : référentiel global des ingrédients, dédupliqué via `findOrCreateIngredient`

#### Table `tags`

```sql
CREATE TABLE tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);
```

* **Contraintes** : nom unique
* **Index** : index trigram `GIN` pour la recherche approchée par nom
* **Usage** : référentiel global des tags de recette, dédupliqué via `findOrCreateTag`

#### Table `recipes`

```sql
CREATE TABLE recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cookbook_id       UUID REFERENCES cookbooks(id) ON DELETE SET NULL,
  image_url         TEXT,
  prep_time_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (prep_time_minutes >= 0),
  cook_time_minutes SMALLINT NOT NULL DEFAULT 0 CHECK (cook_time_minutes >= 0),
  servings          SMALLINT NOT NULL DEFAULT 1 CHECK (servings > 0),
  source            TEXT NOT NULL DEFAULT '',
  favorite          BOOLEAN NOT NULL DEFAULT false,
  difficulty        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recipes_owner ON recipes(owner_id);
CREATE INDEX idx_recipes_cookbook ON recipes(cookbook_id);
CREATE INDEX idx_recipes_favorite ON recipes(owner_id) WHERE favorite;
CREATE INDEX idx_recipes_title_trgm ON recipes USING GIN (title gin_trgm_ops);
```

* **Relations** : `owner_id` → `users(id)` avec suppression en cascade ; `cookbook_id` → `cookbooks(id)`, mis à `NULL` si le cookbook est supprimé (la recette redevient une recette personnelle)
* **Contraintes** : temps de préparation/cuisson positifs, nombre de portions strictement positif
* **Index** : index partiel sur les favoris, index trigram sur le titre pour la recherche
* **Usage** : entité centrale de l'application, une recette avec ses métadonnées

#### Table `recipe_ingredients` (liaison)

```sql
CREATE TABLE recipe_ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity      TEXT,
  unit          TEXT NOT NULL DEFAULT '',
  position      SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
```

* **Type** : table de liaison many-to-many avec attributs (`quantity`, `unit`, `position`)
* **Relations** : `recipe_id` → `recipes(id)` avec suppression en cascade ; `ingredient_id` → `ingredients(id)` avec `ON DELETE RESTRICT` (empêche la suppression d'un ingrédient encore utilisé)
* **Usage** : composition d'une recette, ordonnée par `position`

#### Table `recipe_tags` (liaison)

```sql
CREATE TABLE recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);
```

* **Type** : table de liaison many-to-many
* **Relations** : double référence avec suppression en cascade
* **Usage** : association recettes ↔ tags

#### Table `recipe_steps`

```sql
CREATE TABLE recipe_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL,
  instruction TEXT NOT NULL,
  UNIQUE (recipe_id, position)
);
CREATE INDEX idx_recipe_steps_instruction_trgm ON recipe_steps USING GIN (instruction gin_trgm_ops);
```

* **Relations** : `recipe_id` → `recipes(id)` avec suppression en cascade
* **Contraintes** : couple `(recipe_id, position)` unique pour garantir un ordre d'étapes cohérent
* **Index** : index trigram sur `instruction` pour la recherche plein texte dans les étapes
* **Usage** : étapes de préparation ordonnées d'une recette

#### Table `recipe_planned_dates` (liaison)

```sql
CREATE TABLE recipe_planned_dates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  UNIQUE (recipe_id, planned_date)
);
CREATE INDEX idx_recipe_planned_dates_date ON recipe_planned_dates(planned_date);
```

* **Relations** : `recipe_id` → `recipes(id)` avec suppression en cascade
* **Contraintes** : couple `(recipe_id, planned_date)` unique, une recette ne peut être planifiée deux fois le même jour
* **Usage** : planification des recettes dans un calendrier de repas

#### Table `shopping_checks`

```sql
CREATE TABLE shopping_checks (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  checked    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
```

* **Relations** : `user_id` → `users(id)` avec suppression en cascade
* **Contraintes** : clé primaire composite `(user_id, week_start)` — une seule ligne par utilisateur et par semaine
* **Usage** : état des cases cochées de la liste de courses hebdomadaire (`getShoppingChecks`/`saveShoppingChecks`, voir `Utils/Planning.md`). La colonne `checked` reproduit directement la forme utilisée côté client, `{ [itemKey]: true | number }` (`true` pour un ingrédient à quantité non homogène entièrement coché, un nombre pour la quantité déjà cochée d'un ingrédient à quantité numérique)
* **Trigger** : `updated_at` maintenu automatiquement par `set_updated_at()` (voir `002_triggers.sql`)

#### Table `comments`

```sql
CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at  TIMESTAMPTZ
);
CREATE INDEX idx_comments_recipe ON comments(recipe_id, created_at);
```

* **Relations** : `recipe_id` → `recipes(id)`, `user_id` → `users(id)`, les deux avec suppression en cascade
* **Usage** : commentaires laissés sur une recette (par exemple par les membres d'un cookbook ayant le rôle `commenter`)

#### Table `messages`

```sql
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id UUID NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ
);
CREATE INDEX idx_messages_cookbook ON messages(cookbook_id, created_at);
```

* **Relations** : `cookbook_id` → `cookbooks(id)`, `user_id` → `users(id)`, les deux avec suppression en cascade
* **Usage** : messages de la messagerie temps réel associée à un cookbook (voir `Sockets/Chat.md`)

### Triggers (`db/init/002_triggers.sql`)

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cookbooks_updated_at
  BEFORE UPDATE ON cookbooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_shopping_checks_updated_at
  BEFORE UPDATE ON shopping_checks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

* **Fonction** : `set_updated_at()` remplace `NEW.updated_at` par l'horodatage courant avant chaque `UPDATE`
* **Tables concernées** : `users`, `cookbooks`, `recipes`, `shopping_checks`, les quatre seules tables possédant une colonne `updated_at`
* **Bénéfice** : évite d'avoir à positionner `updated_at` manuellement dans chaque requête `UPDATE` côté code applicatif (`updateRecipe` par exemple ne touche pas à cette colonne)

### Variables d'environnement requises

* **`DATABASE_URL`** : chaîne de connexion PostgreSQL complète
  * Format : `postgresql://user:password@host:port/database`
  * Exemple : `postgresql://postgres:password@db:5432/supmeal` (nom d'hôte `db` défini par le service `docker-compose`)

### Stratégie de suppression

* **`ON DELETE CASCADE`** : utilisée pour la grande majorité des relations (utilisateurs, cookbooks, recettes, messages, commentaires, tables de liaison)
* **`ON DELETE SET NULL`** : utilisée pour `cookbooks.created_by` et `recipes.cookbook_id`, afin de conserver le contenu même si le créateur ou le cookbook parent disparaît
* **`ON DELETE RESTRICT`** : utilisée uniquement pour `recipe_ingredients.ingredient_id`, afin d'empêcher la suppression d'un ingrédient du référentiel global tant qu'il est référencé par une recette
* **Sécurité** : cette combinaison évite les références orphelines tout en préservant les données pertinentes lorsqu'une simple mise à `NULL` est préférable à une cascade destructrice
