import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Viewer from './pages/Viewer'
import Editor from './pages/Editor'
import Tree from './pages/Tree'

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/tree" element={<Tree />} />
      </Routes>
    </div>
  )
}

export default App

