import { useEffect, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'
import * as api from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import PageBackground from '../components/PageBackground'
import { CookbookCoverPage, CookbookFlipPage } from '../components/CookbookFlipPage'
import Carousel from '../components/Carousel'
import CookbookCard from '../components/CookbookCard'
import Skeleton from '../components/Skeleton'
import ErrorState from '../components/ErrorState'
import NewCookbookModal from '../components/modals/NewCookbookModal'

export default function CookbooksPage() {
  const { user } = useAuth()
  const [cookbooks, setCookbooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewCookbook, setShowNewCookbook] = useState(false)
  const [initialCookbookId] = useState(() => sessionStorage.getItem('cookbooks-active-id'))
  const startPage = Math.max(0, cookbooks.findIndex((cb) => cb.id === initialCookbookId) + 1)
  const openingCookbookRef = useRef(false)

  function reload() {
    setLoading(true)
    setError('')
    api
      .getCookbooks(user.id)
      .then((result) => {
        setCookbooks(result)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(reload, [user.id])

  useEffect(() => {
    return () => {
      if (!openingCookbookRef.current) {
        sessionStorage.removeItem('cookbooks-active-id')
      }
    }
  }, [])

  function markOpening(id) {
    openingCookbookRef.current = true
    sessionStorage.setItem('cookbooks-active-id', id)
  }

  return (
    <PageBackground>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={() => setShowNewCookbook(true)}
            className="liquid-glass gold-glass rounded-full px-5 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-sm font-semibold text-stone-900 dark:text-white">+ Nouveau cookbook</span>
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          {loading ? (
            <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-3/4 w-full" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : cookbooks.length === 0 ? (
            <p className="text-sm text-white/80">Aucun cookbook pour l'instant.</p>
          ) : (
            <>
              <div className="w-full md:hidden">
                <Carousel
                  items={cookbooks}
                  getKey={(cb) => cb.id}
                  renderItem={(cb) => <CookbookCard cookbook={cb} onOpen={markOpening} />}
                  activeId={initialCookbookId}
                  onActiveChange={(id) => sessionStorage.setItem('cookbooks-active-id', id)}
                  emptyMessage="Aucun cookbook pour l'instant."
                  prevLabel="Cookbook précédent"
                  nextLabel="Cookbook suivant"
                />
              </div>

              <div className="relative hidden select-none overflow-hidden md:block" style={{ width: 760, height: 520 }}>
                <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-center rounded-l-xl bg-book-paper">
                </div>
                <HTMLFlipBook
                  key={cookbooks.length}
                  width={380}
                  height={520}
                  size="fixed"
                  usePortrait={false}
                  showCover
                  showPageCorners={false}
                  maxShadowOpacity={0.4}
                  startPage={startPage}
                  className="rounded-xl bg-book-paper shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                >
                  <CookbookCoverPage label="Mes cookbooks" />
                  {cookbooks.map((cb) => (
                    <CookbookFlipPage key={cb.id} cookbook={cb} onOpen={markOpening} />
                  ))}
                  <CookbookCoverPage label="SUPMEAL" />
                </HTMLFlipBook>
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-linear-to-r from-black/0 via-black/25 to-black/0" />
              </div>
            </>
          )}
        </div>
      </div>

      {showNewCookbook && (
        <NewCookbookModal
          onClose={() => setShowNewCookbook(false)}
          onCreated={() => {
            setShowNewCookbook(false)
            reload()
          }}
        />
      )}
    </PageBackground>
  )
}
