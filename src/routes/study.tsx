import { Suspense, lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'

const StudyScreen = lazy(async () => {
  const module = await import('@/screens/study/study-screen')
  return { default: module.StudyScreen }
})

export const Route = createFileRoute('/study')({
  ssr: false,
  component: function StudyRoute() {
    usePageTitle('Study Studio')

    return (
      <div
        className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--theme-bg)',
          color: 'var(--theme-text)',
        }}
      >
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
              Loading Study Studio...
            </div>
          }
        >
          <StudyScreen />
        </Suspense>
      </div>
    )
  },
})
