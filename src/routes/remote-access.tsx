import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { RemoteAccessScreen } from '@/screens/remote-access/remote-access-screen'

export const Route = createFileRoute('/remote-access')({
  ssr: false,
  component: function RemoteAccessRoute() {
    usePageTitle('Remote Access')
    return <RemoteAccessScreen />
  },
})
