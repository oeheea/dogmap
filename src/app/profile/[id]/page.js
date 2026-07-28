'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Loading from '@/components/Loading'
import ShapeIcon from '@/components/ShapeIcon'

export default function ProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState(null)
  const [folders, setFolders] = useState([])
  const [reviews, setReviews] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('folders')
  const [editing, setEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [reviewsPublic, setReviewsPublic] = useState(true)
  const [avatarFile, setAvatarFile] = useState(null)
  const [following, setFollowing] = useState(false)
  const [counts, setCounts] = useState({ followers: 0, following: 0 })

  async function load() {
    const { data: u } = await supabase.auth.getUser(); setMe(u.user)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single()
    setProfile(p)
    if (p) { setNickname(p.nickname ?? ''); setBio(p.bio ?? ''); setReviewsPublic(p.reviews_public ?? true) }
    const { data: fs } = await supabase.from('folders').select('*, saved_places(count)').eq('user_id', id).eq('is_public', true).order('created_at')
    setFolders(fs ?? [])
    const owner = u.user && u.user.id === id
    if (p && (p.reviews_public || owner)) {
      const { data: rv } = await supabase.from('reviews').select('*, places(name, category)').eq('user_id', id).order('created_at', { ascending: false })
      setReviews(rv ?? [])
    } else setReviews([])
    const { data: ps } = await supabase.from('posts').select('*, comments(count)').eq('user_id', id).order('created_at', { ascending: false })
    setPosts(ps ?? [])

    const { count: followers } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id)
    const { count: followingCnt } = await supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id)
    setCounts({ followers: followers ?? 0, following: followingCnt ?? 0 })
    if (u.user && u.user.id !== id) {
      const { data: fr } = await supabase.from('follows').select('id').eq('follower_id', u.user.id).eq('following_id', id).maybeSingle()
      setFollowing(!!fr)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function toggleFollow() {
    if (!me) { alert('로그인이 필요해요'); return }
    if (following) await supabase.from('follows').delete().eq('follower_id', me.id).eq('following_id', id)
    else await supabase.from('follows').insert({ follower_id: me.id, following_id: id })
    load()
  }
  async function saveProfile() {
    let avatar_url = profile.avatar_url ?? null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile)
      if (upErr) { alert('사진 업로드 실패: ' + upErr.message); return }
      avatar_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('profiles').update({ nickname, bio, reviews_public: reviewsPublic, avatar_url }).eq('id', id)
    if (error) { alert(error.message); return }
    setAvatarFile(null); setEditing(false); load()
  }
  async function logout() { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <Loading />
  if (!profile) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">없는 사용자예요.</div>

  const isOwner = me && me.id === id
  const showReviews = profile.reviews_public || isOwner
  const TabBtn = ({ k, label, n }) => (
    <button onClick={() => setTab(k)} className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === k ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>{label} {n}</button>
  )

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0">{(profile.nickname ?? '?').slice(0, 1)}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-lg truncate">{profile.nickname ?? '익명'}</div>
            {profile.bio && <div className="text-sm text-gray-500">{profile.bio}</div>}
            <div className="text-xs text-gray-400 mt-1">팔로워 {counts.followers} · 팔로잉 {counts.following}</div>
          </div>
          {isOwner ? (
            <button onClick={() => setEditing(true)} className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 shrink-0">편집</button>
          ) : (
            <button onClick={toggleFollow} className={`text-xs rounded-full px-4 py-1.5 shrink-0 ${following ? 'border border-gray-200 text-gray-600' : 'bg-blue-600 text-white'}`}>{following ? '팔로잉' : '팔로우'}</button>
          )}
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 mt-4 gap-1">
        <TabBtn k="folders" label="폴더" n={folders.length} />
        <TabBtn k="reviews" label="후기" n={showReviews ? reviews.length : ''} />
        <TabBtn k="posts" label="글" n={posts.length} />
      </div>

      <div className="mt-4">
        {tab === 'folders' && (
          <ul className="flex flex-col gap-2">
            {folders.length === 0 && <p className="text-sm text-gray-400">공개된 폴더가 없어요.</p>}
            {folders.map((f) => (
              <li key={f.id}>
                <Link href={`/folder/${f.id}`} className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                  <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center"><ShapeIcon shape={f.icon} size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-sm truncate">{f.name}</span><span className="block text-[11px] text-gray-400">{f.saved_places?.[0]?.count ?? 0}곳</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {tab === 'reviews' && (
          !showReviews ? <p className="text-sm text-gray-400">이 사용자가 후기를 비공개로 설정했어요.</p> : (
            <ul className="flex flex-col gap-2">
              {reviews.length === 0 && <p className="text-sm text-gray-400">아직 후기가 없어요.</p>}
              {reviews.map((r) => (
                <li key={r.id}>
                  <Link href={`/place/${r.place_id}`} className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm truncate">{r.places?.name ?? '(삭제된 장소)'}</span>
                      <span className="text-amber-500 text-sm shrink-0">{'★'.repeat(r.rating)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{r.content}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
        {tab === 'posts' && (
          <ul className="flex flex-col gap-2">
            {posts.length === 0 && <p className="text-sm text-gray-400">아직 쓴 글이 없어요.</p>}
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/community/${p.id}`} className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 shrink-0">{p.category}</span>
                    <span className="font-bold text-sm truncate">{p.title}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString('ko-KR')} · 댓글 {p.comments?.[0]?.count ?? 0}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOwner && (
        <button onClick={logout} className="w-full mt-8 border border-gray-200 text-gray-500 rounded-xl py-2.5 text-sm hover:bg-gray-50">로그아웃</button>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">프로필 편집</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 text-lg">✕</button>
            </div>
            <div className="flex justify-center mb-3">
              <label className="cursor-pointer">
                {(avatarFile || profile.avatar_url) ? (
                  <img src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-2xl">📷</div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files[0])} />
              </label>
            </div>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2" />
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="소개 (선택)" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3" />
            <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={reviewsPublic} onChange={(e) => setReviewsPublic(e.target.checked)} /> 내 후기 목록을 프로필에 공개</label>
            <button onClick={saveProfile} className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">저장</button>
          </div>
        </div>
      )}
    </div>
  )
}