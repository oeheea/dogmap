'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)  // 회원가입 모드인지
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')

    if (isSignUp) {
      // 회원가입
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } },
      })
      if (error) { setMessage('회원가입 실패: ' + error.message); return }
      router.push('/')
    } else {
      // 로그인
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMessage('로그인 실패: ' + error.message); return }
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? '회원가입' : '로그인'} 🐾
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isSignUp && (
            <input className="border rounded px-3 py-2" placeholder="닉네임"
              value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          )}
          <input className="border rounded px-3 py-2" type="email" placeholder="이메일"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="border rounded px-3 py-2" type="password" placeholder="비밀번호 (6자 이상)"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="bg-blue-600 text-white rounded px-3 py-2 font-semibold" type="submit">
            {isSignUp ? '가입하기' : '로그인'}
          </button>
        </form>

        {message && <p className="mt-3 text-sm text-center text-red-500">{message}</p>}

        <button className="mt-4 text-sm text-gray-500 underline w-full"
          onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}>
          {isSignUp ? '이미 계정이 있어요 (로그인)' : '계정이 없어요 (회원가입)'}
        </button>
      </div>
    </div>
  )
}