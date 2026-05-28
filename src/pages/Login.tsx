import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { Phone, Shield, Zap, BarChart3 } from 'lucide-react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const googleButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-script')) return
      const script = document.createElement('script')
      script.id = 'google-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogleButton
      document.body.appendChild(script)
    }

    const initGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return

      window.google.accounts.id.initialize({
        client_id: '721657405787-vsdccjdpfsch11lbqipqul8v6d2mvhj6.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      })

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 280,
        text: 'continue_with',
        shape: 'rectangular',
      })
    }

    loadGoogleScript()
  }, [])

  const handleCredentialResponse = async (response: any) => {
    try {
      await login(response.credential)
      navigate('/')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#F59E0B] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[#F59E0B]/20">
            <Phone className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Nexus Outbound</h1>
          <p className="text-[#737373] text-sm">Premium lead management for cold calling teams</p>
        </div>

        {/* Card */}
        <div className="bg-[#171717] rounded-2xl border border-[#262626] p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
            <p className="text-sm text-[#737373]">Sign in to access your leads</p>
          </div>

          {/* Google Button Container */}
          <div className="flex justify-center mb-6">
            <div ref={googleButtonRef} />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#171717] px-4 text-xs text-[#737373]">Secure login with Google</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-[#0A0A0A]">
              <Zap className="w-5 h-5 text-[#F59E0B] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#737373]">Fast</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0A0A0A]">
              <Shield className="w-5 h-5 text-[#F59E0B] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#737373]">Secure</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-[#0A0A0A]">
              <BarChart3 className="w-5 h-5 text-[#F59E0B] mx-auto mb-1.5" />
              <p className="text-[10px] text-[#737373]">Track</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#737373] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
