import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import TodayBriefing from './pages/TodayBriefing';
import PetWarmup from './pages/PetWarmup';
import MainStudy from './pages/MainStudy';
import SpellingPractice from './pages/SpellingPractice';
import AcceptanceTest from './pages/AcceptanceTest';
import SpotCheck from './pages/SpotCheck';
import DailyReport from './pages/DailyReport';
import SpeechDiagnostic from './pages/SpeechDiagnostic';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';

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
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <Toast />
              <KeyboardHelp />
              <FirstVisitHint />
              <main className="pb-16">
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
                  <Route path="/speech-test" element={<RequireAuth><SpeechDiagnostic /></RequireAuth>} />
                </Routes>
              </main>
            </div>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
