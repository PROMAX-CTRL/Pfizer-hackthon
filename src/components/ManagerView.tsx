import React, { useState, useMemo } from 'react';
import { 
  UatReport, 
  TechnicalCategory, 
  TECHNICAL_CATEGORIES, 
  CATEGORY_OWNER_MAP, 
  FeedbackType, 
  FEEDBACK_TYPES, 
  ManagerPriority, 
  MANAGER_PRIORITIES, 
  ManagerReview,
  ReportStatus
} from '../types/uat';
import { StatusBadge } from './StatusBadge';
import { 
  CheckCircle2, 
  FileText, 
  Search, 
  ShieldCheck, 
  X, 
  RotateCcw,
  Save,
  Filter,
  ArrowUpDown,
  User,
  Tag,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Check,
  Lightbulb,
  PauseCircle,
  XCircle,
  History,
  Info,
  Send,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface ManagerViewProps {
  reports: UatReport[];
  onApproveAsBug: (reportId: string, managerData: Partial<ManagerReview>) => void;
  onRequestClarification: (reportId: string, question: string) => void;
  onMoveToIdeas: (reportId: string, reason: string) => void;
  onDeferReport: (reportId: string, reason: string) => void;
  onMarkNotABug: (reportId: string, explanation: string) => void;
  onSaveDraftFields: (reportId: string, managerData: Partial<ManagerReview>, reason?: string) => void;
  onRevokeApproval: (reportId: string) => void;
}

type SortOption = 'default' | 'oldest_unreviewed' | 'newest' | 'oldest';
type StatusFilterType = 'all' | 'pending' | 'approved' | 'clarification' | 'ideas' | 'deferred' | 'not_a_bug';

export const ManagerView: React.FC<ManagerViewProps> = ({
  reports,
  onApproveAsBug,
  onRequestClarification,
  onMoveToIdeas,
  onDeferReport,
  onMarkNotABug,
  onSaveDraftFields,
  onRevokeApproval,
}) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({});

  // Sub-action dialogs inside the review modal
  const [actionDialogType, setActionDialogType] = useState<
    'none' | 'request_clarification' | 'move_to_ideas' | 'defer' | 'mark_not_bug'
  >('none');
  const [dialogInputText, setDialogInputText] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Active report in review modal
  const activeReport = reports.find((r) => r.id === selectedReportId) || null;

  // Form states for the manager review modal
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<TechnicalCategory>('Unassigned');
  const [formFeedbackType, setFormFeedbackType] = useState<FeedbackType>('Possible bug');
  const [formPriority, setFormPriority] = useState<ManagerPriority>('Needs assessment');
  const [formPriorityExplanation, setFormPriorityExplanation] = useState('');
  const [formEnvironment, setFormEnvironment] = useState('');
  const [formMissingEvidence, setFormMissingEvidence] = useState('');
  const [formUncertaintyNotes, setFormUncertaintyNotes] = useState('');
  const [formStep, setFormStep] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formExpected, setFormExpected] = useState('');
  const [formActual, setFormActual] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Toggle inline expansion in table
  const toggleRowExpansion = (id: string) => {
    setExpandedReportIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Open modal and pre-populate review fields
  const handleOpenReview = (report: UatReport) => {
    setSelectedReportId(report.id);
    const m = report.managerReview;
    setFormTitle(m.summaryTitle || report.testerInput.testStepOrPage || 'Identified UAT Report');
    setFormCategory(m.category || 'Unassigned');
    setFormFeedbackType(m.feedbackType || 'Possible bug');
    setFormPriority(m.priority || 'Needs assessment');
    setFormPriorityExplanation(m.priorityExplanation || '');
    setFormEnvironment(m.environment || report.testerInput.testStepOrPage || '');
    setFormMissingEvidence(m.missingEvidenceNotes || '');
    setFormUncertaintyNotes(m.uncertaintyNotes || '');
    setFormStep(m.reviewedStepOrPage || report.testerInput.testStepOrPage || '');
    setFormDescription(m.refinedDescription || report.testerInput.originalFeedback);
    setFormExpected(m.refinedExpectedResult || report.testerInput.expectedResult || '');
    setFormActual(m.refinedActualResult || report.testerInput.actualResult || '');
    setFormNotes(m.managerNotes || '');
    setActionDialogType('none');
    setDialogInputText('');
    setDialogError('');
    setActionSuccessMsg(null);
  };

  const handleCloseReview = () => {
    setSelectedReportId(null);
    setActionDialogType('none');
    setIsProcessing(false);
  };

  // Gather current editable form state
  const getFormData = (): Partial<ManagerReview> => ({
    summaryTitle: formTitle.trim(),
    category: formCategory,
    simulatedOwner: CATEGORY_OWNER_MAP[formCategory] || 'Unassigned',
    feedbackType: formFeedbackType,
    priority: formPriority,
    priorityExplanation: formPriorityExplanation.trim(),
    environment: formEnvironment.trim(),
    missingEvidenceNotes: formMissingEvidence.trim(),
    uncertaintyNotes: formUncertaintyNotes.trim(),
    reviewedStepOrPage: formStep.trim(),
    refinedDescription: formDescription.trim(),
    refinedExpectedResult: formExpected.trim(),
    refinedActualResult: formActual.trim(),
    managerNotes: formNotes.trim(),
  });

  // Action 1: Approve as Bug (creates exactly one ticket, reviewer "Demo manager")
  const handleApproveAsBug = () => {
    if (!activeReport || isProcessing) return;
    if (!formTitle.trim()) {
      alert('Please provide a structured Bug Title / Summary before approving.');
      return;
    }

    setIsProcessing(true);
    onApproveAsBug(activeReport.id, getFormData());
    setActionSuccessMsg(`Report ${activeReport.id} approved as a bug for Developers! Developer ticket created.`);
    setTimeout(() => {
      setIsProcessing(false);
      handleCloseReview();
    }, 350);
  };

  // Action 2: Save Draft Changes (allows changing priority, category, owner without approving)
  const handleSaveDraft = () => {
    if (!activeReport || isProcessing) return;
    setIsProcessing(true);
    onSaveDraftFields(activeReport.id, getFormData(), 'Updated structured review fields');
    setActionSuccessMsg(`Draft changes saved for ${activeReport.id}.`);
    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
  };

  // Action 3: Open Sub-Action Prompt
  const handleOpenPrompt = (type: 'request_clarification' | 'move_to_ideas' | 'defer' | 'mark_not_bug') => {
    setActionDialogType(type);
    setDialogInputText('');
    setDialogError('');
  };

  // Action 4: Confirm Sub-Action
  const handleConfirmSubAction = () => {
    if (!activeReport || isProcessing) return;
    if (!dialogInputText.trim()) {
      setDialogError('This field is required to proceed with this decision.');
      return;
    }

    setIsProcessing(true);

    if (actionDialogType === 'request_clarification') {
      onRequestClarification(activeReport.id, dialogInputText.trim());
      setActionSuccessMsg(`Clarification requested from tester for ${activeReport.id}.`);
    } else if (actionDialogType === 'move_to_ideas') {
      onMoveToIdeas(activeReport.id, dialogInputText.trim());
      setActionSuccessMsg(`Report ${activeReport.id} moved to feature/improvement ideas.`);
    } else if (actionDialogType === 'defer') {
      onDeferReport(activeReport.id, dialogInputText.trim());
      setActionSuccessMsg(`Report ${activeReport.id} deferred.`);
    } else if (actionDialogType === 'mark_not_bug') {
      onMarkNotABug(activeReport.id, dialogInputText.trim());
      setActionSuccessMsg(`Report ${activeReport.id} marked as not a bug.`);
    }

    setTimeout(() => {
      setIsProcessing(false);
      handleCloseReview();
    }, 350);
  };

  // Priority ranking helper
  const getPriorityRank = (p?: string): number => {
    switch (p) {
      case 'High':
      case 'Critical (P1)':
      case 'High (P2)':
        return 1;
      case 'Needs assessment':
        return 2;
      case 'Medium':
      case 'Medium (P3)':
        return 3;
      case 'Low':
      case 'Low (P4)':
        return 4;
      default:
        return 2;
    }
  };

  // Filter and sort reports
  const processedReports = useMemo(() => {
    return reports
      .filter((report) => {
        // Status filter
        if (statusFilter === 'pending' && report.status !== 'Pending review') return false;
        if (statusFilter === 'approved' && report.status !== 'Approved as bug') return false;
        if (statusFilter === 'clarification' && report.status !== 'Clarification requested') return false;
        if (statusFilter === 'ideas' && report.status !== 'Moved to ideas') return false;
        if (statusFilter === 'deferred' && report.status !== 'Deferred') return false;
        if (statusFilter === 'not_a_bug' && report.status !== 'Not a bug') return false;

        // Category filter
        if (categoryFilter !== 'all' && report.managerReview.category !== categoryFilter) {
          return false;
        }

        // Feedback Type filter
        if (feedbackTypeFilter !== 'all' && report.managerReview.feedbackType !== feedbackTypeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = report.id.toLowerCase().includes(q);
          const matchFeedback = report.testerInput.originalFeedback.toLowerCase().includes(q);
          const matchStep = report.testerInput.testStepOrPage.toLowerCase().includes(q);
          const matchTitle = report.managerReview.summaryTitle.toLowerCase().includes(q);
          const matchCategory = report.managerReview.category.toLowerCase().includes(q);
          const matchOwner = (report.managerReview.simulatedOwner || '').toLowerCase().includes(q);
          const matchTicket = (report.developerTicket?.ticketId || '').toLowerCase().includes(q);
          return matchId || matchFeedback || matchStep || matchTitle || matchCategory || matchOwner || matchTicket;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        if (sortOption === 'default') {
          const rankA = getPriorityRank(a.managerReview.priority);
          const rankB = getPriorityRank(b.managerReview.priority);
          if (rankA !== rankB) return rankA - rankB;
          return timeA - timeB;
        }

        if (sortOption === 'oldest_unreviewed') {
          const isPendingA = a.status === 'Pending review';
          const isPendingB = b.status === 'Pending review';
          if (isPendingA && !isPendingB) return -1;
          if (!isPendingA && isPendingB) return 1;
          return timeA - timeB;
        }

        if (sortOption === 'newest') return timeB - timeA;
        if (sortOption === 'oldest') return timeA - timeB;
        return 0;
      });
  }, [reports, statusFilter, categoryFilter, feedbackTypeFilter, sortOption, searchQuery]);

  const counts = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'Pending review').length,
    approved: reports.filter((r) => r.status === 'Approved as bug').length,
    clarification: reports.filter((r) => r.status === 'Clarification requested').length,
    ideas: reports.filter((r) => r.status === 'Moved to ideas').length,
    deferred: reports.filter((r) => r.status === 'Deferred').length,
    notABug: reports.filter((r) => r.status === 'Not a bug').length,
  };

  const getPriorityBadgeUI = (priority: ManagerPriority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
            High
          </span>
        );
      case 'Needs assessment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-950 border border-purple-300">
            Needs assessment
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-950 border border-amber-300">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Manager Unified Queue: Individual Report Review
              </h1>
              <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                Reviewer: Demo manager
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Open any report individually to review evidence, missing information, and AI suggestions. Take targeted actions (Approve, Request Clarification, Move to Ideas, Defer, or Mark Not a Bug) with full decision history.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-center min-w-[80px]">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Pending</span>
              <span className="text-base font-bold font-mono text-amber-700">{counts.pending}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-center min-w-[80px]">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Approved</span>
              <span className="text-base font-bold font-mono text-emerald-700">{counts.approved}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-center min-w-[80px]">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase">Ideas</span>
              <span className="text-base font-bold font-mono text-teal-700">{counts.ideas}</span>
            </div>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div 
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-lg text-sm flex items-center justify-between"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs text-emerald-800 hover:text-emerald-950 underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unified Queue Filter & Sort Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5">
        {/* Row 1: Status Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap" role="tablist">
            <button
              role="tab"
              aria-selected={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'approved' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'clarification'}
              onClick={() => setStatusFilter('clarification')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'clarification' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clarification ({counts.clarification})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'ideas'}
              onClick={() => setStatusFilter('ideas')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'ideas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ideas ({counts.ideas})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'deferred'}
              onClick={() => setStatusFilter('deferred')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'deferred' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deferred ({counts.deferred})
            </button>
            <button
              role="tab"
              aria-selected={statusFilter === 'not_a_bug'}
              onClick={() => setStatusFilter('not_a_bug')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                statusFilter === 'not_a_bug' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Not a Bug ({counts.notABug})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="default">Default (High → Needs assessment → Medium → Low, oldest first)</option>
              <option value="oldest_unreviewed">Oldest unreviewed first</option>
              <option value="newest">Newest submitted first</option>
              <option value="oldest">Oldest submitted first</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category Filter & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 max-w-[260px]"
            >
              <option value="all">All Categories ({reports.length})</option>
              {TECHNICAL_CATEGORIES.map((cat) => {
                const owner = CATEGORY_OWNER_MAP[cat];
                const count = reports.filter((r) => r.managerReview.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} {owner !== 'Unassigned' ? `— ${owner}` : ''} ({count})
                  </option>
                );
              })}
            </select>

            {(categoryFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline px-1"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, ticket, feedback, owner..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Reports Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {processedReports.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No reports matching filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {reports.length === 0
                ? 'No reports submitted yet. Switch to the Tester role to submit test observations.'
                : 'Try adjusting your filter or search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">ID & Date</th>
                  <th className="py-3 px-4">Status & Decision</th>
                  <th className="py-3 px-4">Priority & Impact</th>
                  <th className="py-3 px-4">Category & Owner</th>
                  <th className="py-3 px-4">Original Feedback & Questions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedReports.map((report) => {
                  const m = report.managerReview;
                  const isExpanded = !!expandedReportIds[report.id];
                  const ownerName = m.simulatedOwner || CATEGORY_OWNER_MAP[m.category] || 'Unassigned';

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors align-top">
                      {/* ID & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 block w-fit">
                            {report.id}
                          </span>
                          {report.developerTicket && (
                            <span className="font-mono font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 block w-fit">
                              {report.developerTicket.ticketId}
                            </span>
                          )}
                          <span className="text-[11px] font-mono tabular-nums text-slate-500 block">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <StatusBadge status={report.status} />
                          {report.statusExplanation && (
                            <p className="text-[11px] text-slate-600 italic line-clamp-1 max-w-[160px]" title={report.statusExplanation}>
                              {report.statusExplanation}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div>{getPriorityBadgeUI(m.priority)}</div>
                          {m.priorityExplanation ? (
                            <p className="text-[11px] text-slate-600 italic line-clamp-2 max-w-[180px]" title={m.priorityExplanation}>
                              "{m.priorityExplanation}"
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No explanation</span>
                          )}
                        </div>
                      </td>

                      {/* Category & Owner */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 block">
                            {m.category}
                          </span>
                          <span className="text-[11px] text-indigo-900 font-semibold block">
                            {ownerName}
                          </span>
                        </div>
                      </td>

                      {/* Original Feedback */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <p className={`text-xs text-slate-800 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                            {report.testerInput.originalFeedback}
                          </p>
                          {report.activeClarificationQuestion && (
                            <div className="p-1.5 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-950">
                              <strong>Awaiting Tester:</strong> {report.activeClarificationQuestion.question}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleRowExpansion(report.id)}
                            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                <span>Collapse</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                <span>Read full feedback</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(report)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800 transition-colors shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Review & Action</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal Dialog */}
      {activeReport && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl my-4 flex flex-col max-h-[94vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm bg-white px-2.5 py-1 rounded border border-slate-300 text-slate-900">
                  {activeReport.id}
                </span>
                <StatusBadge status={activeReport.status} />
                {activeReport.developerTicket && (
                  <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded border border-emerald-300">
                    Ticket: {activeReport.developerTicket.ticketId}
                  </span>
                )}
                <h2 className="text-base font-bold text-slate-900">
                  Manager Report Detail & Review
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Context, Raw Feedback, AI Draft & Evidence (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* 1. Original Tester Input (Immutable) */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Original Feedback & Evidence
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Immutable</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block">Reported Step / Page:</span>
                    <p className="text-xs text-slate-900 bg-white p-2 rounded border border-slate-200 mt-0.5 font-medium">
                      {activeReport.testerInput.testStepOrPage || 'None specified'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block">Raw Tester Feedback:</span>
                    <div className="text-xs text-slate-800 bg-white p-2.5 rounded border border-slate-200 mt-0.5 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {activeReport.testerInput.originalFeedback}
                    </div>
                  </div>

                  {activeReport.testerInput.expectedResult && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block">Expected:</span>
                      <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 mt-0.5">
                        {activeReport.testerInput.expectedResult}
                      </p>
                    </div>
                  )}

                  {activeReport.testerInput.actualResult && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-600 block">Actual:</span>
                      <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 mt-0.5">
                        {activeReport.testerInput.actualResult}
                      </p>
                    </div>
                  )}

                  {/* Clarification Answers */}
                  {activeReport.testerInput.clarifications && activeReport.testerInput.clarifications.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-indigo-900 block">
                        Clarification Answers:
                      </span>
                      <div className="bg-white p-2.5 rounded border border-indigo-200 mt-0.5 space-y-1.5 text-xs">
                        {activeReport.testerInput.clarifications.map((item, idx) => (
                          <div key={idx} className="border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                            <span className="font-semibold text-slate-700 text-[11px] block">Q: {item.question}</span>
                            <span className="text-slate-900 block font-medium">A: {item.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-200">
                    <span>Submitted:</span>
                    <span className="font-mono tabular-nums">{new Date(activeReport.testerInput.submittedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. AI Draft & Analysis (Clearly Labeled as AI Suggestions) */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                      AI Suggestions & Evidence Gap
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      AI Draft (Unconfirmed)
                    </span>
                  </div>

                  <p className="text-xs text-indigo-900 leading-relaxed">
                    {activeReport.managerReview.aiDraft?.summaryObservation || 
                      'Initial feedback analyzed for reproduction clarity and evidence completeness.'}
                  </p>

                  {/* Missing Information / Evidence check */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block">Missing Information Identified:</span>
                    <p className="text-xs text-slate-800 bg-white/80 p-2 rounded border border-indigo-100 mt-0.5">
                      {activeReport.managerReview.missingEvidenceNotes || 'No blocker missing evidence reported. Review reproduction sequence.'}
                    </p>
                  </div>

                  {/* Uncertainty notes */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block">Uncertainty Notes:</span>
                    <p className="text-xs text-slate-800 bg-white/80 p-2 rounded border border-indigo-100 mt-0.5">
                      {activeReport.managerReview.uncertaintyNotes || 'Uncertainty minimal; verify with confirmed component owner.'}
                    </p>
                  </div>
                </div>

                {/* 3. Decision Log History */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5 text-slate-600" />
                    <span>Decision History</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {activeReport.history && activeReport.history.length > 0 ? (
                      activeReport.history.map((h) => (
                        <div key={h.id} className="text-[11px] bg-white p-2 rounded border border-slate-200 space-y-0.5">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{h.action}</span>
                            <span className="text-[10px] font-mono text-slate-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">By: {h.reviewer}</span>
                          {h.reason && <p className="text-slate-600 italic">"{h.reason}"</p>}
                          {h.question && <p className="text-indigo-900">Q: {h.question}</p>}
                          {h.answer && <p className="text-slate-900 font-medium">A: {h.answer}</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No previous decisions logged.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Manager-Editable Final Fields (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Manager-Confirmed Final Fields
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                      Manager-Confirmed Decision
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Reviewer: <strong>Demo manager</strong>
                  </span>
                </div>

                {/* Bug Title */}
                <div>
                  <label htmlFor="formTitle" className="block text-xs font-bold text-slate-800 mb-1">
                    Structured Bug Title / Summary <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="formTitle"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                {/* Category & Owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="formCategory" className="block text-xs font-bold text-slate-800 mb-1">
                      Technical Category & Owner
                    </label>
                    <select
                      id="formCategory"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as TechnicalCategory)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Interface & accessibility">1. Interface & accessibility — Developer A</option>
                      <option value="Functionality & workflow">2. Functionality & workflow — Developer B</option>
                      <option value="Data & saving">3. Data & saving — Developer C</option>
                      <option value="Performance">4. Performance — Developer D</option>
                      <option value="Access & permissions">5. Access & permissions — Developer E</option>
                      <option value="Unassigned">Unassigned (Category unclear)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="formPriority" className="block text-xs font-bold text-slate-800 mb-1">
                      Priority Level
                    </label>
                    <select
                      id="formPriority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as ManagerPriority)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      {MANAGER_PRIORITIES.map((pri) => (
                        <option key={pri} value={pri}>
                          {pri}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Priority Explanation */}
                <div>
                  <label htmlFor="formPriorityExplanation" className="block text-xs font-bold text-slate-800 mb-1">
                    Priority Explanation / Impact Justification
                  </label>
                  <input
                    id="formPriorityExplanation"
                    type="text"
                    value={formPriorityExplanation}
                    onChange={(e) => setFormPriorityExplanation(e.target.value)}
                    placeholder="e.g. High revenue impact; lack of screenshots does not lower priority"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Environment & Missing Evidence Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="formEnvironment" className="block text-xs font-bold text-slate-800 mb-1">
                      Environment / Platform
                    </label>
                    <input
                      id="formEnvironment"
                      type="text"
                      value={formEnvironment}
                      onChange={(e) => setFormEnvironment(e.target.value)}
                      placeholder="e.g. Chrome 124 / macOS Sonoma"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="formMissingEvidence" className="block text-xs font-bold text-slate-800 mb-1">
                      Missing Evidence Notes
                    </label>
                    <input
                      id="formMissingEvidence"
                      type="text"
                      value={formMissingEvidence}
                      onChange={(e) => setFormMissingEvidence(e.target.value)}
                      placeholder="e.g. Network logs absent; manual steps verified"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Refined Steps */}
                <div>
                  <label htmlFor="formDescription" className="block text-xs font-bold text-slate-800 mb-1">
                    Reproduction Steps & Description
                  </label>
                  <textarea
                    id="formDescription"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Clear steps for engineering reproduction..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Expected vs Actual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="formExpected" className="block text-xs font-bold text-slate-800 mb-1">
                      Expected Result
                    </label>
                    <textarea
                      id="formExpected"
                      rows={2}
                      value={formExpected}
                      onChange={(e) => setFormExpected(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="formActual" className="block text-xs font-bold text-slate-800 mb-1">
                      Actual Failure
                    </label>
                    <textarea
                      id="formActual"
                      rows={2}
                      value={formActual}
                      onChange={(e) => setFormActual(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Uncertainty Notes & Manager Guidance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="formUncertaintyNotes" className="block text-xs font-bold text-slate-800 mb-1">
                      Uncertainty Notes
                    </label>
                    <input
                      id="formUncertaintyNotes"
                      type="text"
                      value={formUncertaintyNotes}
                      onChange={(e) => setFormUncertaintyNotes(e.target.value)}
                      placeholder="e.g. Verify whether this affects all vouchers or just SUMMER25"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="formNotes" className="block text-xs font-bold text-slate-800 mb-1">
                      Manager Notes / Dev Guidance
                    </label>
                    <input
                      id="formNotes"
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="e.g. Sprint blocker; test on staging API"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Sub-Action Inline Form Drawer (Clarification, Ideas, Defer, Not a Bug) */}
                {actionDialogType !== 'none' && (
                  <div className="p-4 bg-slate-100 border border-indigo-300 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {actionDialogType === 'request_clarification' && 'Request Clarification from Tester'}
                        {actionDialogType === 'move_to_ideas' && 'Move Report to Feature Ideas Backlog'}
                        {actionDialogType === 'defer' && 'Defer Report for Later Sprint'}
                        {actionDialogType === 'mark_not_bug' && 'Mark Report as Not a Bug'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActionDialogType('none')}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label htmlFor="dialogInputText" className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {actionDialogType === 'request_clarification' && 'Enter a kind, specific question for the tester:'}
                        {actionDialogType === 'move_to_ideas' && 'Explain why this is an idea/enhancement (visible to tester):'}
                        {actionDialogType === 'defer' && 'Explain deferral reason (visible to tester):'}
                        {actionDialogType === 'mark_not_bug' && 'Explain why this behavior is not a bug (visible to tester):'}
                      </label>
                      <textarea
                        id="dialogInputText"
                        rows={2}
                        value={dialogInputText}
                        onChange={(e) => {
                          setDialogInputText(e.target.value);
                          if (dialogError) setDialogError('');
                        }}
                        placeholder={
                          actionDialogType === 'request_clarification'
                            ? 'e.g. Could you confirm if you were logged in as an Admin or Customer when the button failed?'
                            : 'Enter clear reason...'
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      {dialogError && (
                        <p className="text-[11px] text-red-600 mt-1 font-semibold">{dialogError}</p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActionDialogType('none')}
                        className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSubAction}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded"
                      >
                        Confirm Action
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Controls (Action for this ONE report only) */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSaveDraft}
                  className="px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50"
                  title="Save edits without approving or changing status"
                >
                  <Save className="w-3.5 h-3.5 inline mr-1" />
                  Save Draft Changes
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOpenPrompt('request_clarification')}
                  className="px-2.5 py-2 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                >
                  <HelpCircle className="w-3.5 h-3.5 inline mr-1" />
                  Request Clarification
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOpenPrompt('move_to_ideas')}
                  className="px-2.5 py-2 text-xs font-semibold text-teal-900 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100"
                >
                  <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
                  Move to Ideas
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOpenPrompt('defer')}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-md hover:bg-slate-200"
                >
                  <PauseCircle className="w-3.5 h-3.5 inline mr-1" />
                  Defer
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleOpenPrompt('mark_not_bug')}
                  className="px-2.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-300 rounded-md hover:bg-stone-200"
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" />
                  Mark Not a Bug
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeReport.status === 'Approved as bug' && (
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      onRevokeApproval(activeReport.id);
                      handleCloseReview();
                    }}
                    className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200"
                  >
                    Revoke Approval
                  </button>
                )}

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApproveAsBug}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 rounded-md shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {activeReport.status === 'Approved as bug'
                      ? 'Update Approved Bug Ticket'
                      : 'Approve as Bug (Create Developer Ticket)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
