import { Loader2 } from 'lucide-react';

export default function Loading({ text = '加载中...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="mt-4 text-sm text-gray-500">{text}</p>
    </div>
  );
}
