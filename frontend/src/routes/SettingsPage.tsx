import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { supportedLanguages } from '../lib/languages'
import { useSettingsStore } from '../store/settingsStore'
import i18n from '../i18n'
import { fetchCategories } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useCategoryMutations } from '../hooks/useCategoryMutations'

const schema = z.object({
  uiLanguage: z.enum(supportedLanguages),
})

type FormValues = z.infer<typeof schema>

export function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettingsStore()
  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const { control, register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      uiLanguage: settings.uiLanguage,
    },
  })

  useEffect(() => {
    reset({
      uiLanguage: settings.uiLanguage,
    })
  }, [reset, settings])

  const selectedUiLanguage = useWatch({ control, name: 'uiLanguage' })
  useEffect(() => {
    void i18n.changeLanguage(selectedUiLanguage)
  }, [selectedUiLanguage])

  const onSubmit = (values: FormValues) => {
    settings.setAll({
      uiLanguage: values.uiLanguage,
      nativeLanguage: settings.nativeLanguage,
      targetLanguage: settings.targetLanguage,
      correctionEnabled: settings.correctionEnabled,
      coachTone: settings.coachTone,
    })
  }

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
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

  return (
    <div className="space-y-2 sm:space-y-4">
      <h1 className="text-xl font-semibold">{t('settings.title')}</h1>

      <form
        className="space-y-3 rounded-lg border bg-white p-3 text-gray-900 sm:space-y-4 sm:p-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="space-y-1">
          <label className="text-sm text-gray-700">{t('settings.uiLanguage')}</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            {...register('uiLanguage')}
          >
            <option value="ko">ko</option>
            <option value="en">en</option>
            <option value="tr">tr</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t('settings.save')}
        </button>
      </form>

      <div className="rounded-lg border bg-white p-3 text-gray-900 sm:p-4">
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
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder={t('settings.categoryPlaceholder')}
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
          />
          <button
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            type="submit"
            disabled={createCategoryMutation.isPending}
          >
            {createCategoryMutation.isPending ? t('settings.saving') : t('settings.add')}
          </button>
        </form>
        <div className="mt-2 space-y-2 sm:mt-3">
          {categoriesQuery.isLoading && (
            <div className="text-sm text-gray-600">{t('settings.loading')}</div>
          )}
          {categoriesQuery.isError && (
            <div className="text-sm text-red-600">{t('settings.error')}</div>
          )}
          {categoriesQuery.data?.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-1.5 py-1 sm:px-3 sm:py-2"
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
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
                    value={editingCategoryName}
                    onChange={(event) => setEditingCategoryName(event.target.value)}
                  />
                  <button
                    className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white"
                    type="submit"
                    disabled={updateCategoryMutation.isPending}
                  >
                    {t('settings.save')}
                  </button>
                  <button
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700"
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
                  <div className="text-sm text-gray-900">{category.name}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs text-gray-600 hover:underline"
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(category.id)
                        setEditingCategoryName(category.name)
                      }}
                    >
                      {t('settings.edit')}
                    </button>
                    <button
                      className="text-xs text-gray-600 hover:underline"
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
            <div className="text-sm text-gray-600">{t('settings.noCategories')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
