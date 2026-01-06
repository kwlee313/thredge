import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { HomePage } from './routes/HomePage'
import { SettingsPage } from './routes/SettingsPage'
import { ThreadDetailPage } from './routes/ThreadDetailPage'
import { ArchivePage } from './routes/ArchivePage'
import { AdminPage } from './routes/AdminPage'
import { ComponentLabPage } from './dev/ComponentLabPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categories/:categoryPath', element: <HomePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'threads/:id', element: <ThreadDetailPage /> },
      { path: 'archive', element: <ArchivePage /> },
      ...(import.meta.env.DEV ? [{ path: '__lab', element: <ComponentLabPage /> }] : []),
    ],
  },
])
