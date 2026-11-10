import React, { useState, useEffect } from 'react';
import { UatReport, ClarificationQuestion, TesterClarificationItem } from '../types/uat';
import { StatusBadge } from './StatusBadge';
import { 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  FileQuestion, 
  Info, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  RotateCcw,
  Check,
  X,
  HelpCircle
} from 'lucide-react';

interface TesterViewProps {
  reports: UatReport[];
  onSubmitReport: (data: {
    testStepOrPage: string;
    originalFeedback: string;
    expectedResult: string;
    actualResult: string;
    clarifications?: TesterClarificationItem[];
  }) => UatReport;
  onAnswerClarification?: (reportId: string, answer: string) => void;
  onSelectReportToInspect?: (report: UatReport) => void;
}

export const TesterView: React.FC<TesterViewProps> = ({
  reports,
  onSubmitReport,
  onAnswerClarification,
}) => {
  const [testStepOrPage, setTestStepOrPage] = useState('');
  const [originalFeedback, setOriginalFeedback] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [recentSubmittedId, setRecentSubmittedId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // AI Clarification States
  const [configuredModel, setConfiguredModel] = useState<string>('gemini-3.8-flash');
  const [isAiAvailable, setIsAiAvailable] = useState<boolean>(true);
  const [isClarifying, setIsClarifying] = useState<boolean>(false);
  const [clarificationError, setClarificationError] = useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = useState<ClarificationQuestion[]>([]);
  const [hasSufficientDetail, setHasSufficientDetail] = useState<boolean | null>(null);
  const [aiObservation, setAiObservation] = useState<string>('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [confirmedClarifications, setConfirmedClarifications] = useState<TesterClarificationItem[]>([]);
  const [showClarificationForm, setShowClarificationForm] = useState<boolean>(false);
  const [clarificationReplies, setClarificationReplies] = useState<Record<string, string>>({});

  const handleAnswerManagerQuestion = (reportId: string) => {
    const text = (clarificationReplies[reportId] || '').trim();
    if (!text) return;
    if (onAnswerClarification) {
      onAnswerClarification(reportId, text);
      setClarificationReplies((prev) => ({ ...prev, [reportId]: '' }));
    }
  };

  // Check configured model info on mount
  useEffect(() => {
    fetch('/api/model-info')
      .then((res) => res.json())
      .then((data) => {
        if (data?.configuredModel) {
          setConfiguredModel(data.configuredModel);
        }
        if (data?.isAvailable !== undefined) {
          setIsAiAvailable(data.isAvailable);
        }
      })
      .catch(() => {
        // Fallback default
        setConfiguredModel('gemini-3.8-flash');
      });
  }, []);

  // Request AI follow-up questions
  const handleRequestClarification = async () => {
    if (!originalFeedback.trim()) {
      setValidationError('Please enter your initial feedback before requesting clarification.');
      return;
    }

    setValidationError('');
    setClarificationError(null);
    setIsClarifying(true);
    setShowClarificationForm(false);
    setHasSufficientDetail(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

    try {
      const response = await fetch('/api/clarify-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testStepOrPage,
          originalFeedback,
          expectedResult,
          actualResult,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'AI unavailable — you can still submit for manual review');
      }

      if (data?.configuredModel) {
        setConfiguredModel(data.configuredModel);
      }

      if (data?.hasSufficientDetail || !data?.questions || data.questions.length === 0) {
        setHasSufficientDetail(true);
        setAiObservation(data?.summaryObservation || 'Your feedback already provides sufficient detail for engineering reproduction.');
        setAiQuestions([]);
      } else {
        setHasSufficientDetail(false);
        setAiObservation(data?.summaryObservation || 'A few quick clarifications will help developers reproduce this faster.');
        setAiQuestions(data.questions);
        setShowClarificationForm(true);

        // Preserve previously typed answers if re-requested, or initialize empty
        const initialAnswers: Record<string, string> = { ...questionAnswers };
        data.questions.forEach((q: ClarificationQuestion) => {
          if (!initialAnswers[q.id]) {
            initialAnswers[q.id] = '';
          }
        });
        setQuestionAnswers(initialAnswers);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('AI clarification request failed:', err);
      // Strictly report "AI unavailable — you can still submit for manual review" as required
      setClarificationError('AI unavailable — you can still submit for manual review');
    } finally {
      setIsClarifying(false);
    }
  };

  // Helper: user selects "I'm not sure"
  const handleSetNotSure = (questionId: string) => {
    setQuestionAnswers((prev) => ({
      ...prev,
      [questionId]: "I'm not sure",
    }));
  };

  // Attach clarified answers to report
  const handleAttachAnswers = () => {
    const items: TesterClarificationItem[] = aiQuestions
      .map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: (questionAnswers[q.id] || '').trim(),
      }))
      .filter((item) => item.answer.length > 0);

    setConfirmedClarifications(items);
    setShowClarificationForm(false);
  };

  // Skip questions without answering
  const handleSkipClarification = () => {
    setShowClarificationForm(false);
  };

  // Submit report to localStorage
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    if (!originalFeedback.trim()) {
      setValidationError('Please enter your feedback describing what you observed.');
      return;
    }

    setValidationError('');
    setIsSubmitting(true);

    try {
      const created = onSubmitReport({
        testStepOrPage,
        originalFeedback,
        expectedResult,
        actualResult,
        clarifications: confirmedClarifications,
      });

      // Reset form fields and AI states
      setTestStepOrPage('');
      setOriginalFeedback('');
      setExpectedResult('');
      setActualResult('');
      setConfirmedClarifications([]);
      setAiQuestions([]);
      setQuestionAnswers({});
      setShowClarificationForm(false);
      setHasSufficientDetail(null);
      setClarificationError(null);

      setRecentSubmittedId(created.id);
      setExpandedReportId(created.id);

      setTimeout(() => {
        setIsSubmitting(false);
      }, 300);
    } catch {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedReportId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      {/* Intro Header with Configured Model Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Tester Workspace: Log UAT Observations
              </h1>
              <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                AI Powered by {configuredModel}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Describe what happened in your test scenario. Use the <strong className="font-semibold text-slate-800">"Help me explain this"</strong> button 
              to get targeted clarification questions from Gemini, or submit directly for manager triage.
            </p>
          </div>

          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 max-w-xs">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              AI Boundary Rule
            </div>
            The AI only clarifies your notes. It cannot approve, reject, delete, or create bug tickets. Real approvals belong to the UAT Manager.
          </div>
        </div>
      </div>

      {recentSubmittedId && (
        <div 
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-lg flex items-center justify-between gap-3 text-sm"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>Report saved successfully!</strong> Assigned reference code{' '}
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
                {recentSubmittedId}
              </span>
              . Status is <strong>Pending review</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRecentSubmittedId(null)}
            className="text-xs text-emerald-800 hover:text-emerald-950 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Entry Form + Submitted Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form (7 cols) */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Submit New UAT Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in your feedback below. Required fields are marked with an asterisk (*).
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Model: <strong className="text-slate-800">{configuredModel}</strong>
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Optional Test Step or Page Name */}
            <div>
              <label 
                htmlFor="testStepOrPage" 
                className="block text-sm font-semibold text-slate-800 mb-1"
              >
                Test Step or Page Name <span className="text-xs font-normal text-slate-500">(Optional)</span>
              </label>
              <input
                id="testStepOrPage"
                type="text"
                value={testStepOrPage}
                onChange={(e) => setTestStepOrPage(e.target.value)}
                placeholder="e.g. Checkout flow - Step 3 Payment Details"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isSubmitting}
              />
              <p className="text-[12px] text-slate-500 mt-1">
                Helps locate where in the application you encountered the behavior.
              </p>
            </div>

            {/* Original Feedback (Required) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label 
                  htmlFor="originalFeedback" 
                  className="block text-sm font-semibold text-slate-800"
                >
                  Original Tester Feedback <span className="text-red-600" aria-label="Required">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Untrusted report text
                </span>
              </div>

              <textarea
                id="originalFeedback"
                rows={4}
                value={originalFeedback}
                onChange={(e) => {
                  setOriginalFeedback(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="Explain what happened, what felt broken, or what was unexpected..."
                className={`w-full px-3 py-2 text-sm bg-white border rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                  validationError
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-indigo-500'
                }`}
                disabled={isSubmitting}
                required
              />

              {validationError ? (
                <p className="text-xs text-red-600 font-medium mt-1" role="alert">
                  {validationError}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1.5">
                  <p className="text-[12px] text-slate-500">
                    Write in your own words. You can use the AI assistant below to check for missing details.
                  </p>

                  {/* "Help me explain this" Button */}
                  <button
                    type="button"
                    onClick={handleRequestClarification}
                    disabled={isClarifying || isSubmitting || !originalFeedback.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-200 transition-colors shrink-0 shadow-2xs"
                  >
                    {isClarifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Help me explain this</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* AI Clarification Feedback Box / Error State / Short Form */}
            {clarificationError && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3.5 rounded-lg text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="font-semibold">{clarificationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClarificationError(null)}
                    className="text-amber-800 hover:text-amber-950 font-bold p-0.5"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-amber-800">
                  Your original feedback is safely preserved. You can proceed to submit for manual review or retry the AI check.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestClarification}
                    disabled={isClarifying}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded font-semibold text-[11px] hover:bg-amber-100"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry AI check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClarificationError(null)}
                    className="text-[11px] text-amber-800 underline hover:text-amber-950"
                  >
                    Submit for manual review without AI
                  </button>
                </div>
              </div>
            )}

            {/* AI Sufficient Detail Banner */}
            {hasSufficientDetail && !clarificationError && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3.5 rounded-lg text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">Sufficient Detail Detected</span>
                    <span className="text-[11px] text-emerald-800">{aiObservation}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasSufficientDetail(null)}
                  className="text-emerald-800 hover:text-emerald-950 text-xs underline font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Targeted Follow-up Questions Short Form (NOT a general chat window) */}
            {showClarificationForm && aiQuestions.length > 0 && (
              <div className="bg-slate-50 border border-indigo-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      AI Clarification Questions ({aiQuestions.length} targeted)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Engine: {configuredModel}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  {aiObservation} Answer what you can; blank answers and "I'm not sure" are welcome.
                </p>

                <div className="space-y-3">
                  {aiQuestions.map((q, index) => (
                    <div key={q.id} className="bg-white p-3 rounded-md border border-slate-200 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <label 
                          htmlFor={`clarify-${q.id}`} 
                          className="text-xs font-semibold text-slate-800 block"
                        >
                          {index + 1}. {q.question}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSetNotSure(q.id)}
                          className="text-[11px] text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200 font-medium whitespace-nowrap shrink-0"
                          title="Click if you don't have this detail"
                        >
                          I'm not sure
                        </button>
                      </div>

                      {q.hint && (
                        <p className="text-[11px] text-slate-500 italic">
                          Hint: {q.hint}
                        </p>
                      )}

                      <input
                        id={`clarify-${q.id}`}
                        type="text"
                        value={questionAnswers[q.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionAnswers((prev) => ({
                            ...prev,
                            [q.id]: val,
                          }));
                        }}
                        placeholder="Your answer or leave blank..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>

                {/* Form Buttons: Attach or Continue Without Answering */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleSkipClarification}
                    className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                  >
                    Continue without answering
                  </button>

                  <button
                    type="button"
                    onClick={handleAttachAnswers}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Add answers to report</span>
                  </button>
                </div>
              </div>
            )}

            {/* Attached Clarifications Summary Badge */}
            {confirmedClarifications.length > 0 && !showClarificationForm && (
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-950 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{confirmedClarifications.length} Clarification(s) attached to report</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClarificationForm(true)}
                    className="text-[11px] text-indigo-700 font-semibold underline hover:text-indigo-900"
                  >
                    Edit answers
                  </button>
                </div>
                <ul className="space-y-1 text-slate-700 text-[11px]">
                  {confirmedClarifications.map((c, i) => (
                    <li key={i} className="bg-white p-1.5 rounded border border-indigo-100">
                      <strong>Q:</strong> {c.question} <br />
                      <span className="text-slate-900 font-medium">A: {c.answer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Optional Expected and Actual Results in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label 
                  htmlFor="expectedResult" 
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Expected Result <span className="text-xs font-normal text-slate-500">(Optional)</span>
                </label>
                <textarea
                  id="expectedResult"
                  rows={3}
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="What did you expect should happen according to acceptance criteria?"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label 
                  htmlFor="actualResult" 
                  className="block text-sm font-semibold text-slate-800 mb-1"
                >
                  Actual Result <span className="text-xs font-normal text-slate-500">(Optional)</span>
                </label>
                <textarea
                  id="actualResult"
                  rows={3}
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  placeholder="What actually occurred on screen or in the workflow?"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Will be assigned unique ID and stored in browser
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 text-white text-sm font-semibold rounded-md shadow-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>{isSubmitting ? 'Saving Report...' : 'Submit UAT Feedback'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Submitted Reports by Tester (5 cols) */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Your Logged Reports
              </h2>
              <p className="text-xs text-slate-500">
                Track status across UAT review
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
              {reports.length} total
            </span>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-lg">
              <FileQuestion className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No reports logged yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Submit your first observation using the form on the left. It will appear here immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {reports.map((report) => {
                const isExpanded = expandedReportId === report.id;
                const isApproved = report.status === 'Approved as bug';

                return (
                  <div
                    key={report.id}
                    className={`border rounded-lg transition-all ${
                      report.id === recentSubmittedId
                        ? 'border-indigo-400 bg-indigo-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {report.id}
                            </span>
                            <StatusBadge status={report.status} />
                          </div>
                          {report.testerInput.testStepOrPage && (
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                              {report.testerInput.testStepOrPage}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpand(report.id)}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                          aria-label={isExpanded ? 'Collapse report details' : 'Expand report details'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {report.testerInput.originalFeedback}
                      </p>

                      {/* Prominent Manager Clarification Request Notice & Reply Box */}
                      {(report.status === 'Clarification requested' || report.activeClarificationQuestion) && (
                        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md text-xs space-y-2">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-indigo-950 block">
                                Manager Clarification Requested
                              </span>
                              <p className="text-slate-800 font-medium mt-1 bg-white p-2 rounded border border-indigo-100">
                                "{report.activeClarificationQuestion?.question || report.statusExplanation || 'The UAT Manager requested additional clarification on this report.'}"
                              </p>
                            </div>
                          </div>

                          {onAnswerClarification && (
                            <div className="space-y-1.5 pt-1">
                              <label htmlFor={`reply-${report.id}`} className="block text-[11px] font-semibold text-indigo-900">
                                Your Answer to Manager (will return status to Pending review):
                              </label>
                              <textarea
                                id={`reply-${report.id}`}
                                rows={2}
                                value={clarificationReplies[report.id] || ''}
                                onChange={(e) => setClarificationReplies((prev) => ({ ...prev, [report.id]: e.target.value }))}
                                placeholder="Type your answer with additional details, screenshots/steps context..."
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                              />
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setClarificationReplies((prev) => ({ ...prev, [report.id]: "I'm not sure / No further details available" }))}
                                  className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                                >
                                  I'm not sure
                                </button>
                                <button
                                  type="button"
                                  disabled={!clarificationReplies[report.id]?.trim()}
                                  onClick={() => handleAnswerManagerQuestion(report.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-2xs"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Submit Answer to Manager</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manager Explanation Display for Decisions */}
                      {report.statusExplanation && report.status !== 'Clarification requested' && (
                        <div className="mt-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                          <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wide">
                            Manager Decision Note:
                          </span>
                          <p className="text-slate-700 mt-0.5 italic">
                            "{report.statusExplanation}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                        <span>
                          Logged {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {isApproved ? 'Approved for Dev' : report.status === 'Clarification requested' ? 'Awaiting Your Response' : 'Awaiting Manager'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/70 text-xs space-y-2 rounded-b-lg">
                        <div>
                          <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                            Full Original Feedback:
                          </span>
                          <p className="text-slate-800 whitespace-pre-wrap mt-0.5 bg-white p-2 rounded border border-slate-200">
                            {report.testerInput.originalFeedback}
                          </p>
                        </div>

                        {report.testerInput.clarifications && report.testerInput.clarifications.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                              AI Clarification Follow-ups:
                            </span>
                            <div className="mt-0.5 bg-white p-2 rounded border border-slate-200 space-y-1">
                              {report.testerInput.clarifications.map((item, idx) => (
                                <div key={idx} className="text-[11px]">
                                  <span className="font-medium text-slate-700">Q: {item.question}</span>
                                  <p className="text-slate-900 font-semibold">{item.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {report.testerInput.expectedResult && (
                          <div>
                            <span className="font-semibold text-slate-700 block text-[11px]">
                              Expected:
                            </span>
                            <p className="text-slate-600 mt-0.5">{report.testerInput.expectedResult}</p>
                          </div>
                        )}

                        {report.testerInput.actualResult && (
                          <div>
                            <span className="font-semibold text-slate-700 block text-[11px]">
                              Actual:
                            </span>
                            <p className="text-slate-600 mt-0.5">{report.testerInput.actualResult}</p>
                          </div>
                        )}

                        {isApproved && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-xs">
                            <span className="font-semibold block">Manager Approval Note:</span>
                            <span>
                              Promoted to Bug: "{report.managerReview.summaryTitle}" ({report.managerReview.priority})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
