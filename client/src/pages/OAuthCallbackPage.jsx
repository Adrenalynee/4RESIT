import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'

export default function OAuthCallbackPage() {
  const [params] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      navigate('/login')
      return
    }
    loginWithToken(token)
      .then(() => navigate('/recipes'))
      .catch(() => navigate('/login'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageBackground className="flex items-center justify-center px-4">
      <p className="text-sm text-stone-700 dark:text-stone-300">Connexion en cours...</p>
    </PageBackground>
  )
}
