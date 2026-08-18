export const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: '8 caractères minimum' },
  { key: 'uppercase', label: 'Une majuscule' },
  { key: 'digit', label: 'Un chiffre' },
  { key: 'special', label: 'Un caractère spécial (ex: . ! ? #)' },
]

export function checkPasswordStrength(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

export function isPasswordStrong(password) {
  return Object.values(checkPasswordStrength(password)).every(Boolean)
}
