'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } })
      if (error) { setMessage('회원가입 실패: ' + error.message); return }
      router.push('/')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMessage('로그인 실패: ' + error.message); return }
      router.push('/')
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🐾</div>
          <h1 className="text-xl font-extrabold">멍냥플레이스</h1>
          <p className="text-sm text-gray-400 mt-1">{isSignUp ? '반려동물과 갈 곳을 함께 기록해요' : '다시 오신 걸 환영해요'}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          {isSignUp && (
            <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none"
              placeholder="닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          )}
          <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none"
            type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-blue-400 focus:outline-none"
            type="password" placeholder="비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="bg-blue-600 hover:bg-blue-700 transition text-white rounded-lg px-3 py-2.5 font-semibold text-sm mt-1" type="submit">
            {isSignUp ? '가입하기' : '로그인'}
          </button>
        </form>

        {message && <p className="mt-3 text-sm text-center text-red-500">{message}</p>}

        <button className="mt-5 text-sm text-gray-400 hover:text-gray-700 w-full"
          onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}>
          {isSignUp ? '이미 계정이 있어요 · 로그인' : '계정이 없어요 · 회원가입'}
        </button>
      </div>
    </div>
  )
}