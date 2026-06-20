import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button, Input } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await login(data)
      navigate('/dashboard')
    } catch {
      setServerError('Incorrect email or password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#3949ab] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                            radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a237e] to-[#3949ab] px-8 py-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">HireFlow AI</span>
            </div>
            <h1 className="text-white text-lg font-semibold">Recruiter Console</h1>
            <p className="text-blue-200 text-sm mt-1">Sign in to manage your hiring pipeline</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Server error */}
              {serverError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{serverError}</p>
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm transition-colors
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full py-2.5 mt-2"
                loading={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium mb-1">Demo credentials</p>
              <p className="text-xs text-blue-600">Email: <span className="font-mono">admin@ats.com</span></p>
              <p className="text-xs text-blue-600">Password: <span className="font-mono">admin1234</span></p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              © 2026 HireFlow AI, Inc. · Intelligent Hiring, Streamlined.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
