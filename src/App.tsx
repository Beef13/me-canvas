import BoardCanvas from './canvas/BoardCanvas'
import CmdK from './ui/CmdK'
import ErrorOverlay from './ui/ErrorOverlay'
import Onboarding from './ui/Onboarding'
import OrganizeBar from './ui/OrganizeBar'
import StatusBar from './ui/StatusBar'
import TagPanel from './ui/TagPanel'
import Toolbar from './ui/Toolbar'

export default function App() {
  return (
    <div className="mc-shell">
      <Toolbar />
      <OrganizeBar />
      <div className="relative flex-1">
        <BoardCanvas />
        <StatusBar />
        <TagPanel />
        <Onboarding />
        <ErrorOverlay />
      </div>
      <CmdK />
    </div>
  )
}
