import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Users } from 'lucide-react'
import { candidatesApi } from '../../api/candidates'
import { Button, Input, Modal, Badge, PageSpinner, EmptyState } from '../../components/ui'
import type { CandidateWritePayload } from '../../types'

const candidateSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
})
type CandidateFormValues = z.infer<typeof candidateSchema>

function AddCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CandidateFormValues>({ resolver: zodResolver(candidateSchema) })

  const createCandidateMutation = useMutation({
    mutationFn: (payload: CandidateWritePayload) => candidatesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      handleClose()
    },
  })

  function handleClose() {
    reset()
    onClose()
  }

  function onSubmit(values: CandidateFormValues) {
    createCandidateMutation.mutate(values)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Candidate" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="Enter first name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label="Last Name"
            placeholder="Enter last name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone Number"
          placeholder="+1 (555) 000-0000"
          error={errors.phone?.message}
          {...register('phone')}
        />

        {createCandidateMutation.isError && (
          <p className="text-sm text-red-600">Couldn't add this candidate. Check the fields and try again.</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createCandidateMutation.isPending}>
            Add Candidate
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function CandidatesListPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const candidatesQuery = useQuery({
    queryKey: ['candidates', { search: debouncedSearch, page }],
    queryFn: () => candidatesApi.list({ search: debouncedSearch || undefined, page }),
  })

  const candidates = candidatesQuery.data?.data.results ?? []
  const hasNext = !!candidatesQuery.data?.data.next
  const hasPrev = !!candidatesQuery.data?.data.previous

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Search and manage everyone in your talent pool.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Candidate
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {candidatesQuery.isLoading ? (
          <PageSpinner />
        ) : candidatesQuery.isError ? (
          <EmptyState title="Couldn't load candidates" description="Something went wrong. Try refreshing the page." />
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No candidates found"
            description={search ? 'Try a different search.' : 'Add your first candidate to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {candidate.first_name} {candidate.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{candidate.email}</td>
                    <td className="px-4 py-3 text-gray-600">{candidate.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">{candidate.application_count}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(hasNext || hasPrev) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <Button variant="secondary" size="sm" disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <AddCandidateModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}