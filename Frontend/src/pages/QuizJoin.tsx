import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

/**
 * QuizJoin - Kahoot-style student-facing game PIN entry page.
 * Students enter the session code (PIN) shared by their teacher to join a live quiz.
 * Full-screen, projector & mobile-friendly design.
 */
export function QuizJoin() {
  const [, navigate] = useLocation();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"pin" | "name">("pin");
  const [joining, setJoining] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  // Allow numeric-only PIN entry
  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setPin(cleaned);
    // Auto-advance when 6 digits entered
    if (cleaned.length === 6) {
      setTimeout(() => setStep("name"), 200);
    }
  };

  // Verify the session code with backend
  const verifySession = trpc.liveQuiz.getByCode.useQuery(pin, {
    enabled: pin.length >= 4,
    retry: false,
  });

  const joinSession = trpc.liveQuiz.joinWithCode.useMutation({
    onSuccess: (result: any) => {
      toast.success("You're in! Get ready...");
      navigate(`/quiz/play/${result.participantId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Unable to join quiz");
      setJoining(false);
    },
  });

  const handleJoin = () => {
    if (step === "pin") {
      if (pin.length < 4) {
        toast.error("Please enter a valid PIN");
        return;
      }
      setStep("name");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setJoining(true);
    joinSession.mutate({ sessionCode: pin, participantName: name.trim() });
  };

  const session = verifySession.data;

  return (
    <div className="quiz-join-page">
      {/* Decorative background shapes */}
      <div className="quiz-join-shape quiz-join-shape-1" />
      <div className="quiz-join-shape quiz-join-shape-2" />
      <div className="quiz-join-glow" />

      {/* Top-right language selector */}
      <button className="quiz-join-lang" aria-label="Language">
        <span>🌐</span> EN
      </button>

      <div className="quiz-join-content">
        {/* Logo */}
        <div className="quiz-join-logo">EIA<span>Quiz</span></div>

        {/* Card */}
        <div className="quiz-join-card">
          {step === "pin" ? (
            <>
              <h2 className="quiz-join-title">PIN</h2>
              <div className="quiz-join-input-wrap">
                <Input
                  ref={inputRef}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="Enter PIN"
                  inputMode="numeric"
                  className="quiz-join-input"
                  aria-label="Game PIN"
                />
              </div>
              {pin.length >= 4 && verifySession.isFetching && (
                <p className="quiz-join-hint">Checking PIN...</p>
              )}
              {session && (
                <p className="quiz-join-hint quiz-join-hint-success">
                  ✓ Found quiz: {session.title || "Live Quiz"}
                </p>
              )}
              {pin.length >= 4 && verifySession.isError && (
                <p className="quiz-join-hint quiz-join-hint-error">
                  No quiz found with this PIN
                </p>
              )}
              <Button
                className="quiz-join-button"
                onClick={handleJoin}
                disabled={pin.length < 4}
              >
                Join
              </Button>
            </>
          ) : (
            <>
              <h2 className="quiz-join-title">Your Name</h2>
              <p className="quiz-join-subtitle">Enter a nickname or your name to join</p>
              <div className="quiz-join-input-wrap">
                <Input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="Enter your name"
                  maxLength={30}
                  className="quiz-join-input"
                  aria-label="Your name"
                />
              </div>
              <div className="quiz-join-buttons">
                <Button
                  variant="outline"
                  className="quiz-join-button-secondary"
                  onClick={() => { setStep("pin"); setName(""); }}
                >
                  Back
                </Button>
                <Button
                  className="quiz-join-button"
                  onClick={handleJoin}
                  disabled={joining || !name.trim()}
                >
                  {joining ? "Joining..." : "Join"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="quiz-join-footer">
          <Sparkles size={14} />
          <span>Powered by <strong>EIA Assessment Hub</strong></span>
        </div>
      </div>
    </div>
  );
}

export default QuizJoin;
