import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChangePassword from "./pages/ChangePassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { TeacherHome } from "./pages/TeacherHome";
import { LibraryPage } from "./pages/Library";
import { TeacherAssignments } from "./pages/Assignments";
import { TeacherReports } from "./pages/Reports";
import { TeacherClasses } from "./pages/Classes";
import QuizJoin from "./pages/QuizJoin";
import QuizEditor from "./pages/QuizEditor";
import QuizTake from "./pages/QuizTake";

function Router() {
  return (
    <Switch>
      <Route path="/quiz/join" component={QuizJoin} />
      <Route path="/assessments/new" component={QuizEditor} />
      <Route path="/quiz/editor" component={QuizEditor} />
      <Route path="/assessment/:id" component={QuizTake} />
      <Route path="/login" component={Login} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/" component={Home} />
      <Route path="/assessments" component={Home} />
      <Route path="/users" component={Home} />
      <Route path="/student/history" component={Home} />
      <Route path="/question-bank" component={Home} />
      <Route path="/assignments" component={Home} />
      <Route path="/analytics" component={Home} />
      <Route path="/settings" component={Home} />
      <Route path="/teacher" component={TeacherHome} />
      <Route path="/teacher/library" component={LibraryPage} />
      <Route path="/teacher/assignments" component={TeacherAssignments} />
      <Route path="/teacher/reports" component={TeacherReports} />
      <Route path="/teacher/classes" component={TeacherClasses} />
      <Route path="/admin" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
