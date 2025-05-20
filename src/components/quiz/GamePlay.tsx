import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Award } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../auth/VercelAuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface Question {
  id: string;
  text: string;
  time_limit: number;
  options: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
}

interface Player {
  id: string;
  name: string;
  score: number;
  avatar: string;
}

const GamePlay = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameSession, setGameSession] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 means not started
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchGameData();
      subscribeToAnswers();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId]);

  const fetchGameData = async () => {
    try {
      setLoading(true);

      // Get the game session
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error("Game session not found");

      // Check if the current user is the host
      if (sessionData.host_id !== user?.id) {
        toast({
          title: "Access denied",
          description: "You are not the host of this game",
          variant: "destructive",
        });
        navigate("/host");
        return;
      }

      setGameSession(sessionData);

      // Get the quiz details
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", sessionData.quiz_id)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Get all questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", sessionData.quiz_id)
        .order("id", { ascending: true });

      if (questionsError) throw questionsError;

      // For each question, get its options
      const questionsWithOptions = await Promise.all(
        (questionsData || []).map(async (question) => {
          const { data: optionsData, error: optionsError } = await supabase
            .from("options")
            .select("*")
            .eq("question_id", question.id);

          if (optionsError) throw optionsError;

          return {
            ...question,
            options: optionsData || [],
          };
        }),
      );

      setQuestions(questionsWithOptions);

      // Get the players who have joined
      const { data: playersData, error: playersError } = await supabase
        .from("game_players")
        .select("*")
        .eq("session_id", sessionId);

      if (playersError) throw playersError;

      const formattedPlayers = (playersData || []).map((player) => ({
        id: player.id,
        name: player.player_name,
        score: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.player_name}`,
      }));

      setPlayers(formattedPlayers);

      // If the game is already in progress, get the current question index
      if (sessionData.current_question_index !== null) {
        setCurrentQuestionIndex(sessionData.current_question_index);

        // If there's an active question, start the timer
        if (
          sessionData.current_question_index >= 0 &&
          sessionData.current_question_index < questionsWithOptions.length
        ) {
          const question =
            questionsWithOptions[sessionData.current_question_index];
          startTimer(question.time_limit);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      navigate("/host");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToAnswers = () => {
    const subscription = supabase
      .channel("game_answers_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const answer = payload.new;

          // Update the player's score if the answer is correct
          if (answer.is_correct) {
            setPlayers((current) =>
              current.map((player) =>
                player.id === answer.player_id
                  ? {
                      ...player,
                      score: player.score + calculateScore(timeLeft),
                    }
                  : player,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const calculateScore = (secondsLeft: number) => {
    // Base score is 1000, with bonus points for answering quickly
    return 1000 + secondsLeft * 50;
  };

  const startTimer = (seconds: number) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(seconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, show the results
          clearInterval(timerRef.current!);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = async () => {
    if (questions.length === 0) {
      toast({
        title: "No questions",
        description: "This quiz doesn't have any questions",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update the game session status and current question index
      const { error } = await supabase
        .from("game_sessions")
        .update({
          status: "active",
          current_question_index: 0,
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Start the first question
      setCurrentQuestionIndex(0);
      setShowResults(false);
      startTimer(questions[0].time_limit);
    } catch (error: any) {
      toast({
        title: "Error starting game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const nextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      // End of quiz
      try {
        const { error } = await supabase
          .from("game_sessions")
          .update({
            status: "completed",
            current_question_index: null,
          })
          .eq("id", sessionId);

        if (error) throw error;

        setGameEnded(true);
      } catch (error: any) {
        toast({
          title: "Error ending game",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      // Update the game session with the new question index
      const { error } = await supabase
        .from("game_sessions")
        .update({ current_question_index: nextIndex })
        .eq("id", sessionId);

      if (error) throw error;

      // Show the next question
      setCurrentQuestionIndex(nextIndex);
      setShowResults(false);
      startTimer(questions[nextIndex].time_limit);
    } catch (error: any) {
      toast({
        title: "Error loading next question",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const endGame = () => {
    navigate("/host");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] pt-16 flex items-center justify-center">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-[#46178F] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-[#46178F]/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (gameEnded) {
    // Sort players by score (highest first)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen bg-[#f5f5f7] pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Game Over!
            </h1>
            <p className="text-xl text-gray-600">{quiz?.title}</p>
          </div>

          <Card className="bg-white shadow-sm border-gray-100 p-8 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-[#FFD700]/20 mb-4">
                <Award className="h-10 w-10 text-[#FFD700]" />
              </div>
              <h2 className="text-3xl font-bold mb-1">Final Results</h2>
              <p className="text-gray-600">{players.length} players</p>
            </div>

            <div className="space-y-4 max-w-lg mx-auto">
              {sortedPlayers.map((player, index) => {
                let medalColor = "";
                if (index === 0)
                  medalColor = "bg-[#FFD700] text-white"; // Gold
                else if (index === 1)
                  medalColor = "bg-[#C0C0C0] text-white"; // Silver
                else if (index === 2) medalColor = "bg-[#CD7F32] text-white"; // Bronze

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 font-bold ${medalColor || "bg-gray-200"}`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex items-center">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <span className="font-medium">{player.name}</span>
                      </div>
                    </div>
                    <span className="font-bold">
                      {player.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-center">
            <Button
              onClick={endGame}
              className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
            >
              Back to Host Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (currentQuestionIndex === -1) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] pt-16 pb-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {quiz?.title}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {questions.length} questions
          </p>

          <Card className="bg-white shadow-sm border-gray-100 p-8 mb-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
              <p className="text-gray-600 mb-6">
                {players.length}{" "}
                {players.length === 1 ? "player has" : "players have"} joined.
              </p>
              <Button
                onClick={startGame}
                className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
              >
                Start Game
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Question {questionNumber} of {totalQuestions}
            </h2>
          </div>
          <div className="text-2xl font-bold text-[#46178F]">{timeLeft}s</div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full mb-6">
          <div
            className="h-2 bg-[#46178F] rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {showResults ? (
          <div>
            <Card className="bg-white shadow-sm border-gray-100 p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6 text-center">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const colors = [
                    option.is_correct ? "bg-[#00C985]" : "bg-[#FF3355]", // Red or Green if correct
                    option.is_correct ? "bg-[#00C985]" : "bg-[#FF3355]", // Red or Green if correct
                    option.is_correct ? "bg-[#00C985]" : "bg-[#FF3355]", // Red or Green if correct
                    option.is_correct ? "bg-[#00C985]" : "bg-[#FF3355]", // Red or Green if correct
                  ];
                  return (
                    <div
                      key={option.id}
                      className={`p-6 rounded-xl ${colors[index]} text-white flex items-center justify-center`}
                    >
                      <span className="text-lg font-medium">{option.text}</span>
                      {option.is_correct && (
                        <span className="ml-2 text-sm bg-white text-[#00C985] px-2 py-1 rounded-full">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={nextQuestion}
                  className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="h-5 w-5" />
                    </>
                  ) : (
                    "See Final Results"
                  )}
                </Button>
              </div>
            </Card>

            <Card className="bg-white shadow-sm border-gray-100 p-6">
              <h3 className="text-xl font-bold mb-4">Leaderboard</h3>

              <div className="space-y-3">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="bg-gray-200 h-6 w-6 rounded-full flex items-center justify-center mr-3 text-gray-700 font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{player.name}</span>
                      </div>
                      <span className="font-bold">
                        {player.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card className="bg-white shadow-sm border-gray-100 p-8 text-center">
            <h2 className="text-3xl font-bold mb-8">{currentQuestion.text}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentQuestion.options.map((option, index) => {
                const colors = [
                  "bg-[#FF3355]", // Red
                  "bg-[#00C985]", // Green
                  "bg-[#0086FF]", // Blue
                  "bg-[#FFC400]", // Yellow
                ];
                return (
                  <div
                    key={option.id}
                    className={`p-8 rounded-xl ${colors[index]} text-white flex items-center justify-center`}
                  >
                    <span className="text-xl font-medium">{option.text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GamePlay;
