# RecipeScraper Utils

## `isAllowedRecipeUrl(rawUrl): boolean`

* **Paramètres**

  * `rawUrl` : URL à valider (string, requis)

* **Retour**

  * `boolean` : `true` si l'URL est en HTTPS et que son hostname appartient à la liste blanche de domaines autorisés

* **Lignes importantes**

  * `try { url = new URL(rawUrl); } catch { return false; }` : une URL malformée renvoie simplement `false` plutôt que de lever une exception — fonction "sûre" utilisable directement sur une entrée non fiable
  * `url.protocol === 'https:'` : refuse explicitement `http://` ainsi que tout autre protocole (`file://`, `javascript:`, etc.), réduisant la surface d'attaque
  * `isAllowedHost` : `` host === allowed || host.endsWith(`.${allowed}`) `` — autorise le domaine exact ainsi que tous ses sous-domaines (ex. `www.marmiton.org`), comparaison faite en minuscule
  * `ALLOWED_HOSTS = ['marmiton.org', 'cuisineaz.com']` : liste blanche fermée à seulement deux sites ; toute autre destination (y compris une IP privée ou `localhost`) est rejetée avant même l'émission d'une requête réseau — première ligne de défense contre une attaque SSRF (Server-Side Request Forgery)

## `scrapeRecipeFromUrl(rawUrl): Promise<object>`

* **Paramètres**

  * `rawUrl` : URL de la page recette à importer (string, requis)

* **Retour**

  * `Promise<object>` : `{ title, image, prepTime, cookTime, servings, ingredients: [{ name, quantity, unit }], steps: string[], source }` ; en cas d'échec à n'importe quelle étape, la fonction lève une `Error` enrichie d'un champ `.status` (via `httpError`) reprise ensuite comme code de réponse HTTP par la route appelante

* **Lignes importantes**

  * `if (!isAllowedRecipeUrl(rawUrl)) throw httpError(400, ...)` : revalide la liste blanche en tout premier, avant d'émettre la moindre requête
  * `const controller = new AbortController(); setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)` (10 secondes) : interrompt la requête si le site distant est trop lent, pour ne pas bloquer indéfiniment le serveur
  * **revalidation de la liste blanche après redirection** : `if (!isAllowedRecipeUrl(response.url)) throw httpError(400, ...)` — le site cible pourrait répondre par une redirection (30x) vers un domaine hors liste blanche, y compris une adresse interne ; sans cette seconde vérification sur l'URL *finale* (`response.url`, après que `fetch` a suivi les redirections via `redirect: 'follow'`), la liste blanche initiale serait contournable par un redirect malveillant côté site distant — c'est le point central de la protection anti-SSRF de ce module
  * `const contentLength = Number(response.headers.get('content-length') || 0); if (contentLength > MAX_CONTENT_LENGTH) throw httpError(502, ...)` (5 Mo) : rejette une réponse annoncée comme trop volumineuse avant même de lire le corps
  * `headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SupmealRecipeImporter/1.0)' }` : identifie explicitement le robot auprès du site distant plutôt que d'usurper un navigateur
  * extraction JSON-LD via cheerio : `$('script[type="application/ld+json"]').each((_, el) => { ... JSON.parse(...) ... })`, chaque bloc invalide provoque un `catch { }` silencieux qui n'interrompt pas le parcours des autres blocs de la page
  * `findRecipeNode` recherche, parmi tous les blocs JSON-LD de la page, le premier noeud dont `@type` est (ou contient) `'Recipe'`, conforme au vocabulaire schema.org/Recipe
  * `if (!recipeNode) throw httpError(422, "Aucune recette n'a été trouvée sur cette page")` : levé seulement après avoir parcouru l'ensemble des blocs JSON-LD sans succès
  * assemblage final du résultat en déléguant chaque champ à un helper dédié : `parseIsoDurationToMinutes` (durées), `parseServings` (portions), `flattenInstructions` (étapes), `splitIngredientLine` (ingrédients), `firstImageUrl` (image)

## `splitIngredientLine(rawLine): object` (fonction interne)

* **Paramètres**

  * `rawLine` : ligne d'ingrédient brute telle qu'extraite du JSON-LD, ex. `"200 g de farine"` (string, requis)

* **Retour**

  * `object` : `{ name: string, quantity: string, unit: string }` (heuristique — `quantity`/`unit` restent des chaînes, potentiellement vides)

* **Lignes importantes**

  * `const qtyMatch = /^(\d+(?:[.,]\d+)?)\s+(.*)$/.exec(line);` : détecte une quantité numérique en tête de ligne (entier ou décimal avec `.` ou `,`) ; si la ligne ne commence pas par un nombre, elle est renvoyée telle quelle comme `name`, sans quantité ni unité
  * `UNIT_WORDS` : liste fermée d'unités françaises (grammes, litres, cuillères à soupe/café, gousses, pincées, tranches, boîtes, etc.), **triée par longueur décroissante** (`.sort((a, b) => b.length - a.length)`) avant toute recherche — garantit qu'une unité longue et spécifique (ex. "cuillères à soupe") est reconnue avant un préfixe plus court qui matcherait aussi (ex. "c")
  * `UNIT_WORDS.find((u) => lowerRest.startsWith(u.toLowerCase()))` : l'unité n'est reconnue que si elle apparaît en tout début du texte restant après la quantité, comparaison insensible à la casse
  * `rest.slice(0, unitWord.length)` puis `.replace(/^\s+(de |d'|du |des )?/i, '')` : une fois l'unité isolée, retire l'article partitif français qui la suit fréquemment (`"200 g de farine"` → nom nettoyé `"farine"`)
  * si aucune unité connue n'est reconnue dans `UNIT_WORDS`, `quantity` reste tout de même extraite mais `unit` reste vide et tout le texte restant devient le `name`
  * heuristique volontairement limitée : ne gère pas les fractions (`"1/2"`), les quantités en texte libre (`"une pincée"`) ni les plages (`"4-6"`) — ce dernier cas n'est traité que pour les portions, via `parseServings`, qui se contente d'extraire le premier nombre trouvé

## `parseIsoDurationToMinutes(duration): number|null` (fonction interne)

* **Paramètres**

  * `duration` : durée au format ISO 8601, ex. `PT1H30M` (string, ou `null`/`undefined`, optionnel)

* **Retour**

  * `number|null` : durée totale en minutes, ou `null` si `duration` est absent, si la regex ne matche pas, ou si le total calculé vaut 0

* **Lignes importantes**

  * `if (!duration) return null;` : sortie anticipée si le champ JSON-LD est absent
  * `` /^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?/ `` : tolère une portion "jours" (`\d+D`) présente dans la syntaxe ISO mais ignorée dans le calcul final (seules les heures et les minutes sont converties) ; heures et minutes sont toutes deux optionnelles
  * `hours * 60 + minutes || null` : si le total vaut `0` (durée réellement nulle, ou champ mal formé n'ayant fait matcher aucun groupe), le `|| null` transforme cette valeur fausse en `null` plutôt que de renvoyer `0`

## `parseServings(recipeYield): number|null` (fonction interne)

* **Paramètres**

  * `recipeYield` : valeur brute du champ `recipeYield` du JSON-LD — chaîne, nombre ou tableau selon le site (optionnel)

* **Retour**

  * `number|null` : premier nombre entier trouvé dans la valeur, ou `null` si aucun chiffre n'est présent

* **Lignes importantes**

  * `Array.isArray(recipeYield) ? recipeYield[0] : recipeYield` : certains sites renvoient un tableau de valeurs (ex. `["4", "4 portions"]`) — seule la première entrée est prise en compte
  * `` /\d+/.exec(String(value ?? '')) `` : extrait uniquement la première séquence de chiffres et ignore tout texte environnant (ex. `"4 portions"` → `4`)

## `flattenInstructions(instructions): string[]` (fonction interne)

* **Paramètres**

  * `instructions` : champ `recipeInstructions` du JSON-LD — chaîne, tableau de chaînes, tableau d'objets `HowToStep`, ou `HowToSection` imbriquée (format très variable selon les sites) (optionnel)

* **Retour**

  * `string[]` : liste plate d'instructions textuelles, débarrassée des entrées vides

* **Lignes importantes**

  * `if (!instructions) return [];` puis `Array.isArray(instructions) ? instructions : [instructions]` : normalise systématiquement en tableau, même pour une valeur unique, afin de traiter tous les formats de façon uniforme
  * `else if (item?.itemListElement) steps.push(...flattenInstructions(item.itemListElement));` : récursion sur les `HowToSection` (étapes regroupées en sous-listes), aplatie récursivement dans le même tableau
  * `else if (item?.text) steps.push(String(item.text).trim());` : gère les objets `HowToStep`, où le texte de l'étape est stocké dans une propriété `text` plutôt qu'en chaîne brute
  * `.filter(Boolean)` final : retire les étapes vides ou issues d'un format non reconnu

## `findRecipeNode(jsonLd): object|undefined` (fonction interne)

* **Paramètres**

  * `jsonLd` : contenu JSON déjà parsé d'un bloc `<script type="application/ld+json">` (object ou array, requis)

* **Retour**

  * `object|undefined` : premier noeud dont `@type` vaut `'Recipe'` (ou contient `'Recipe'` si `@type` est un tableau), ou `undefined` si aucun ne correspond

* **Lignes importantes**

  * `Array.isArray(jsonLd) ? jsonLd : jsonLd['@graph'] || [jsonLd]` : gère les trois structures JSON-LD rencontrées en pratique — tableau de noeuds à la racine, objet unique avec une propriété `@graph`, ou objet `Recipe` unique directement à la racine
  * `type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))` : `@type` peut être une simple chaîne ou un tableau de types (un même noeud pouvant être à la fois `Recipe` et, par exemple, `NutritionInformation`)

## `firstImageUrl(image): string|null` (fonction interne)

* **Paramètres**

  * `image` : champ `image` du JSON-LD — chaîne, tableau ou objet `ImageObject`, format variable selon le site (optionnel)

* **Retour**

  * `string|null` : première URL d'image trouvée, ou `null`

* **Lignes importantes**

  * `if (!image) return null;` puis `typeof image === 'string' ? image : ...` : gère directement le cas le plus simple, une URL en chaîne brute
  * `Array.isArray(image) ? firstImageUrl(image[0]) : ...` : récursion sur le premier élément si `image` est un tableau (au cas où celui-ci contiendrait lui-même des objets)
  * `image.url` : gère le cas d'un objet `ImageObject` du vocabulaire schema.org, où l'URL est portée par une propriété `url` plutôt que d'être la valeur elle-même
