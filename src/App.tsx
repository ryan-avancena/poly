import Dictionary from './pages/Dictionary'

function App() {
  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <header className="border-b border-black">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <span className="text-sm font-bold">poly</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Dictionary />
      </main>
    </div>
  )
}

export default App
