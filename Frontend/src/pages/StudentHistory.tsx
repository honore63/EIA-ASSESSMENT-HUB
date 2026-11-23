import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function StudentHistory() {
  const [, navigate] = useLocation();
  const history = trpc.students.history.useQuery();
  const available = trpc.assessments.available.useQuery();
  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" />My learning</div><h1>Assessment history</h1><p>Your completed assessments, marks and teacher feedback.</p></div>
      </div>
      <section className="studio-form-card">
        <div className="form-section-heading"><div><div><h2>Available assessments</h2><p>Published work ready for you to complete.</p></div></div></div>
        {available.isLoading ? <p>Loading assessments...</p> : available.error ? <p role="alert">{available.error.message}</p> : available.data?.length ? (
          <div className="analytics-table">
            {available.data.map(item => (
              <div className="analytics-table-row" key={item.id}>
                <div><strong>{item.title}</strong><span>{item.subject} · {item.gradeLabel}</span></div>
                <span>{item.questionCount} questions</span>
                <span>{item.durationMinutes} min</span>
                <strong>{item.totalMarks} marks</strong>
                <Button size="sm" onClick={() => navigate(`/assessment/${item.id}`)}>Start</Button>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">No published assessments are available yet.</div>}
      </section>
      <section className="studio-form-card">
        {history.isLoading ? <p>Loading your assessment history...</p> : history.error ? <p role="alert">{history.error.message}</p> : history.data?.length ? (
          <div className="analytics-table">
            <div className="analytics-table-head"><span>Assessment</span><span>Completed</span><span>Status</span><span>Score</span><span>Percentage</span><span>Time</span><span>Feedback</span></div>
            {history.data.map(item => (
              <div className="analytics-table-row" key={item.attemptId}>
                <div><strong>{item.title}</strong><span>{item.subject}{item.topic ? ` · ${item.topic}` : ""}</span></div>
                <span>{item.completedAt?.toLocaleDateString() ?? "—"}</span>
                <span>{item.status}</span>
                <strong>{item.score ?? "—"} / {item.totalMarks}</strong>
                <strong>{item.percentage === null ? "—" : `${item.percentage}%`}</strong>
                <span>{item.timeTakenSeconds === null ? "—" : `${Math.floor(item.timeTakenSeconds / 60)} min`}</span>
                <span>{item.teacherFeedback || "No feedback yet"}</span>
              </div>
            ))}
          </div>
        ) : <div className="empty-state">Your completed assessments will appear here once they are linked to your account.</div>}
      </section>
    </div>
  );
}
