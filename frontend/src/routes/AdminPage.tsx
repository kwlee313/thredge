import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../App'
import {
  deleteAdminUser,
  fetchAdminUsers,
  fetchSignupPolicy,
  updateSignupPolicy,
} from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { uiTokens } from '../lib/uiTokens'

export function AdminPage() {
  const { t } = useTranslation()
  const { authQuery } = useOutletContext<AppOutletContext>()
  const queryClient = useQueryClient()
  const isAdmin = authQuery.data?.role === 'ADMIN'

  const signupPolicyQuery = useQuery({
    queryKey: queryKeys.admin.signupPolicy,
    queryFn: fetchSignupPolicy,
    enabled: isAdmin,
  })

  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: fetchAdminUsers,
    enabled: isAdmin,
  })

  const signupPolicyMutation = useMutation({
    mutationFn: (enabled: boolean) => updateSignupPolicy(enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.signupPolicy })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    },
  })

  if (authQuery.isLoading) {
    return <div className="text-sm text-[var(--theme-muted)]">{t('common.loading')}</div>
  }

  if (!authQuery.data) {
    return <div className="text-sm text-[var(--theme-muted)]">{t('admin.loginRequired')}</div>
  }

  if (!isAdmin) {
    return <div className="text-sm text-[var(--theme-muted)]">{t('admin.adminOnly')}</div>
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className={uiTokens.card.surface}>
        <div className="text-sm font-semibold">{t('admin.title')}</div>
        <div className="mt-2 text-sm text-[var(--theme-muted)]">
          {t('admin.subtitle')}
        </div>
      </div>

      <div className={uiTokens.card.surface}>
        <div className="text-sm font-semibold">{t('admin.signupPolicyTitle')}</div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <div className="text-[var(--theme-ink)]">
            {signupPolicyQuery.isLoading && t('common.loading')}
            {signupPolicyQuery.isError && t('admin.error')}
            {signupPolicyQuery.isSuccess &&
              (signupPolicyQuery.data.enabled
                ? t('admin.signupAllowed')
                : t('admin.signupBlocked'))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={uiTokens.button.secondarySm}
              onClick={() => signupPolicyMutation.mutate(true)}
              disabled={signupPolicyMutation.isPending || signupPolicyQuery.isLoading}
            >
              {t('admin.allow')}
            </button>
            <button
              type="button"
              className={uiTokens.button.secondarySm}
              onClick={() => signupPolicyMutation.mutate(false)}
              disabled={signupPolicyMutation.isPending || signupPolicyQuery.isLoading}
            >
              {t('admin.block')}
            </button>
          </div>
        </div>
      </div>

      <div className={uiTokens.card.surface}>
        <div className="text-sm font-semibold">{t('admin.usersTitle')}</div>
        {usersQuery.isLoading && (
          <div className="mt-2 text-sm text-[var(--theme-muted)]">
            {t('common.loading')}
          </div>
        )}
        {usersQuery.isError && (
          <div className="mt-2 text-sm text-[var(--theme-muted)]">
            {t('admin.error')}
          </div>
        )}
        {usersQuery.isSuccess && usersQuery.data.length === 0 && (
          <div className="mt-2 text-sm text-[var(--theme-muted)]">
            {t('admin.emptyUsers')}
          </div>
        )}
        {usersQuery.isSuccess && usersQuery.data.length > 0 && (
          <div className="mt-3 space-y-2">
            {usersQuery.data.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm"
              >
                <div className="min-w-[160px]">
                  <div className="font-semibold text-[var(--theme-ink)]">{user.username}</div>
                  <div className="text-xs text-[var(--theme-muted)]">
                    {new Date(user.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={uiTokens.tag.outline}>{user.role}</span>
                  <button
                    type="button"
                    className={uiTokens.button.secondaryXs}
                    onClick={() => {
                      if (window.confirm(t('admin.deleteConfirm', { username: user.username }))) {
                        deleteUserMutation.mutate(user.id)
                      }
                    }}
                    disabled={deleteUserMutation.isPending}
                  >
                    {t('admin.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
