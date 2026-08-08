import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Shield, RefreshCw, Ban, CheckCircle2, Loader2 } from 'lucide-react';

function fmtDuration(seconds) {
  if (!seconds) return '0 分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false }).slice(0, 16);
}

export default function Admin() {
  const { showToast } = useApp();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const { users } = await api.getAdminUsers();
      setUsers(users);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetPassword = async (u) => {
    const newPassword = window.prompt(`为「${u.username}」设置新密码（至少 6 位）：`);
    if (!newPassword) return;
    if (newPassword.length < 6) { showToast('密码至少 6 位', 'error'); return; }
    setBusyId(u.id);
    try {
      await api.resetUserPassword(u.id, newPassword);
      showToast(`已重置「${u.username}」的密码`, 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (u) => {
    const action = u.status === 'active' ? '禁用' : '启用';
    if (!window.confirm(`确定要${action}账号「${u.username}」吗？`)) return;
    setBusyId(u.id);
    try {
      await api.toggleUserStatus(u.id);
      showToast(`已${action}「${u.username}」`, 'success');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> 加载中...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">管理员面板</h1>
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-4 py-3">用户</th>
              <th className="px-4 py-3">注册时间</th>
              <th className="px-4 py-3">最后登录</th>
              <th className="px-4 py-3">今日训练</th>
              <th className="px-4 py-3">累计时长</th>
              <th className="px-4 py-3">List 完成</th>
              <th className="px-4 py-3">掌握词数</th>
              <th className="px-4 py-3">欠债</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{u.username}</span>
                  {u.is_admin && (
                    <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">管理员</span>
                  )}
                  {u.is_test && (
                    <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">测试账号</span>
                  )}
                  {u.id === me?.id && <span className="ml-1 text-xs text-gray-400">(我)</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3 text-gray-600">{fmtDate(u.last_login_at)}</td>
                <td className="px-4 py-3">
                  {u.stats.todayCompleted
                    ? <span className="text-green-600">✓ 已完成</span>
                    : u.stats.todayTrainedSeconds > 0
                      ? <span className="text-amber-600">{fmtDuration(u.stats.todayTrainedSeconds)}</span>
                      : <span className="text-gray-400">未训练</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{fmtDuration(u.stats.totalSeconds)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {u.stats.listsDone} 个
                  {u.stats.pendingReviewLists > 0 && (
                    <span className="ml-1 text-amber-600">({u.stats.pendingReviewLists} 待重背)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{u.stats.masteredWords}</td>
                <td className="px-4 py-3 text-gray-600">{u.stats.debtMinutes} 分钟</td>
                <td className="px-4 py-3">
                  {u.status === 'active'
                    ? <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">正常</span>
                    : <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">已禁用</span>}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.id !== me?.id && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busyId === u.id}
                        className="px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                      >
                        重置密码
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={busyId === u.id}
                        className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 disabled:opacity-50 ${
                          u.status === 'active'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {u.status === 'active' ? <Ban className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {u.status === 'active' ? '禁用' : '启用'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">共 {users.length} 个账号 · 重置密码会使该用户所有会话立即失效</p>
    </div>
  );
}
