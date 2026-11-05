import { useState, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { MandatorySurveyProvider, useMandatorySurvey } from './context/MandatorySurveyContext';
import Header from './components/Header';
import Footer from './components/Footer';
import LoadingPage from './components/LoadingPage';
import ChatButton from './components/ChatButton';
import MandatorySurveyOverlay from './components/MandatorySurveyOverlay';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Blog from './pages/Blog';
import CreatePost from './pages/CreatePost';
import EditArticle from './pages/EditArticle';
import Article from './pages/Article';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import Event from './pages/Event';
import Economy from './pages/Economy';
import Resources from './pages/Resources';
import Entrepreneurs from './pages/Entrepreneurs';
import Contact from './pages/Contact';
import Questionnaire from './pages/Questionnaire';
import QuestionnaireFill from './pages/QuestionnaireFill';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';
import TwoFactorVerify from './pages/TwoFactorVerify';
import TwoFactorAuth from './pages/TwoFactorAuth';
import Account from './pages/Account';
import Admin from './pages/Admin';
import Legal from './pages/Legal';
import Chatbot from './pages/Chatbot';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import { authService } from './services';
import VisitTracker from './components/VisitTracker';

// Styles
import './styles/index.css';

/** Periodically validates session; clears storage on deleted/deactivated account (via API 401 + codes). */
function SessionValidator() {
  useEffect(() => {
    const validate = async () => {
      if (authService.needsQuestionnaireCompletion()) return;
      if (!authService.isAuthenticated()) return;
      try {
        await authService.getProfile();
      } catch {
        // api.js may have redirected after clearing session
      }
    };

    const interval = setInterval(validate, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') validate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <>
      {isLoading && <LoadingPage onLoadingComplete={handleLoadingComplete} />}
      {!isLoading && (
        <ThemeProvider>
          <Router>
            <MandatorySurveyProvider>
              <SessionValidator />
              <VisitTracker />
              <AppRoutes />
            </MandatorySurveyProvider>
          </Router>
        </ThemeProvider>
      )}
    </>
  );
}

/** Floating chat (dolphinbot) on all routes except admin and full-page chatbot */
/**
 * Chaque nouvelle page s'ouvre en haut (React Router conserve sinon la position de défilement).
 * Exceptions : retour/avance du navigateur (position d'origine) et liens vers une ancre (#section).
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    // Ancre existante (#section) : laisser le navigateur s'y rendre. Une ancre sans élément
    // (ex. /compte#panier qui sélectionne un onglet) repart en haut de page.
    if (hash && document.getElementById(decodeURIComponent(hash.slice(1)))) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash, navigationType]);

  return null;
}

function AppRoutes() {
  const location = useLocation();
  const chatEnabled = import.meta.env.VITE_ENABLE_CHATBOT !== 'false';
  const path = location.pathname;
  const { isMandatoryBlockActive: mandatoryBlock } = useMandatorySurvey();
  const showChatFab =
    chatEnabled &&
    !path.startsWith('/admin') &&
    path !== '/chatbot' &&
    !mandatoryBlock;

  return (
    <>
      <ScrollToTop />
      {showChatFab && <ChatButton />}
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="*" element={<MainLayout />} />
      </Routes>
    </>
  );
}

function MainLayout() {
  return (
    <>
      <Header />

      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/creer" element={<CreatePost />} />
          <Route path="/blog/modifier/:id" element={<EditArticle />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/evenements" element={<Events />} />
          <Route path="/evenements/creer" element={<CreateEvent />} />
          <Route path="/evenements/modifier/:id" element={<EditEvent />} />
          <Route path="/evenement/:idOrSlug" element={<Event />} />
          <Route path="/economies/:type" element={<Economy />} />
          <Route path="/ressources" element={<Resources />} />
          <Route path="/entrepreneurs" element={<Entrepreneurs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/questionnaire/:id" element={<QuestionnaireFill />} />
          <Route path="/questionnaire" element={<Questionnaire />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/complete-profile" element={<CompleteProfile />} />
          <Route path="/auth/2fa" element={<TwoFactorVerify />} />
          <Route path="/compte" element={<Account />} />
          <Route path="/compte/2fa" element={<TwoFactorAuth />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/verifier-email" element={<VerifyEmail />} />
          <Route path="/legal/:page" element={<Legal />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <MandatorySurveyOverlay />
    </>
  );
}

function NotFound() {
  return (
    <section className="section">
      <div className="container text-center">
        <h1 style={{ fontSize: '6rem', color: 'var(--color-primary)' }}>404</h1>
        <h2>Page non trouvée</h2>
        <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          La page que vous recherchez n'existe pas.
        </p>
        <a href="/" className="btn btn--primary">Retour à l'accueil</a>
      </div>
    </section>
  );
}

export default App;
