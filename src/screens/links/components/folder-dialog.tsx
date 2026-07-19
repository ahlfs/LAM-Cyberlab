import { useState } from 'react'
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import type { LinkuFolder } from '@/server/linku-db'
import { DEFAULT_FOLDER_COLOR, FOLDER_COLORS } from '../lib/palette'
import { useCreateFolder, useUpdateFolder } from '../lib/use-linku'

export function FolderDialog({
  folder,
  onClose,
}: {
  folder: LinkuFolder | null
  onClose: () => void
}) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? DEFAULT_FOLDER_COLOR)
  const createFolder = useCreateFolder()
  const updateFolder = useUpdateFolder()
  const isEdit = folder != null
  const pending = createFolder.isPending || updateFolder.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const onSuccess = () => {
      toast(isEdit ? `Updated "${trimmed}"` : `Created "${trimmed}"`)
      onClose()
    }
    const onError = (err: unknown) =>
      toast(err instanceof Error ? err.message : 'Something went wrong')
    if (isEdit) {
      updateFolder.mutate({ id: folder.id, name: trimmed, color }, { onSuccess, onError })
    } else {
      createFolder.mutate({ name: trimmed, color }, { onSuccess, onError })
    }
  }

  return (
    <DialogRoot
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <DialogTitle>{isEdit ? 'Edit folder' : 'New folder'}</DialogTitle>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text)' }}>
              Name
            </span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Reading list"
              required
              className="rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
              style={
                {
                  background: 'var(--theme-input)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text)',
                  '--tw-ring-color': 'var(--theme-focus)',
                } as React.CSSProperties
              }
            />
          </label>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] font-medium" style={{ color: 'var(--theme-text)' }}>
              Color
            </legend>
            <div className="grid grid-cols-8 gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  aria-label={c.name}
                  aria-pressed={color === c.hex}
                  className="size-7 rounded-full transition-transform motion-safe:duration-150"
                  style={{
                    background: c.hex,
                    outline: color === c.hex ? '2px solid var(--theme-text)' : 'none',
                    outlineOffset: 2,
                    transform: color === c.hex ? 'scale(1.08)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose onClick={onClose}>Cancel</DialogClose>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:pointer-events-none disabled:opacity-50"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
            >
              {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
