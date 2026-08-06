import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { EditorScreen } from '@/screens/editor/editor-screen'

export const Route = createFileRoute('/editor')({
  ssr: false,
  component: function EditorRoute() {
    usePageTitle('Code Editor')
    return <EditorScreen />
  },
})
