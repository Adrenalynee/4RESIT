import { useRef, useState } from 'react'
import Modal from '../Modal'

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 320

export default function CropAvatarModal({ imageSrc, onClose, onConfirm }) {
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function clampOffset(next, currentZoom, size) {
    if (!size) return next
    const baseScale = VIEWPORT_SIZE / Math.min(size.width, size.height)
    const totalScale = baseScale * currentZoom
    const maxX = Math.max(0, (size.width * totalScale - VIEWPORT_SIZE) / 2)
    const maxY = Math.max(0, (size.height * totalScale - VIEWPORT_SIZE) / 2)
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    }
  }

  function handleImageLoad() {
    const img = imgRef.current
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function handleZoomChange(e) {
    const nextZoom = Number(e.target.value)
    setZoom(nextZoom)
    setOffset((prev) => clampOffset(prev, nextZoom, naturalSize))
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, offsetStart: offset }
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const next = { x: dragRef.current.offsetStart.x + dx, y: dragRef.current.offsetStart.y + dy }
    setOffset(clampOffset(next, zoom, naturalSize))
  }

  function handlePointerUp() {
    dragRef.current = null
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img || !naturalSize) return
    const baseScale = VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)
    const totalScale = baseScale * zoom
    const scaleFactor = OUTPUT_SIZE / VIEWPORT_SIZE
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    ctx.translate(OUTPUT_SIZE / 2 + scaleFactor * offset.x, OUTPUT_SIZE / 2 + scaleFactor * offset.y)
    ctx.scale(scaleFactor * totalScale, scaleFactor * totalScale)
    ctx.drawImage(img, -naturalSize.width / 2, -naturalSize.height / 2)
    onConfirm(canvas.toDataURL('image/jpeg', 0.9))
  }

  const displayScale = naturalSize
    ? (VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)) * zoom
    : 1

  return (
    <Modal onClose={onClose}>
      <h2 className="relative pr-10 font-logo text-2xl font-bold text-stone-900 dark:text-stone-100">Recadrer l'avatar</h2>
      <p className="relative mt-1 text-sm text-stone-700 dark:text-stone-300">
        Déplacez l'image et ajustez le zoom pour cadrer votre photo.
      </p>

      <div
        className="liquid-glass relative mx-auto mt-4 touch-none overflow-hidden rounded-full"
        style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Aperçu à recadrer"
          onLoad={handleImageLoad}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-w-none select-none"
          style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${displayScale})` }}
        />
      </div>

      <div className="relative mt-4 flex items-center gap-3">
        <span className="text-sm text-stone-700 dark:text-stone-300">Zoom</span>
        <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={handleZoomChange} className="gold-range flex-1" />
      </div>

      <div className="relative mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="liquid-glass relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-stone-900 transition hover:scale-105 hover:brightness-125 active:scale-100 dark:text-stone-100"
        >
          <span className="relative">Annuler</span>
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="liquid-glass gold-glass relative cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-105 hover:brightness-95 active:scale-100"
        >
          <span className="relative text-stone-900 dark:text-white">Valider</span>
        </button>
      </div>
    </Modal>
  )
}
