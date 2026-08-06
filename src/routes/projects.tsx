import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'
import { ProjectsScreen } from '@/screens/projects/projects-screen'

export const Route = createFileRoute('/projects')({
  ssr: false,
  component: function ProjectsRoute() {
    usePageTitle('Projects')
    return <ProjectsScreen />
  },
})
