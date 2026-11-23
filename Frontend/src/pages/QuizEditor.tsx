import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  FileImage,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const QUESTION_TYPES = [
  "mcq",
  "multi_select",
  "true_false",
  "short_answer",
  "numeric",
  "fill_blank",
] as const;

type QuestionType = (typeof QUESTION_TYPES)[number];
type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};
type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  timeLimitSeconds: number;
  marks: number;
  options: AnswerOption[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  multi_select: "Multiple select",
  true_false: "True or false",
  short_answer: "Short answer",
  numeric: "Numeric answer",
  fill_blank: "Fill in the blank",
};

const TIME_LIMITS = [15, 30, 45, 60, 90, 120, 180, 300];
const SUBJECTS = ["Mathematics", "Integrated Science", "English Language", "Digital Literacy", "General"];
const GRADES = ["Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "General"];

let idCounter = 0;
const createId = () => `question-${Date.now()}-${idCounter++}`;
const createOption = (index: number): AnswerOption => ({
  id: createId(),
  text: "",
  isCorrect: false,
});

function createQuestion(): Question {
  return {
    id: createId(),
    type: "mcq",
    prompt: "",
    timeLimitSeconds: 30,
    marks: 1,
    options: [0, 1, 2, 3].map(createOption),
  };
}

function needsOptions(type: QuestionType) {
  return type === "mcq" || type === "multi_select" || type === "true_false";
}

export default function QuizEditor() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [title, setTitle] = useState("Untitled assessment");
  const [subject, setSubject] = useState("Mathematics");
  const [gradeLabel, setGradeLabel] = useState("Grade 9");
  const [questions, setQuestions] = useState<Question[]>([createQuestion()]);
  const [activeId, setActiveId] = useState(questions[0].id);
  const [showProperties, setShowProperties] = useState(true);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const activeQuestion = questions.find(question => question.id === activeId) ?? questions[0];
  const activeIndex = questions.findIndex(question => question.id === activeQuestion.id);
  const showOptions = needsOptions(activeQuestion.type);

  const saveMutation = trpc.assessments.saveFull.useMutation({
    onSuccess: () => {
      toast.success("Draft saved to your assessment library");
      navigate("/assessments");
    },
    onError: error => toast.error(error.message || "Unable to save this assessment"),
  });

  useEffect(() => {
    promptRef.current?.focus();
  }, [activeId]);

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions(current => current.map(question =>
      question.id === id ? { ...question, ...patch } : question
    ));
  };

  const updateOption = (questionId: string, optionId: string, text: string) => {
    setQuestions(current => current.map(question => question.id === questionId
      ? {
          ...question,
          options: question.options.map(option => option.id === optionId ? { ...option, text } : option),
        }
      : question
    ));
  };

  const addQuestion = () => {
    const question = createQuestion();
    setQuestions(current => [...current, question]);
    setActiveId(question.id);
  };

  const duplicateQuestion = (id: string) => {
    const index = questions.findIndex(question => question.id === id);
    if (index < 0) return;
    const source = questions[index];
    const copy: Question = {
      ...source,
      id: createId(),
      options: source.options.map(option => ({ ...option, id: createId() })),
    };
    setQuestions(current => {
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setActiveId(copy.id);
    toast.success("Question duplicated");
  };

  const deleteQuestion = (id: string) => {
    if (questions.length === 1) {
      toast.error("An assessment needs at least one question");
      return;
    }
    const next = questions.filter(question => question.id !== id);
    setQuestions(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const changeType = (type: QuestionType) => {
    let options = activeQuestion.options;
    if (type === "true_false") {
      options = [
        { id: createId(), text: "True", isCorrect: false },
        { id: createId(), text: "False", isCorrect: false },
      ];
    } else if (needsOptions(type)) {
      options = options.length >= 2 ? options : [0, 1, 2, 3].map(createOption);
    } else {
      options = [];
    }
    updateQuestion(activeId, { type, options });
  };

  const toggleCorrect = (optionId: string) => {
    const multiple = activeQuestion.type === "multi_select";
    setQuestions(current => current.map(question => {
      if (question.id !== activeId) return question;
      return {
        ...question,
        options: question.options.map(option => {
          if (multiple) return option.id === optionId ? { ...option, isCorrect: !option.isCorrect } : option;
          return { ...option, isCorrect: option.id === optionId };
        }),
      };
    }));
  };

  const addOption = () => {
    if (activeQuestion.options.length >= 6) return;
    updateQuestion(activeId, { options: [...activeQuestion.options, createOption(activeQuestion.options.length)] });
  };

  const removeOption = (optionId: string) => {
    if (activeQuestion.options.length <= 2) return;
    updateQuestion(activeId, {
      options: activeQuestion.options.filter(option => option.id !== optionId),
    });
  };

  const handleSave = () => {
    if (!isAuthenticated || user?.role === "student") {
      toast.info("Sign in with a teacher or admin account to save");
      navigate("/login");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Enter an assessment title of at least three characters");
      return;
    }
    const incompleteQuestion = questions.find(question => question.prompt.trim().length < 5);
    if (incompleteQuestion) {
      setActiveId(incompleteQuestion.id);
      toast.error("Each question needs a prompt with at least five characters");
      return;
    }
    const incompleteChoices = questions.find(question =>
      needsOptions(question.type) &&
      (question.options.some(option => !option.text.trim()) || !question.options.some(option => option.isCorrect))
    );
    if (incompleteChoices) {
      setActiveId(incompleteChoices.id);
      toast.error("Complete each answer choice and mark at least one correct answer");
      return;
    }

    const totalSeconds = questions.reduce((total, question) => total + question.timeLimitSeconds, 0);
    saveMutation.mutate({
      title: title.trim(),
      subject,
      gradeLabel,
      status: "draft",
      durationMinutes: Math.max(1, Math.min(240, Math.ceil(totalSeconds / 60))),
      questions: questions.map(question => ({
        type: question.type,
        prompt: question.prompt.trim(),
        marks: question.marks,
        timeLimitSeconds: question.timeLimitSeconds,
        options: question.options.map(option => ({
          text: option.text.trim(),
          isCorrect: option.isCorrect,
        })),
      })),
    });
  };

  return (
    <div className="quiz-editor">
      <header className="qe-topbar">
        <button className="qe-back" onClick={() => navigate("/assessments")} aria-label="Back to assessments">
          <ArrowLeft size={18} />
        </button>
        <div className="qe-brand" aria-label="Excel Assessment Hub">
          <span className="qe-brand-mark">EA</span>
          <span className="qe-brand-copy"><strong>EXCEL</strong><small>ASSESSMENT HUB</small></span>
        </div>
        <label className="qe-title-wrap">
          <span>Assessment title</span>
          <Input
            className="qe-title-input"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Name this assessment"
            aria-label="Assessment title"
          />
        </label>
        <div className="qe-topbar-spacer" />
        <span className="qe-save-status"><span />Draft · not saved</span>
        <Button variant="outline" className="qe-settings" onClick={() => setShowProperties(value => !value)}>
          <Settings2 size={16} /> Details
        </Button>
        <Button variant="ghost" className="qe-exit" onClick={() => navigate("/assessments")}>Exit</Button>
        <Button className="qe-save" onClick={handleSave} disabled={saveMutation.isPending}>
          <Save size={16} /> {saveMutation.isPending ? "Saving…" : "Save draft"}
        </Button>
      </header>

      <div className="qe-body">
        <aside className="qe-left">
          <div className="qe-left-heading">
            <div><span className="qe-section-kicker">Build flow</span><strong>Questions</strong></div>
            <span className="qe-count">{questions.length}</span>
          </div>
          <div className="qe-question-list">
            {questions.map((question, index) => (
              <button
                type="button"
                key={question.id}
                className={`qe-question-thumb ${question.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(question.id)}
                aria-current={question.id === activeId ? "step" : undefined}
              >
                <span className="qe-thumb-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="qe-thumb-copy">
                  <strong>{question.prompt.trim() || `Question ${index + 1}`}</strong>
                  <small>{TYPE_LABELS[question.type]} · {question.timeLimitSeconds}s</small>
                </span>
              </button>
            ))}
          </div>
          <Button className="qe-add-btn" onClick={addQuestion}>
            <Plus size={17} /> Add question
          </Button>
          <div className="qe-left-note">
            <span className="qe-note-mark">i</span>
            <p>Keep prompts clear and focused. You can revise a draft before sharing it.</p>
          </div>
        </aside>

        <main className="qe-canvas">
          <div className="qe-canvas-inner">
            <div className="qe-canvas-heading">
              <div>
                <span className="qe-section-kicker">Question {String(activeIndex + 1).padStart(2, "0")}</span>
                <h1>Shape the learning moment.</h1>
              </div>
              <span className="qe-question-count">{activeIndex + 1} of {questions.length}</span>
            </div>

            <label className="qe-prompt-label" htmlFor="question-prompt">Question prompt</label>
            <textarea
              id="question-prompt"
              ref={promptRef}
              className="qe-prompt-input"
              value={activeQuestion.prompt}
              onChange={event => updateQuestion(activeId, { prompt: event.target.value })}
              placeholder="What should learners think through?"
              rows={3}
            />

            <button
              type="button"
              className="qe-media-area"
              onClick={() => toast.info("Visual uploads will be available when storage is connected")}
            >
              <span className="qe-media-icon"><FileImage size={20} /></span>
              <span className="qe-media-copy"><strong>Add a visual or source</strong><small>Optional context for this question</small></span>
              <span className="qe-media-action">Choose file</span>
            </button>

            {showOptions ? (
              <section className="qe-answers-section">
                <div className="qe-answer-heading">
                  <div><span className="qe-section-kicker">Response design</span><h2>Answer choices</h2></div>
                  <span>Mark the correct {activeQuestion.type === "multi_select" ? "answers" : "answer"}</span>
                </div>
                <div className="qe-answers-grid">
                  {activeQuestion.options.map((option, index) => (
                    <div className={`qe-answer-card ${option.isCorrect ? "correct" : ""}`} key={option.id}>
                      <span className="qe-answer-mark">{String.fromCharCode(65 + index)}</span>
                      <input
                        className="qe-answer-text"
                        value={option.text}
                        onChange={event => updateOption(activeId, option.id, event.target.value)}
                        placeholder={`Answer choice ${index + 1}`}
                        aria-label={`Answer choice ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="qe-answer-check"
                        aria-label={option.isCorrect ? "Correct answer" : "Mark as correct"}
                        aria-pressed={option.isCorrect}
                        onClick={() => toggleCorrect(option.id)}
                      >
                        {option.isCorrect && <Check size={16} />}
                      </button>
                      {activeQuestion.options.length > 2 && (
                        <button
                          type="button"
                          className="qe-answer-remove"
                          aria-label={`Remove answer choice ${index + 1}`}
                          onClick={() => removeOption(option.id)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {activeQuestion.options.length < 6 && (
                  <button type="button" className="qe-add-option" onClick={addOption}>
                    <Plus size={15} /> Add an answer choice
                  </button>
                )}
              </section>
            ) : (
              <div className="qe-text-answer-hint">
                <span className="qe-hint-icon"><Check size={16} /></span>
                <div><strong>Open response</strong><p>Learners will enter their own answer for this question.</p></div>
              </div>
            )}
          </div>
        </main>

        {showProperties && (
          <aside className="qe-properties">
            <div className="qe-props-header">
              <div><span className="qe-section-kicker">Configure</span><h2>Question details</h2></div>
              <button type="button" onClick={() => setShowProperties(false)} aria-label="Close question details"><X size={18} /></button>
            </div>
            <div className="qe-props-scroll">
              <label className="qe-prop-group">
                <span className="qe-prop-label">Question type</span>
                <select
                  className="qe-meta-select"
                  value={activeQuestion.type}
                  onChange={event => {
                    const selected = QUESTION_TYPES.find(type => type === event.target.value);
                    if (selected) changeType(selected);
                  }}
                >
                  {QUESTION_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
                </select>
              </label>
              <label className="qe-prop-group">
                <span className="qe-prop-label"><Clock3 size={15} /> Time limit</span>
                <select
                  className="qe-meta-select"
                  value={activeQuestion.timeLimitSeconds}
                  onChange={event => updateQuestion(activeId, { timeLimitSeconds: Number(event.target.value) })}
                >
                  {TIME_LIMITS.map(seconds => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
                </select>
                <button
                  type="button"
                  className="qe-apply-all"
                  onClick={() => {
                    setQuestions(current => current.map(question => ({ ...question, timeLimitSeconds: activeQuestion.timeLimitSeconds })));
                    toast.success("Time limit applied to all questions");
                  }}
                >
                  Apply to all questions
                </button>
              </label>
              <label className="qe-prop-group">
                <span className="qe-prop-label">Points</span>
                <select
                  className="qe-meta-select"
                  value={activeQuestion.marks}
                  onChange={event => updateQuestion(activeId, { marks: Number(event.target.value) })}
                >
                  {[1, 2, 3, 5, 10].map(points => <option key={points} value={points}>{points} {points === 1 ? "point" : "points"}</option>)}
                </select>
              </label>
              <div className="qe-props-divider" />
              <label className="qe-prop-group">
                <span className="qe-prop-label">Subject</span>
                <select className="qe-meta-select" value={subject} onChange={event => setSubject(event.target.value)}>
                  {SUBJECTS.map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="qe-prop-group">
                <span className="qe-prop-label">Grade / stage</span>
                <select className="qe-meta-select" value={gradeLabel} onChange={event => setGradeLabel(event.target.value)}>
                  {GRADES.map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <div className="qe-props-footer">
                <Button variant="outline" onClick={() => deleteQuestion(activeId)}>
                  <Trash2 size={15} /> Delete
                </Button>
                <Button variant="outline" onClick={() => duplicateQuestion(activeId)}>
                  <Copy size={15} /> Duplicate
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
