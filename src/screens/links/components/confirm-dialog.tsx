import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogRoot,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AlertDialogRoot
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <AlertDialogContent>
        <div className="flex flex-col gap-2 p-5">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </div>
        <div className="flex justify-end gap-2 border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          {destructive ? (
            <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-bg)' }}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialogRoot>
  )
}
