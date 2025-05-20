import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Trash2, Save, ArrowRight } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../auth/VercelAuthProvider";
import { useToast } from "@/components/ui/use-toast";

interface Question {
  id: string;
  text: string;
  timeLimit: number;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      text: "",
      timeLimit: 30,
      options: [
        { id: "1", text: "", isCorrect: false },
        { id: "2", text: "", isCorrect: false },
        { id: "3", text: "", isCorrect: false },
        { id: "4", text: "", isCorrect: false },
      ],
    },
  ]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `${questions.length + 1}`,
      text: "",
      timeLimit: 30,
      options: [
        { id: "1", text: "", isCorrect: false },
        { id: "2", text: "", isCorrect: false },
        { id: "3", text: "", isCorrect: false },
        { id: "4", text: "", isCorrect: false },
      ],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const updateQuestion = (
    questionId: string,
    field: string,
    value: string | number,
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q,
      ),
    );
  };

  const updateOption = (
    questionId: string,
    optionId: string,
    field: string,
    value: string | boolean,
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o,
              ),
            }
          : q,
      ),
    );
  };

  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) => ({
                ...o,
                isCorrect: o.id === optionId,
              })),
            }
          : q,
      ),
    );
  };

  const validateQuiz = () => {
    if (!quizTitle.trim()) {
      toast({
        title: "Missing title",
        description: "Please add a title for your quiz",
        variant: "destructive",
      });
      return false;
    }

    for (const question of questions) {
      if (!question.text.trim()) {
        toast({
          title: "Incomplete question",
          description: `Question ${question.id} is missing text`,
          variant: "destructive",
        });
        return false;
      }

      const hasCorrectOption = question.options.some((o) => o.isCorrect);
      if (!hasCorrectOption) {
        toast({
          title: "Missing correct answer",
          description: `Question ${question.id} doesn't have a correct answer selected`,
          variant: "destructive",
        });
        return false;
      }

      for (const option of question.options) {
        if (!option.text.trim()) {
          toast({
            title: "Incomplete option",
            description: `An option in question ${question.id} is empty`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const saveQuiz = async () => {
    if (!validateQuiz()) return;

    try {
      // Insert the quiz
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: quizTitle,
          description: quizDescription,
          user_id: user?.id,
        })
        .select();

      if (quizError) {
        console.error("Quiz insert error:", quizError);
        throw quizError;
      }

      if (!quizData || quizData.length === 0) {
        throw new Error("Failed to create quiz");
      }

      const quizId = quizData[0].id;
      console.log("Created quiz with ID:", quizId);

      // Insert all questions
      for (const question of questions) {
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quizId,
            text: question.text,
            time_limit: question.timeLimit,
          })
          .select();

        if (questionError) {
          console.error("Question insert error:", questionError);
          throw questionError;
        }

        if (!questionData || questionData.length === 0) {
          throw new Error("Failed to create question");
        }

        const questionId = questionData[0].id;
        console.log("Created question with ID:", questionId);

        // Insert all options for this question
        for (const option of question.options) {
          const { error: optionError } = await supabase.from("options").insert({
            question_id: questionId,
            text: option.text,
            is_correct: option.isCorrect,
          });

          if (optionError) {
            console.error("Option insert error:", optionError);
            throw optionError;
          }
        }
      }

      toast({
        title: "Quiz created!",
        description: "Your quiz has been saved successfully",
      });

      navigate("/host");
    } catch (error: any) {
      console.error("Error saving quiz:", error);
      toast({
        title: "Error saving quiz",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-16 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Quiz</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/host")}
              className="gap-2"
            >
              Cancel
            </Button>
            <Button
              onClick={saveQuiz}
              className="bg-[#46178F] hover:bg-[#3b1277] gap-2"
            >
              <Save className="h-4 w-4" />
              Save Quiz
            </Button>
          </div>
        </div>

        <Card className="mb-8 bg-white shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title
              </label>
              <Input
                id="title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title"
                className="w-full"
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (optional)
              </label>
              <Textarea
                id="description"
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
                placeholder="Enter quiz description"
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {questions.map((question, qIndex) => (
            <Card
              key={question.id}
              className="bg-white shadow-sm border-gray-100"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  disabled={questions.length === 1}
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <Input
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, "text", e.target.value)
                    }
                    placeholder="Enter your question"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (seconds)
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={question.timeLimit}
                    onChange={(e) =>
                      updateQuestion(
                        question.id,
                        "timeLimit",
                        parseInt(e.target.value) || 30,
                      )
                    }
                    className="w-32"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Answer Options
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, index) => {
                      const colors = [
                        "bg-[#FF3355]", // Red
                        "bg-[#00C985]", // Green
                        "bg-[#0086FF]", // Blue
                        "bg-[#FFC400]", // Yellow
                      ];
                      return (
                        <div
                          key={option.id}
                          className={`p-4 rounded-xl ${colors[index]} text-white flex items-center gap-3`}
                        >
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={option.isCorrect}
                            onChange={() =>
                              setCorrectOption(question.id, option.id)
                            }
                            className="h-4 w-4"
                          />
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              updateOption(
                                question.id,
                                option.id,
                                "text",
                                e.target.value,
                              )
                            }
                            placeholder={`Option ${index + 1}`}
                            className="flex-1 bg-white/20 border-none text-white placeholder:text-white/60 focus:ring-white/50"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={addQuestion}
            variant="outline"
            className="w-full py-6 border-dashed border-2 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <PlusCircle className="h-5 w-5" />
            Add Question
          </Button>

          <CardFooter className="flex justify-end pt-6">
            <Button
              onClick={saveQuiz}
              className="bg-[#46178F] hover:bg-[#3b1277] gap-2 text-lg px-8 py-6 h-auto"
            >
              Save Quiz
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardFooter>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;
