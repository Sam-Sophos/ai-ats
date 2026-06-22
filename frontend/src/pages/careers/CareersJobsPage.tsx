import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Briefcase } from 'lucide-react'
import { jobsApi } from '../../api/jobs'
import { PageSpinner, EmptyState, Badge } from '../../components/ui'
import type { JobList } from '../../types'

async function fetchAllJobs(): Promise<JobList[]> {
  let page = 1
  let results: JobList[] = []
  while (true) {
    const res = await jobsApi.list({ page })
    results = results.concat(res.data.results)
    if (!res.data.next) break
    page += 1
  }
  return results
}

export default function CareersJobsPage() {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null)

  const jobsQuery = useQuery({
    queryKey: ['careers', 'jobs'],
    queryFn: fetchAllJobs,
  })

  const allJobs = jobsQuery.data ?? []
  const departments = Array.from(new Set(allJobs.map((j) => j.department_name))).sort()

  const filteredJobs = allJobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase())
    const matchesDept = !departmentFilter || job.department_name === departmentFilter
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900">Shape the future of Talent Acquisition</h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">
          Join a team of visionaries, builders, and problem solvers working to connect the world's
          best talent with their dream opportunities.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for roles, skills, or departments..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {departments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDepartmentFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !departmentFilter ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Positions
            </button>
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  departmentFilter === dept ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Open Roles</h2>
          {!jobsQuery.isLoading && (
            <span className="text-sm text-gray-500">
              Showing {filteredJobs.length} of {allJobs.length} positions
            </span>
          )}
        </div>

        {jobsQuery.isLoading ? (
          <PageSpinner />
        ) : jobsQuery.isError ? (
          <EmptyState title="Couldn't load jobs" description="Something went wrong. Try refreshing the page." />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-10 h-10" />}
            title="No matching roles"
            description="Try a different search or department."
          />
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                <div>
                  <Badge variant="blue">{job.department_name}</Badge>
                  <h3 className="text-base font-semibold text-gray-900 mt-1.5">{job.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{job.skill_count} required skills</p>
                </div>
                <Link
                  to={`/careers/${job.id}`}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors whitespace-nowrap"
                >
                  View & Apply
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}