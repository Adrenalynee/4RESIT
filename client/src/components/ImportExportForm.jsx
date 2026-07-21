import { useRef, useState } from 'react'
import * as api from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import { csvToImportPayload, recipesToCsv } from '../utils/csv'

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportExportForm() {
  const { user } = useAuth()
  const fileInput = useRef(null)
  const [message, setMessage] = useState('')
  const [confirmExport, setConfirmExport] = useState(false)

  async function handleExport(format) {
    const data = await api.exportUserData(user.id)
    if (format === 'csv') {
      const cookbooksById = Object.fromEntries(data.cookbooks.map((cb) => [cb.id, cb]))
      downloadBlob(recipesToCsv(data.recipes, cookbooksById), 'text/csv', 'supmeal-export.csv')
    } else {
      downloadBlob(JSON.stringify(data, null, 2), 'application/json', 'supmeal-export.json')
    }
    setConfirmExport(false)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const isCsv = file.name.toLowerCase().endsWith('.csv')
      const payload = isCsv ? csvToImportPayload(text) : JSON.parse(text)
      await api.importUserData(user.id, payload)
      setMessage('Import réussi ! Vos recettes et cookbooks ont été ajoutés.')
    } catch {
      setMessage("Erreur : le fichier n'est pas un export SUPMEAL valide (JSON ou CSV).")
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <section className="liquid-glass rounded-xl p-4">
        <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Exporter mes données</h2>
        <p className="relative mt-1 text-sm text-stone-700 dark:text-stone-300">
          Le fichier généré contiendra l'ensemble de vos recettes et cookbooks, en clair. Le format JSON conserve tout
          (membres, commentaires, planning) ; le format CSV ne contient que les recettes, en vue d'un import dans un
          tableur ou un autre outil.
        </p>
        {!confirmExport ? (
          <button
            onClick={() => setConfirmExport(true)}
            className="liquid-glass gold-glass relative mt-3 rounded-full px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Exporter</span>
          </button>
        ) : (
          <div className="relative mt-3 rounded-md border-2 border-(--shimmer-2) p-3 text-sm text-black">
            Ce fichier contiendra vos données en clair. Continuer ?
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => handleExport('json')}
                className="liquid-glass gold-glass relative rounded-full px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
              >
                <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Exporter en JSON</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="liquid-glass gold-glass relative rounded-full px-3 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:brightness-95 active:scale-100"
              >
                <span className="relative text-sm font-semibold text-stone-900 dark:text-white">Exporter en CSV</span>
              </button>
              <button
                onClick={() => setConfirmExport(false)}
                className="liquid-glass relative rounded-full px-3 py-1.5 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
              >
                <span className="relative">Annuler</span>
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="liquid-glass rounded-xl p-4">
        <h2 className="relative font-semibold text-stone-900 dark:text-stone-100">Importer des données</h2>
        <p className="relative mt-1 text-sm text-stone-700 dark:text-stone-300">
          Importez un fichier JSON ou CSV exporté depuis SUPMEAL. Vous serez attribué comme créateur des cookbooks importés.
        </p>
        <div className="relative mt-3 flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            id="import-export-file-input"
            onChange={handleImport}
            className="sr-only"
          />
          <label
            htmlFor="import-export-file-input"
            className="liquid-glass gold-glass relative inline-block cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
          >
            <span className="relative text-stone-900 dark:text-white">Choisir un fichier</span>
          </label>
        </div>
        {message && <p className="relative mt-2 text-sm text-stone-700 dark:text-stone-300">{message}</p>}
      </section>
    </div>
  )
}
