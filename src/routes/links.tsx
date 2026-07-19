import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { LinksScreen } from '@/screens/links/links-screen'

export const Route = createFileRoute('/links')({
  ssr: false,
  component: function LinksRoute() {
    usePageTitle('Links')
    return <LinksScreen />
  },
})
