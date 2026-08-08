import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { BookOpen } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (password !== confirm) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const user = await register(username.trim(), password);
      showToast(user.isAdmin ? '🎉 注册成功！你是第一个用户，已自动成为管理员并继承原有学习数据' : '注册成功！', 'success');
      navigate('/daily', { replace: true });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <div className="flex flex-col items-center mb-6">
            <BookOpen className="w-10 h-10 text-indigo-600 mb-2" />
            <h1 className="text-2xl font-bold text-gray-900">注册账号</h1>
            <p className="text-sm text-gray-400 mt-1">设置用户名和密码即可</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="2-20 位字母/数字/下划线/中文"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="再输入一次密码"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !username || !password || !confirm}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            已有账号？<Link to="/login" className="text-indigo-600 hover:underline">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
