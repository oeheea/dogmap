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
  const [threshold, setThreshold] = useState(3)
  const [tagConfirm, setTagConfirm] = useState(5)
  const [tagDelete, setTagDelete] = useState(5)

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
    if (s) { setStats(s); setThreshold(s.threshold ?? 3); setTagConfirm(s.tag_confirm ?? 5); setTagDelete(s.tag_delete ?? 5) }
    const { data: rp } = await supabase.rpc('admin_reports'); setReports(rp ?? [])
    const { data: us } = await supabase.rpc('admin_list_users'); setUsers(us ?? [])
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
  async function saveThreshold() {
    const { error } = await supabase.rpc('admin_set_threshold', { val: Number(threshold) })
    if (error) { alert(error.message); return }
    alert('저장했어요 🐾'); loadAll()
  }

  async function saveTagThresholds() {
    const { error } = await supabase.rpc('admin_set_tag_thresholds', { confirm_val: Number(tagConfirm), delete_val: Number(tagDelete) })
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
          {[['가게', stats.places], ['숨김', stats.hidden], ['신고', stats.reports], ['사용자', stats.users], ['후기', stats.reviews], ['산책', stats.walks]].map(([l, v]) => (
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
        </>
      )}

      {tab === 'users' && (
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
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
            <div className="text-sm font-semibold mb-1">태그 투표 기준</div>
            <p className="text-xs text-gray-400 mb-3">특징 태그가 확정·삭제되는 데 필요한 사람 수예요.</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-500 w-14">👍 확정</span>
              <input type="number" min="1" value={tagConfirm} onChange={(e) => setTagConfirm(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">명 이상</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-14">🗑️ 삭제</span>
              <input type="number" min="1" value={tagDelete} onChange={(e) => setTagDelete(e.target.value)} className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <span className="text-sm text-gray-500">명 이상</span>
              <button onClick={saveTagThresholds} className="ml-auto bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}