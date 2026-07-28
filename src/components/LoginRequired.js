import Link from 'next/link'

export default function LoginRequired() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center mt-8">
        <div className="text-4xl mb-2">🐾</div>
        <p className="text-gray-700 font-semibold">로그인이 필요해요</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">로그인하고 즐겨찾기·후기·커뮤니티를 이용해보세요</p>
        <Link href="/login" className="inline-block bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold">로그인 / 회원가입</Link>
      </div>
    </div>
  )
}