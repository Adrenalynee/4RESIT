# Password Utils

## `checkPasswordStrength(password): object`

* **Paramètres**

  * `password` : mot de passe à évaluer (string, requis)

* **Retour**

  * `object` : `{ length: boolean, uppercase: boolean, digit: boolean, special: boolean }`, un booléen par critère de robustesse évalué indépendamment

* **Lignes importantes**

  * `length: password.length >= 8` : au moins 8 caractères
  * `uppercase: /[A-Z]/.test(password)` : au moins une lettre majuscule (non accentuée)
  * `digit: /[0-9]/.test(password)` : au moins un chiffre
  * `special: /[^A-Za-z0-9]/.test(password)` : caractère spécial défini par exclusion — "tout ce qui n'est ni une lettre ni un chiffre" ; un simple point `.`, une espace ou une lettre accentuée (ex. `é`) valide donc ce critère, sans nécessiter un ensemble restreint de symboles de ponctuation

## `isPasswordStrong(password): boolean`

* **Paramètres**

  * `password` : mot de passe à évaluer (string, requis)

* **Retour**

  * `boolean` : `true` uniquement si les 4 critères de `checkPasswordStrength` sont simultanément vérifiés

* **Lignes importantes**

  * `Object.values(checkPasswordStrength(password)).every(Boolean)` : réutilise `checkPasswordStrength` plutôt que de dupliquer les expressions régulières, et exige un ET logique strict entre les 4 critères — il n'y a pas de système de score ou de pondération, un seul critère manquant rend le mot de passe non conforme
