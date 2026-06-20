import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, X, Briefcase } from 'lucide-react'
import { jobsApi } from '../../api/jobs'
import { authApi } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import { Button, Input, Textarea, Select, Modal, Badge, PageSpinner, EmptyState } from '../../components/ui'
import type { Skill, JobWritePayload } from '../../types'

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  department: z.string().min(1, 'Select a department'),
})
type JobFormValues = z.infer<typeof jobSchema>

function CreateJobModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([])
  const [skillQuery, setSkillQuery] = useState('')
  const [debouncedSkillQuery, setDebouncedSkillQuery] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSkillQuery(skillQuery), 300)
    return () => clearTimeout(t)
  }, [skillQuery])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobFormValues>({ resolver: zodResolver(jobSchema) })

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => authApi.listDepartments(),
    staleTime: 5 * 60 * 1000,
  })
  const departments = departmentsQuery.data?.data ?? []

  const skillsQuery = useQuery({
    queryKey: ['skills', debouncedSkillQuery],
    queryFn: () => jobsApi.searchSkills(debouncedSkillQuery),
    enabled: debouncedSkillQuery.length > 0,
  })
  const skillResults = (skillsQuery.data?.data.results ?? []).filter(
    (s) => !selectedSkills.some((sel) => sel.id === s.id)
  )

  const createJobMutation = useMutation({
    mutationFn: (payload: JobWritePayload) => jobsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      handleClose()
    },
  })

  function handleClose() {
    reset()
    setSelectedSkills([])
    setSkillQuery('')
    onClose()
  }

  function onSubmit(values: JobFormValues) {
    createJobMutation.mutate({
      title: values.title,
      description: values.description,
      department: Number(values.department),
      skill_ids: selectedSkills.map((s) => s.id),
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Job Posting" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Job Title"
          placeholder="e.g. Senior Software Engineer"
          error={errors.title?.message}
          {...register('title')}
        />

        <Select
          label="Department"
          placeholder="Select a department"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          error={errors.department?.message}
          {...register('department')}
        />

        <Textarea
          label="Job Description"
          placeholder="Start typing the job requirements and responsibilities..."
          rows={5}
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Required Skills</label>

          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {selectedSkills.map((skill) => (
                <Badge key={skill.id} variant="blue" className="gap-1">
                  {skill.skill_name}
                  <button
                    type="button"
                    onClick={() => setSelectedSkills((prev) => prev.filter((s) => s.id !== skill.id))}
                    className="hover:text-blue-950"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Input
              placeholder="Add skill (e.g. React)..."
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
            />
            {debouncedSkillQuery.length > 0 && skillResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {skillResults.map((skill) => (
                  <button
                    type="button"
                    key={skill.id}
                    onClick={() => {
                      setSelectedSkills((prev) => [...prev, skill])
                      setSkillQuery('')
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {skill.skill_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {createJobMutation.isError && (
          <p className="text-sm text-red-600">Couldn't create the job. Check the fields and try again.</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createJobMutation.isPending}>
            Publish Job
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function JobsListPage() {
  const { canManage } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, departmentFilter])

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => authApi.listDepartments(),
    staleTime: 5 * 60 * 1000,
  })
  const departments = departmentsQuery.data?.data ?? []

  const jobsQuery = useQuery({
    queryKey: ['jobs', { search: debouncedSearch, department: departmentFilter, page }],
    queryFn: () =>
      jobsApi.list({
        search: debouncedSearch || undefined,
        department: departmentFilter ? Number(departmentFilter) : undefined,
        page,
      }),
  })

  const jobs = jobsQuery.data?.data.results ?? []
  const hasNext = !!jobsQuery.data?.data.next
  const hasPrev = !!jobsQuery.data?.data.previous

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage open requisitions and AI-matching criteria.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Create Job
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by title..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {jobsQuery.isLoading ? (
          <PageSpinner />
        ) : jobsQuery.isError ? (
          <EmptyState title="Couldn't load jobs" description="Something went wrong. Try refreshing the page." />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-10 h-10" />}
            title="No jobs found"
            description={search || departmentFilter ? 'Try adjusting your filters.' : 'Create your first job posting to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Skills</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${job.id}`} className="font-medium text-blue-700 hover:underline">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{job.department_name}</td>
                    <td className="px-4 py-3 text-gray-600">{job.created_by_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="blue">{job.skill_count} skills</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
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

      <CreateJobModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}