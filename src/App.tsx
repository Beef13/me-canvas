import BoardCanvas from './canvas/BoardCanvas'
import CmdK from './ui/CmdK'
import CollabPanel from './ui/CollabPanel'
import ErrorOverlay from './ui/ErrorOverlay'
import Onboarding from './ui/Onboarding'
import OrganizeBar from './ui/OrganizeBar'
import RemoteCursors from './ui/RemoteCursors'
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
        <RemoteCursors />
        <StatusBar />
        <TagPanel />
        <Onboarding />
        <ErrorOverlay />
        <CollabPanel />
      </div>
      <CmdK />
    </div>
  )
}
