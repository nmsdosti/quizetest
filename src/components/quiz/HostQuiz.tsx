import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Users, Clock, Copy, ArrowRight } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../auth/VercelAuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface Quiz {
  id: string;
  title: string;
  description: string;
  created_at: string;
  question_count?: number;
}

const HostQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
  const [gamePin, setGamePin] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);

      // Get all quizzes created by the user
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (quizzesError) throw quizzesError;

      // For each quiz, count the number of questions
      const quizzesWithQuestionCount = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          const { count, error } = await supabase
            .from("questions")
            .select("*", { count: "exact" })
            .eq("quiz_id", quiz.id);

          return {
            ...quiz,
            question_count: count || 0,
          };
        }),
      );

      setQuizzes(quizzesWithQuestionCount);
    } catch (error: any) {
      toast({
        title: "Error loading quizzes",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!selectedQuiz) {
      toast({
        title: "No quiz selected",
        description: "Please select a quiz to host",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate a random 6-digit game PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      // Create a new game session
      const { data, error } = await supabase
        .from("game_sessions")
        .insert({
          quiz_id: selectedQuiz,
          host_id: user?.id,
          game_pin: pin,
          status: "waiting", // waiting, active, completed
        })
        .select();

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Failed to create game session");

      setGamePin(pin);

      // Navigate to the game lobby
      navigate(`/game/${data[0].id}`);
    } catch (error: any) {
      toast({
        title: "Error starting game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const copyGamePin = () => {
    if (gamePin) {
      navigator.clipboard.writeText(gamePin);
      toast({
        title: "Game PIN copied",
        description: "Share this PIN with participants",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Host a Quiz</h1>
          <Button
            onClick={() => navigate("/create")}
            className="bg-[#46178F] hover:bg-[#3b1277] gap-2"
          >
            Create New Quiz
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-[#46178F] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-[#46178F]/20 animate-pulse" />
              </div>
            </div>
          </div>
        ) : gamePin ? (
          <Card className="bg-white shadow-sm border-gray-100 text-center p-8">
            <div className="max-w-md mx-auto">
              <div className="mb-6 bg-[#46178F] text-white p-6 rounded-xl">
                <h2 className="text-2xl font-bold mb-2">Game PIN</h2>
                <div className="text-5xl font-bold tracking-wider mb-4">
                  {gamePin}
                </div>
                <Button
                  onClick={copyGamePin}
                  variant="outline"
                  className="bg-white/20 border-white text-white hover:bg-white/30 gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy PIN
                </Button>
              </div>
              <p className="text-lg mb-6">
                Share this PIN with participants. They can join at{" "}
                <span className="font-bold">quizmaster.com</span> or through the
                app.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate(`/game/${selectedQuiz}`)}
                  className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
                >
                  Continue to Lobby
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Card>
        ) : quizzes.length === 0 ? (
          <Card className="bg-white shadow-sm border-gray-100 p-8 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">No Quizzes Found</h2>
              <p className="text-gray-600 mb-6">
                You haven't created any quizzes yet. Create your first quiz to
                get started!
              </p>
              <Button
                onClick={() => navigate("/create")}
                className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
              >
                Create Your First Quiz
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className={`bg-white shadow-sm border-2 cursor-pointer transition-all ${selectedQuiz === quiz.id ? "border-[#46178F]" : "border-gray-100 hover:border-gray-300"}`}
                  onClick={() => setSelectedQuiz(quiz.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {quiz.description || "No description"}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{quiz.question_count} questions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={startGame}
                disabled={!selectedQuiz}
                className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto disabled:opacity-50"
              >
                <Play className="h-5 w-5" />
                Start Game
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HostQuiz;
