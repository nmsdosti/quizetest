import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Award, Clock } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useToast } from "@/components/ui/use-toast";

interface Question {
  id: string;
  text: string;
  time_limit: number;
  options: {
    id: string;
    text: string;
  }[];
}

const PlayerGame = () => {
  const { sessionId, playerId } = useParams<{
    sessionId: string;
    playerId: string;
  }>();
  const { toast } = useToast();
  const [gameSession, setGameSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false);

  useEffect(() => {
    if (sessionId && playerId) {
      fetchGameSession();
      subscribeToGameChanges();
    }
  }, [sessionId, playerId]);

  const fetchGameSession = async () => {
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

      setGameSession(sessionData);

      // If the game is completed, show the final results
      if (sessionData.status === "completed") {
        setGameEnded(true);
        await fetchFinalResults();
        return;
      }

      // If the game is active and has a current question
      if (
        sessionData.status === "active" &&
        sessionData.current_question_index !== null
      ) {
        await fetchCurrentQuestion(
          sessionData.quiz_id,
          sessionData.current_question_index,
        );

        // Check if the player has already answered this question
        await checkIfAnswered(sessionData.current_question_index);
      }
    } catch (error: any) {
      toast({
        title: "Error loading game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentQuestion = async (
    quizId: string,
    questionIndex: number,
  ) => {
    try {
      // Get all questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("id", { ascending: true });

      if (questionsError) throw questionsError;
      if (!questionsData || questionIndex >= questionsData.length) return;

      const question = questionsData[questionIndex];

      // Get options for this question (without revealing which is correct)
      const { data: optionsData, error: optionsError } = await supabase
        .from("options")
        .select("id, text")
        .eq("question_id", question.id);

      if (optionsError) throw optionsError;

      setCurrentQuestion({
        ...question,
        options: optionsData || [],
      });

      setTimeLeft(question.time_limit);
      setWaitingForNextQuestion(false);

      // Start a timer to count down
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } catch (error: any) {
      toast({
        title: "Error loading question",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const checkIfAnswered = async (questionIndex: number) => {
    try {
      const { data, error } = await supabase
        .from("game_answers")
        .select("*")
        .eq("session_id", sessionId)
        .eq("player_id", playerId)
        .eq("question_index", questionIndex)
        .single();

      if (!error && data) {
        setAnswerSubmitted(true);
        setSelectedOption(data.option_id);
      } else {
        setAnswerSubmitted(false);
        setSelectedOption(null);
      }
    } catch (error) {
      // If no answer found, that's fine
      setAnswerSubmitted(false);
      setSelectedOption(null);
    }
  };

  const fetchFinalResults = async () => {
    try {
      // Get all players and their scores
      const { data: playersData, error: playersError } = await supabase
        .from("game_players")
        .select("id, player_name, score")
        .eq("session_id", sessionId)
        .order("score", { ascending: false });

      if (playersError) throw playersError;

      // Find this player's score and rank
      const playerIndex =
        playersData?.findIndex((p) => p.id === playerId) ?? -1;
      if (playerIndex !== -1) {
        setScore(playersData![playerIndex].score || 0);
        setPlayerRank(playerIndex + 1);
      }
    } catch (error: any) {
      toast({
        title: "Error loading results",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const subscribeToGameChanges = () => {
    const subscription = supabase
      .channel("game_session_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedSession = payload.new;
          setGameSession(updatedSession);

          // If the game has ended
          if (updatedSession.status === "completed") {
            setGameEnded(true);
            fetchFinalResults();
            return;
          }

          // If the question has changed
          if (
            updatedSession.current_question_index !== null &&
            (!gameSession ||
              updatedSession.current_question_index !==
                gameSession.current_question_index)
          ) {
            fetchCurrentQuestion(
              updatedSession.quiz_id,
              updatedSession.current_question_index,
            );
            checkIfAnswered(updatedSession.current_question_index);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const submitAnswer = async (optionId: string) => {
    if (answerSubmitted || !currentQuestion || timeLeft === 0) return;

    setSelectedOption(optionId);
    setAnswerSubmitted(true);

    try {
      // Get the correct answer
      const { data: correctOption, error: optionError } = await supabase
        .from("options")
        .select("id, is_correct")
        .eq("question_id", currentQuestion.id)
        .eq("is_correct", true)
        .single();

      if (optionError) throw optionError;

      const isCorrect = correctOption?.id === optionId;

      // Submit the answer
      const { error } = await supabase.from("game_answers").insert({
        session_id: sessionId,
        player_id: playerId,
        question_id: currentQuestion.id,
        question_index: gameSession.current_question_index,
        option_id: optionId,
        is_correct: isCorrect,
        time_taken: currentQuestion.time_limit - timeLeft,
      });

      if (error) throw error;

      // Show feedback
      toast({
        title: isCorrect ? "Correct!" : "Incorrect",
        description: isCorrect ? "You got it right!" : "Better luck next time",
        variant: isCorrect ? "default" : "destructive",
      });

      // Now wait for the next question
      setWaitingForNextQuestion(true);
    } catch (error: any) {
      toast({
        title: "Error submitting answer",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setAnswerSubmitted(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20 shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-[#FFD700]/20 mb-4">
              <Award className="h-10 w-10 text-[#FFD700]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
            <p className="text-xl">Your final score</p>
          </div>

          <div className="text-6xl font-bold mb-6">
            {score.toLocaleString()}
          </div>

          {playerRank && (
            <div className="mb-8">
              <p className="text-lg">Your rank</p>
              <div className="text-3xl font-bold">
                {playerRank}
                {getOrdinalSuffix(playerRank)} place
              </div>
            </div>
          )}

          <p className="text-lg mb-6">Thanks for playing!</p>

          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-white text-[#46178F] hover:bg-white/90 text-lg px-8 py-6 h-auto w-full"
          >
            Play Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!gameSession || gameSession.status === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20 shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Waiting for game to start</h1>
          <p className="text-xl mb-8">The host will start the game soon</p>

          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-white/30 border-t-white animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20 shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Get Ready!</h1>
          <p className="text-xl mb-8">The next question is coming up</p>

          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-white/30 border-t-white animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (waitingForNextQuestion || timeLeft === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20 shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">
            {answerSubmitted ? "Answer Submitted!" : "Time's Up!"}
          </h1>
          <p className="text-xl mb-8">Waiting for the next question</p>

          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-white/30 border-t-white animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex flex-col">
      <div className="p-4 flex justify-between items-center">
        <div className="text-2xl font-bold">{timeLeft}s</div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span>Question {gameSession.current_question_index + 1}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">
          {currentQuestion.text}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {currentQuestion.options.map((option, index) => {
            const colors = [
              "bg-[#FF3355] hover:bg-[#FF3355]/80", // Red
              "bg-[#00C985] hover:bg-[#00C985]/80", // Green
              "bg-[#0086FF] hover:bg-[#0086FF]/80", // Blue
              "bg-[#FFC400] hover:bg-[#FFC400]/80", // Yellow
            ];
            return (
              <Button
                key={option.id}
                onClick={() => submitAnswer(option.id)}
                disabled={answerSubmitted}
                className={`${colors[index]} text-white text-lg p-8 h-auto rounded-xl ${selectedOption === option.id ? "ring-4 ring-white" : ""} ${answerSubmitted ? "opacity-50" : ""}`}
              >
                {option.text}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export default PlayerGame;
