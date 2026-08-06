import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import KeyboardHelp from './components/KeyboardHelp';
import FirstVisitHint from './components/FirstVisitHint';

// Pages
import Home from './pages/Home';
import Topics from './pages/Topics';
import WordList from './pages/WordList';
import WordStudy from './pages/WordStudy';
import SpellingTest from './pages/SpellingTest';
import ReviewWords from './pages/ReviewWords';
import WrongWords from './pages/WrongWords';
import WritingQuestions from './pages/WritingQuestions';
import WritingEditor from './pages/WritingEditor';
import WritingResult from './pages/WritingResult';
import History from './pages/History';
import DailySetup from './pages/DailySetup';
import DailyFlashcards from './pages/DailyFlashcards';
import DailyQuiz from './pages/DailyQuiz';
import DailyCorrection from './pages/DailyCorrection';
import DailyReport from './pages/DailyReport';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Toast />
            <KeyboardHelp />
            <FirstVisitHint />
            <main className="pb-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/words" element={<Topics />} />
                <Route path="/words/:topic" element={<WordList />} />
                <Route path="/words/:topic/study" element={<WordStudy />} />
                <Route path="/spelling-test" element={<SpellingTest />} />
                <Route path="/review-words" element={<ReviewWords />} />
                <Route path="/wrong-words" element={<WrongWords />} />
                <Route path="/writing" element={<WritingQuestions />} />
                <Route path="/writing/:id" element={<WritingEditor />} />
                <Route path="/writing/result/:id" element={<WritingResult />} />
                <Route path="/history" element={<History />} />
                <Route path="/daily" element={<DailySetup />} />
                <Route path="/daily/flashcards" element={<DailyFlashcards />} />
                <Route path="/daily/quiz" element={<DailyQuiz />} />
                <Route path="/daily/correction" element={<DailyCorrection />} />
                <Route path="/daily/report" element={<DailyReport />} />
              </Routes>
            </main>
          </div>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
