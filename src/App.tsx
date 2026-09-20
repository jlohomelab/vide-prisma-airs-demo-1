import ArchitectureFlowDiagram from '../client/src/components/ArchitectureFlowDiagram'
import { LanguageProvider } from '../client/src/contexts/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <ArchitectureFlowDiagram />
    </LanguageProvider>
  )
}

export default App
