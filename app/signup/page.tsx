"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, ArrowLeft, Check, Loader2, Shield, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"

// In-memory store for rate limiting (use Redis in production)
const signupAttempts = new Map()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // Clean every 5 minutes

// Performance monitoring
const performanceMetrics = {
  signupRequests: 0,
  successfulSignups: 0,
  failedSignups: 0,
  startTime: Date.now()
}

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [passwordMatch, setPasswordMatch] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)
  
  const formRef = useRef<HTMLFormElement>(null)
  const submitTimeoutRef = useRef<NodeJS.Timeout>()

  // Password strength calculator
  const calculatePasswordStrength = useCallback((password: string) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    if (/[^A-Za-z0-9]/.test(password)) strength += 25
    return strength
  }, [])

  // Optimized validation with debouncing
  const validateForm = useCallback(() => {
    const errors: string[] = []
    
    // Trim and validate length
    const name = formData.fullName.trim()
    const email = formData.email.trim().toLowerCase()
    const password = formData.password
    
    if (!name || name.length < 2) errors.push("Name must be at least 2 characters")
    if (name.length > 50) errors.push("Name must be less than 50 characters")
    if (!email) errors.push("Email is required")
    if (email.length > 255) errors.push("Email must be less than 255 characters")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format")
    if (password.length < 8) errors.push("Password must be at least 8 characters")
    if (password.length > 128) errors.push("Password must be less than 128 characters")
    if (!passwordMatch) errors.push("Passwords do not match")
    if (passwordStrength < 50) errors.push("Password is too weak")
    
    return errors
  }, [formData.fullName, formData.email, formData.password, passwordMatch, passwordStrength])

  // Rate limiting with IP and email tracking
  const checkRateLimit = useCallback((email: string, ip?: string) => {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxAttempts = 3
    
    // Clean old entries periodically
    if (now % CLEANUP_INTERVAL < 1000) {
      for (const [key, attempts] of signupAttempts.entries()) {
        const recentAttempts = attempts.filter((time: number) => now - time < windowMs)
        if (recentAttempts.length === 0) {
          signupAttempts.delete(key)
        } else {
          signupAttempts.set(key, recentAttempts)
        }
      }
    }

    // Check by email
    const emailKey = `email:${email}`
    if (!signupAttempts.has(emailKey)) {
      signupAttempts.set(emailKey, [])
    }
    
    const emailAttempts = signupAttempts.get(emailKey)
    const recentEmailAttempts = emailAttempts.filter((time: number) => now - time < windowMs)
    
    if (recentEmailAttempts.length >= maxAttempts) {
      return { allowed: false, reason: "EMAIL_RATE_LIMIT" }
    }

    // Check by IP if available
    if (ip) {
      const ipKey = `ip:${ip}`
      if (!signupAttempts.has(ipKey)) {
        signupAttempts.set(ipKey, [])
      }
      
      const ipAttempts = signupAttempts.get(ipKey)
      const recentIpAttempts = ipAttempts.filter((time: number) => now - time < windowMs)
      
      if (recentIpAttempts.length >= maxAttempts * 2) { // Higher limit for IP
        return { allowed: false, reason: "IP_RATE_LIMIT" }
      }
    }

    return { allowed: true }
  }, [])

  // Update rate limit counters
  const updateRateLimit = useCallback((email: string, ip?: string) => {
    const now = Date.now()
    
    const emailKey = `email:${email}`
    const emailAttempts = signupAttempts.get(emailKey) || []
    emailAttempts.push(now)
    signupAttempts.set(emailKey, emailAttempts)

    if (ip) {
      const ipKey = `ip:${ip}`
      const ipAttempts = signupAttempts.get(ipKey) || []
      ipAttempts.push(now)
      signupAttempts.set(ipKey, ipAttempts)
    }
  }, [])

  // Get client IP (simplified - use proper IP detection in production)
  const getClientIP = useCallback(async (): Promise<string> => {
    try {
      // In production, you'd get this from your backend API
      const response = await fetch('/api/client-ip')
      const data = await response.json()
      return data.ip || 'unknown'
    } catch {
      return 'unknown'
    }
  }, [])

  // Debounced form validation
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Trim inputs and limit length
    let processedValue = value
    if (typeof value === 'string') {
      processedValue = value.trim()
      if (name === 'fullName' && value.length > 50) return
      if (name === 'email' && value.length > 255) return
      if (name === 'password' && value.length > 128) return
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }))
    setError("")

    // Update password strength in real-time
    if (name === 'password') {
      const strength = calculatePasswordStrength(processedValue)
      setPasswordStrength(strength)
    }

    // Check password match with debouncing
    if (name === 'confirmPassword' || name === 'password') {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current)
      }
      
      submitTimeoutRef.current = setTimeout(() => {
        setPasswordMatch(
          name === 'confirmPassword' 
            ? processedValue === formData.password 
            : formData.confirmPassword === processedValue
        )
      }, 300)
    }
  }, [formData.password, formData.confirmPassword, calculatePasswordStrength])

  // Password strength indicator
  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 25) return "bg-red-500"
    if (strength < 50) return "bg-orange-500"
    if (strength < 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 25) return "Very Weak"
    if (strength < 50) return "Weak"
    if (strength < 75) return "Good"
    return "Strong"
  }

  // Main signup handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    performanceMetrics.signupRequests++

    // Client-side validation first (fastest)
    const errors = validateForm()
    if (errors.length > 0) {
      setError(errors[0])
      performanceMetrics.failedSignups++
      return
    }

    // Get client IP for rate limiting
    const clientIP = await getClientIP()

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(formData.email, clientIP)
    if (!rateLimitCheck.allowed) {
      const message = rateLimitCheck.reason === "EMAIL_RATE_LIMIT" 
        ? "Too many signup attempts for this email. Please try again in 15 minutes."
        : "Too many signup attempts from your network. Please try again in 15 minutes."
      setError(message)
      performanceMetrics.failedSignups++
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const startTime = performance.now()

      // Step 1: Quick email existence check
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase())
        .limit(1)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Check error:', checkError)
        throw new Error('System temporarily unavailable')
      }

      if (existingUser) {
        setError("Email already exists. Please use a different email or login.")
        performanceMetrics.failedSignups++
        return
      }

      // Step 2: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: formData.role
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
  console.error('Auth error details:', authError)
  
  // Specific error handling
  if (authError.message?.includes("already registered") || authError.code === 'user_already_exists') {
    setError("Email already exists. Please use a different email or login.")
  } 
  else if (authError.message?.includes("rate limit") || authError.status === 429) {
    setError("Too many signup attempts. Please wait 15 minutes and try again.")
  }
  else if (authError.message?.includes("password") || authError.code === 'weak_password') {
    setError("Password is too weak. Please use a stronger password.")
  }
  else if (authError.message?.includes("email") || authError.code === 'invalid_email') {
    setError("Please enter a valid email address.")
  }
  else if (authError.status === 0 || authError.message?.includes("network") || authError.message?.includes("fetch")) {
    setError("Network connection failed. Please check your internet and try again.")
  }
  else if (authError.status >= 500) {
    setError("Authentication service is temporarily down. Please try again in a few minutes.")
  }
  else {
    // Generic error message that doesn't reveal technical details
    setError("Unable to create account at this time. Please try again later.")
  }
  
  performanceMetrics.failedSignups++
  return
}
      if (authData.user) {
        // Step 3: Insert user data efficiently
        const { error: dbError } = await supabase
          .from('users')
          .insert([
            { 
              id: authData.user.id,
              name: formData.fullName.trim().substring(0, 50),
              email: formData.email.trim().toLowerCase().substring(0, 255),
              password: '[HASHED]', // Supabase handles password hashing
              role: formData.role,
              created_at: new Date().toISOString(),
              last_active: new Date().toISOString()
            }
          ])
          .select('id')
          .single() // Only return ID to minimize data transfer

        if (dbError) {
          console.error('Database error:', dbError)
          
          // Rollback: Delete auth user if DB insert fails
          await supabase.auth.admin.deleteUser(authData.user.id)
          
          setError("Account creation failed. Please try again.")
          performanceMetrics.failedSignups++
          return
        }

        // Update rate limit and metrics
        updateRateLimit(formData.email, clientIP)
        performanceMetrics.successfulSignups++

        const endTime = performance.now()
        console.log(`Signup completed in ${endTime - startTime}ms`)

        setSuccess("Account created successfully! Please check your email for verification.")
        
        // Reset form
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "student",
        })
        setPasswordStrength(0)

        // Clear any pending timeouts
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current)
        }
      }
    } catch (error) {
      console.error("Signup error:", error)
      setError("An unexpected error occurred. Please try again.")
      performanceMetrics.failedSignups++
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current)
    }
  }, [])

  // Add cleanup to component unmount
 
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center py-12">
      {/* Background with performance optimization */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          opacity: 0.95,
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          prefetch={false} // Optimize navigation
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Signup Card */}
        <div className="glass-effect p-8 rounded-2xl border border-blue-500/20 space-y-8">
          {/* Header with Performance Indicators */}
          <div className="text-center space-y-3">
            <div className="flex justify-center items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 text-sm text-green-400">
                <Zap className="w-4 h-4" />
                <span>Optimized</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground">Join our high-performance learning platform</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Form */}
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-foreground flex items-center gap-2">
                Full Name
                <span className="text-xs text-muted-foreground">(max 20 chars)</span>
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                maxLength={20}
                className="bg-input border-blue-500/30 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/50"
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                Email Address
                <span className="text-xs text-muted-foreground">(max 30 chars)</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                maxLength={30}
                className="bg-input border-blue-500/30 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/50"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground flex items-center gap-2">
                Password
                <span className="text-xs text-muted-foreground">(8-12 chars)</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
                maxLength={12}
                className="bg-input border-blue-500/30 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/50"
                required
                disabled={isLoading}
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Password Strength:</span>
                    <span className={passwordStrength < 50 ? "text-red-400" : passwordStrength < 75 ? "text-yellow-400" : "text-green-400"}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  minLength={8}
                  maxLength={128}
                  className={`bg-input border-blue-500/30 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-blue-500/50 ${
                    formData.confirmPassword && !passwordMatch ? "border-red-500/50" : ""
                  }`}
                  required
                  disabled={isLoading}
                />
                {formData.confirmPassword && passwordMatch && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {formData.confirmPassword && !passwordMatch && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-3 pt-2">
              <Label className="text-foreground">I am a:</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Student Option */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role: "student" }))}
                  disabled={isLoading}
                  className={`p-4 rounded-lg border-2 transition-all text-center font-semibold disabled:opacity-50 ${
                    formData.role === "student"
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-blue-500/20 bg-transparent text-muted-foreground hover:border-blue-500/40"
                  }`}
                >
                  <div className="text-lg mb-1">👨‍🎓</div>
                  Student
                </button>

                {/* Teacher Option */}
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role: "teacher" }))}
                  disabled={isLoading}
                  className={`p-4 rounded-lg border-2 transition-all text-center font-semibold disabled:opacity-50 ${
                    formData.role === "teacher"
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-blue-500/20 bg-transparent text-muted-foreground hover:border-blue-500/40"
                  }`}
                >
                  <div className="text-lg mb-1">👨‍🏫</div>
                  Teacher
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !passwordMatch || passwordStrength < 50}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 h-11 font-semibold glow-effect mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-500/20" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          {/* Sign In Link */}
          <p className="text-center text-muted-foreground">
            Already have an account?{" "}
            <Link 
              href="/login" 
              className="text-blue-400 hover:text-blue-300 font-semibold"
              prefetch={false}
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground text-sm mt-8">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}