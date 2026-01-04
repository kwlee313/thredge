import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { login, signup } from '../lib/api'
import { HomeFeed } from '../components/home/HomeFeed'
import type { AppOutletContext } from '../App'
import { queryKeys } from '../lib/queryKeys'
import { uiTokens } from '../lib/uiTokens'

export function HomePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const { authQuery } = useOutletContext<AppOutletContext>()

  const handleAuthSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    await queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed })
    await queryClient.invalidateQueries({ queryKey: queryKeys.threads.searchRoot })
  }

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: handleAuthSuccess,
  })

  const signupMutation = useMutation({
    mutationFn: () => signup(username, password),
    onSuccess: handleAuthSuccess,
  })

  return (
    <div className="space-y-2 sm:space-y-3">
      {authQuery.isLoading && (
        <div className={`w-full ${uiTokens.card.surface} sm:mx-auto sm:max-w-md`}>
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--theme-muted)]">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--theme-border)] border-t-[var(--theme-primary)]"
              aria-hidden="true"
            />
            {t('common.loading')}
          </div>
        </div>
      )}

      {!authQuery.isLoading && !authQuery.data && (
        <div className={`w-full ${uiTokens.card.surface} sm:mx-auto sm:max-w-md`}>
          <div className="text-sm font-semibold">
            {mode === 'login' ? t('home.loginTitle') : t('home.signupTitle')}
          </div>
          <form
            className="mt-2 space-y-2 sm:mt-3 sm:space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (mode === 'login') {
                loginMutation.mutate()
              } else {
                signupMutation.mutate()
              }
            }}
          >
            <label className="block text-sm">
              <span className="text-[var(--theme-muted)]">{t('home.username')}</span>
              <input
                className={`mt-1 ${uiTokens.input.base} ${uiTokens.input.paddingMd}`}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--theme-muted)]">{t('home.password')}</span>
              <input
                className={`mt-1 ${uiTokens.input.base} ${uiTokens.input.paddingMd}`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            <button
              className={`w-full ${uiTokens.button.primaryMd}`}
              type="submit"
              disabled={loginMutation.isPending || signupMutation.isPending}
            >
              {loginMutation.isPending || signupMutation.isPending
                ? t('common.loading')
                : mode === 'login'
                  ? t('home.loginButton')
                  : t('home.signupButton')}
            </button>
            {mode === 'login' && loginMutation.isError && (
              <div className="text-sm text-red-600">{t('home.loginError')}</div>
            )}
            {mode === 'signup' && signupMutation.isError && (
              <div className="text-sm text-red-600">{t('home.signupError')}</div>
            )}
          </form>
          <div className="mt-2 flex items-center justify-between text-sm text-[var(--theme-muted)] sm:mt-3">
            <span>
              {mode === 'login' ? t('home.needAccount') : t('home.haveAccount')}
            </span>
            <button
              className="font-semibold text-[var(--theme-primary)] hover:opacity-80"
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? t('home.switchToSignup') : t('home.switchToLogin')}
            </button>
          </div>
        </div>
      )}

      {authQuery.data && (
        <HomeFeed username={authQuery.data.username} />
      )}
    </div>
  )
}
