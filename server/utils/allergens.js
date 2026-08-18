export const ALLERGENS = [
  { value: 'gluten', label: 'Gluten (céréales)' },
  { value: 'crustaces', label: 'Crustacés' },
  { value: 'oeufs', label: 'Œufs' },
  { value: 'poissons', label: 'Poissons' },
  { value: 'arachides', label: 'Arachides' },
  { value: 'soja', label: 'Soja' },
  { value: 'lait', label: 'Lait' },
  { value: 'fruits_a_coque', label: 'Fruits à coque' },
  { value: 'celeri', label: 'Céleri' },
  { value: 'moutarde', label: 'Moutarde' },
  { value: 'sesame', label: 'Sésame' },
  { value: 'sulfites', label: 'Sulfites' },
  { value: 'lupin', label: 'Lupin' },
  { value: 'mollusques', label: 'Mollusques' },
];

export const ALLERGEN_VALUES = ALLERGENS.map((a) => a.value);
