import { Suspense } from "react";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import Success from "./components/pages/success";
import Home from "./components/pages/home";
import CreateQuiz from "./components/quiz/CreateQuiz";
import HostQuiz from "./components/quiz/HostQuiz";
import GameLobby from "./components/quiz/GameLobby";
import GamePlay from "./components/quiz/GamePlay";
import JoinGame from "./components/quiz/JoinGame";
import PlayerGame from "./components/quiz/PlayerGame";
import { AuthProvider, useAuth } from "./components/auth/VercelAuthProvider";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen, LoadingSpinner } from "./components/ui/loading-spinner";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  // For the tempo routes
  if (import.meta.env.VITE_TEMPO === "true") {
    useRoutes(routes);
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/success" element={<Success />} />

        {/* Quiz Creator Routes */}
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <CreateQuiz />
            </PrivateRoute>
          }
        />
        <Route
          path="/host"
          element={
            <PrivateRoute>
              <HostQuiz />
            </PrivateRoute>
          }
        />
        <Route
          path="/game/:sessionId"
          element={
            <PrivateRoute>
              <GameLobby />
            </PrivateRoute>
          }
        />
        <Route
          path="/game/:sessionId/play"
          element={
            <PrivateRoute>
              <GamePlay />
            </PrivateRoute>
          }
        />

        {/* Player Routes */}
        <Route path="/join" element={<JoinGame />} />
        <Route path="/play/:sessionId/:playerId" element={<PlayerGame />} />

        {/* Add this before the catchall route for tempo */}
        {import.meta.env.VITE_TEMPO === "true" && <Route path="/tempobook/*" />}
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen text="Loading application..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
