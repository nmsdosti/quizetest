import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useToast } from "@/components/ui/use-toast";

const JoinGame = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gamePin, setGamePin] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [step, setStep] = useState(1); // 1: Enter PIN, 2: Enter Name
  const [loading, setLoading] = useState(false);
  const [gameSession, setGameSession] = useState<any>(null);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gamePin.trim()) {
      toast({
        title: "Missing game PIN",
        description: "Please enter a valid game PIN",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if the game exists and is in waiting status
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_pin", gamePin)
        .eq("status", "waiting")
        .single();

      if (error) {
        toast({
          title: "Game not found",
          description: "Please check the PIN and try again",
          variant: "destructive",
        });
        return;
      }

      setGameSession(data);
      setStep(2);
    } catch (error: any) {
      toast({
        title: "Error joining game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Add the player to the game
      const { data, error } = await supabase
        .from("game_players")
        .insert({
          session_id: gameSession.id,
          player_name: playerName,
        })
        .select();

      if (error) throw error;

      // Navigate to the player game screen
      navigate(`/play/${gameSession.id}/${data[0].id}`);
    } catch (error: any) {
      toast({
        title: "Error joining game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-white/20 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {step === 1 ? "Join a Game" : "Enter Your Name"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="gamePin" className="block text-sm font-medium">
                  Game PIN
                </label>
                <Input
                  id="gamePin"
                  value={gamePin}
                  onChange={(e) => setGamePin(e.target.value)}
                  placeholder="Enter 6-digit PIN"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:ring-white/50 text-xl text-center tracking-wider h-14"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-[#46178F] hover:bg-white/90 text-lg py-6 h-auto"
                disabled={loading}
              >
                {loading ? "Checking..." : "Enter"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="playerName"
                  className="block text-sm font-medium"
                >
                  Your Name
                </label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:ring-white/50 text-xl text-center h-14"
                  maxLength={15}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-white text-[#46178F] hover:bg-white/90 text-lg py-6 h-auto gap-2"
                disabled={loading}
              >
                {loading ? "Joining..." : "Join Game"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinGame;
