import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, BookOpen, PenLine, BarChart3, Search, LogOut, Shield, Sun, Moon, Smartphone, HelpCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useTouch } from '../../context/TouchContext';

// 环境徽标：本地(laptop)=浅黄，服务器(server)=浅灰
const IS_SERVER = !['localhost', '127.0.0.1'].includes(window.location.hostname);

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showToast, dispatch } = useApp();
  const { theme, toggle } = useTheme();
  const { mode, setMode } = useTouch();
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'bg-indigo-100 text-indigo-700'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  useEffect(() => {
    document.title = `IELTS Prep · ${IS_SERVER ? 'server' : 'laptop'}`;
  }, []);

  // Listen for '/' key to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/words?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('已退出登录', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-bold text-indigo-600 flex items-center gap-1">
              <BookOpen className="w-6 h-6" />
              IELTS Prep
            </span>
            {/* 环境徽标：server=浅灰，laptop=浅黄 */}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                IS_SERVER ? 'bg-gray-200 text-gray-500' : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              {IS_SERVER ? 'server' : 'laptop'}
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder={isTouch ? '搜索单词...' : '搜索单词... (按 / 快速聚焦)'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              to="/daily" aria-label="每日训练"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/daily')}`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">每日训练</span>
            </Link>
            <Link
              to="/words" aria-label="背单词"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/words')}`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">背单词</span>
            </Link>
            <Link
              to="/writing" aria-label="写作"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/writing')}`}
            >
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">写作</span>
            </Link>
            <Link
              to="/history" aria-label="历史记录"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/history')}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">历史</span>
            </Link>

            {/* 用户区 */}
            <div className="ml-2 pl-3 border-l border-gray-200 flex items-center gap-1">
              {user?.isAdmin && (
                <Link
                  to="/admin" aria-label="管理"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/admin')}`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden lg:inline">管理</span>
                </Link>
              )}
              <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-[100px] truncate">
                {user?.username}
              </span>
              {/* 操作帮助：触屏点这里打开指引（桌面按 ? 也可） */}
              <button
                onClick={() => dispatch({ type: 'TOGGLE_KEYBOARD_HELP' })}
                aria-label="操作帮助"
                title="操作帮助"
                className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              {/* 界面模式切换：桌面 ↔ 触屏（手动覆盖自动检测） */}
              <button
                onClick={() => {
                  const next = mode === 'touch' ? 'desktop' : 'touch';
                  setMode(next);
                  showToast(next === 'touch' ? '已切换为触屏模式（底部导航）' : '已切换为桌面模式', 'info');
                }}
                aria-label="切换界面模式"
                title={mode === 'touch' ? '切换到桌面模式' : '切换到触屏模式'}
                className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
              >
                <Smartphone className="w-4 h-4" />
              </button>
              {/* 深色/浅色切换：浅色显示月亮，深色显示太阳 */}
              <button
                onClick={toggle}
                aria-label="切换深浅色模式"
                title={theme === 'dark' ? '切换到浅色模式' : '切换到暗黑模式'}
                className="flex items-center px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                aria-label="退出登录"
                title="退出登录"
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
