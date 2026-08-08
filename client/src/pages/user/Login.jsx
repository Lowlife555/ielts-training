import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { BookOpen } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      showToast(`欢迎回来，${user.username}`, 'success');
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
            <h1 className="text-2xl font-bold text-gray-900">登录</h1>
            <p className="text-sm text-gray-400 mt-1">IELTS 备考训练营</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="你的用户名"
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
                placeholder="你的密码"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-5 text-center">
            还没有账号？<Link to="/register" className="text-indigo-600 hover:underline">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
