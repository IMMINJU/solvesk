'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  images: { url: string; name: string }[]
  currentIndex: number
  onClose: () => void
  onNavigate?: (index: number) => void
}

export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) {
  const currentImage = images[currentIndex]

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate?.(currentIndex - 1)
    }
  }, [currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate?.(currentIndex + 1)
    }
  }, [currentIndex, images.length, onNavigate])

  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = currentImage.url
    link.download = currentImage.name
    link.target = '_blank'
    link.click()
  }, [currentImage])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') handlePrevious()
      else if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handlePrevious, handleNext])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const lightboxContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={e => {
        e.stopPropagation()
        onClose()
      }}
    >
      <button
        onClick={e => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      <button
        onClick={e => {
          e.stopPropagation()
          handleDownload()
        }}
        className="absolute top-4 right-16 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
        aria-label="Download"
      >
        <Download className="h-6 w-6" />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={e => {
            e.stopPropagation()
            handlePrevious()
          }}
          className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={e => {
            e.stopPropagation()
            handleNext()
          }}
          className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
          aria-label="Next image"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      <div
        className="relative max-w-7xl max-h-[90vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={currentImage.name}
          className="max-w-full max-h-[90vh] object-contain"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-sm">
          <p className="font-medium truncate">{currentImage.name}</p>
          {images.length > 1 && (
            <p className="text-xs text-white/60 mt-1">
              {currentIndex + 1} / {images.length}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(lightboxContent, document.body)
}
