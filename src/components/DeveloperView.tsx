import React, { useState } from 'react';
import { UatReport, BugPriority } from '../types/uat';
import { 
  Code2, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Info,
  Clock,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';

interface DeveloperViewProps {
  reports: UatReport[];
  onSwitchToManagerRole: () => void;
}

export const DeveloperView: React.FC<DeveloperViewProps> = ({
  reports,
  onSwitchToManagerRole,
}) => {
  // Developer view STRICTLY displays only reports explicitly approved as bugs
  const approvedBugs = reports.filter((r) => r.status === 'Approved as bug');
  const [openTesterSubmissions, setOpenTesterSubmissions] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const toggleTesterDetails = (id: string) => {
    setOpenTesterSubmissions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredBugs = approvedBugs.filter((bug) => {
    if (selectedPriority !== 'all' && bug.managerReview.priority !== selectedPriority) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = bug.id.toLowerCase().includes(q);
      const matchTitle = bug.managerReview.summaryTitle.toLowerCase().includes(q);
      const matchCat = bug.managerReview.category.toLowerCase().includes(q);
      const matchLoc = bug.managerReview.reviewedStepOrPage.toLowerCase().includes(q);
      const matchDesc = bug.managerReview.refinedDescription.toLowerCase().includes(q);
      return matchId || matchTitle || matchCat || matchLoc || matchDesc;
    }
    return true;
  });

  const getPriorityBadge = (priority: BugPriority) => {
    switch (priority) {
      case 'High':
      case 'Critical (P1)':
      case 'High (P2)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
            High
          </span>
        );
      case 'Needs assessment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-950 border border-purple-300">
            Needs assessment
          </span>
        );
      case 'Medium':
      case 'Medium (P3)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-950 border border-amber-300">
            Medium
          </span>
        );
      case 'Low':
      case 'Low (P4)':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Developer Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Developer Queue: Approved Bugs
              </h1>
              <span className="text-xs font-mono font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                Engineering Ready
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Strictly displays reports approved and structured by the UAT Manager. Raw unreviewed tester feedback is filtered out to avoid noise.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-2 text-right">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Approved Bug Count
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {approvedBugs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar if bugs exist */}
      {approvedBugs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600">Filter Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities ({approvedBugs.length})</option>
              <option value="High">High</option>
              <option value="Needs assessment">Needs assessment</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search approved bugs..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* Main List of Approved Bugs */}
      {approvedBugs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto shadow-xs">
          <Code2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">No Approved Bugs in Developer Queue</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            By design, software tester submissions remain in <strong>Pending review</strong> until a UAT Manager opens them, confirms the defect, refines the structured fields, and explicitly approves them.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onSwitchToManagerRole}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <span>Switch to Manager Role to Triage</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">No approved bugs match your filter criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedPriority('all');
              setSearchQuery('');
            }}
            className="mt-2 text-xs text-indigo-700 font-semibold underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBugs.map((bug) => {
            const m = bug.managerReview;
            const isOriginalExpanded = openTesterSubmissions[bug.id] || false;

            return (
              <article
                key={bug.id}
                className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Bug Card Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-indigo-700 px-2.5 py-0.5 rounded shadow-2xs">
                          {bug.developerTicket?.ticketId || `DEV-${bug.id}`}
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" title="Source UAT Report ID">
                          Ref: {bug.id}
                        </span>
                        {getPriorityBadge(bug.developerTicket?.priority || m.priority)}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {bug.developerTicket?.category || m.category}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                          Owner: {bug.developerTicket?.owner || m.simulatedOwner || 'Unassigned'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {m.reviewedStepOrPage}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 pt-0.5">
                        {bug.developerTicket?.title || m.summaryTitle}
                      </h3>
                      {m.priorityExplanation && (
                        <p className="text-xs text-slate-600 italic">
                          <strong className="font-semibold text-slate-700 not-italic">Priority rationale:</strong> "{m.priorityExplanation}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 text-xs text-slate-500">
                      <div className="flex items-center gap-1 justify-end text-emerald-800 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Approved by {bug.developerTicket?.reviewer || m.reviewerLabel || 'Demo manager'}</span>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 block mt-0.5">
                        Approved: {new Date(bug.developerTicket?.approvedAt || m.approvedAt || bug.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bug Structured Content */}
                <div className="p-5 space-y-4 text-xs text-slate-800 bg-white">
                  {/* Environment & Missing Evidence Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-0.5">
                        Test Environment:
                      </span>
                      <p className="text-slate-900 font-medium">
                        {bug.developerTicket?.environment || m.environment || m.reviewedStepOrPage || 'Web Browser (Standard desktop)'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-0.5">
                        Missing Evidence / Artifacts:
                      </span>
                      <p className="text-slate-800">
                        {bug.developerTicket?.missingEvidence || m.missingEvidenceNotes || 'None noted; verified by manager.'}
                      </p>
                    </div>
                  </div>

                  {/* Steps / Context */}
                  {(bug.developerTicket?.reproductionSteps || m.refinedDescription) && (
                    <div>
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-1">
                        Reproduction Steps & Technical Description
                      </span>
                      <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-900">
                        {bug.developerTicket?.reproductionSteps || m.refinedDescription}
                      </div>
                    </div>
                  )}

                  {/* Expected vs Actual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                      <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] block mb-1">
                        Expected Behavior
                      </span>
                      <p className="text-slate-800 leading-relaxed">
                        {bug.developerTicket?.expectedResult || m.refinedExpectedResult || (
                          <span className="text-slate-400 italic">No expected result specified</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-slate-50/70 p-3 rounded-md border border-slate-200">
                      <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px] block mb-1">
                        Actual Observed Failure
                      </span>
                      <p className="text-slate-800 leading-relaxed">
                        {bug.developerTicket?.actualResult || m.refinedActualResult || (
                          <span className="text-slate-400 italic">No actual result specified</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Manager Notes */}
                  {m.managerNotes && (
                    <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-md">
                      <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] block mb-0.5">
                        UAT Manager Guidance:
                      </span>
                      <p className="text-amber-950 font-medium">
                        {m.managerNotes}
                      </p>
                    </div>
                  )}

                  {/* Preserved Raw Tester Submission Toggle */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleTesterDetails(bug.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                      aria-expanded={isOriginalExpanded}
                    >
                      {isOriginalExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isOriginalExpanded
                          ? 'Hide original tester submission'
                          : 'Inspect original raw tester submission for context'}
                      </span>
                    </button>

                    {isOriginalExpanded && (
                      <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Original Tester Record (Unedited)</span>
                          <span>Logged: {new Date(bug.testerInput.submittedAt).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 block">Raw Feedback:</span>
                          <p className="text-slate-800 whitespace-pre-wrap mt-0.5 bg-white p-2 rounded border border-slate-200">
                            {bug.testerInput.originalFeedback}
                          </p>
                        </div>
                        {bug.testerInput.testStepOrPage && (
                          <p className="text-slate-600">
                            <strong>Tester Page/Step:</strong> {bug.testerInput.testStepOrPage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
