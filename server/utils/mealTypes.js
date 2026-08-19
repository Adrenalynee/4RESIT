export const MEAL_TYPES = [
  { value: 'entree', label: 'Entrée' },
  { value: 'plat_principal', label: 'Plat principal' },
  { value: 'accompagnement', label: 'Accompagnement' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'aperitif', label: 'Apéritif' },
  { value: 'boisson', label: 'Boisson' },
  { value: 'sauce', label: 'Sauce' },
  { value: 'petit_dejeuner', label: 'Petit-déjeuner / Brunch' },
  { value: 'gouter', label: 'Goûter' },
];

export const MEAL_TYPE_VALUES = MEAL_TYPES.map((m) => m.value);
