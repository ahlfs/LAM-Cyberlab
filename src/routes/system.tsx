import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { SystemScreen } from '@/screens/system/system-screen'

export const Route = createFileRoute('/system')({
  ssr: false,
  component: function SystemRoute() {
    usePageTitle('System')
    return <SystemScreen />
  },
})
