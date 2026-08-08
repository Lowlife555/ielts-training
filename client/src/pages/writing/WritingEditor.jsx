import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useApp } from '../../context/AppContext';
import Loading from '../../components/ui/Loading';
import { ArrowLeft, Clock, Send, Save, AlertTriangle } from 'lucide-react';

export default function WritingEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const [question, setQuestion] = useState(null);
  const [essayText, setEssayText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const textareaRef = useRef(null);

  // Load question
  useEffect(() => {
    api.getWritingQuestion(id)
      .then(setQuestion)
      .finally(() => setLoading(false));
  }, [id]);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`essay_draft_${id}`);
    if (draft) {
      setEssayText(draft);
      showToast('已加载本地草稿', 'info');
    }
  }, [id]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!essayText.trim()) return;
    const autoSave = setInterval(() => {
      localStorage.setItem(`essay_draft_${id}`, essayText);
    }, 30000);
    return () => clearInterval(autoSave);
  }, [essayText, id]);

  // Word count
  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const saveDraft = useCallback(() => {
    localStorage.setItem(`essay_draft_${id}`, essayText);
    showToast('草稿已保存', 'success');
  }, [essayText, id, showToast]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    if (!essayText.trim()) {
      showToast('请先输入作文内容', 'error');
      return;
    }

    if (wordCount < (question?.word_limit_min || 150)) {
      showToast(`字数不足，至少需要${question?.word_limit_min || 150}字`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.submitEssay({
        questionId: parseInt(id),
        essayText: essayText.trim(),
      });

      // Clear draft
      localStorage.removeItem(`essay_draft_${id}`);

      showToast('批改完成！', 'success');
      navigate(`/writing/result/${result.id}`);
    } catch (err) {
      showToast(`提交失败: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [essayText, wordCount, question, id, navigate, showToast, submitting]);

  // Keyboard shortcuts
  useKeyboard({
    'Escape': () => {
      if (showConfirm) {
        setShowConfirm(false);
      } else {
        saveDraft();
        navigate(-1);
      }
    },
  }, true, [showConfirm, saveDraft, navigate]);

  // Handle keydown in textarea
  const handleTextareaKeyDown = (e) => {
    // Tab: insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newText = essayText.substring(0, start) + '  ' + essayText.substring(end);
      setEssayText(newText);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
      return;
    }

    // Ctrl+S: Save draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveDraft();
      return;
    }

    // Ctrl+Enter: Submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setShowConfirm(true);
      return;
    }
  };

  // Auto-focus
  useEffect(() => {
    if (!loading && question) {
      textareaRef.current?.focus();
    }
  }, [loading, question]);

  if (loading) return <Loading text="加载题目..." />;
  if (!question) return <div className="text-center py-20 text-gray-500">题目不存在</div>;

  const minWords = question.word_limit_min || 250;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/writing" className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          返回选题
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </span>
          <span className={wordCount < minWords ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
            {wordCount} 字
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Question panel */}
        <div className="card h-fit lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              question.task_type === 'task1' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {question.task_type === 'task1' ? 'Task 1' : 'Task 2'}
            </span>
            <span className="text-xs text-gray-400">{question.source}</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{question.question_text}</h2>
          <div className="text-sm text-gray-500">
            最低字数：<span className="font-semibold">{question.word_limit_min}</span> 字
          </div>
        </div>

        {/* Editor panel */}
        <div className="card">
          <textarea
            ref={textareaRef}
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="在此输入你的作文...&#10;&#10;提示：&#10;• Ctrl+Enter 提交作文&#10;• Tab 插入缩进&#10;• Ctrl+S 保存草稿"
            className="w-full min-h-[400px] p-4 border border-gray-200 rounded-lg text-sm leading-relaxed
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     resize-y font-mono"
            spellCheck="true"
          />

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              <button onClick={saveDraft} className="btn-secondary flex items-center gap-1 text-sm">
                <Save className="w-4 h-4" />
                保存草稿
              </button>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting || !essayText.trim()}
              className="btn-primary flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              {submitting ? '批改中...' : '提交批改'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">确认提交</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              提交后AI将立即批改你的作文。字数: <span className={wordCount < minWords ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>{wordCount}</span>
            </p>
            {wordCount < minWords && (
              <p className="text-sm text-red-500 mb-4">⚠️ 字数不足最低要求 ({minWords}字)</p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary">取消</button>
              <button onClick={handleSubmit} className="btn-primary" disabled={submitting}>
                {submitting ? '提交中...' : '确认提交 (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <p className="text-center text-xs text-gray-400 mt-6 space-x-4">
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+Enter</kbd> 提交</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Tab</kbd> 缩进</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Ctrl+S</kbd> 保存草稿</span>
        <span className="kbd-hint"><kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded">Esc</kbd> 返回</span>
        <span className="touch-hint hidden">点「提交作文」交卷 · 自动保存草稿</span>
      </p>
    </div>
  );
}
