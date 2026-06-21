import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Send as SendIcon, FileText, X } from 'lucide-react'
import { communicationsApi } from '../../api/communications'
import { applicationsApi } from '../../api/applications'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input, Textarea, Modal, PageSpinner, EmptyState } from '../../components/ui'
import type { MessageTemplate, ApplicationList } from '../../types'

const templateSchema = z.object({
  template_name: z.string().min(1, 'Name is required'),
  email_subject: z.string().min(1, 'Subject is required'),
  email_body: z.string().min(1, 'Body is required'),
})
type TemplateFormValues = z.infer<typeof templateSchema>

function CreateTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: TemplateFormValues) => communicationsApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      handleClose()
    },
  })

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Template" size="lg">
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <Input label="Template Name" placeholder="e.g. Initial Outreach" error={errors.template_name?.message} {...register('template_name')} />
        <Input label="Email Subject" placeholder="e.g. Exciting opportunity at our company" error={errors.email_subject?.message} {...register('email_subject')} />
        <Textarea
          label="Email Body"
          placeholder="Hi {{candidate_name}}, ..."
          rows={8}
          error={errors.email_body?.message}
          {...register('email_body')}
        />
        <p className="text-xs text-gray-400">
          Available placeholders: <code className="bg-gray-100 px-1 rounded">{'{{candidate_name}}'}</code>{' '}
          <code className="bg-gray-100 px-1 rounded">{'{{job_title}}'}</code>{' '}
          <code className="bg-gray-100 px-1 rounded">{'{{company_name}}'}</code>
        </p>
        {createMutation.isError && (
          <p className="text-sm text-red-600">Couldn't create the template. Check the fields and try again.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Save Template</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CommunicationsPage() {
  const { canManage } = useAuth()
  const queryClient = useQueryClient()
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationList | null>(null)
  const [appQuery, setAppQuery] = useState('')
  const [debouncedAppQuery, setDebouncedAppQuery] = useState('')
  const [filterApplication, setFilterApplication] = useState<ApplicationList | null>(null)
  const [filterAppQuery, setFilterAppQuery] = useState('')
  const [debouncedFilterAppQuery, setDebouncedFilterAppQuery] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAppQuery(appQuery), 300)
    return () => clearTimeout(t)
  }, [appQuery])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilterAppQuery(filterAppQuery), 300)
    return () => clearTimeout(t)
  }, [filterAppQuery])

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: () => communicationsApi.listTemplates(),
  })
  const templates = templatesQuery.data?.data.results ?? []

  const appSearchQuery = useQuery({
    queryKey: ['applications', 'comms-search', debouncedAppQuery],
    queryFn: () => applicationsApi.list({ search: debouncedAppQuery }),
    enabled: debouncedAppQuery.length > 0,
  })
  const appSearchResults = appSearchQuery.data?.data.results ?? []

  const filterAppSearchQuery = useQuery({
    queryKey: ['applications', 'comms-filter-search', debouncedFilterAppQuery],
    queryFn: () => applicationsApi.list({ search: debouncedFilterAppQuery }),
    enabled: debouncedFilterAppQuery.length > 0,
  })
  const filterAppResults = filterAppSearchQuery.data?.data.results ?? []

  const logsQuery = useQuery({
    queryKey: ['communications', filterApplication?.id],
    queryFn: () => communicationsApi.listLogs({ application: filterApplication?.id }),
  })
  const logs = logsQuery.data?.data.results ?? []

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!selectedApplication || !selectedTemplate) throw new Error('Missing application or template')
      return communicationsApi.send(selectedApplication.id, selectedTemplate.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] })
      setSendSuccess(true)
      setSelectedApplication(null)
      setTimeout(() => setSendSuccess(false), 3000)
    },
  })

  function renderPreview(template: MessageTemplate, app: ApplicationList | null) {
    let body = template.email_body
    if (app) {
      body = body.replaceAll('{{candidate_name}}', app.candidate_name)
      body = body.replaceAll('{{job_title}}', app.job_title)
      body = body.replaceAll('{{company_name}}', 'Our Company')
    }
    return body
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Communications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send templated emails to candidates and track what's gone out.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Templates</h2>
            {canManage && (
              <button onClick={() => setIsTemplateModalOpen(true)} className="text-blue-700 hover:text-blue-800">
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          {templatesQuery.isLoading ? (
            <PageSpinner />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No templates yet"
              description={canManage ? 'Create one to get started.' : 'Check back later.'}
            />
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedTemplate?.id === t.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium text-gray-900">{t.template_name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t.email_subject}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Send a Communication</h2>

          {!selectedTemplate ? (
            <EmptyState title="Pick a template" description="Select a template on the left to get started." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Application</label>
                {selectedApplication ? (
                  <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-900">
                      {selectedApplication.candidate_name} — {selectedApplication.job_title}
                    </span>
                    <button onClick={() => setSelectedApplication(null)}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search by candidate or job title..."
                      value={appQuery}
                      onChange={(e) => setAppQuery(e.target.value)}
                    />
                    {debouncedAppQuery.length > 0 && appSearchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {appSearchResults.map((app) => (
                          <button
                            key={app.id}
                            onClick={() => { setSelectedApplication(app); setAppQuery('') }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            {app.candidate_name} — {app.job_title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs text-gray-400 mb-1">Subject</p>
                <p className="text-sm font-medium text-gray-900 mb-3">{selectedTemplate.email_subject}</p>
                <p className="text-xs text-gray-400 mb-1">Preview</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renderPreview(selectedTemplate, selectedApplication)}
                </p>
              </div>

              {canManage ? (
                <div className="flex items-center justify-between">
                  <Button disabled={!selectedApplication} loading={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
                    <SendIcon className="w-4 h-4" />
                    Send Email
                  </Button>
                  {sendSuccess && <span className="text-sm text-emerald-600">Sent successfully!</span>}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Only HR/Admin can send communications.</p>
              )}
              {sendMutation.isError && <p className="text-sm text-red-600">Couldn't send this email. Try again.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Sent History</h2>
          <div className="w-72">
            {filterApplication ? (
              <div className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-700 truncate">
                  {filterApplication.candidate_name} — {filterApplication.job_title}
                </span>
                <button onClick={() => setFilterApplication(null)}>
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Filter by application..."
                  value={filterAppQuery}
                  onChange={(e) => setFilterAppQuery(e.target.value)}
                  className="!py-1.5 text-xs"
                />
                {debouncedFilterAppQuery.length > 0 && filterAppResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filterAppResults.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => { setFilterApplication(app); setFilterAppQuery('') }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {app.candidate_name} — {app.job_title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {logsQuery.isLoading ? (
          <PageSpinner />
        ) : logs.length === 0 ? (
          <EmptyState title="No communications sent yet" description="Sent emails will be logged here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Recipient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Template</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sent By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.application.candidate_name}</td>
                    <td className="px-4 py-3 text-gray-600">{log.template.template_name}</td>
                    <td className="px-4 py-3 text-gray-600">{log.sender.first_name} {log.sender.last_name}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(log.sent_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateTemplateModal open={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />
    </div>
  )
}