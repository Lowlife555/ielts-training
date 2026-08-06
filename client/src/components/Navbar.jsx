import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, PenLine, BarChart3, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
      ? 'bg-indigo-100 text-indigo-700'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

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

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-indigo-600 shrink-0">
            <BookOpen className="w-6 h-6" />
            <span className="hidden sm:inline">IELTS Prep</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="搜索单词... (按 / 快速聚焦)"
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
              to="/daily"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/daily')}`}
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">每日训练</span>
            </Link>
            <Link
              to="/words"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/words')}`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">背单词</span>
            </Link>
            <Link
              to="/writing"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/writing')}`}
            >
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">写作</span>
            </Link>
            <Link
              to="/history"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/history')}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">历史</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
