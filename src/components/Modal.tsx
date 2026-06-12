import type { ReactNode } from 'react'

interface ModalProps {
  title: ReactNode
  onClose: () => void
  children: ReactNode
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-black w-full max-w-md max-h-[80vh] overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-sm hover:underline">
            close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
