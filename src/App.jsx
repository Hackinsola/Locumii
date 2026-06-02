import EditorLayout from '@/components/editor/editor-layout'

function App() {
  return (
    <EditorLayout>
      <div className="p-6">
        <h1 className="text-xl font-semibold">Editor</h1>
        <p className="text-muted-foreground">Editor content area.</p>
      </div>
    </EditorLayout>
  )
}

export default App
