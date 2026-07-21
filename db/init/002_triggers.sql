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

CREATE OR REPLACE FUNCTION refresh_recipe_search_vector(p_recipe_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE recipes r SET search_vector =
    setweight(to_tsvector('french', coalesce(r.title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce((
      SELECT string_agg(i.name, ' ')
      FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = r.id
    ), '')), 'B') ||
    setweight(to_tsvector('french', coalesce((
      SELECT string_agg(t.name, ' ')
      FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
      WHERE rt.recipe_id = r.id
    ), '')), 'B') ||
    setweight(to_tsvector('french', coalesce((
      SELECT string_agg(s.instruction, ' ')
      FROM recipe_steps s
      WHERE s.recipe_id = r.id
    ), '')), 'C')
  WHERE r.id = p_recipe_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_fn_recipes_search()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_recipe_search_vector(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipes_search
  AFTER INSERT OR UPDATE OF title ON recipes
  FOR EACH ROW EXECUTE FUNCTION trg_fn_recipes_search();

CREATE OR REPLACE FUNCTION trg_fn_recipe_children_search()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_recipe_search_vector(COALESCE(NEW.recipe_id, OLD.recipe_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipe_ingredients_search
  AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION trg_fn_recipe_children_search();

CREATE TRIGGER trg_recipe_tags_search
  AFTER INSERT OR DELETE ON recipe_tags
  FOR EACH ROW EXECUTE FUNCTION trg_fn_recipe_children_search();

CREATE TRIGGER trg_recipe_steps_search
  AFTER INSERT OR UPDATE OR DELETE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION trg_fn_recipe_children_search();
