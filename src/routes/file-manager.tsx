import { createFileRoute } from '@tanstack/react-router'
import { FileManagerScreen } from '@/screens/file-manager/file-manager-screen'

export const Route = createFileRoute('/file-manager')({
  ssr: false,
  component: FileManagerRoute,
  errorComponent: function FileManagerError({ error }) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-primary-50 dark:bg-neutral-950">
        <h2 className="text-xl font-semibold text-primary-900 dark:text-neutral-100 mb-3">
          Failed to Load File Manager
        </h2>
        <p className="text-sm text-primary-600 dark:text-neutral-400 mb-4 max-w-md">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          Reload Page
        </button>
      </div>
    )
  },
  pendingComponent: function FileManagerPending() {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-r-transparent mb-3" />
          <p className="text-sm text-primary-500 dark:text-neutral-400">Loading File Manager...</p>
        </div>
      </div>
    )
  },
})

function FileManagerRoute() {
  return <FileManagerScreen />
}
