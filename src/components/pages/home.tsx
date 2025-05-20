import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Settings,
  User,
  Play,
  PlusCircle,
  Trophy,
  Clock,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/VercelAuthProvider";

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-[#f5f5f7]/30">
        <div className="max-w-[980px] mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center">
            <Link to="/" className="font-medium text-xl">
              QuizMaster
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/host">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    My Quizzes
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 hover:cursor-pointer">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-none shadow-lg"
                  >
                    <DropdownMenuLabel className="text-xs text-gray-500">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => signOut()}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-[#46178F] text-white hover:bg-[#3b1277] text-sm px-4">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-12">
        {/* Hero section */}
        <section className="py-20 text-center bg-gradient-to-b from-[#46178F] to-[#7B2CBF] text-white">
          <div className="max-w-[980px] mx-auto px-4">
            <h2 className="text-5xl font-bold tracking-tight mb-4">
              Interactive Quiz Platform
            </h2>
            <h3 className="text-2xl font-medium mb-8">
              Create, host, and play engaging quizzes in real-time
            </h3>
            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-12">
              <Link to="/signup">
                <Button className="rounded-full bg-white text-[#46178F] hover:bg-gray-100 text-lg px-8 py-6 h-auto">
                  Create a Quiz
                </Button>
              </Link>
              <Link to="/">
                <Button
                  variant="outline"
                  className="rounded-full border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
                >
                  Join a Game
                </Button>
              </Link>
            </div>
            <div className="mt-8 bg-white/10 backdrop-blur-sm p-6 rounded-2xl max-w-md mx-auto">
              <div className="text-left mb-4 flex items-center">
                <div className="bg-[#FF3355] h-12 w-12 rounded-xl flex items-center justify-center mr-4">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-xl">Join a Game</h4>
                  <p className="text-white/80">Enter a game code to join</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Game PIN"
                  className="flex-1 rounded-lg px-4 py-3 bg-white/20 border-none text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/50 focus:outline-none"
                />
                <Link to="/join">
                  <Button className="rounded-lg bg-[#FF3355] hover:bg-[#e02e4d] px-6">
                    Join
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-20 bg-[#f5f5f7] text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-2">
            How It Works
          </h2>
          <h3 className="text-xl font-medium text-gray-600 mb-12">
            Simple steps to create and play interactive quizzes
          </h3>

          <div className="mt-8 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-14 w-14 bg-[#46178F]/10 rounded-full flex items-center justify-center mb-6">
                <PlusCircle className="h-7 w-7 text-[#46178F]" />
              </div>
              <h4 className="text-xl font-bold mb-3">Create</h4>
              <p className="text-gray-600">
                Design engaging quizzes with multiple-choice questions, timers,
                and custom point systems.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-14 w-14 bg-[#FF3355]/10 rounded-full flex items-center justify-center mb-6">
                <Play className="h-7 w-7 text-[#FF3355]" />
              </div>
              <h4 className="text-xl font-bold mb-3">Host</h4>
              <p className="text-gray-600">
                Start a live game session with a unique code and control the
                flow of questions in real-time.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-14 w-14 bg-[#00C985]/10 rounded-full flex items-center justify-center mb-6">
                <Trophy className="h-7 w-7 text-[#00C985]" />
              </div>
              <h4 className="text-xl font-bold mb-3">Compete</h4>
              <p className="text-gray-600">
                Join games using a simple code and compete against others with
                real-time leaderboards.
              </p>
            </div>
          </div>
        </section>

        {/* Grid section for other features */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <div className="h-16 w-16 bg-[#FF3355]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Clock className="h-8 w-8 text-[#FF3355]" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Real-time Interaction</h2>
            <p className="text-lg text-gray-600 mb-6">
              Engage participants with timed questions and instant feedback
            </p>
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm max-w-sm mx-auto">
              <div className="space-y-4">
                <div className="h-4 w-full bg-[#46178F] rounded-full"></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-[#FF3355] rounded-xl flex items-center justify-center text-white font-bold">
                    Red
                  </div>
                  <div className="h-20 bg-[#00C985] rounded-xl flex items-center justify-center text-white font-bold">
                    Green
                  </div>
                  <div className="h-20 bg-[#0086FF] rounded-xl flex items-center justify-center text-white font-bold">
                    Blue
                  </div>
                  <div className="h-20 bg-[#FFC400] rounded-xl flex items-center justify-center text-white font-bold">
                    Yellow
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <div className="h-16 w-16 bg-[#00C985]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Users className="h-8 w-8 text-[#00C985]" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Live Leaderboards</h2>
            <p className="text-lg text-gray-600 mb-6">
              Track scores in real-time and celebrate top performers
            </p>
            <div className="mt-8 bg-white p-6 rounded-xl shadow-sm max-w-sm mx-auto text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-[#FFD700] h-8 w-8 rounded-full flex items-center justify-center mr-3 text-white font-bold">
                      1
                    </div>
                    <span className="font-medium">Player One</span>
                  </div>
                  <span className="font-bold">2400</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-[#C0C0C0] h-8 w-8 rounded-full flex items-center justify-center mr-3 text-white font-bold">
                      2
                    </div>
                    <span className="font-medium">Player Two</span>
                  </div>
                  <span className="font-bold">1850</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-[#CD7F32] h-8 w-8 rounded-full flex items-center justify-center mr-3 text-white font-bold">
                      3
                    </div>
                    <span className="font-medium">Player Three</span>
                  </div>
                  <span className="font-bold">1340</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#46178F] py-12 text-white">
        <div className="max-w-[980px] mx-auto px-4">
          <div className="border-b border-white/20 pb-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-lg mb-4">QuizMaster</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link to="/" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Examples
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Resources</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link to="/" className="hover:text-white">
                    Getting Started
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Question Templates
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Community</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link to="/" className="hover:text-white">
                    Quiz Library
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    YouTube
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-4">Legal</h4>
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link to="/" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:text-white">
                    Licenses
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="py-4 text-white/60">
            <p>Copyright © 2025 QuizMaster. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
