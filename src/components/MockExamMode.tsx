import { useEffect, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Eye,
  FileText,
  Share2,
  History,
  Loader2,
  RotateCcw,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MockExamDraftEditorDialog from "@/components/MockExamDraftEditorDialog";
import { requestMockExam } from "@/services/mockExamApi";
import {
  completeQuickPracticeSession,
  deleteSavedMockExamSession,
  getSavedMockExamSession,
  getQuickPracticeReview,
  listSharedMockExams,
  listSavedMockExams,
  persistMockExamSession,
  publishMockExamToSharedPool,
  updateSavedMockExamDraft,
  useSharedMockExam,
} from "@/services/mockExamSessionStore";
import { LECTURE_TOPICS } from "@/data/examTopics";
import type {
  MockExamAnswerRecord,
  MockExamDifficulty,
  MockExamLibraryScope,
  MockExamLibrarySummary,
  MockExamMode as ExamMode,
  MockExamNormalizedResponse,
  MockExamSavedSession,
  MockExamSessionStatus,
  MockExamSharedExamSummary,
  MockExamStructuredPayload,
  MockExamRunnerQuestion as Question,
} from "@/types/mockExam";
import { printStructuredMockExam } from "@/utils/mockExamDraft";

interface ResultContext {
  source: "current" | "history";
  sessionId: string | null;
  submittedAt: string | null;
}

type SavedExamFilter = ExamMode;
const formatTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return "Not submitted yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const getCorrectOptionText = (question: Question) => {
  if (typeof question.correctAnswer === "number") {
    return question.options[question.correctAnswer] ?? question.correctAnswerText ?? "";
  }

  return question.correctAnswerText ?? "";
};

const formatOptionForDisplay = (option: string, index: number) => {
  const trimmed = option.trim();
  if (/^[A-Z][).:]\s/.test(trimmed)) {
    return option;
  }

  return `${String.fromCharCode(65 + index)}) ${option}`;
};

const getModeLabel = (mode: ExamMode) =>
  mode === "quick_practice" ? "Quick Practice" : "Exam Simulation";

const getStatusLabel = (status: MockExamSessionStatus) => {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "submitted":
      return "Completed";
    case "graded":
      return "Graded";
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

const getStatusVariant = (status: MockExamSessionStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "submitted":
    case "graded":
      return "default";
    case "failed":
    case "abandoned":
      return "destructive";
    case "ready":
      return "secondary";
    default:
      return "outline";
  }
};

const SESSION_STATUS_PRIORITY: Record<MockExamSessionStatus, number> = {
  submitted: 0,
  graded: 0,
  in_progress: 1,
  ready: 2,
  generating: 3,
  abandoned: 4,
  failed: 5,
};

const formatWarningCount = (count: number) =>
  count === 1 ? "1 workflow warning" : `${count} workflow warnings`;

const getWorkflowReviewDescription = (
  warnings: string[],
  requiresReview: boolean,
  fallback: string,
) => {
  if (requiresReview && warnings.length > 0) {
    return `${formatWarningCount(warnings.length)} returned. Review the draft in the app, apply fixes if needed, and use Print Draft for the stable PDF path.`;
  }

  if (requiresReview) {
    return "The workflow flagged this draft for review. Check it in the app, then print locally.";
  }

  if (warnings.length > 0) {
    return `${formatWarningCount(warnings.length)} returned. The structured draft is ready in the app and local print is the recommended export path.`;
  }

  return fallback;
};

const MockExamMode = () => {
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [submittedAnswers, setSubmittedAnswers] = useState<Map<number, MockExamAnswerRecord>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [scoredPoints, setScoredPoints] = useState(0);
  const [error, setError] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastResponse, setLastResponse] = useState<MockExamNormalizedResponse | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [activeQuickPracticeSessionId, setActiveQuickPracticeSessionId] = useState<string | null>(null);
  const [practiceStartedAt, setPracticeStartedAt] = useState<number | null>(null);
  const [completionSaved, setCompletionSaved] = useState(false);
  const [resultContext, setResultContext] = useState<ResultContext | null>(null);
  const [savedExamSessions, setSavedExamSessions] = useState<MockExamLibrarySummary[]>([]);
  const [sharedExamSessions, setSharedExamSessions] = useState<MockExamSharedExamSummary[]>([]);
  const [isLoadingSavedExams, setIsLoadingSavedExams] = useState(false);
  const [isLoadingSharedExams, setIsLoadingSharedExams] = useState(false);
  const [activeSavedExamFilter, setActiveSavedExamFilter] = useState<SavedExamFilter>("quick_practice");
  const [activeSavedExamScope, setActiveSavedExamScope] = useState<MockExamLibraryScope>("personal");
  const [loadingSavedSessionId, setLoadingSavedSessionId] = useState<string | null>(null);
  const [loadingSharedExamId, setLoadingSharedExamId] = useState<string | null>(null);
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDraftEditorOpen, setIsDraftEditorOpen] = useState(false);
  const [editorSessionId, setEditorSessionId] = useState<string | null>(null);
  const [editorTopic, setEditorTopic] = useState("Computer Networks");
  const [editorDifficulty, setEditorDifficulty] = useState<MockExamDifficulty>("medium");
  const [editorStructured, setEditorStructured] = useState<MockExamStructuredPayload | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPrintingDraft, setIsPrintingDraft] = useState(false);
  const [showSavedExamsSection, setShowSavedExamsSection] = useState(false);
  const [showGenerateSection, setShowGenerateSection] = useState(false);
  const [topicsExpanded, setTopicsExpanded] = useState(false);

  const courseName = "Computer Networks";
  const [examMode, setExamMode] = useState<ExamMode>("exam_simulation");
  const [numMCQ, setNumMCQ] = useState("10");
  const [numOpenEnded, setNumOpenEnded] = useState("5");
  const [difficulty, setDifficulty] = useState<MockExamDifficulty>("medium");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([...LECTURE_TOPICS]);

  const totalLectures = LECTURE_TOPICS.length;
  const selectedCount = selectedTopics.length;
  const allSelected = selectedCount === totalLectures;
  const noneSelected = selectedCount === 0;
  const examStarted = questions.length > 0 && !showResults;
  const effectiveNumOpenEnded = examMode === "quick_practice" ? "0" : numOpenEnded;
  const openEndedDisabled = examMode === "quick_practice";
  const answeredCount = submittedAnswers.size;
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const allQuestionsSubmitted = questions.length > 0 && answeredCount === questions.length;
  const orderedResults = questions
    .map((question) => {
      const result = submittedAnswers.get(question.id);
      return result ? { question, result } : null;
    })
    .filter((entry): entry is { question: Question; result: MockExamAnswerRecord } => Boolean(entry));
  const filteredSavedExamSessions = savedExamSessions
    .filter((session) => session.mode === activeSavedExamFilter)
    .slice()
    .sort((left, right) => {
      const priorityDiff =
        SESSION_STATUS_PRIORITY[left.status] - SESSION_STATUS_PRIORITY[right.status];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftTime = new Date(left.submittedAt ?? left.createdAt).getTime();
      const rightTime = new Date(right.submittedAt ?? right.createdAt).getTime();
      return rightTime - leftTime;
    });
  const quickPracticeLibraryCount = savedExamSessions.filter(
    (session) => session.mode === "quick_practice",
  ).length;
  const examSimulationLibraryCount = savedExamSessions.filter(
    (session) => session.mode === "exam_simulation",
  ).length;
  const quickPracticeSharedCount = sharedExamSessions.filter(
    (session) => session.mode === "quick_practice",
  ).length;
  const examSimulationSharedCount = sharedExamSessions.filter(
    (session) => session.mode === "exam_simulation",
  ).length;

  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingQuestions) {
      setElapsedTime(0);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - start);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoadingQuestions]);

  const loadSavedExamLibrary = async () => {
    setIsLoadingSavedExams(true);

    try {
      const sessions = await listSavedMockExams();
      setSavedExamSessions(sessions);
    } finally {
      setIsLoadingSavedExams(false);
    }
  };

  const loadSharedExamLibrary = async () => {
    setIsLoadingSharedExams(true);

    try {
      const sessions = await listSharedMockExams();
      setSharedExamSessions(sessions);
    } finally {
      setIsLoadingSharedExams(false);
    }
  };

  const refreshExamLibraries = async () => {
    await Promise.all([loadSavedExamLibrary(), loadSharedExamLibrary()]);
  };

  useEffect(() => {
    void refreshExamLibraries();
  }, []);

  const resetPracticeState = () => {
    setQuestions([]);
    setCurrentQuestion(0);
    setUserAnswers(new Map());
    setSubmittedAnswers(new Map());
    setShowResults(false);
    setScoredPoints(0);
    setTotalPoints(0);
    setActiveQuickPracticeSessionId(null);
    setPracticeStartedAt(null);
    setCompletionSaved(false);
    setResultContext(null);
    setLoadingSavedSessionId(null);
  };

  const validateAnswer = (question: Question, selectedValue: string): boolean => {
    return selectedValue === question.correctAnswer?.toString();
  };

  const startQuickPractice = (practiceQuestions: Question[], sessionId: string | null) => {
    setQuestions(practiceQuestions);
    setCurrentQuestion(0);
    setUserAnswers(new Map());
    setSubmittedAnswers(new Map());
    setShowResults(false);
    setScoredPoints(0);
    setTotalPoints(practiceQuestions.reduce((sum, question) => sum + question.points, 0));
    setActiveQuickPracticeSessionId(sessionId);
    setPracticeStartedAt(Date.now());
    setCompletionSaved(false);
    setResultContext(null);
  };

  const applySavedSessionConfig = (
    session: Pick<
      MockExamLibrarySummary | MockExamSavedSession,
      "mode" | "difficulty" | "selectedTopics" | "requestedCounts" | "sessionId"
    >,
  ) => {
    const normalizedMcqCount = session.requestedCounts.mcq > 0 ? session.requestedCounts.mcq : 10;
    const normalizedOpenEndedCount = Math.max(session.requestedCounts.openEnded, 0);

    setExamMode(session.mode);
    setDifficulty(session.difficulty);
    setNumMCQ(String(normalizedMcqCount));
    setNumOpenEnded(String(normalizedOpenEndedCount));
    setSelectedTopics(
      session.selectedTopics.length > 0 ? session.selectedTopics : [...LECTURE_TOPICS],
    );
    setSavedSessionId(session.sessionId);
  };

  const focusSavedExamsSection = (
    mode: SavedExamFilter,
    scope: MockExamLibraryScope = "personal",
  ) => {
    setActiveSavedExamFilter(mode);
    setActiveSavedExamScope(scope);
    setShowSavedExamsSection(true);
    setShowGenerateSection(false);

    window.setTimeout(() => {
      document
        .getElementById("saved-mock-exams-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const focusGenerateExamSection = () => {
    setShowGenerateSection(true);
    setShowSavedExamsSection(false);

    window.setTimeout(() => {
      document
        .getElementById("generate-mock-exam-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const buildRequestFromSavedSession = (savedSession: MockExamSavedSession) => ({
    mode: savedSession.mode,
    topic: savedSession.topic,
    numMultipleChoice:
      savedSession.requestedCounts.mcq > 0
        ? savedSession.requestedCounts.mcq
        : Math.max(savedSession.normalizedResponse.practiceQuestions.length, 5),
    numOpenEnded: Math.max(savedSession.requestedCounts.openEnded, 0),
    difficulty: savedSession.difficulty,
    includeTopics: savedSession.selectedTopics,
    excludeTopics: [],
    sessionId: `exam-${Date.now()}`,
  });

  const findNextUnansweredIndex = (fromIndex: number) => {
    if (!questions.length) {
      return -1;
    }

    for (let offset = 1; offset <= questions.length; offset += 1) {
      const nextIndex = (fromIndex + offset) % questions.length;
      if (!submittedAnswers.has(questions[nextIndex].id)) {
        return nextIndex;
      }
    }

    return -1;
  };

  const fetchExamQuestions = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "No lectures selected",
        description: "Please select at least one lecture to generate an exam.",
        variant: "destructive",
      });
      return;
    }

    const requestedMcqCount = parseInt(numMCQ, 10);
    const requestedOpenEndedCount = parseInt(effectiveNumOpenEnded, 10);

    if (examMode === "exam_simulation" && requestedMcqCount + requestedOpenEndedCount === 0) {
      toast({
        title: "No questions selected",
        description: "Choose at least one MCQ or open-ended question before generating an exam.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingQuestions(true);
    setError("");
    setSavedSessionId(null);
    resetPracticeState();

    try {
      const includeTopics = allSelected ? [] : selectedTopics;
      const requestPayload = {
        mode: examMode,
        topic: courseName,
        numMultipleChoice: requestedMcqCount,
        numOpenEnded: requestedOpenEndedCount,
        difficulty,
        includeTopics,
        excludeTopics: [],
        sessionId: `exam-${Date.now()}`,
      } as const;

      const response = await requestMockExam(requestPayload);

      console.log("[MockExam] normalized response:", response);
      setLastResponse(response);

      const persistenceResult = await persistMockExamSession(requestPayload, response);
      if (persistenceResult.status === "saved" && persistenceResult.sessionId) {
        setSavedSessionId(persistenceResult.sessionId);
        await refreshExamLibraries();

        if (examMode === "exam_simulation") {
          focusSavedExamsSection("exam_simulation", "personal");
        }
      } else if (persistenceResult.status === "failed") {
        console.error("[MockExam] Failed to save generated exam session:", persistenceResult.reason);
      }

      if (examMode === "quick_practice" && response.practiceQuestions.length > 0) {
        startQuickPractice(
          response.practiceQuestions,
          persistenceResult.status === "saved" ? persistenceResult.sessionId : null,
        );
        toast({
          title: "Quick Practice Ready",
          description: `${response.practiceQuestions.length} in-app MCQs are ready to answer.`,
        });
        return;
      }

      if (!response.pdf.link && !response.structured) {
        throw new Error("Workflow returned neither structured questions nor a PDF link.");
      }

      if (examMode === "quick_practice" && !response.structured) {
        toast({
          title: "Workflow still PDF-first",
          description: "Quick Practice is ready in the app, but your n8n workflow still returns only a PDF link today.",
        });
      } else if (response.structured) {
        if (examMode === "exam_simulation" && persistenceResult.status !== "saved") {
          openDraftEditor({
            sessionId: null,
            topic: courseName,
            difficulty,
            structured: response.structured,
          });
        }

        toast({
          title:
            examMode === "exam_simulation"
              ? response.requiresReview
                ? "Exam Draft Requires Review"
                : "Exam Draft Ready"
              : "Structured exam data received",
          description:
            examMode === "exam_simulation"
              ? persistenceResult.status === "saved"
                ? "Your new exam was added to My History below. Use Open Exam to review it, make changes, and print it."
                : "Your exam draft is open now, but it could not be saved to My History automatically."
              : "The app detected structured exam JSON and is ready for the upgraded workflow.",
        });
      } else {
        toast({
          title: "Remote PDF Ready",
          description:
            persistenceResult.status === "saved"
              ? "Your new exam was added to My History below. Open it there and download the PDF if you need a copy."
              : "The workflow returned a hosted PDF, but the exam could not be added to My History automatically.",
        });
      }
    } catch (err: any) {
      console.error("Failed to generate exam:", err);
      const errorMessage = err.message || "Failed to generate exam. Please try again.";
      setError(errorMessage);

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (value: string) => {
    const question = questions[currentQuestion];
    if (!question || submittedAnswers.has(question.id)) {
      return;
    }

    const nextAnswers = new Map(userAnswers);
    nextAnswers.set(question.id, value);
    setUserAnswers(nextAnswers);
  };

  const handleClearSelection = () => {
    const question = questions[currentQuestion];
    if (!question || submittedAnswers.has(question.id)) {
      return;
    }

    const nextAnswers = new Map(userAnswers);
    nextAnswers.delete(question.id);
    setUserAnswers(nextAnswers);
  };

  const handleConfirmAnswer = () => {
    const question = questions[currentQuestion];
    if (!question || submittedAnswers.has(question.id)) {
      return;
    }

    const selectedValue = userAnswers.get(question.id) || "";
    if (!selectedValue) {
      return;
    }

    const selectedOptionIndex = Number.parseInt(selectedValue, 10);
    const answerText = question.options[selectedOptionIndex] ?? selectedValue;
    const isCorrect = validateAnswer(question, selectedValue);
    const pointsEarned = isCorrect ? question.points : 0;

    const nextSubmittedAnswers = new Map(submittedAnswers);
    nextSubmittedAnswers.set(question.id, {
      questionId: question.id,
      answer: answerText,
      selectedOptionIndex,
      isCorrect,
      pointsEarned,
      submittedAt: new Date().toISOString(),
    });

    setSubmittedAnswers(nextSubmittedAnswers);
  };

  const handleFinishQuickPractice = async () => {
    const finalResults = questions
      .map((question) => submittedAnswers.get(question.id))
      .filter((result): result is MockExamAnswerRecord => Boolean(result));

    if (finalResults.length !== questions.length) {
      toast({
        title: "Complete every question first",
        description: "Confirm an answer for each question before finishing the quick practice.",
        variant: "destructive",
      });
      return;
    }

    const finalScore = finalResults.reduce((sum, result) => sum + result.pointsEarned, 0);
    const submittedAt = new Date().toISOString();

    setScoredPoints(finalScore);
    setShowResults(true);
    setCurrentQuestion(0);
    setResultContext({
      source: "current",
      sessionId: activeQuickPracticeSessionId,
      submittedAt,
    });

    if (!activeQuickPracticeSessionId || completionSaved) {
      return;
    }

    const completionResult = await completeQuickPracticeSession({
      sessionId: activeQuickPracticeSessionId,
      questions,
      answers: finalResults.map((result) => ({
        ...result,
        submittedAt: result.submittedAt ?? submittedAt,
      })),
      totalPoints,
      scoredPoints: finalScore,
      elapsedSeconds:
        practiceStartedAt !== null ? (Date.now() - practiceStartedAt) / 1000 : undefined,
    });

    if (completionResult.status === "saved") {
      setCompletionSaved(true);
      await refreshExamLibraries();
      toast({
        title: "Quick Practice Saved",
        description: "Your completed attempt is now available in exam history.",
      });
    } else if (completionResult.status === "failed") {
      console.error("[MockExam] Failed to save completed quick practice:", completionResult.reason);
      toast({
        title: "History Save Failed",
        description: completionResult.reason || "The completed attempt could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleReviewCompletedSession = async (sessionId: string) => {
    setLoadingSavedSessionId(sessionId);

    try {
      const review = await getQuickPracticeReview(sessionId);
      if (!review) {
        toast({
          title: "Result Unavailable",
          description: "This quick-practice session does not have a completed saved result yet.",
          variant: "destructive",
        });
        return;
      }

      applySavedSessionConfig({
        mode: "quick_practice",
        difficulty: review.difficulty,
        selectedTopics: review.selectedTopics,
        requestedCounts: {
          mcq: review.questions.length,
          openEnded: 0,
        },
        sessionId: review.sessionId,
      });

      const nextSubmittedAnswers = new Map<number, MockExamAnswerRecord>();
      for (const answer of review.answers) {
        nextSubmittedAnswers.set(answer.questionId, answer);
      }

      setQuestions(review.questions);
      setUserAnswers(new Map());
      setSubmittedAnswers(nextSubmittedAnswers);
      setCurrentQuestion(0);
      setTotalPoints(review.totalPoints);
      setScoredPoints(review.scoredPoints);
      setShowResults(true);
      setResultContext({
        source: "history",
        sessionId: review.sessionId,
        submittedAt: review.submittedAt,
      });
      setActiveQuickPracticeSessionId(review.sessionId);
      setCompletionSaved(true);
    } finally {
      setLoadingSavedSessionId(null);
    }
  };

  const handleStartSavedPractice = async (
    session: MockExamLibrarySummary,
    duplicateSession: boolean,
  ) => {
    setLoadingSavedSessionId(session.sessionId);

    try {
      const savedSession = await getSavedMockExamSession(session.sessionId);
      if (!savedSession) {
        toast({
          title: "Saved Exam Unavailable",
          description: "This saved quick-practice session could not be loaded.",
          variant: "destructive",
        });
        return;
      }

      if (savedSession.mode !== "quick_practice") {
        toast({
          title: "Invalid Session Type",
          description: "Only quick-practice sessions can be started in the in-app runner.",
          variant: "destructive",
        });
        return;
      }

      if (savedSession.normalizedResponse.practiceQuestions.length === 0) {
        toast({
          title: "Saved Practice Unavailable",
          description: "This saved quick-practice session has no in-app questions to load.",
          variant: "destructive",
        });
        return;
      }

      let nextResponse: MockExamNormalizedResponse = savedSession.normalizedResponse;
      let nextSessionId: string | null = savedSession.sessionId;

      if (duplicateSession) {
        const requestPayload = buildRequestFromSavedSession(savedSession);
        nextResponse = {
          ...savedSession.normalizedResponse,
          sessionId: requestPayload.sessionId,
        };

        const persistenceResult = await persistMockExamSession(requestPayload, nextResponse);
        if (persistenceResult.status === "saved" && persistenceResult.sessionId) {
          nextSessionId = persistenceResult.sessionId;
          await refreshExamLibraries();
        } else {
          nextSessionId = null;
          toast({
            title: "Practice Started Without Save",
            description:
              persistenceResult.reason ||
              "A new history record could not be created, but the questions are still available in-app.",
            variant: "destructive",
          });
        }
      }

      applySavedSessionConfig({
        mode: "quick_practice",
        difficulty: savedSession.difficulty,
        selectedTopics: savedSession.selectedTopics,
        requestedCounts: savedSession.requestedCounts,
        sessionId: nextSessionId ?? savedSession.sessionId,
      });
      setError("");
      setLastResponse(nextResponse);
      startQuickPractice(nextResponse.practiceQuestions, nextSessionId);

      toast({
        title: duplicateSession ? "Saved Practice Duplicated" : "Saved Practice Loaded",
        description: duplicateSession
          ? "A fresh practice session was created from your saved exam."
          : "You can continue working through this saved quick-practice exam.",
      });
    } finally {
      setLoadingSavedSessionId(null);
    }
  };

  const handleOpenSavedSession = async (session: MockExamLibrarySummary) => {
    setLoadingSavedSessionId(session.sessionId);

    try {
      if (session.mode === "quick_practice") {
        await handleStartSavedPractice(session, false);
        return;
      }

      const savedSession = await getSavedMockExamSession(session.sessionId);
      if (!savedSession) {
        toast({
          title: "Saved Exam Unavailable",
          description: "This saved exam could not be loaded.",
          variant: "destructive",
        });
        return;
      }

      applySavedSessionConfig(savedSession);
      setError("");
      setLastResponse(savedSession.normalizedResponse);
      resetPracticeState();
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (savedSession.normalizedResponse.structured) {
        openDraftEditor({
          sessionId: savedSession.sessionId,
          topic: savedSession.topic,
          difficulty: savedSession.difficulty,
          structured: savedSession.normalizedResponse.structured,
        });
      }

      toast({
        title: "Saved Exam Simulation Loaded",
        description: savedSession.normalizedResponse.structured
          ? "The saved exam draft is now open. Review, edit, and print it locally."
          : savedSession.normalizedResponse.pdf.link
            ? "The saved exam simulation is available as a hosted PDF."
            : "The saved exam simulation was loaded from your library.",
      });
    } finally {
      setLoadingSavedSessionId(null);
    }
  };

  const handleShareSavedExam = async (session: MockExamLibrarySummary) => {
    setSharingSessionId(session.sessionId);

    try {
      const shareResult = await publishMockExamToSharedPool(session.sessionId);

      if (shareResult.status === "saved") {
        await refreshExamLibraries();
        toast({
          title: "Shared Pool Updated",
          description: "This exam is now available in the shared pool for other students.",
        });
        return;
      }

      toast({
        title: "Share Failed",
        description: shareResult.reason || "This exam could not be published to the shared pool.",
        variant: "destructive",
      });
    } finally {
      setSharingSessionId(null);
    }
  };

  const handleDeleteSavedExam = async (session: MockExamLibrarySummary) => {
    const confirmed = window.confirm(
      `Delete "${session.topic}" from your saved exams? This removes the saved session, its answers, and any linked private history.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingSessionId(session.sessionId);

    try {
      const deleteResult = await deleteSavedMockExamSession(session.sessionId);

      if (deleteResult.status !== "saved") {
        toast({
          title: "Delete Failed",
          description: deleteResult.reason || "This saved exam could not be deleted.",
          variant: "destructive",
        });
        return;
      }

      if (
        savedSessionId === session.sessionId ||
        activeQuickPracticeSessionId === session.sessionId ||
        resultContext?.sessionId === session.sessionId
      ) {
        resetPracticeState();
        setLastResponse(null);
        setSavedSessionId(null);
        setError("");
        setShowSavedExamsSection(true);
      }

      await refreshExamLibraries();
      toast({
        title: "Saved Exam Deleted",
        description: "The exam was removed from your personal history.",
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  const openDraftEditor = ({
    sessionId,
    topic,
    difficulty: nextDifficulty,
    structured,
  }: {
    sessionId: string | null;
    topic: string;
    difficulty: MockExamDifficulty;
    structured: MockExamStructuredPayload | null;
  }) => {
    if (!structured) {
      toast({
        title: "Draft Unavailable",
        description: "This exam does not have structured draft content to edit yet.",
        variant: "destructive",
      });
      return;
    }

    setEditorSessionId(sessionId);
    setEditorTopic(topic);
    setEditorDifficulty(nextDifficulty);
    setEditorStructured(structured);
    setIsDraftEditorOpen(true);
  };

  const handlePrintExamDraft = async ({
    topic,
    structured,
    difficulty: nextDifficulty = editorDifficulty,
  }: {
    topic: string;
    structured: MockExamStructuredPayload;
    difficulty?: MockExamDifficulty;
  }) => {
    setIsPrintingDraft(true);

    try {
      await printStructuredMockExam({
        topic,
        difficulty: nextDifficulty,
        structured,
      });
      toast({
        title: "Draft Ready to Print",
        description: "A print window opened with the edited exam draft.",
      });
    } catch (error: any) {
      toast({
        title: "Print Failed",
        description: error?.message || "The edited draft could not be printed.",
        variant: "destructive",
      });
    } finally {
      setIsPrintingDraft(false);
    }
  };

  const handleSaveExamDraft = async ({
    topic,
    structured,
  }: {
    topic: string;
    structured: MockExamStructuredPayload;
  }) => {
    if (!editorSessionId) {
      setLastResponse((current) =>
        current
          ? {
              ...current,
              pdf: {
                link: null,
                downloadLink: null,
                fileId: null,
              },
              structured,
            }
          : current,
      );
      setIsDraftEditorOpen(false);
      toast({
        title: "Draft Updated Locally",
        description:
          "This draft was updated in the app. Sign in and save the session if you want to keep the edited version in your history.",
      });
      return;
    }

    setIsSavingDraft(true);

    try {
      const result = await updateSavedMockExamDraft(editorSessionId, {
        topic,
        structured,
      });

      if (result.status !== "saved") {
        toast({
          title: "Save Failed",
          description: result.reason || "The edited draft could not be saved.",
          variant: "destructive",
        });
        return;
      }

      const savedSession = await getSavedMockExamSession(editorSessionId);
      if (!savedSession) {
        toast({
          title: "Draft Saved",
          description:
            "The edited draft was saved, but the refreshed session could not be reloaded automatically.",
        });
        setIsDraftEditorOpen(false);
        await refreshExamLibraries();
        return;
      }

      applySavedSessionConfig(savedSession);
      resetPracticeState();
      setError("");
      setLastResponse(savedSession.normalizedResponse);
      setSavedSessionId(savedSession.sessionId);
      setIsDraftEditorOpen(false);
      await refreshExamLibraries();

      toast({
        title: "Draft Saved",
        description:
          "The edited exam draft replaced the old saved copy. The previous PDF link was cleared, so print a fresh PDF from the draft.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUseSharedExam = async (sharedExam: MockExamSharedExamSummary) => {
    setLoadingSharedExamId(sharedExam.sharedExamId);

    try {
      const sharedResult = await useSharedMockExam(sharedExam.sharedExamId);
      const nextResponse = sharedResult.normalizedResponse;

      if (!nextResponse || !sharedResult.mode || !sharedResult.difficulty || !sharedResult.topic) {
        toast({
          title: "Shared Exam Unavailable",
          description: sharedResult.reason || "This shared exam could not be loaded.",
          variant: "destructive",
        });
        return;
      }

      applySavedSessionConfig({
        mode: sharedResult.mode,
        difficulty: sharedResult.difficulty,
        selectedTopics: sharedResult.selectedTopics ?? sharedExam.selectedTopics,
        requestedCounts: sharedExam.requestedCounts,
        sessionId: sharedResult.sessionId ?? sharedExam.sharedExamId,
      });
      setError("");
      setLastResponse(nextResponse);
      setSavedSessionId(sharedResult.sessionId ?? null);

      if (sharedResult.mode === "quick_practice") {
        if (nextResponse.practiceQuestions.length === 0) {
          toast({
            title: "Shared Practice Unavailable",
            description: "This shared quick-practice exam has no in-app questions to load.",
            variant: "destructive",
          });
          return;
        }

        startQuickPractice(nextResponse.practiceQuestions, sharedResult.sessionId ?? null);
        toast({
          title: "Shared Practice Ready",
          description:
            sharedResult.status === "saved"
              ? "A private copy was created in your history and loaded into the runner."
              : sharedResult.reason ||
                "The shared practice loaded, but a private history copy could not be created.",
          variant: sharedResult.status === "saved" ? "default" : "destructive",
        });
      } else {
        resetPracticeState();
        setLastResponse(nextResponse);
        setSavedSessionId(sharedResult.sessionId ?? null);
        window.scrollTo({ top: 0, behavior: "smooth" });

        if (nextResponse.structured) {
          openDraftEditor({
            sessionId: sharedResult.sessionId ?? null,
            topic: sharedResult.topic,
            difficulty: sharedResult.difficulty,
            structured: nextResponse.structured,
          });
        }

        toast({
          title: "Shared Exam Loaded",
          description:
            sharedResult.status === "saved" && nextResponse.structured
              ? "A private copy of the shared exam is now open. Review, edit, and print it locally."
              : sharedResult.status === "saved"
                ? getWorkflowReviewDescription(
                    nextResponse.warnings,
                    nextResponse.requiresReview,
                    "A private copy of the shared exam was added to your library. Review it in the app and print it locally.",
                  )
              : sharedResult.reason ||
                "The shared exam loaded, but a private history copy could not be created.",
          variant: sharedResult.status === "saved" ? "default" : "destructive",
        });
      }

      await refreshExamLibraries();
    } finally {
      setLoadingSharedExamId(null);
    }
  };

  const handleRetakeExam = () => {
    resetPracticeState();
    setError("");
    setLastResponse(null);
    setSavedSessionId(null);
    setSelectedTopics([...LECTURE_TOPICS]);
    setShowGenerateSection(true);
  };

  const handleBackToStudio = () => {
    resetPracticeState();
    setError("");
    setLastResponse(null);
    setShowSavedExamsSection(true);
  };

  const openExternalLink = (link: string | null, title: string, description: string) => {
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      title,
      description,
      variant: "destructive",
    });
  };

  const getSavedQuickPracticeActionLabel = (session: MockExamLibrarySummary) =>
    session.status === "submitted" || session.status === "graded"
      ? "Practice Again"
      : session.status === "in_progress"
        ? "Continue"
        : "Start Saved Practice";

  const getSavedExamPrimaryActionLabel = (session: MockExamLibrarySummary) =>
    session.mode === "exam_simulation" ? "Open Exam" : getSavedQuickPracticeActionLabel(session);

  const getSharedExamPrimaryActionLabel = (session: MockExamSharedExamSummary) =>
    session.mode === "quick_practice" ? "Start Shared Practice" : "Open Exam";

  const getSavedExamTimestamp = (session: MockExamLibrarySummary) =>
    session.submittedAt ?? session.startedAt ?? session.createdAt;

  const isCompletedQuickPracticeSession = (session: MockExamLibrarySummary) =>
    session.mode === "quick_practice" &&
    (session.status === "submitted" || session.status === "graded");

  const isHighlightedHistorySession = (sessionId: string) =>
    sessionId === savedSessionId ||
    sessionId === activeQuickPracticeSessionId ||
    sessionId === resultContext?.sessionId;

  const renderSavedExamList = () => {
    if (isLoadingSavedExams) {
      return (
        <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
          Loading saved mock exams...
        </div>
      );
    }

    if (filteredSavedExamSessions.length === 0) {
      return (
        <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
          No saved {activeSavedExamFilter === "quick_practice" ? "quick-practice" : "exam-simulation"} sessions yet.
        </div>
      );
    }

    return (
      <Accordion type="single" collapsible className="space-y-3">
        {filteredSavedExamSessions.map((session) => {
          const isLoadingThisSession = loadingSavedSessionId === session.sessionId;
          const isCompletedQuickPractice = isCompletedQuickPracticeSession(session);

          return (
            <AccordionItem
              key={session.sessionId}
              value={session.sessionId}
              className="overflow-hidden rounded-xl border bg-secondary/20 px-4"
            >
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getModeLabel(session.mode)}</Badge>
                    <Badge variant={getStatusVariant(session.status)}>
                      {getStatusLabel(session.status)}
                    </Badge>
                    <Badge variant="secondary">{session.difficulty}</Badge>
                    {isCompletedQuickPractice && (
                      <Badge variant="secondary">
                        {session.percentage}% • {session.scoredPoints}/{session.totalPoints}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 font-medium">{session.topic}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.requestedCounts.mcq} MCQs, {session.requestedCounts.openEnded} open-ended •{" "}
                    {session.totalQuestions} total questions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Saved {formatTimestamp(getSavedExamTimestamp(session))}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4 pt-1">
                {session.selectedTopics.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Topics:{" "}
                    {session.selectedTopics
                      .map((topic) => topic.replace(/Lecture (\d+):/, "L$1:"))
                      .join(", ")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {session.mode === "quick_practice" ? (
                    <>
                      {session.mode === "quick_practice" && (
                        <Button
                          variant="outline"
                          onClick={() => void handleReviewCompletedSession(session.sessionId)}
                          disabled={isLoadingThisSession}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Result
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          void handleStartSavedPractice(session, isCompletedQuickPractice)
                        }
                        disabled={isLoadingThisSession}
                        className="gradient-primary shadow-glow"
                      >
                        {isLoadingThisSession ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading
                          </>
                        ) : (
                          getSavedQuickPracticeActionLabel(session)
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          if (session.pdf.link) {
                            openExternalLink(
                              session.pdf.link,
                              "Cannot Open Saved Exam",
                              "This saved exam simulation does not have a PDF link.",
                            );
                            return;
                          }

                          void handleOpenSavedSession(session);
                        }}
                        disabled={isLoadingThisSession}
                        className="gradient-primary shadow-glow"
                      >
                        {isLoadingThisSession ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading
                          </>
                        ) : (
                          "Load Exam"
                        )}
                      </Button>

                      {session.pdf.downloadLink && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            openExternalLink(
                              session.pdf.downloadLink,
                              "Download Error",
                              "This saved exam simulation does not have a download link.",
                            )
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  void renderSavedExamList;

  if (showResults) {
    const percentage = totalPoints > 0 ? Math.round((scoredPoints / totalPoints) * 100) : 0;
    const reviewQuestion = questions[currentQuestion];
    const reviewResult = reviewQuestion ? submittedAnswers.get(reviewQuestion.id) ?? null : null;
    const selectedOptionIndex =
      typeof reviewResult?.selectedOptionIndex === "number" ? reviewResult.selectedOptionIndex : null;
    const correctOptionIndex =
      reviewQuestion && typeof reviewQuestion.correctAnswer === "number"
        ? reviewQuestion.correctAnswer
        : null;
    const canMovePrev = currentQuestion > 0;
    const canMoveNext = currentQuestion < questions.length - 1;

    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBackToStudio} className="w-fit">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Mock Exam Studio
        </Button>

        <Card className="glass-card shadow-lg border-2">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
              <Target className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl">
              {resultContext?.source === "history" ? "Quick Practice Review" : "Quick Practice Complete"}
            </CardTitle>
            <CardDescription>
              {resultContext?.source === "history"
                ? "Reviewing a completed quick practice attempt from your saved history."
                : "Structured in-app scoring is now working for MCQ-based quick practice."}
            </CardDescription>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {resultContext?.sessionId && (
                <Badge variant="outline">Session {resultContext.sessionId.slice(0, 8)}</Badge>
              )}
              <Badge variant="secondary">{formatTimestamp(resultContext?.submittedAt)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">{percentage}%</div>
              <p className="text-muted-foreground">
                {scoredPoints} out of {totalPoints} points
              </p>
            </div>
            <Progress value={percentage} className="h-3" />

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-primary">
                  {orderedResults.filter(({ result }) => result.isCorrect).length}
                </div>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <div className="text-2xl font-bold text-destructive">
                  {orderedResults.filter(({ result }) => !result.isCorrect).length}
                </div>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>

            <Button onClick={handleBackToStudio} className="w-full gradient-primary shadow-glow">
              <RotateCcw className="w-4 h-4 mr-2" />
              {resultContext?.source === "history"
                ? "Back to Mock Exam Studio"
                : "Start Another Practice Session"}
            </Button>
          </CardContent>
        </Card>

        {reviewQuestion && reviewResult && (
          <Card className="glass-card shadow-lg border-2">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{reviewQuestion.topic}</Badge>
                    <Badge
                      variant={
                        reviewQuestion.difficulty === "hard"
                          ? "destructive"
                          : reviewQuestion.difficulty === "easy"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {reviewQuestion.difficulty}
                    </Badge>
                    <Badge variant="secondary">
                      Question {currentQuestion + 1} of {questions.length}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl leading-relaxed">{reviewQuestion.question}</CardTitle>
                  <CardDescription className="mt-2">
                    Review the exact question and the answer you submitted for this attempt.
                  </CardDescription>
                </div>

                <Badge variant={reviewResult.isCorrect ? "default" : "destructive"}>
                  {reviewResult.isCorrect ? "Correct" : "Incorrect"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-3">
                {reviewQuestion.options.map((option, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  const isCorrectOption = correctOptionIndex === idx;

                  return (
                    <div
                      key={`${reviewQuestion.id}-${idx}`}
                      className={cn(
                        "rounded-lg border-2 p-4",
                        isSelected && isCorrectOption && "border-primary bg-primary/10",
                        isSelected && !isCorrectOption && "border-destructive bg-destructive/10",
                        !isSelected && isCorrectOption && "border-primary/50 bg-primary/5",
                        !isSelected && !isCorrectOption && "border-border bg-background/50",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant={isSelected ? "default" : "outline"} className="mt-0.5">
                          {String.fromCharCode(65 + idx)}
                        </Badge>
                        <div className="flex-1 space-y-2">
                          <p>{formatOptionForDisplay(option, idx)}</p>
                          <div className="flex flex-wrap gap-2">
                            {isSelected && (
                              <Badge variant={reviewResult.isCorrect ? "default" : "destructive"}>
                                Your Answer
                              </Badge>
                            )}
                            {isCorrectOption && (
                              <Badge variant="secondary">Correct Answer</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className={cn(
                  "rounded-lg border p-4 text-sm",
                  reviewResult.isCorrect
                    ? "border-primary/50 bg-primary/5"
                    : "border-destructive/50 bg-destructive/5",
                )}
              >
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Your answer: <span className="font-medium text-foreground">{reviewResult.answer}</span>
                  </p>
                  {!reviewResult.isCorrect && (
                    <p className="text-muted-foreground">
                      Correct answer:{" "}
                      <span className="font-medium text-primary">
                        {getCorrectOptionText(reviewQuestion)}
                      </span>
                    </p>
                  )}
                  {reviewQuestion.explanation && (
                    <p className="text-muted-foreground">
                      Explanation: <span className="font-medium text-foreground">{reviewQuestion.explanation}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={!canMovePrev}
                  className="sm:flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous Question
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  disabled={!canMoveNext}
                  className="sm:flex-1"
                >
                  Next Question
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (examStarted) {
    const question = questions[currentQuestion];
    const currentAnswer = userAnswers.get(question.id) || "";
    const currentResult = submittedAnswers.get(question.id) || null;
    const currentQuestionSubmitted = Boolean(currentResult);
    const nextUnansweredIndex = findNextUnansweredIndex(currentQuestion);

    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBackToStudio} className="w-fit">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Mock Exam Studio
        </Button>

        <Card className="glass-card shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline">{question.topic}</Badge>
                  <Badge
                    variant={
                      question.difficulty === "hard"
                        ? "destructive"
                        : question.difficulty === "easy"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {question.difficulty}
                  </Badge>
                  <Badge variant="secondary">{answeredCount} confirmed</Badge>
                  <Badge variant="outline">{unansweredCount} remaining</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((answeredCount / questions.length) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">Questions Confirmed</p>
              </div>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} className="h-2 mt-4" />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <Card className="glass-card shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Question Navigator
              </CardTitle>
              <CardDescription>
                Pick any question, confirm the answer when you are ready, and come back later if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {questions.map((item, index) => {
                  const submitted = submittedAnswers.get(item.id);
                  const hasDraft = userAnswers.has(item.id) && !submitted;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentQuestion(index)}
                      className={cn(
                        "h-11 rounded-lg border text-sm font-semibold transition-colors",
                        index === currentQuestion && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        submitted?.isCorrect && "border-primary/60 bg-primary/15 text-primary",
                        submitted && !submitted.isCorrect && "border-destructive/60 bg-destructive/10 text-destructive",
                        !submitted && hasDraft && "border-primary/40 bg-primary/10 text-primary",
                        !submitted && !hasDraft && "border-border bg-background/60 hover:border-primary/40",
                      )}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
                  <span>Confirmed correct</span>
                  <Badge variant="default">{orderedResults.filter(({ result }) => result.isCorrect).length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
                  <span>Confirmed incorrect</span>
                  <Badge variant="destructive">{orderedResults.filter(({ result }) => !result.isCorrect).length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
                  <span>Unconfirmed</span>
                  <Badge variant="outline">{unansweredCount}</Badge>
                </div>
              </div>

              {allQuestionsSubmitted && (
                <Button onClick={handleFinishQuickPractice} className="w-full gradient-primary shadow-glow">
                  Finish Quick Practice
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card shadow-lg border-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-xl leading-relaxed flex-1">{question.question}</CardTitle>
                <Badge variant="outline">{question.points} pts</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={currentAnswer}
                onValueChange={handleAnswerChange}
                disabled={currentQuestionSubmitted}
              >
                <div className="space-y-3">
                  {question.options.map((option, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start space-x-3 rounded-lg border-2 p-4 transition-smooth",
                        currentQuestionSubmitted ? "cursor-default opacity-80" : "cursor-pointer",
                        currentAnswer === idx.toString()
                          ? "border-primary bg-primary/5 shadow-glow"
                          : "border-border hover:border-primary/50",
                      )}
                      onClick={() => {
                        if (!currentQuestionSubmitted) {
                          handleAnswerChange(idx.toString());
                        }
                      }}
                    >
                      <RadioGroupItem value={idx.toString()} id={`option-${currentQuestion}-${idx}`} className="mt-0.5" />
                      <Label
                        htmlFor={`option-${currentQuestion}-${idx}`}
                        className={cn("flex-1", !currentQuestionSubmitted && "cursor-pointer")}
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              {currentResult && (
                <div
                  className={cn(
                    "rounded-lg border p-4 text-sm",
                    currentResult.isCorrect
                      ? "border-primary/50 bg-primary/5"
                      : "border-destructive/50 bg-destructive/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold">
                      {currentResult.isCorrect ? "Correct" : "Incorrect"}
                    </p>
                    <Badge variant={currentResult.isCorrect ? "default" : "destructive"}>
                      {currentResult.pointsEarned} / {question.points} pts
                    </Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    Your answer: <span className="font-medium text-foreground">{currentResult.answer}</span>
                  </p>
                  {!currentResult.isCorrect && (
                    <p className="mt-1 text-muted-foreground">
                      Correct answer:{" "}
                      <span className="font-medium text-primary">{getCorrectOptionText(question)}</span>
                    </p>
                  )}
                  {question.explanation && (
                    <p className="mt-2 text-muted-foreground">
                      Explanation: <span className="font-medium text-foreground">{question.explanation}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="sm:flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                  disabled={currentQuestion === questions.length - 1}
                  className="sm:flex-1"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {!currentQuestionSubmitted ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={handleClearSelection}
                    disabled={!currentAnswer}
                    className="sm:flex-1"
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={handleConfirmAnswer}
                    disabled={!currentAnswer}
                    className="sm:flex-1 gradient-primary shadow-glow"
                  >
                    Confirm Answer
                  </Button>
                </div>
              ) : allQuestionsSubmitted ? (
                <Button onClick={handleFinishQuickPractice} className="w-full gradient-primary shadow-glow">
                  Finish Quick Practice
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (nextUnansweredIndex >= 0) {
                      setCurrentQuestion(nextUnansweredIndex);
                    }
                  }}
                  disabled={nextUnansweredIndex < 0}
                  className="w-full gradient-primary shadow-glow"
                >
                  Go to Next Unanswered
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card id="generate-mock-exam-section" className="glass-card shadow-lg border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Mock Exam Studio</CardTitle>
          <CardDescription>
            If you already made a paper before, open <strong>Saved Mock Exams</strong>. If you
            want a fresh paper, open <strong>Generate New Mock Exam</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-secondary/20 p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <p className="font-medium">Saved Mock Exams</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a paper you already made. This is the easiest place to continue, check,
                change, download, or share an older paper.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  if (showSavedExamsSection) {
                    setShowSavedExamsSection(false);
                    return;
                  }

                  focusSavedExamsSection(activeSavedExamFilter, activeSavedExamScope);
                }}
              >
                {showSavedExamsSection ? "Hide Saved Mock Exams" : "Open Saved Mock Exams"}
              </Button>
            </div>

            <div className="rounded-xl border bg-secondary/20 p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <p className="font-medium">Generate New Mock Exam</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a brand-new practice set or exam simulation from the topics and difficulty
                you choose.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  if (showGenerateSection) {
                    setShowGenerateSection(false);
                    return;
                  }

                  focusGenerateExamSection();
                }}
              >
                {showGenerateSection ? "Hide Generate New Mock Exam" : "Open Generate New Mock Exam"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-background/50 p-4">
            <p className="font-medium">What the buttons mean</p>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <p><strong className="text-foreground">Open Exam:</strong> opens the paper inside LearningPacer so you can read it, check it, and change it.</p>
              <p><strong className="text-foreground">Download PDF:</strong> saves a PDF copy of the paper to your device.</p>
              <p><strong className="text-foreground">Print:</strong> creates a fresh printable version after you finish editing the paper.</p>
              <p><strong className="text-foreground">Share to Pool:</strong> adds your paper to the shared pool so other students can reuse it.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="saved-mock-exams-section" className="glass-card shadow-lg border-2">
        <Collapsible open={showSavedExamsSection} onOpenChange={setShowSavedExamsSection}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Saved Mock Exams
                </CardTitle>
                <CardDescription>
                  Reopen an existing exam instead of generating a fresh one.
                </CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">{savedExamSessions.length} my history</Badge>
                  <Badge variant="outline">{sharedExamSessions.length} shared pool</Badge>
                  <Badge variant="outline">
                    {quickPracticeLibraryCount + quickPracticeSharedCount} quick
                  </Badge>
                  <Badge variant="outline">
                    {examSimulationLibraryCount + examSimulationSharedCount} sim
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refreshExamLibraries()}
                  disabled={isLoadingSavedExams || isLoadingSharedExams}
                >
                  Refresh Library
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    {showSavedExamsSection ? "Hide" : "Open"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-secondary/20 p-4">
                <p className="font-medium">Pick an exam you already made</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Switch between your own history and the shared pool. Opening a shared exam makes
                  your own private copy first, so you can work on it safely.
                </p>
              </div>

              <Tabs
                value={activeSavedExamFilter}
                onValueChange={(value) => setActiveSavedExamFilter(value as SavedExamFilter)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="quick_practice">
                    Quick Practice ({quickPracticeLibraryCount + quickPracticeSharedCount})
                  </TabsTrigger>
                  <TabsTrigger value="exam_simulation">
                    Exam Simulation ({examSimulationLibraryCount + examSimulationSharedCount})
                  </TabsTrigger>
                </TabsList>

                {(["quick_practice", "exam_simulation"] as SavedExamFilter[]).map((filter) => {
                  const personalSessions = savedExamSessions
                    .filter((session) => session.mode === filter)
                    .slice()
                    .sort((left, right) => {
                      const priorityDiff =
                        SESSION_STATUS_PRIORITY[left.status] - SESSION_STATUS_PRIORITY[right.status];

                      if (priorityDiff !== 0) {
                        return priorityDiff;
                      }

                      const leftTime = new Date(left.submittedAt ?? left.createdAt).getTime();
                      const rightTime = new Date(right.submittedAt ?? right.createdAt).getTime();
                      return rightTime - leftTime;
                    });
                  const sharedSessions = sharedExamSessions
                    .filter((session) => session.mode === filter)
                    .slice()
                    .sort((left, right) => {
                      if (right.usageCount !== left.usageCount) {
                        return right.usageCount - left.usageCount;
                      }

                      const leftTime = new Date(left.createdAt).getTime();
                      const rightTime = new Date(right.createdAt).getTime();
                      return rightTime - leftTime;
                    });
                  const personalCount =
                    filter === "quick_practice"
                      ? quickPracticeLibraryCount
                      : examSimulationLibraryCount;
                  const sharedCount =
                    filter === "quick_practice"
                      ? quickPracticeSharedCount
                      : examSimulationSharedCount;

                  return (
                    <TabsContent key={`${filter}-shared-pool`} value={filter} className="space-y-4">
                      <Tabs
                        value={activeSavedExamScope}
                        onValueChange={(value) =>
                          setActiveSavedExamScope(value as MockExamLibraryScope)
                        }
                      >
                        <TabsList className="grid w-full grid-cols-2 md:max-w-md">
                          <TabsTrigger value="personal">My History ({personalCount})</TabsTrigger>
                          <TabsTrigger value="shared">
                            <Users className="mr-2 h-4 w-4" />
                            Shared Pool ({sharedCount})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="personal" className="space-y-3">
                          {isLoadingSavedExams ? (
                            <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                              Loading your saved mock exams...
                            </div>
                          ) : personalSessions.length === 0 ? (
                            <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                              {savedExamSessions.length === 0
                                ? "No personal mock exams yet. Generate one below and it will appear here."
                                : "No personal exams match this mode yet."}
                            </div>
                          ) : (
                            personalSessions.map((session) => {
                              const isLoadingThisSession =
                                loadingSavedSessionId === session.sessionId;
                              const isSharingThisSession =
                                sharingSessionId === session.sessionId;
                              const isDeletingThisSession =
                                deletingSessionId === session.sessionId;
                              const isBusyThisSession =
                                isLoadingThisSession ||
                                isSharingThisSession ||
                                isDeletingThisSession;
                              const actionLabel = getSavedExamPrimaryActionLabel(session);
                              const isHighlightedThisSession = isHighlightedHistorySession(
                                session.sessionId,
                              );

                              return (
                                <div
                                  key={`${filter}-${session.sessionId}`}
                                  className={cn(
                                    "rounded-xl border bg-secondary/20 p-4 transition-all",
                                    isHighlightedThisSession &&
                                      "border-primary/50 bg-primary/5 shadow-glow ring-1 ring-primary/30",
                                  )}
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{getModeLabel(session.mode)}</Badge>
                                        <Badge variant={getStatusVariant(session.status)}>
                                          {getStatusLabel(session.status)}
                                        </Badge>
                                        <Badge variant="secondary">{session.difficulty}</Badge>
                                        {session.requiresReview && (
                                          <Badge variant="destructive">Review Required</Badge>
                                        )}
                                        {!session.requiresReview && session.warningCount > 0 && (
                                          <Badge variant="outline">
                                            {formatWarningCount(session.warningCount)}
                                          </Badge>
                                        )}
                                        {session.isSharedToPool && (
                                          <Badge variant="outline">Shared</Badge>
                                        )}
                                        {isHighlightedThisSession && (
                                          <Badge className="shadow-glow">Open Now</Badge>
                                        )}
                                        {session.mode === "quick_practice" &&
                                          (session.status === "submitted" ||
                                            session.status === "graded") && (
                                            <Badge variant="secondary">
                                              {session.percentage}% • {session.scoredPoints}/
                                              {session.totalPoints}
                                            </Badge>
                                          )}
                                      </div>
                                      <div>
                                        <p className="font-medium">{session.topic}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {session.requestedCounts.mcq} MCQs,{" "}
                                          {session.requestedCounts.openEnded} open-ended •{" "}
                                          {session.totalQuestions} total questions
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Saved {formatTimestamp(getSavedExamTimestamp(session))}
                                        </p>
                                      </div>
                                      {session.selectedTopics.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                          Topics:{" "}
                                          {session.selectedTopics
                                            .map((topic) =>
                                              topic.replace(/Lecture (\d+):/, "L$1:"),
                                            )
                                            .join(", ")}
                                        </p>
                                      )}
                                      {session.mode === "exam_simulation" &&
                                        (session.requiresReview || session.warningCount > 0) && (
                                          <p className="text-xs text-amber-700 dark:text-amber-300">
                                            {session.requiresReview
                                              ? "This draft should be checked before you print it. Open it in LearningPacer first."
                                              : `${formatWarningCount(session.warningCount)} were saved with this draft. Open it in LearningPacer before you print it.`}
                                          </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                                      <Button
                                        onClick={() => {
                                          if (session.mode === "quick_practice") {
                                            void handleStartSavedPractice(
                                              session,
                                              isCompletedQuickPracticeSession(session),
                                            );
                                            return;
                                          }

                                          void handleOpenSavedSession(session);
                                        }}
                                        disabled={
                                          isLoadingThisSession ||
                                          isDeletingThisSession
                                        }
                                        className="gradient-primary shadow-glow"
                                      >
                                        {isLoadingThisSession || isDeletingThisSession ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {isDeletingThisSession
                                              ? "Deleting"
                                              : "Loading"}
                                          </>
                                        ) : (
                                          actionLabel
                                        )}
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={isBusyThisSession}
                                            aria-label="More exam actions"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52">
                                          {session.mode === "quick_practice" && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                void handleReviewCompletedSession(session.sessionId)
                                              }
                                            >
                                              <Eye className="mr-2 h-4 w-4" />
                                              View Result
                                            </DropdownMenuItem>
                                          )}

                                          {session.mode === "exam_simulation" &&
                                            session.pdf.downloadLink && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  openExternalLink(
                                                    session.pdf.downloadLink,
                                                    "Download Error",
                                                    "This saved exam simulation does not have a download link.",
                                                  )
                                                }
                                              >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
                                              </DropdownMenuItem>
                                            )}

                                          <DropdownMenuItem
                                            onClick={() => void handleShareSavedExam(session)}
                                            disabled={
                                              isSharingThisSession || Boolean(session.isSharedToPool)
                                            }
                                          >
                                            <Share2 className="mr-2 h-4 w-4" />
                                            {session.isSharedToPool
                                              ? "Already Shared"
                                              : "Share to Pool"}
                                          </DropdownMenuItem>

                                          <DropdownMenuSeparator />

                                          <DropdownMenuItem
                                            onClick={() => void handleDeleteSavedExam(session)}
                                            className="text-destructive focus:text-destructive"
                                            disabled={isDeletingThisSession}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Exam
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </TabsContent>

                        <TabsContent value="shared" className="space-y-3">
                          {isLoadingSharedExams ? (
                            <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                              Loading shared mock exams...
                            </div>
                          ) : sharedSessions.length === 0 ? (
                            <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                              No shared exams are available for this mode yet.
                            </div>
                          ) : (
                            sharedSessions.map((session) => {
                              const isLoadingThisSharedExam =
                                loadingSharedExamId === session.sharedExamId;

                              return (
                                <div
                                  key={session.sharedExamId}
                                  className="rounded-xl border bg-secondary/20 p-4"
                                >
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{getModeLabel(session.mode)}</Badge>
                                        <Badge variant="secondary">{session.difficulty}</Badge>
                                        <Badge variant="outline">{session.usageCount} uses</Badge>
                                        {session.requiresReview && (
                                          <Badge variant="destructive">Review Required</Badge>
                                        )}
                                        {!session.requiresReview && session.warningCount > 0 && (
                                          <Badge variant="outline">
                                            {formatWarningCount(session.warningCount)}
                                          </Badge>
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium">{session.topic}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {session.requestedCounts.mcq} MCQs,{" "}
                                          {session.requestedCounts.openEnded} open-ended •{" "}
                                          {session.totalQuestions} total questions
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Shared {formatTimestamp(session.createdAt)}
                                        </p>
                                      </div>
                                      {session.selectedTopics.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                          Topics:{" "}
                                          {session.selectedTopics
                                            .map((topic) =>
                                              topic.replace(/Lecture (\d+):/, "L$1:"),
                                            )
                                            .join(", ")}
                                        </p>
                                      )}
                                      {session.mode === "exam_simulation" &&
                                        (session.requiresReview || session.warningCount > 0) && (
                                          <p className="text-xs text-amber-700 dark:text-amber-300">
                                            {session.requiresReview
                                              ? "This shared draft should be checked before you print it. Open it in LearningPacer first."
                                              : `${formatWarningCount(session.warningCount)} came with this shared draft. Open it in LearningPacer before you print it.`}
                                          </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                                      <Button
                                        onClick={() => void handleUseSharedExam(session)}
                                        disabled={isLoadingThisSharedExam}
                                        className="gradient-primary shadow-glow"
                                      >
                                        {isLoadingThisSharedExam ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Loading
                                          </>
                                        ) : (
                                          getSharedExamPrimaryActionLabel(session)
                                        )}
                                      </Button>

                                      {session.pdf.downloadLink && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              disabled={isLoadingThisSharedExam}
                                              aria-label="More shared exam actions"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-52">
                                            {session.pdf.downloadLink && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  openExternalLink(
                                                    session.pdf.downloadLink,
                                                    "Download Error",
                                                    "This shared exam simulation does not have a download link.",
                                                  )
                                                }
                                              >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download PDF
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  );
                })}

            {false && (["quick_practice", "exam_simulation"] as SavedExamFilter[]).map((filter) => (
              <TabsContent key={filter} value={filter} className="space-y-3">
                {isLoadingSavedExams ? (
                  <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    Loading saved mock exams...
                  </div>
                ) : filteredSavedExamSessions.length === 0 ? (
                  <div className="rounded-lg border bg-secondary/20 p-4 text-sm text-muted-foreground">
                    {savedExamSessions.length === 0
                      ? "No saved mock exams yet. Generate one below and it will appear here."
                      : "No saved exams match this filter yet."}
                  </div>
                ) : (
                  filteredSavedExamSessions.map((session) => {
                    const isLoadingThisSession = loadingSavedSessionId === session.sessionId;
                    const actionLabel = getSavedExamPrimaryActionLabel(session);

                    return (
                      <div
                        key={session.sessionId}
                        className="rounded-xl border bg-secondary/20 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{getModeLabel(session.mode)}</Badge>
                              <Badge variant={getStatusVariant(session.status)}>
                                {getStatusLabel(session.status)}
                              </Badge>
                              <Badge variant="secondary">{session.difficulty}</Badge>
                              {session.mode === "quick_practice" &&
                                (session.status === "submitted" || session.status === "graded") && (
                                  <Badge variant="secondary">
                                    {session.percentage}% • {session.scoredPoints}/{session.totalPoints}
                                  </Badge>
                                )}
                            </div>
                            <div>
                              <p className="font-medium">{session.topic}</p>
                              <p className="text-sm text-muted-foreground">
                                {session.requestedCounts.mcq} MCQs, {session.requestedCounts.openEnded} open-ended •{" "}
                                {session.totalQuestions} total questions
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Saved {formatTimestamp(getSavedExamTimestamp(session))}
                              </p>
                            </div>
                            {session.selectedTopics.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Topics: {session.selectedTopics.map((topic) => topic.replace(/Lecture (\d+):/, "L$1:")).join(", ")}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
                            {session.mode === "quick_practice" && (
                              <Button
                                variant="outline"
                                onClick={() => void handleReviewCompletedSession(session.sessionId)}
                                disabled={isLoadingThisSession}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Result
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                if (session.mode === "quick_practice") {
                                  void handleStartSavedPractice(
                                    session,
                                    isCompletedQuickPracticeSession(session),
                                  );
                                  return;
                                }

                                void handleOpenSavedSession(session);
                              }}
                              disabled={isLoadingThisSession}
                              className="gradient-primary shadow-glow"
                            >
                              {isLoadingThisSession ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Loading
                                </>
                              ) : (
                                actionLabel
                              )}
                            </Button>

                            {session.mode === "exam_simulation" && session.pdf.link && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  openExternalLink(
                                    session.pdf.link,
                                    "Cannot Open Saved Exam",
                                    "This saved exam simulation does not have a PDF link.",
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Open Remote PDF
                              </Button>
                            )}

                            {session.mode === "exam_simulation" && session.pdf.downloadLink && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  openExternalLink(
                                    session.pdf.downloadLink,
                                    "Download Error",
                                    "This saved exam simulation does not have a download link.",
                                  )
                                }
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download Remote PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            ))}
          </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="glass-card shadow-lg border-2">
        <Collapsible open={showGenerateSection} onOpenChange={setShowGenerateSection}>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Brain className="w-6 h-6 text-primary" />
                  Generate New Mock Exam
                </CardTitle>
                <CardDescription>
                  Generate a fresh quick-practice drill or exam simulation only when you want a new paper.
                </CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {examMode === "quick_practice" ? "Quick practice" : "Exam simulation"}
                  </Badge>
                  <Badge variant="secondary">{difficulty}</Badge>
                  <Badge variant="outline">Saved session history</Badge>
                </div>
              </div>

              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {showGenerateSection ? "Hide" : "Open"}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-lg bg-secondary/20">
            <h3 className="font-semibold text-lg">Customize Your Exam</h3>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Mode</h4>
                <Badge variant="outline">
                  {examMode === "quick_practice" ? "In-app drill" : "Structured draft + local print"}
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamMode("quick_practice")}
                  disabled={isLoadingQuestions}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    examMode === "quick_practice"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">Quick Practice</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MCQ-only, in-app, free navigation, and instant feedback after you confirm each answer.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("exam_simulation")}
                  disabled={isLoadingQuestions}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    examMode === "exam_simulation"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background/60 hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">Exam Simulation</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generates a structured exam draft in-app. Review it, edit it, and print a fresh
                    PDF locally for the most reliable result.
                  </p>
                </button>
              </div>
            </div>

            <Collapsible open={topicsExpanded} onOpenChange={setTopicsExpanded} className="space-y-3 pt-2 border-t">
              <div className="flex flex-col gap-3 rounded-lg border bg-background/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Lecture Topics</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {allSelected
                        ? `All ${totalLectures} lectures selected`
                        : noneSelected
                          ? "No lectures selected yet"
                          : `${selectedCount} of ${totalLectures} lectures selected`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTopics([...LECTURE_TOPICS])}
                      disabled={isLoadingQuestions || allSelected}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTopics([])}
                      disabled={isLoadingQuestions || noneSelected}
                    >
                      Clear All
                    </Button>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm">
                        {topicsExpanded ? "Hide Topics" : "Edit Topics"}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                {noneSelected && (
                  <p className="text-sm text-destructive">
                    Select at least one lecture before generating an exam.
                  </p>
                )}
              </div>

              <CollapsibleContent>
                <div className="grid grid-cols-1 gap-2 rounded-lg border bg-background/50 p-3 md:grid-cols-2">
                  {LECTURE_TOPICS.map((lecture) => {
                    const isSelected = selectedTopics.includes(lecture);
                    const shortName = lecture.replace(/Lecture (\d+):/, "L$1:");

                    return (
                      <label
                        key={lecture}
                        className={cn(
                          "flex items-center gap-2 rounded-md p-2 text-sm transition-colors",
                          "hover:bg-secondary/50",
                          isSelected && "bg-primary/10",
                          isLoadingQuestions && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTopics([...selectedTopics, lecture]);
                            } else {
                              setSelectedTopics(selectedTopics.filter((topic) => topic !== lecture));
                            }
                          }}
                          disabled={isLoadingQuestions}
                        />
                        <span className={cn("truncate", !isSelected && "text-muted-foreground")}>
                          {shortName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mcq">Multiple Choice Questions</Label>
                <Select value={numMCQ} onValueChange={setNumMCQ} disabled={isLoadingQuestions}>
                  <SelectTrigger id="mcq">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {examMode === "exam_simulation" && <SelectItem value="0">0 Questions</SelectItem>}
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={cn(openEndedDisabled && "opacity-60")}>
                <Label htmlFor="open">Open-Ended Questions</Label>
                <Select
                  value={effectiveNumOpenEnded}
                  onValueChange={setNumOpenEnded}
                  disabled={isLoadingQuestions || openEndedDisabled}
                >
                  <SelectTrigger id="open">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 Questions</SelectItem>
                    <SelectItem value="3">3 Questions</SelectItem>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="7">7 Questions</SelectItem>
                  </SelectContent>
                </Select>
                {openEndedDisabled && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Quick Practice is MCQ-only, so short-answer generation is disabled here.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Difficulty Level</Label>
              <RadioGroup
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as MockExamDifficulty)}
                disabled={isLoadingQuestions}
              >
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="easy" id="easy" />
                    <Label htmlFor="easy" className="font-normal cursor-pointer">
                      Easy
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="font-normal cursor-pointer">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hard" id="hard" />
                    <Label htmlFor="hard" className="font-normal cursor-pointer">
                      Hard
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Professor-Style Questions</h3>
                <p className="text-sm text-muted-foreground">
                  6 question archetypes modeled on real ELEC3120 past papers and homework.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Difficulty-Driven Structure</h3>
                <p className="text-sm text-muted-foreground">
                  Easy, Medium, and Hard change the exam blueprint — not just a prompt hint.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Brain className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Diagrams & Tables</h3>
                <p className="text-sm text-muted-foreground">
                  Network topologies, sequence diagrams, and TCP fill-in tables rendered in the
                  printable draft.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Exam Draft & Print</h3>
                <p className="text-sm text-muted-foreground">
                  Professional A4 exam with HKUST header, instructions, and a reliable local print
                  path.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={fetchExamQuestions} className="ml-4">
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoadingQuestions ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div className="space-y-3">
                <p className="font-medium">Generating your personalized exam...</p>
                <p className="text-sm text-muted-foreground">
                  This typically takes 30-60 seconds
                </p>
                <p className="text-xs text-muted-foreground">
                  Elapsed: {Math.floor(elapsedTime / 1000)}s
                </p>
              </div>
            </div>
          ) : (
            <Button
              onClick={fetchExamQuestions}
              disabled={noneSelected}
              className="w-full gradient-primary shadow-glow text-lg py-6"
            >
              <FileText className="w-5 h-5 mr-2" />
              {examMode === "quick_practice" ? "Generate Quick Practice" : "Generate Exam Simulation"}
            </Button>
          )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <MockExamDraftEditorDialog
        open={isDraftEditorOpen}
        onOpenChange={(open) => {
          setIsDraftEditorOpen(open);
          if (!open) {
            setEditorSessionId(null);
            setEditorStructured(null);
          }
        }}
        topic={editorTopic}
        difficulty={editorDifficulty}
        structured={editorStructured}
        canSave={Boolean(editorSessionId)}
        isSaving={isSavingDraft}
        isPrinting={isPrintingDraft}
        onSave={handleSaveExamDraft}
        onPrint={handlePrintExamDraft}
      />
    </div>
  );
};

export default MockExamMode;
