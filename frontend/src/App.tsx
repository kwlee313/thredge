import { NavLink, Outlet } from 'react-router-dom'
import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuthUser } from './lib/api'
import { fetchMe, logout } from './lib/api'
import { queryKeys } from './lib/queryKeys'
import { usePinchFontSize } from './hooks/usePinchFontSize'
import { applyTheme, resolveTheme } from './lib/uiTheme'
import { useSettingsStore } from './store/settingsStore'

export type AppOutletContext = {
  authQuery: UseQueryResult<AuthUser, Error>
}

export default function App() {
  usePinchFontSize()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { themePreset, themeCustomColor } = useSettingsStore()

  useEffect(() => {
    applyTheme(resolveTheme(themePreset, themeCustomColor))
  }, [themePreset, themeCustomColor])

  const authQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchMe,
    retry: false,
  })

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.setQueryData(queryKeys.auth.me, undefined)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
    },
  })

  return (
    <div className="min-h-full bg-[var(--theme-soft)] text-[var(--theme-ink)]">
      <header className="border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
        <div className="flex w-full items-center justify-between pl-2 pr-1 py-3 sm:mx-auto sm:max-w-3xl sm:px-4">
          <div className="font-semibold text-[var(--theme-primary)]">{t('appName')}</div>
          <div className="flex items-center gap-4 text-sm">
            <nav className="flex gap-3">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                }
                end
              >
                {t('nav.home')}
              </NavLink>
              <NavLink
                to="/archive"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                }
              >
                {t('nav.archive')}
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                }
              >
                {t('nav.settings')}
              </NavLink>
              {authQuery.data?.role === 'ADMIN' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    isActive ? 'font-semibold text-[var(--theme-primary)]' : 'text-[var(--theme-muted)]'
                  }
                >
                  {t('nav.admin')}
                </NavLink>
              )}
            </nav>
            {authQuery.isSuccess && (
              <button
                className="rounded-md border border-[var(--theme-border)] px-2 py-1 text-xs text-[var(--theme-ink)] hover:opacity-80"
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

      <main className="w-full pl-2 pr-1 pt-6 pb-4 sm:mx-auto sm:max-w-3xl sm:px-4 sm:py-6">
        <Outlet context={{ authQuery }} />
      </main>
    </div>
  )
}
