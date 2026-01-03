import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from './routes/HomePage'
import { SettingsPage } from './routes/SettingsPage'
import { ThreadDetailPage } from './routes/ThreadDetailPage'
import { ArchivePage } from './routes/ArchivePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'threads/:id', element: <ThreadDetailPage /> },
      { path: 'archive', element: <ArchivePage /> },
    ],
  },
])
