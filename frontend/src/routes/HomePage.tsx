import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { login } from '../lib/api'
import { HomeFeed } from '../components/home/HomeFeed'
import type { AppOutletContext } from '../App'

export function HomePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('user')
  const [password, setPassword] = useState('user')
  const { authQuery } = useOutletContext<AppOutletContext>()

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'feed'] })
      await queryClient.invalidateQueries({ queryKey: ['threads', 'search'] })
    },
  })

  return (
    <div className="space-y-2 sm:space-y-3">

      {!authQuery.isSuccess && (
        <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
          <div className="text-sm font-semibold">{t('home.loginTitle')}</div>
          <form
            className="mt-2 space-y-2 sm:mt-3 sm:space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              loginMutation.mutate()
            }}
          >
            <label className="block text-sm">
              <span className="text-gray-600">{t('home.username')}</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{t('home.password')}</span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button
              className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? t('home.loading') : t('home.loginButton')}
            </button>
            {loginMutation.isError && (
              <div className="text-sm text-red-600">{t('home.loginError')}</div>
            )}
          </form>
        </div>
      )}

      {authQuery.isSuccess && (
        <HomeFeed username={authQuery.data.username} />
      )}
    </div>
  )
}
