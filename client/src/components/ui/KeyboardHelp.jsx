import { useApp } from '../../context/AppContext';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useTouch } from '../../context/TouchContext';
import { X } from 'lucide-react';

export default function KeyboardHelp() {
  const { state, dispatch } = useApp();
  const { isTouch } = useTouch();

  useKeyboard({
    '?': () => dispatch({ type: 'TOGGLE_KEYBOARD_HELP' }),
    'Escape': () => state.keyboardHelpVisible && dispatch({ type: 'HIDE_KEYBOARD_HELP' }),
  });

  if (!state.keyboardHelpVisible) return null;

  const shortcuts = [
    { section: '全局快捷键', items: [
      { key: '?', desc: '显示/隐藏此帮助面板' },
      { key: '/', desc: '聚焦搜索框' },
      { key: 'Esc', desc: '关闭弹窗 / 返回上级' },
    ]},
    { section: '单词学习', items: [
      { key: 'Enter', desc: '学习模式：下一个单词' },
      { key: 'Space', desc: '朗读当前单词' },
      { key: '← →', desc: '上一个/下一个单词' },
      { key: '1 2 3 4', desc: '选择题：快速选择选项' },
    ]},
    { section: '拼写测试', items: [
      { key: 'Enter', desc: '提交拼写 → 自动下一题' },
      { key: 'Esc', desc: '结束测试，返回列表' },
    ]},
    { section: '写作模块', items: [
      { key: 'Ctrl+Enter', desc: '提交作文（二次确认）' },
      { key: 'Tab', desc: '插入2空格缩进' },
      { key: 'Ctrl+S', desc: '保存草稿到本地' },
      { key: 'Esc', desc: '返回选题页' },
    ]},
  ];

  const touchGuide = [
    { section: '全局操作', items: [
      { gesture: '点返回箭头', desc: '返回上一页' },
      { gesture: '底部标签栏', desc: '首页 / 单词 / 写作 / 我的' },
      { gesture: '右上角 ⓘ 按钮', desc: '打开本帮助' },
      { gesture: '右上角 电脑 按钮', desc: '随时切回桌面模式' },
      { gesture: '我的 → 设置', desc: '深色模式 / 界面模式（自动·触屏·桌面）' },
    ]},
    { section: '单词学习', items: [
      { gesture: '点卡片', desc: '显示释义（已显示时点击无操作，不会跳题）' },
      { gesture: '左右滑动', desc: '会（右滑）/ 不会（左滑）' },
      { gesture: '点🔊', desc: '朗读单词' },
      { gesture: '点绿色/红色按钮', desc: '认识 / 不认识' },
    ]},
    { section: '拼写测试', items: [
      { gesture: '输入后点提交', desc: '提交拼写 → 自动下一题' },
      { gesture: '左上返回', desc: '结束测试' },
    ]},
    { section: '写作模块', items: [
      { gesture: '点提交作文', desc: '交卷批改' },
      { gesture: '自动保存', desc: '草稿随时保存，可放心退出' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 animate-fade-in"
         onClick={() => dispatch({ type: 'HIDE_KEYBOARD_HELP' })}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            <span className="kbd-hint">⌨️ 快捷键一览</span>
            <span className="touch-hint hidden">👆 触屏操作指引</span>
          </h2>
          <button
            onClick={() => dispatch({ type: 'HIDE_KEYBOARD_HELP' })}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {isTouch ? (
            touchGuide.map((section) => (
              <div key={section.section}>
                <h3 className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wide">
                  {section.section}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.gesture} className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-gray-700 shrink-0">{item.gesture}</span>
                      <span className="text-sm text-gray-500 text-right">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            shortcuts.map((section) => (
              <div key={section.section}>
                <h3 className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wide">
                  {section.section}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.desc}</span>
                      <kbd className="px-2.5 py-1 bg-gray-100 border border-gray-300 rounded-md text-xs font-mono font-medium text-gray-700 shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 text-center">
            <span className="kbd-hint">按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> 随时打开此面板 · 按 <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Esc</kbd> 关闭</span>
            <span className="touch-hint hidden">点右上角 × 关闭</span>
          </p>
        </div>
      </div>
    </div>
  );
}
