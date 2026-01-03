import { NavLink, Outlet } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from './lib/api'
import { fetchMe, logout } from './lib/api'
import { queryKeys } from './lib/queryKeys'

export type AppOutletContext = {
  authQuery: UseQueryResult<AuthUser, Error>
}

export default function App() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const authQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
    },
  })

  return (
    <div className="min-h-full bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="flex w-full items-center justify-between pl-2 pr-1 py-3 sm:mx-auto sm:max-w-3xl sm:px-4">
          <div className="font-semibold">{t('appName')}</div>
          <div className="flex items-center gap-4 text-sm">
            <nav className="flex gap-3">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
                end
              >
                {t('nav.home')}
              </NavLink>
              <NavLink
                to="/archive"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                {t('nav.archive')}
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                }
              >
                {t('nav.settings')}
              </NavLink>
            </nav>
            {authQuery.isSuccess && (
              <button
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                type="button"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {t('nav.logout')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full pl-2 pr-1 py-4 sm:mx-auto sm:max-w-3xl sm:px-4 sm:py-6">
        <Outlet context={{ authQuery }} />
      </main>
    </div>
  )
}
