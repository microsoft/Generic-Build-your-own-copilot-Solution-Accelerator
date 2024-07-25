import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { initializeIcons } from '@fluentui/react'

import Chat from './pages/chat/Chat'
import Draft from './pages/draft/Draft'
import Landing from './pages/landing/Landing'
import Layout from './pages/layout/Layout'
import NoPage from './pages/NoPage'
import Document from './pages/document/Document'
import { AppStateProvider } from './state/AppProvider'
import { ChatType } from './api'

import './index.css' 

initializeIcons()

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/generate" element={<Chat type={ChatType.Generate} />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="*" element={<NoPage />} />
          </Route>
          <Route path="/document/:id" element={<Document />} />
        </Routes>
      </HashRouter>
    </AppStateProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
