import { Suspense, lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'

const GraphScreen = lazy(async () => {
  const module = await import('@/screens/graph/graph-screen')
  return { default: module.GraphScreen }
})

export const Route = createFileRoute('/graph')({
  ssr: false,
  component: function GraphRoute() {
    usePageTitle('Graph')

    return (
      <Suspense
        fallback={
          <div className="flex h-full min-h-[240px] items-center justify-center px-4 text-sm text-primary-500 dark:text-neutral-400">
            Loading 3D graph...
          </div>
        }
      >
        <GraphScreen />
      </Suspense>
    )
  },
})
