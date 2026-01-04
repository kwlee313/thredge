import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { z } from 'zod'
import { supportedLanguages } from '../lib/languages'
import { useSettingsStore } from '../store/settingsStore'
import i18n from '../i18n'
import { fetchCategories, changePassword } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { uiTokens } from '../lib/uiTokens'
import {
  CUSTOM_THEME_ID,
  applyTheme,
  buildThemeFromPrimary,
  normalizeThemeHex,
  resolveTheme,
  uiThemePresets,
} from '../lib/uiTheme'
import type { AppOutletContext } from '../App'

const schema = z.object({
  uiLanguage: z.enum(supportedLanguages),
  themePreset: z.string(),
  themeCustomColor: z.string(),
})

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(4, 'Password must be at least 4 characters'),
    confirmNewPassword: z.string().min(4, 'Password must be at least 4 characters'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
type FormValues = z.infer<typeof schema>

export function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettingsStore()
  const { authQuery } = useOutletContext<AppOutletContext>()
  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const { control, register, handleSubmit, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      uiLanguage: settings.uiLanguage,
      themePreset: settings.themePreset,
      themeCustomColor: settings.themeCustomColor,
    },
  })

  useEffect(() => {
    reset({
      uiLanguage: settings.uiLanguage,
      themePreset: settings.themePreset,
      themeCustomColor: settings.themeCustomColor,
    })
  }, [reset, settings])

  const selectedUiLanguage = useWatch({ control, name: 'uiLanguage' })
  const selectedThemePreset = useWatch({ control, name: 'themePreset' })
  const selectedThemeCustomColor = useWatch({ control, name: 'themeCustomColor' })
  useEffect(() => {
    void i18n.changeLanguage(selectedUiLanguage)
  }, [selectedUiLanguage])

  useEffect(() => {
    applyTheme(resolveTheme(selectedThemePreset, selectedThemeCustomColor))
  }, [selectedThemePreset, selectedThemeCustomColor])

  const customColorValue =
    normalizeThemeHex(selectedThemeCustomColor) ?? settings.themeCustomColor
  const customTheme = useMemo(
    () => buildThemeFromPrimary(customColorValue),
    [customColorValue],
  )

  const onSubmit = (values: FormValues) => {
    const normalizedCustomColor =
      normalizeThemeHex(values.themeCustomColor) ?? settings.themeCustomColor
    settings.setAll({
      uiLanguage: values.uiLanguage,
      nativeLanguage: settings.nativeLanguage,
      targetLanguage: settings.targetLanguage,
      correctionEnabled: settings.correctionEnabled,
      coachTone: settings.coachTone,
      themePreset: values.themePreset,
      themeCustomColor: normalizedCustomColor,
    })
  }

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    enabled: Boolean(authQuery.data),
  })

  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } =
    useCategoryMutations({
      invalidateThreadsFeed: true,
      onCreateSuccess: () => {
        setNewCategory('')
      },
      onUpdateSuccess: () => {
        setEditingCategoryId(null)
        setEditingCategoryName('')
      },
    })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
    setError: setPasswordError,
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (values: PasswordChangeFormValues) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      resetPassword()
      alert(t('settings.passwordChanged'))
    },
    onError: (error: Error) => {
      setPasswordError('root', { message: error.message })
    },
  })

  const onPasswordSubmit = (values: PasswordChangeFormValues) => {
    changePasswordMutation.mutate(values)
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <h1 className="text-xl font-semibold">{t('settings.title')}</h1>

      <form
        className={`space-y-3 ${uiTokens.card.surface} sm:space-y-4`}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-1">
          <label className="text-sm text-[var(--theme-muted)]">
            {t('settings.uiLanguage')}
          </label>
          <select
            className={`${uiTokens.input.base} ${uiTokens.input.paddingMd}`}
            {...register('uiLanguage')}
          >
            <option value="ko">ko</option>
            <option value="en">en</option>
            <option value="tr">tr</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">{t('settings.themeTitle')}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {uiThemePresets.map((preset) => {
              const theme = buildThemeFromPrimary(preset.primary)
              const isActive = selectedThemePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`rounded-md border bg-[var(--theme-surface)] p-1 text-left transition ${
                    isActive ? 'border-[var(--theme-primary)]' : 'border-[var(--theme-border)]'
                  }`}
                  onClick={() => setValue('themePreset', preset.id, { shouldDirty: true })}
                  aria-pressed={isActive}
                >
                  <div className="flex h-8 w-full overflow-hidden rounded-sm">
                    <span
                      className="w-2/3"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span
                      className="w-1/3"
                      style={{ backgroundColor: theme.soft }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--theme-muted)]">
                    {preset.name}
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              className={`rounded-md border bg-[var(--theme-surface)] p-1 text-left transition ${
                selectedThemePreset === CUSTOM_THEME_ID
                  ? 'border-[var(--theme-primary)]'
                  : 'border-[var(--theme-border)]'
              }`}
              onClick={() => setValue('themePreset', CUSTOM_THEME_ID, { shouldDirty: true })}
              aria-pressed={selectedThemePreset === CUSTOM_THEME_ID}
            >
              <div className="flex h-8 w-full overflow-hidden rounded-sm">
                <span className="w-2/3" style={{ backgroundColor: customTheme.primary }} />
                <span className="w-1/3" style={{ backgroundColor: customTheme.soft }} />
              </div>
              <div className="mt-1 text-[10px] text-[var(--theme-muted)]">
                {t('settings.themeCustom')}
              </div>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-[var(--theme-muted)]">
              {t('settings.themeCustomColor')}
            </label>
            <input
              type="color"
              value={customColorValue}
              onChange={(event) => {
                setValue('themePreset', CUSTOM_THEME_ID, { shouldDirty: true })
                setValue('themeCustomColor', event.target.value, { shouldDirty: true })
              }}
              aria-label={t('settings.themeCustomColor')}
            />
            <input
              className={`${uiTokens.input.base} px-2 py-1 text-xs`}
              value={selectedThemeCustomColor}
              placeholder={t('settings.themeCustomPlaceholder')}
              onChange={(event) => {
                setValue('themePreset', CUSTOM_THEME_ID, { shouldDirty: true })
                setValue('themeCustomColor', event.target.value, { shouldDirty: true })
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          className={uiTokens.button.primaryMd}
        >
          {t('settings.save')}
        </button>
      </form>

      {authQuery.data && (
        <>
          <div className={uiTokens.card.surface}>
            <div className="text-sm font-semibold">{t('settings.changePassword')}</div>
            <form
              className="mt-2 space-y-3 sm:mt-3"
              onSubmit={handleSubmitPassword(onPasswordSubmit)}
            >
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder={t('settings.currentPassword')}
                  className={`${uiTokens.input.base} ${uiTokens.input.paddingMd} w-full`}
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <div className="text-xs text-red-600">
                    {passwordErrors.currentPassword.message}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder={t('settings.newPassword')}
                  className={`${uiTokens.input.base} ${uiTokens.input.paddingMd} w-full`}
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <div className="text-xs text-red-600">
                    {passwordErrors.newPassword.message}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="password"
                  placeholder={t('settings.confirmNewPassword')}
                  className={`${uiTokens.input.base} ${uiTokens.input.paddingMd} w-full`}
                  {...registerPassword('confirmNewPassword')}
                />
                {passwordErrors.confirmNewPassword && (
                  <div className="text-xs text-red-600">
                    {passwordErrors.confirmNewPassword.message}
                  </div>
                )}
              </div>

              {passwordErrors.root && (
                <div className="text-sm text-red-600">{passwordErrors.root.message}</div>
              )}

              <button
                type="submit"
                className={uiTokens.button.primaryMd}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending
                  ? t('settings.saving')
                  : t('settings.changePasswordButton')}
              </button>
            </form>
          </div>

          <div className={uiTokens.card.surface}>
            <div className="text-sm font-semibold">{t('settings.categories')}</div>
            <form
              className="mt-2 flex gap-2 sm:mt-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!newCategory.trim()) {
                  return
                }
                createCategoryMutation.mutate({ name: newCategory })
              }}
            >
              <input
                className={`flex-1 ${uiTokens.input.base} ${uiTokens.input.paddingMd}`}
                placeholder={t('settings.categoryPlaceholder')}
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              />
              <button
                className={uiTokens.button.primaryMd}
                type="submit"
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? t('settings.saving') : t('settings.add')}
              </button>
            </form>
            <div className="mt-2 space-y-2 sm:mt-3">
              {categoriesQuery.isLoading && (
                <div className="text-sm text-[var(--theme-muted)]">
                  {t('settings.loading')}
                </div>
              )}
              {categoriesQuery.isError && (
                <div className="text-sm text-red-600">{t('settings.error')}</div>
              )}
              {categoriesQuery.data?.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--theme-border)] bg-[var(--theme-surface)] px-1.5 py-1 sm:px-3 sm:py-2"
                >
                  {editingCategoryId === category.id ? (
                    <form
                      className="flex w-full items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!editingCategoryName.trim()) {
                          return
                        }
                        updateCategoryMutation.mutate({
                          id: editingCategoryId ?? '',
                          name: editingCategoryName,
                        })
                      }}
                    >
                      <input
                        className={`flex-1 ${uiTokens.input.base} px-3 py-1`}
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                      />
                      <button
                        className={uiTokens.button.primarySm}
                        type="submit"
                        disabled={updateCategoryMutation.isPending}
                      >
                        {t('settings.save')}
                      </button>
                      <button
                        className={uiTokens.button.secondarySm}
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null)
                          setEditingCategoryName('')
                        }}
                      >
                        {t('settings.cancel')}
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="text-sm text-[var(--theme-ink)]">
                        {category.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-[var(--theme-muted)] hover:opacity-90 hover:underline"
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(category.id)
                            setEditingCategoryName(category.name)
                          }}
                        >
                          {t('settings.edit')}
                        </button>
                        <button
                          className="text-xs text-[var(--theme-muted)] hover:opacity-90 hover:underline"
                          type="button"
                          onClick={() => deleteCategoryMutation.mutate({ id: category.id })}
                          disabled={deleteCategoryMutation.isPending}
                        >
                          {t('settings.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {categoriesQuery.data?.length === 0 && (
                <div className="text-sm text-[var(--theme-muted)]">
                  {t('settings.noCategories')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
