import { ResourceStage } from './components/resource-stage'
import { StudyAgentPanel } from './components/study-agent-panel'

export function StudyScreen() {
  return (
    <div
      className="flex h-full w-full min-h-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)',
      }}
    >
      {/* Left Stage (420px-460px on desktop) */}
      <div className="w-full md:w-[420px] lg:w-[460px] h-full min-h-0 shrink-0 flex flex-col">
        <ResourceStage />
      </div>

      {/* Right Agent Panel (flex-1 full stretch) */}
      <div className="hidden md:flex flex-1 h-full min-h-0 min-w-0 flex-col">
        <StudyAgentPanel />
      </div>
    </div>
  )
}
