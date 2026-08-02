'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatAddress } from '@/lib/format'

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('reports')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [catVotes, setCatVotes] = useState([])
  const [threshold, setThreshold] = useState(3)
  const [catThreshold, setCatThreshold] = useState(10)
  const [tagMinShow, setTagMinShow] = useState(1)
  const [searchRadius, setSearchRadius] = useState(2)
  const [userQuery, setUserQuery] = useState('')

  async function checkAdmin() {
    const { data: u } = await supabase.auth.getUser()
    let admin = false
    if (u.user) {
      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', u.user.id).single()
      admin = !!p?.is_admin
    }
    setIsAdmin(admin); setLoaded(true)
    if (admin) loadAll()
  }
  async function loadAll() {
    const { data: s } = await supabase.rpc('admin_stats')
    if (s) { setStats(s); setThreshold(s.threshold ?? 3); setCatThreshold(s.category_threshold ?? 10); setTagMinShow(s.tag_min_show ?? 1); setSearchRadius(s.search_radius_km ?? 2) }
    const { data: rp } = await supabase.rpc('admin_reports'); setReports(rp ?? [])
    const { data: us } = await supabase.rpc('admin_list_users'); setUsers(us ?? [])
    const { data: cv } = await supabase.rpc('admin_category_votes'); setCatVotes(cv ?? [])
  }
  useEffect(() => { checkAdmin() }, [])

  async function setHidden(pid, val) {
    const { error } = await supabase.rpc('admin_set_hidden', { pid, val })
    if (error) { alert(error.message); return }; loadAll()
  }
  async function removePlace(pid) {
    if (!confirm('완전히 삭제할까요? 되돌릴 수 없어요.')) return
    const { error } = await supabase.rpc('admin_delete_place', { pid })
    if (error) { alert(error.message); return }; loadAll()
  }
  async function toggleAdmin(uid, val) {
    if (!confirm(val ? '이 사용자를 관리자로 지정할까요?' : '관리자 권한을 해제할까요?')) return
    const { error } = await supabase.rpc('admin_set_admin', { target: uid, val })
    if (error) { alert(error.message); return }; loadAll()
  }
  async function applyCategory(pid, cat) {
    if (!confirm(`이 가게를 "${cat}" (으)로 바꿀까요?`)) return
    const { error } = await supabase.rpc('admin_apply_category', { pid, cat })
    if (error) { alert(error.message); return }; loadAll()
  }
  async function saveThreshold() {
    const { error } = await supabase.rpc('admin_set_threshold', { val: Number(threshold) })
    if (error) { alert(error.message); return }
    alert('저장했어요 🐾'); loadAll()
  }
  async function saveCatThreshold() {
    const { error } = await supabase.rpc('admin_set_category_threshold', { val: Number(catThreshold) })
    if (error) { alert(error.message); return }
    alert('저장했어요 🐾'); loadAll()
  }
  async function saveTagMinShow() {
    const { error } = await supabase.rpc('admin_set_tag_min_show', { val: Number(tagMinShow) })
    if (error) { alert(error.message); return }
    alert('저장했어요 🐾'); loadAll()
  }
  async function saveSearchRadius() {
    const { error } = await supabase.rpc('admin_set_search_radius', { val: Number(searchRadius) })
    if (error) { alert(error.message); return }
    alert('저장했어요 🐾'); loadAll()
  }

  if (!loaded) return <div className="p-6 text-gray-400">불러오는 중...</div>
  if (!isAdmin) return <div className="max-w-lg mx-auto p-6 text-center text-gray-500">관리자만 볼 수 있는 페이지예요.</div>

  const Tab = ({ k, label }) => (
    <button onClick={() => setTab(k)} className={`flex-1 py-2 text-sm font-medium rounded-lg ${tab === k ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>{label}</button>
  )

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-3">관리자</h1>
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
        <Tab k="reports" label="신고" />
        <Tab k="stats" label="통계" />
        <Tab k="users" label="사용자" />
        <Tab k="settings" label="설정" />
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 gap-2">
          {[['가게', stats.places], ['숨김', stats.hidden], ['신고', stats.reports], ['사용자', stats.users], ['후기', stats.reviews]].map(([l, v]) => (
            <div key={l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div className="text-2xl font-extrabold">{v ?? 0}</div>
              <div className="text-xs text-gray-400 mt-1">{l}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <>
          {reports.length === 0 && <p className="text-gray-400 text-sm">신고된 가게가 없어요 🐾</p>}
          <ul className="flex flex-col gap-3">
            {reports.map((p) => (
              <li key={p.place_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{p.name}{p.hidden && <span className="text-[10px] bg-gray-800 text-white rounded px-1.5 py-0.5 ml-1">숨김</span>}</div>
                    <div className="text-xs text-gray-400 truncate">{p.category} · {formatAddress(p.address)}</div>
                  </div>
                  <span className="text-xs text-red-500 shrink-0">🚩 {p.report_count}</span>
                </div>
                {(p.reasons ?? []).length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {p.reasons.map((r, i) => <li key={i} className="text-[11px] bg-red-50 text-red-600 rounded-full px-2 py-0.5">{r}</li>)}
                  </ul>
                )}
                <div className="flex gap-2 mt-3">
                  {p.hidden
                    ? <button onClick={() => setHidden(p.place_id, false)} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">복구</button>
                    : <button onClick={() => setHidden(p.place_id, true)} className="flex-1 bg-gray-700 text-white rounded-lg py-2 text-sm">숨기기</button>}
                  <button onClick={() => removePlace(p.place_id)} className="flex-1 border border-gray-200 text-red-500 rounded-lg py-2 text-sm">완전 삭제</button>
                </div>
              </li>
            ))}
          </ul>

          {catVotes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold mb-2">카테고리 정정 요청</h3>
              <ul className="flex flex-col gap-2">
                {catVotes.map((c) => (
                  <li key={c.place_id + c.suggested_category} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{c.name}</div>
                      <div className="text-[11px] text-gray-500">{c.current_category} → <b className="text-blue-700">{c.suggested_category}</b> · {c.votes}명</div>
                    </div>
                    <button onClick={() => applyCategory(c.place_id, c.suggested_category)} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 shrink-0">적용</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {tab === 'users' && (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 mb-3">
            <span className="text-gray-400">🔍</span>
            <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="닉네임·이메일 검색"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-gray-400" />
            {userQuery && <button onClick={() => setUserQuery('')} className="text-gray-300 text-sm">✕</button>}
          </div>
          <ul className="flex flex-col gap-2">
            {users.filter((u) => {
              const q = userQuery.trim().toLowerCase()
              if (!q) return true
              return (u.nickname ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)
            }).map((u) => (
              <li key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{u.nickname ?? '(닉네임 없음)'}{u.is_admin && <span className="text-[10px] text-red-500"> · 관리자</span>}</div>
                  <div className="text-[11px] text-gray-400 truncate">{u.email}</div>
                </div>
                <button onClick={() => toggleAdmin(u.id, !u.is_admin)} className={`text-xs rounded-full px-3 py-1.5 shrink-0 ${u.is_admin ? 'border border-gray-200 text-gray-500' : 'bg-red-500 text-white'}`}>
                  {u.is_admin ? '관리자 해제' : '관리자 지정'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === 'settings' && (
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold mb-1">자동 숨김 기준</div>
            <p className="text-xs text-gray-400 mb-3">서로 다른 몇 명이 신고하면 가게를 자동으로 숨길지 정해요.</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">명 이상</span>
              <button onClick={saveThreshold} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">저장</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold mb-1">카테고리 자동 변경 기준</div>
            <p className="text-xs text-gray-400 mb-3">몇 명이 같은 카테고리로 정정 요청하면 자동으로 바꿀지 정해요.</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={catThreshold} onChange={(e) => setCatThreshold(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">명 이상</span>
              <button onClick={saveCatThreshold} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">저장</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold mb-1">특징 표시 최소 인원</div>
            <p className="text-xs text-gray-400 mb-3">후기에서 몇 명 이상이 체크한 특징만 표시할지 정해요.</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={tagMinShow} onChange={(e) => setTagMinShow(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">명 이상</span>
              <button onClick={saveTagMinShow} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">저장</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-sm font-semibold mb-1">지역 검색 반경</div>
            <p className="text-xs text-gray-400 mb-3">둘러보기에서 지역 검색 시 몇 km 안의 가게를 보여줄지 정해요.</p>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={searchRadius} onChange={(e) => setSearchRadius(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">km 이내</span>
              <button onClick={saveSearchRadius} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}