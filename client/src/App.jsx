import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTouch } from './context/TouchContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import MobileTabBar from './components/layout/MobileTabBar';
import Toast from './components/ui/Toast';
import KeyboardHelp from './components/ui/KeyboardHelp';
import FirstVisitHint from './components/training/FirstVisitHint';

// Pages
import Home from './pages/misc/Home';
import Topics from './pages/words/Topics';
import WordList from './pages/words/WordList';
import WordStudy from './pages/words/WordStudy';
import SpellingTest from './pages/words/SpellingTest';
import ReviewWords from './pages/words/ReviewWords';
import WrongWords from './pages/words/WrongWords';
import WritingQuestions from './pages/writing/WritingQuestions';
import WritingEditor from './pages/writing/WritingEditor';
import WritingResult from './pages/writing/WritingResult';
import History from './pages/writing/History';
import TodayBriefing from './pages/daily/TodayBriefing';
import PetWarmup from './pages/daily/PetWarmup';
import MainStudy from './pages/daily/MainStudy';
import SpellingPractice from './pages/daily/SpellingPractice';
import AcceptanceTest from './pages/daily/AcceptanceTest';
import SpotCheck from './pages/daily/SpotCheck';
import DailyReport from './pages/daily/DailyReport';
import SpeechDiagnostic from './pages/misc/SpeechDiagnostic';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import Admin from './pages/user/Admin';
import Me from './pages/user/Me';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Layout />
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function Layout() {
  const { isTouch } = useTouch();

  return (
    <div className="min-h-screen bg-gray-50">
      {!isTouch && <Navbar />}
      <Toast />
      <KeyboardHelp />
      <FirstVisitHint />
      <main className={isTouch ? 'pb-24 pt-2' : 'pb-16'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/words" element={<RequireAuth><Topics /></RequireAuth>} />
          <Route path="/words/:topic" element={<RequireAuth><WordList /></RequireAuth>} />
          <Route path="/words/:topic/study" element={<RequireAuth><WordStudy /></RequireAuth>} />
          <Route path="/spelling-test" element={<RequireAuth><SpellingTest /></RequireAuth>} />
          <Route path="/review-words" element={<RequireAuth><ReviewWords /></RequireAuth>} />
          <Route path="/wrong-words" element={<RequireAuth><WrongWords /></RequireAuth>} />
          <Route path="/writing" element={<RequireAuth><WritingQuestions /></RequireAuth>} />
          <Route path="/writing/:id" element={<RequireAuth><WritingEditor /></RequireAuth>} />
          <Route path="/writing/result/:id" element={<RequireAuth><WritingResult /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
          <Route path="/daily" element={<RequireAuth><TodayBriefing /></RequireAuth>} />
          <Route path="/daily/warmup" element={<RequireAuth><PetWarmup /></RequireAuth>} />
          <Route path="/daily/study" element={<RequireAuth><MainStudy /></RequireAuth>} />
          <Route path="/daily/spotcheck" element={<RequireAuth><SpotCheck /></RequireAuth>} />
          <Route path="/daily/spelling" element={<RequireAuth><SpellingPractice /></RequireAuth>} />
          <Route path="/daily/acceptance" element={<RequireAuth><AcceptanceTest /></RequireAuth>} />
          <Route path="/daily/report" element={<RequireAuth><DailyReport /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/me" element={<RequireAuth><Me /></RequireAuth>} />
          <Route path="/speech-test" element={<RequireAuth><SpeechDiagnostic /></RequireAuth>} />
        </Routes>
      </main>
      {isTouch && <MobileTabBar />}
    </div>
  );
}
