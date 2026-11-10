/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DemoRole, UatReport, ManagerReview, TesterClarificationItem } from './types/uat';
import {
  getStoredReports,
  createReport,
  approveReportAsBug,
  requestClarification,
  answerClarification,
  moveReportToIdeas,
  deferReport,
  markReportNotABug,
  saveManagerDraftFields,
  revokeApproval,
  clearAllReports,
  generateDemoSampleReports,
} from './utils/storage';
import { Banner } from './components/Banner';
import { RoleSwitcher } from './components/RoleSwitcher';
import { TesterView } from './components/TesterView';
import { ManagerView } from './components/ManagerView';
import { DeveloperView } from './components/DeveloperView';
import { 
  Bug, 
  HelpCircle, 
  RotateCcw, 
  PlusCircle, 
  ArrowRight, 
  X,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [reports, setReports] = useState<UatReport[]>([]);
  const [currentRole, setCurrentRole] = useState<DemoRole>('tester');
  const [showHowToTestModal, setShowHowToTestModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize from localStorage once on load.
  // Note: We DO NOT seed reports automatically, per specification.
  useEffect(() => {
    const loaded = getStoredReports();
    setReports(loaded);
  }, []);

  const handleCreateReport = (data: {
    testStepOrPage: string;
    originalFeedback: string;
    expectedResult: string;
    actualResult: string;
    clarifications?: TesterClarificationItem[];
  }) => {
    const created = createReport(data);
    setReports(getStoredReports());
    return created;
  };

  const handleApproveAsBug = (reportId: string, managerData: Partial<ManagerReview>) => {
    approveReportAsBug(reportId, managerData);
    setReports(getStoredReports());
    setNotification(`Report ${reportId} approved as bug. Created developer ticket DEV-${reportId}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRequestClarification = (reportId: string, question: string) => {
    requestClarification(reportId, question);
    setReports(getStoredReports());
    setNotification(`Clarification requested from tester for ${reportId}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAnswerClarification = (reportId: string, answer: string) => {
    answerClarification(reportId, answer);
    setReports(getStoredReports());
    setNotification(`Answer submitted for ${reportId}. Report returned to Pending review.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleMoveToIdeas = (reportId: string, reason: string) => {
    moveReportToIdeas(reportId, reason);
    setReports(getStoredReports());
    setNotification(`Report ${reportId} moved to feature & improvement ideas.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeferReport = (reportId: string, reason: string) => {
    deferReport(reportId, reason);
    setReports(getStoredReports());
    setNotification(`Report ${reportId} deferred.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleMarkNotABug = (reportId: string, explanation: string) => {
    markReportNotABug(reportId, explanation);
    setReports(getStoredReports());
    setNotification(`Report ${reportId} marked as not a bug.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveDraftFields = (reportId: string, managerData: Partial<ManagerReview>, reason?: string) => {
    saveManagerDraftFields(reportId, managerData, reason);
    setReports(getStoredReports());
    setNotification(`Draft changes saved for ${reportId}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRevokeApproval = (reportId: string) => {
    revokeApproval(reportId);
    setReports(getStoredReports());
    setNotification(`Approval revoked for ${reportId}. Removed from developer queue.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLoadDemoSamples = () => {
    const loaded = generateDemoSampleReports();
    setReports(loaded);
    setNotification('Loaded fictional sample reports with AI drafts into localStorage.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all stored reports and reset IDs in this browser?')) {
      clearAllReports();
      setReports([]);
      setNotification('All browser records cleared.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const reportCounts = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'Pending review').length,
    approved: reports.filter((r) => r.status === 'Approved as bug').length,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* 1. Mandatory Disclaimer Banner Throughout */}
      <Banner />

      {/* 2. Top Header Navigation (Top Bar Contract: Brand + Nav info + Quick Actions) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                UAT Untangled
              </span>
              <span className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Tester Observations → Manager Triage → Developer Bugs
              </span>
            </div>
          </div>

          {/* Quick Prototype Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowToTestModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>How to Test</span>
            </button>

            {reports.length === 0 && (
              <button
                type="button"
                onClick={handleLoadDemoSamples}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                title="Optional rapid test helper: load fictional demo reports"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Load Demo Data</span>
                <span className="sm:hidden">Demo Data</span>
              </button>
            )}

            {reports.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors"
                title="Clear localStorage records"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Browser Data</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. DEMO ROLE Switcher */}
      <RoleSwitcher
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        reportCounts={reportCounts}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-slate-900 text-white text-xs py-2 px-4 rounded-md shadow-md flex items-center justify-between">
            <span>{notification}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Role Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'tester' && (
          <TesterView
            reports={reports}
            onSubmitReport={handleCreateReport}
            onAnswerClarification={handleAnswerClarification}
          />
        )}

        {currentRole === 'manager' && (
          <ManagerView
            reports={reports}
            onApproveAsBug={handleApproveAsBug}
            onRequestClarification={handleRequestClarification}
            onMoveToIdeas={handleMoveToIdeas}
            onDeferReport={handleDeferReport}
            onMarkNotABug={handleMarkNotABug}
            onSaveDraftFields={handleSaveDraftFields}
            onRevokeApproval={handleRevokeApproval}
          />
        )}

        {currentRole === 'developer' && (
          <DeveloperView
            reports={reports}
            onSwitchToManagerRole={() => setCurrentRole('manager')}
          />
        )}
      </main>

      {/* 5. Minimal Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">UAT Untangled</span> Prototype • 
            Status: <span className="text-emerald-700 font-medium">LocalStorage Connected</span> • 
            {reports.length} Records in Local Browser
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentRole('tester')}
              className={`hover:text-slate-900 ${currentRole === 'tester' ? 'font-bold text-indigo-700' : ''}`}
            >
              Tester View
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setCurrentRole('manager')}
              className={`hover:text-slate-900 ${currentRole === 'manager' ? 'font-bold text-indigo-700' : ''}`}
            >
              Manager View
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setCurrentRole('developer')}
              className={`hover:text-slate-900 ${currentRole === 'developer' ? 'font-bold text-indigo-700' : ''}`}
            >
              Developer View
            </button>
          </div>
        </div>
      </footer>

      {/* "How to Test" Guidance Modal */}
      {showHowToTestModal && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  How to Test the UAT Untangled Prototype
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowToTestModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-indigo-950">
                <span className="font-bold block mb-1">Testing Objective:</span>
                Verify the end-to-end individual review workflow: tester submissions with AI clarification, manager side-by-side triage with 5 distinct actions (Approve as bug, Request clarification, Move to ideas, Defer, Mark not a bug), and the developer queue with verified tickets.
              </div>

              <ol className="space-y-3 list-decimal list-inside font-medium text-slate-800">
                <li className="pl-1">
                  <span className="font-bold text-slate-900">Step 1 — Tester Submission & AI Clarification:</span>
                  <div className="ml-5 mt-1 text-slate-600 font-normal">
                    Select the <strong>Tester</strong> role tab. Enter feedback and click <strong>"Help me explain this"</strong>. Gemini analyzes your draft and asks targeted clarification questions. Attach answers or skip, then submit. The report receives a unique ID (e.g. <code>UAT-101</code>) with status <strong>Pending review</strong>.
                  </div>
                </li>

                <li className="pl-1">
                  <span className="font-bold text-slate-900">Step 2 — Manager Detail View & Triage Actions:</span>
                  <div className="ml-5 mt-1 text-slate-600 font-normal">
                    Switch to <strong>Manager</strong>. Click <strong>Review & Triage</strong> on a report. Inspect the side-by-side view: original feedback, AI suggestions (clearly tagged), and manager-confirmed fields. Test the five individual review actions:
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                      <li><strong>Approve as bug:</strong> Creates exactly 1 linked ticket (<code>DEV-UAT-...</code>) for the designated developer owner with reviewer "Demo manager".</li>
                      <li><strong>Request clarification:</strong> Enter a kind question. Return to Tester view to see the question and submit a response, which returns the report to Pending review.</li>
                      <li><strong>Move to ideas:</strong> Move report to feature ideas backlog without creating a bug ticket.</li>
                      <li><strong>Defer / Mark not a bug:</strong> Record a substantive reason; report remains visible in filtered tabs.</li>
                      <li><strong>Save Draft:</strong> Change category, owner, priority or notes without approving.</li>
                    </ul>
                  </div>
                </li>

                <li className="pl-1">
                  <span className="font-bold text-slate-900">Step 3 — Developer Queue:</span>
                  <div className="ml-5 mt-1 text-slate-600 font-normal">
                    Switch to <strong>Developer</strong>. Only reports explicitly approved as bugs appear, displaying the ticket ID, category, simulated owner (Developer A–E), environment, missing evidence notes, and reproduction steps.
                  </div>
                </li>

                <li className="pl-1">
                  <span className="font-bold text-slate-900">Step 4 — Persistence Check:</span>
                  <div className="ml-5 mt-1 text-slate-600 font-normal">
                    Refresh your browser. All records, decisions, ticket numbers, and clarification threads remain intact in <code>localStorage</code>.
                  </div>
                </li>
              </ol>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowToTestModal(false)}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Got It, Start Testing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
