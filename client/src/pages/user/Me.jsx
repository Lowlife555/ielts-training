import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTouch } from '../../context/TouchContext';
import { useApp } from '../../context/AppContext';
import { Shield, Sun, Moon, Smartphone, Monitor, LogOut, Check, FlaskConical, Settings as SettingsIcon } from 'lucide-react';

export default function Me() {
  const { user, logout } = useAuth();
  const { showToast } = useApp();
  const { theme, toggle: toggleTheme } = useTheme();
  const { mode, setMode } = useTouch();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      showToast('已退出登录', 'info');
      navigate('/login', { replace: true });
    } catch {
      setLoggingOut(false);
    }
  };

  const Row = ({ icon, label, children }) => (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <span className="flex items-center gap-2.5 text-sm text-gray-700">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );

  const Segment = ({ value, options }) => (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => { if (mode !== o.value) { setMode(o.value); showToast(o.label, 'info'); } }}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === o.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 用户卡片 */}
      <div className="card mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
          {user?.username?.slice(0, 1).toUpperCase()}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{user?.username}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          {user?.isAdmin && (
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded">管理员</span>
          )}
          {user?.isTest && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">测试账号</span>
          )}
        </div>
        {user?.isAdmin && (
          <Link
            to="/admin"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium"
          >
            <Shield className="w-4 h-4" /> 进入管理面板
          </Link>
        )}
      </div>

      {/* 设置 */}
      <div className="card mb-4 p-0 overflow-hidden">
        <Row icon={<Sun className="w-4 h-4 text-amber-500" />} label="深色模式">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            {theme === 'dark' ? '已开启' : '已关闭'}
          </button>
        </Row>

        <Row icon={<Smartphone className="w-4 h-4 text-green-600" />} label="界面模式">
          <Segment
            options={[
              { value: 'auto', label: '自动' },
              { value: 'touch', label: '触屏' },
              { value: 'desktop', label: '桌面' },
            ]}
          />
        </Row>

        <Row icon={<Check className="w-4 h-4 text-green-600" />} label="触屏交互说明">
          <span className="text-xs text-gray-400">
            左右滑动词卡 · 右上角可切回桌面模式
          </span>
        </Row>

        <Row icon={<Monitor className="w-4 h-4 text-indigo-600" />} label="版本">
          <span className="text-xs text-gray-400">v7.2</span>
        </Row>

        <Link
          to="/settings"
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm text-gray-700">
            <SettingsIcon className="w-4 h-4 text-gray-500" />
            设置
          </span>
          <span className="text-xs text-gray-400">读音/音标/番茄钟 →</span>
        </Link>
      </div>

      {/* 退出 */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? '退出中...' : '退出登录'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-4">
        {user?.isTest ? <span className="inline-flex items-center gap-1"><FlaskConical className="w-3 h-3" /> 测试账号：无惩罚机制</span> : 'IELTS Prep · 每日进步一点点'}
      </p>
    </div>
  );
}
