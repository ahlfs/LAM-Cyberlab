import {
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/prompt-kit/markdown'
import type { StudyResource } from '@/stores/study-store'

type ResourcePreviewDialogProps = {
  resource: StudyResource | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResourcePreviewDialog({
  resource,
  open,
  onOpenChange,
}: ResourcePreviewDialogProps) {
  if (!resource) return null

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)',
          borderColor: 'var(--theme-border)',
        }}
      >
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <div>
            <DialogTitle
              className="text-base font-semibold"
              style={{ color: 'var(--theme-text)' }}
            >
              {resource.title}
            </DialogTitle>
            <DialogDescription
              className="text-xs mt-0.5"
              style={{ color: 'var(--theme-muted)' }}
            >
              Type: {resource.type.toUpperCase()} • Size:{' '}
              {(resource.size / 1024).toFixed(1)} KB
              {resource.sourceUrl ? ` • Source: ${resource.sourceUrl}` : ''}
            </DialogDescription>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto my-4 p-4 rounded-xl border font-mono text-xs leading-relaxed select-text"
          style={{
            backgroundColor: 'var(--theme-card)',
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text)',
          }}
        >
          <Markdown>{resource.content || '_No content extracted._'}</Markdown>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs px-3.5 py-2 font-medium rounded-xl border transition-colors"
            style={{
              borderColor: 'var(--theme-border)',
              backgroundColor: 'var(--theme-card)',
              color: 'var(--theme-text)',
            }}
          >
            Close Preview
          </button>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
