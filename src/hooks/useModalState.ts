import { useState, useCallback } from 'react'

/**
 * Gestione unificata dello stato di un modal create/edit.
 *
 * Sostituisce il pattern ripetuto:
 *   const [isOpen, setIsOpen] = useState(false)
 *   const [editingItem, setEditingItem] = useState<T | null>(null)
 *   function openCreate() { setEditingItem(null); setIsOpen(true) }
 *   function openEdit(item) { setEditingItem(item); setIsOpen(true) }
 *   function close() { setIsOpen(false); setEditingItem(null) }
 *
 * Uso:
 *   const modal = useModalState<Subject>()
 *   modal.openCreate()
 *   modal.openEdit(subject)
 *   modal.close()
 *   modal.isOpen        // boolean
 *   modal.editingItem   // T | null
 *   modal.isEditing     // boolean (true se editingItem != null)
 */
export function useModalState<T = unknown>() {
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setIsOpen(true)
  }, [])

  const openEdit = useCallback((item: T) => {
    setEditingItem(item)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setEditingItem(null)
  }, [])

  return {
    isOpen,
    editingItem,
    isEditing: editingItem !== null,
    openCreate,
    openEdit,
    close,
  }
}
