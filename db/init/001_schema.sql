CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('google', 'microsoft', 'github')),
  provider_user_id TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);

CREATE TABLE user_preferences (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_servings  SMALLINT NOT NULL DEFAULT 2 CHECK (default_servings > 0)
);

CREATE TABLE user_allergies (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allergy TEXT NOT NULL,
  PRIMARY KEY (user_id, allergy)
);

CREATE TABLE user_diets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diet    TEXT NOT NULL,
  PRIMARY KEY (user_id, diet)
);

CREATE TABLE user_cuisines (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cuisine TEXT NOT NULL,
  PRIMARY KEY (user_id, cuisine)
);

CREATE TYPE cookbook_role AS ENUM ('creator', 'editor', 'reader', 'commenter');

CREATE TABLE cookbooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cookbook_members (
  cookbook_id UUID NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        cookbook_role NOT NULL DEFAULT 'reader',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cookbook_id, user_id)
);
CREATE INDEX idx_cookbook_members_user ON cookbook_members(user_id);

CREATE TABLE ingredients (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_ingredients_name_trgm ON ingredients USING GIN (name gin_trgm_ops);

CREATE TABLE tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);
CREATE INDEX idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);

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

CREATE TABLE recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);

CREATE TABLE recipe_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL,
  instruction TEXT NOT NULL,
  UNIQUE (recipe_id, position)
);
CREATE INDEX idx_recipe_steps_instruction_trgm ON recipe_steps USING GIN (instruction gin_trgm_ops);

CREATE TABLE recipe_planned_dates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  planned_date DATE NOT NULL,
  UNIQUE (recipe_id, planned_date)
);
CREATE INDEX idx_recipe_planned_dates_date ON recipe_planned_dates(planned_date);

CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at  TIMESTAMPTZ
);
CREATE INDEX idx_comments_recipe ON comments(recipe_id, created_at);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id UUID NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ
);
CREATE INDEX idx_messages_cookbook ON messages(cookbook_id, created_at);
