import { useState, useRef, useCallback } from 'react';

/**
 * 「错词重测」状态机（中文默写 / 拼写验收共用）。
 *
 * 抽取 ListDictation / AcceptanceTest 几乎逐行相同的核心：
 *   当前词、输入、反馈、首试/最终成绩记录、答错词进入下一轮重测直到全对。
 *
 * @param {Object} opts
 *   judge(input, word) -> boolean        判分函数
 *   onAnswer(word, isCorrect, answer)    每次作答的副作用（如保存进度）
 *   onComplete(results)                  全部通过时回调
 *   delay                                 反馈停留时长（默认 800ms）
 */
export function useDictationSession({ judge, onAnswer, onComplete, delay = 800 }) {
  const [words, setWords] = useState([]);
  const [round, setRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const roundPassedRef = useRef(new Set());
  const resultsRef = useRef([]);

  const start = useCallback((ws) => {
    setWords(ws);
    setRound(1);
    setCurrentIndex(0);
    setUserInput('');
    setFeedback(null);
    roundPassedRef.current = new Set();
    resultsRef.current = [];
    setResults([]);
  }, []);

  const currentWord = words[currentIndex];

  const submit = useCallback(() => {
    if (feedback || !userInput.trim() || !currentWord) return;
    const wid = currentWord.id ?? currentWord.wordId;
    const isCorrect = judge(userInput, currentWord);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) roundPassedRef.current.add(wid);

    // 记录首试/最终成绩
    const answer = userInput.trim();
    const prev = resultsRef.current;
    const idx = prev.findIndex((r) => r.wordId === wid);
    let next;
    if (idx === -1) {
      next = [...prev, { wordId: wid, correct: isCorrect, firstTry: isCorrect, answer }];
    } else if (isCorrect) {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], correct: true, answer };
      next = copy;
    } else {
      next = prev;
    }
    resultsRef.current = next;
    setResults(next);
    onAnswer?.(currentWord, isCorrect, answer);

    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        const retry = words.filter((w) => !roundPassedRef.current.has(w.id ?? w.wordId));
        if (retry.length > 0) {
          setWords(retry);
          setRound((r) => r + 1);
          setCurrentIndex(0);
          setUserInput('');
          setFeedback(null);
        } else {
          onComplete?.(resultsRef.current);
        }
      } else {
        setCurrentIndex((i) => i + 1);
        setUserInput('');
        setFeedback(null);
      }
    }, delay);
  }, [feedback, userInput, currentWord, currentIndex, words, judge, onAnswer, onComplete, delay]);

  return {
    words, round, currentIndex, currentWord,
    userInput, setUserInput, feedback, results,
    start, submit,
  };
}
