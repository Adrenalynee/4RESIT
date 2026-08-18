import { PASSWORD_REQUIREMENTS, checkPasswordStrength } from '../utils/passwordStrength'

export default function PasswordStrengthMeter({ password }) {
  const checks = checkPasswordStrength(password)

  return (
    <ul className="mt-2 space-y-0.5 text-xs">
      {PASSWORD_REQUIREMENTS.map((req) => (
        <li
          key={req.key}
          className={checks[req.key] ? 'text-emerald-600 dark:text-emerald-400' : 'text-black dark:text-white'}
        >
          {checks[req.key] ? '✓' : '○'} {req.label}
        </li>
      ))}
    </ul>
  )
}
