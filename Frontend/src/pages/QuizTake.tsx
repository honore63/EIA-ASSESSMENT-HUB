import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Check, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ChoiceAnswer = { optionId: number };
type MultiAnswer = { optionIds: number[] };

export default function QuizTake() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/assessment/:id");
  const assessmentId = Number(params?.id);
  const { user, isAuthenticated } = useAuth();
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, ChoiceAnswer | MultiAnswer | { text: string }>>({});

  const assessment = trpc.assessments.take.useQuery(
    { id: assessmentId },
    { enabled: isAuthenticated && user?.role === "student" && Number.isInteger(assessmentId) }
  );
  const startAttempt = trpc.attempts.start.useMutation({
    onSuccess: result => setAttemptId(result.attemptId),
    onError: error => toast.error(error.message),
  });
  const saveResponse = trpc.attempts.saveResponse.useMutation({
    onError: error => toast.error(error.message),
  });
  const submitAttempt = trpc.attempts.submit.useMutation({
    onSuccess: result => {
      toast.success(`Submitted · ${result.score}/${result.totalMarks} (${result.percentage}%)`);
      navigate("/student/history");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (isAuthenticated && user?.role === "student" && Number.isInteger(assessmentId) && !attemptId) {
      startAttempt.mutate({ assessmentId });
    }
  }, [isAuthenticated, user?.role, assessmentId, attemptId]);

  const saveAnswer = (questionId: number, answer: ChoiceAnswer | MultiAnswer | { text: string }) => {
    setAnswers(current => ({ ...current, [questionId]: answer }));
    if (attemptId) {
      saveResponse.mutate({ attemptId, questionId, answer });
    }
  };

  if (!isAuthenticated || user?.role !== "student") {
    return (
      <div className="page-wrap inner-page">
        <div className="soft-callout">
          <div><strong>Student sign-in required</strong><span>Sign in with a student account to take this assessment.</span></div>
          <Button onClick={() => navigate("/login")}>Sign in</Button>
        </div>
      </div>
    );
  }

  if (assessment.isLoading) return <div className="page-wrap inner-page">Loading assessment...</div>;
  if (assessment.error) return <div className="page-wrap inner-page" role="alert">{assessment.error.message}</div>;
  if (!assessment.data) return <div className="page-wrap inner-page">Assessment unavailable.</div>;

  const allAnswered = assessment.data.questions.every(question => answers[question.id]);

  return (
    <div className="page-wrap inner-page">
      <button className="back-link" onClick={() => navigate("/student/history")}><ArrowLeft size={15} /> Exit assessment</button>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" />{assessment.data.subject} · {assessment.data.gradeLabel}</div>
          <h1>{assessment.data.title}</h1>
          {assessment.data.description && <p>{assessment.data.description}</p>}
        </div>
        <span className="status-badge status-neutral"><Clock3 size={14} /> {assessment.data.durationMinutes} min</span>
      </div>

      <div className="studio-form-card">
        {assessment.data.questions.map((question, index) => {
          const answer = answers[question.id];
          return (
            <section className="form-section-heading" key={question.id} style={{ alignItems: "flex-start" }}>
              <div>
                <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{question.prompt}</h2>
                  <p>{question.marks} {question.marks === 1 ? "mark" : "marks"} · {question.type.replace("_", " ")}</p>
                </div>
              </div>
              {question.options.length > 0 ? (
                <div className="qe-answers-grid" style={{ width: "100%", marginTop: "1rem" }}>
                  {question.options.map(option => {
                    const selected = question.type === "multi_select"
                      ? !!(answer as MultiAnswer)?.optionIds?.includes(option.id)
                      : (answer as ChoiceAnswer)?.optionId === option.id;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={`qe-answer-card ${selected ? "correct" : ""}`}
                        onClick={() => {
                          if (question.type === "multi_select") {
                            const current = ((answer as MultiAnswer)?.optionIds ?? []).filter(id => id !== option.id);
                            if (!selected) current.push(option.id);
                            saveAnswer(question.id, { optionIds: current });
                          } else {
                            saveAnswer(question.id, { optionId: option.id });
                          }
                        }}
                      >
                        <span className="qe-answer-mark">{option.label}</span>
                        <span className="qe-answer-text">{option.text}</span>
                        {selected && <span className="qe-answer-check"><Check size={16} /></span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  className="Input"
                  style={{ marginTop: "1rem", width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem" }}
                  value={(answer as { text?: string })?.text ?? ""}
                  onChange={event => saveAnswer(question.id, { text: event.target.value })}
                  placeholder="Enter your answer"
                />
              )}
            </section>
          );
        })}
        <div className="form-bottom-row">
          <span>{allAnswered ? "All questions answered" : "You can submit now or finish the remaining questions"}</span>
          <Button
            className="button-mustard"
            disabled={!attemptId || submitAttempt.isPending}
            onClick={() => submitAttempt.mutate({ attemptId: attemptId as number })}
          >
            {submitAttempt.isPending ? "Submitting..." : "Submit assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
