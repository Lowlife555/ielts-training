import { useLocation, Link } from 'react-router-dom';
import { CalendarDays, BookOpen, PenLine, BarChart3, User } from 'lucide-react';

const tabs = [
  { to: '/daily', label: '训练', icon: CalendarDays },
  { to: '/words', label: '背单词', icon: BookOpen },
  { to: '/writing', label: '写作', icon: PenLine },
  { to: '/history', label: '历史', icon: BarChart3 },
  { to: '/me', label: '我的', icon: User },
];

export default function MobileTabBar() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 dark:bg-slate-800 dark:border-slate-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex max-w-lg mx-auto">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
