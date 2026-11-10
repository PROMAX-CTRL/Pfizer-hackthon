import { 
  UatReport, 
  TesterSubmission, 
  ManagerReview, 
  TechnicalCategory, 
  FeedbackType, 
  ManagerPriority,
  ReportStatus,
  DeveloperTicket,
  DecisionLogEntry,
  CATEGORY_OWNER_MAP 
} from '../types/uat';

const STORAGE_KEY = 'uat_untangled_records_v1';
const COUNTER_KEY = 'uat_untangled_counter_v1';

function normalizeCategory(rawCat?: string): TechnicalCategory {
  if (!rawCat) return 'Unassigned';
  if (rawCat === 'Interface & accessibility' || rawCat === 'UI/Visual' || rawCat === 'Accessibility' || rawCat === 'Content/Copy') {
    return 'Interface & accessibility';
  }
  if (rawCat === 'Functionality & workflow' || rawCat === 'Functional/Logic') {
    return 'Functionality & workflow';
  }
  if (rawCat === 'Data & saving' || rawCat === 'Data/Calculation') {
    return 'Data & saving';
  }
  if (rawCat === 'Performance') {
    return 'Performance';
  }
  if (rawCat === 'Access & permissions') {
    return 'Access & permissions';
  }
  return 'Unassigned';
}

function normalizePriority(rawPri?: string): ManagerPriority {
  if (!rawPri) return 'Needs assessment';
  if (rawPri === 'High' || rawPri === 'Critical (P1)' || rawPri === 'High (P2)') {
    return 'High';
  }
  if (rawPri === 'Medium' || rawPri === 'Medium (P3)') {
    return 'Medium';
  }
  if (rawPri === 'Low' || rawPri === 'Low (P4)') {
    return 'Low';
  }
  if (rawPri === 'Needs assessment') {
    return 'Needs assessment';
  }
  return 'Needs assessment';
}

function normalizeReport(report: any): UatReport {
  const m = report.managerReview || {};
  const category = normalizeCategory(m.category);
  const priority = normalizePriority(m.priority);
  const feedbackType: FeedbackType = m.feedbackType || 'Possible bug';
  const simulatedOwner = m.simulatedOwner || CATEGORY_OWNER_MAP[category] || 'Unassigned';
  const status: ReportStatus = report.status || 'Pending review';
  const history: DecisionLogEntry[] = Array.isArray(report.history) ? report.history : [];

  let developerTicket: DeveloperTicket | undefined = report.developerTicket;
  if (status === 'Approved as bug' && !developerTicket) {
    developerTicket = {
      ticketId: `DEV-${report.id}`,
      reportId: report.id,
      title: m.summaryTitle || 'Approved Bug Ticket',
      category,
      owner: simulatedOwner,
      priority,
      reproductionSteps: m.refinedDescription || report.testerInput?.originalFeedback || '',
      expectedResult: m.refinedExpectedResult || report.testerInput?.expectedResult || '',
      actualResult: m.refinedActualResult || report.testerInput?.actualResult || '',
      environment: m.environment || report.testerInput?.testStepOrPage || 'General Web Client',
      missingEvidence: m.missingEvidenceNotes || 'None specified',
      reviewer: m.reviewerLabel || 'Demo manager',
      approvedAt: m.approvedAt || report.updatedAt || report.createdAt,
    };
  }

  return {
    ...report,
    status,
    history,
    developerTicket,
    statusExplanation: report.statusExplanation || '',
    activeClarificationQuestion: report.activeClarificationQuestion,
    managerReview: {
      ...m,
      category,
      simulatedOwner,
      feedbackType,
      priority,
      priorityExplanation: m.priorityExplanation || '',
      environment: m.environment || '',
      missingEvidenceNotes: m.missingEvidenceNotes || '',
      uncertaintyNotes: m.uncertaintyNotes || '',
      reviewerLabel: m.reviewerLabel || (status === 'Approved as bug' ? 'Demo manager' : undefined),
      isManagerConfirmed: m.isManagerConfirmed ?? (status === 'Approved as bug'),
    },
  };
}

export function getStoredReports(): UatReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeReport);
  } catch (error) {
    console.error('Failed to load reports from localStorage', error);
    return [];
  }
}

export function saveStoredReports(reports: UatReport[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to save reports to localStorage', error);
  }
}

function getNextId(): string {
  let current = 101;
  try {
    const rawCounter = localStorage.getItem(COUNTER_KEY);
    if (rawCounter) {
      const num = parseInt(rawCounter, 10);
      if (!isNaN(num) && num >= 101) {
        current = num;
      }
    }
    const nextVal = current + 1;
    localStorage.setItem(COUNTER_KEY, nextVal.toString());
    return `UAT-${current}`;
  } catch {
    return `UAT-${Date.now().toString().slice(-4)}`;
  }
}

export function createReport(submission: {
  testStepOrPage: string;
  originalFeedback: string;
  expectedResult: string;
  actualResult: string;
  clarifications?: import('../types/uat').TesterClarificationItem[];
}): UatReport {
  const reports = getStoredReports();
  const id = getNextId();
  const now = new Date().toISOString();

  const initialTitle = submission.testStepOrPage
    ? `Issue on ${submission.testStepOrPage}`
    : submission.originalFeedback.slice(0, 60) + (submission.originalFeedback.length > 60 ? '...' : '');

  let refinedDesc = submission.originalFeedback.trim();
  if (submission.clarifications && submission.clarifications.length > 0) {
    const validClarifications = submission.clarifications.filter((c) => c.answer && c.answer.trim());
    if (validClarifications.length > 0) {
      refinedDesc += '\n\n-- Tester Clarifications --\n' +
        validClarifications.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n');
    }
  }

  const newReport: UatReport = {
    id,
    status: 'Pending review',
    createdAt: now,
    updatedAt: now,
    history: [
      {
        id: `hist-${Date.now()}`,
        action: 'Updated fields',
        reviewer: 'Tester',
        timestamp: now,
        reason: 'Report created and submitted for UAT triage',
        newStatus: 'Pending review',
      },
    ],
    testerInput: {
      testStepOrPage: submission.testStepOrPage.trim(),
      originalFeedback: submission.originalFeedback.trim(),
      expectedResult: submission.expectedResult.trim(),
      actualResult: submission.actualResult.trim(),
      submittedAt: now,
      clarifications: submission.clarifications || [],
    },
    managerReview: {
      summaryTitle: initialTitle || 'Untangled Bug Report',
      category: 'Unassigned',
      simulatedOwner: CATEGORY_OWNER_MAP['Unassigned'],
      feedbackType: 'Possible bug',
      priority: 'Needs assessment',
      priorityExplanation: '',
      reviewedStepOrPage: submission.testStepOrPage.trim() || 'General Workflow',
      environment: '',
      missingEvidenceNotes: '',
      uncertaintyNotes: '',
      refinedDescription: refinedDesc,
      refinedExpectedResult: submission.expectedResult.trim(),
      refinedActualResult: submission.actualResult.trim(),
      managerNotes: '',
      isManagerConfirmed: false,
    },
  };

  const updated = [newReport, ...reports];
  saveStoredReports(updated);
  return newReport;
}

/**
 * 1. Approve as Bug Action:
 * Records final fields, reviewer label "Demo manager", approval timestamp.
 * Creates exactly ONE developer ticket linked to the report.
 * Repeated clicks or refresh do not duplicate tickets.
 */
export function approveReportAsBug(
  reportId: string,
  managerData: Partial<ManagerReview>
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const targetCategory = managerData.category || current.managerReview.category || 'Unassigned';
  const targetOwner = managerData.simulatedOwner || CATEGORY_OWNER_MAP[targetCategory] || 'Unassigned';

  const updatedReview: ManagerReview = {
    ...current.managerReview,
    ...managerData,
    category: targetCategory,
    simulatedOwner: targetOwner,
    reviewerLabel: 'Demo manager',
    approvedAt: now,
    approvedBy: 'Demo manager',
    isManagerConfirmed: true,
  };

  // Exactly one developer ticket linked to this report
  const ticketId = current.developerTicket?.ticketId || `DEV-${current.id}`;
  const developerTicket: DeveloperTicket = {
    ticketId,
    reportId: current.id,
    title: updatedReview.summaryTitle || current.id,
    category: targetCategory,
    owner: targetOwner,
    priority: updatedReview.priority,
    reproductionSteps: updatedReview.refinedDescription,
    expectedResult: updatedReview.refinedExpectedResult,
    actualResult: updatedReview.refinedActualResult,
    environment: updatedReview.environment || current.testerInput.testStepOrPage || 'General Web Client',
    missingEvidence: updatedReview.missingEvidenceNotes || 'None specified',
    reviewer: 'Demo manager',
    approvedAt: now,
  };

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Approved as bug',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: updatedReview.priorityExplanation || 'Approved for developer queue',
    previousStatus: current.status,
    newStatus: 'Approved as bug',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Approved as bug',
    statusExplanation: `Approved by Demo manager for ${targetOwner} (${targetCategory}).`,
    updatedAt: now,
    managerReview: updatedReview,
    developerTicket,
    activeClarificationQuestion: undefined,
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * 2. Request Clarification Action:
 * Requires manager to enter a kind, specific question.
 * Transitions to 'Clarification requested'.
 */
export function requestClarification(
  reportId: string,
  question: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Clarification requested',
    reviewer: 'Demo manager',
    timestamp: now,
    question: question.trim(),
    previousStatus: current.status,
    newStatus: 'Clarification requested',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Clarification requested',
    statusExplanation: `Manager requested clarification: "${question.trim()}"`,
    updatedAt: now,
    activeClarificationQuestion: {
      question: question.trim(),
      requestedAt: now,
      requestedBy: 'Demo manager',
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * Tester answers manager's clarification question.
 * Places the report back into 'Pending review' without overwriting earlier feedback.
 */
export function answerClarification(
  reportId: string,
  answer: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();
  const askedQuestion = current.activeClarificationQuestion?.question || 'Manager clarification question';

  const newClarificationItem = {
    questionId: `clarify-mgr-${Date.now()}`,
    question: askedQuestion,
    answer: answer.trim(),
    answeredAt: now,
    source: 'manager_requested' as const,
  };

  const updatedClarifications = [
    ...(current.testerInput.clarifications || []),
    newClarificationItem,
  ];

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Clarification answered',
    reviewer: 'Tester',
    timestamp: now,
    question: askedQuestion,
    answer: answer.trim(),
    previousStatus: current.status,
    newStatus: 'Pending review',
  };

  // Append new answer to manager refinedDescription for review context
  let updatedRefinedDesc = current.managerReview.refinedDescription;
  updatedRefinedDesc += `\n\n[Clarification answered on ${new Date(now).toLocaleDateString()}]:\nQ: ${askedQuestion}\nA: ${answer.trim()}`;

  const updatedReport: UatReport = {
    ...current,
    status: 'Pending review',
    statusExplanation: 'Tester submitted clarification. Awaiting manager review.',
    updatedAt: now,
    activeClarificationQuestion: undefined,
    testerInput: {
      ...current.testerInput,
      clarifications: updatedClarifications,
    },
    managerReview: {
      ...current.managerReview,
      refinedDescription: updatedRefinedDesc,
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * 3. Move to Ideas Action:
 * Requires reason, shows report in Ideas filter, notifies tester, NO bug ticket.
 */
export function moveReportToIdeas(
  reportId: string,
  reason: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Moved to ideas',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: reason.trim(),
    previousStatus: current.status,
    newStatus: 'Moved to ideas',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Moved to ideas',
    statusExplanation: `Moved to feature/improvement ideas backlog: ${reason.trim()}`,
    updatedAt: now,
    developerTicket: undefined, // No bug ticket
    activeClarificationQuestion: undefined,
    managerReview: {
      ...current.managerReview,
      feedbackType: 'Improvement idea',
      reviewerLabel: 'Demo manager',
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * 4. Defer Action:
 * Requires reason, keeps report visible in manager queue.
 */
export function deferReport(
  reportId: string,
  reason: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Deferred',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: reason.trim(),
    previousStatus: current.status,
    newStatus: 'Deferred',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Deferred',
    statusExplanation: `Deferred by Demo manager: ${reason.trim()}`,
    updatedAt: now,
    developerTicket: undefined,
    activeClarificationQuestion: undefined,
    managerReview: {
      ...current.managerReview,
      reviewerLabel: 'Demo manager',
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * 5. Mark Not a Bug Action:
 * Requires explanation, keeps report visible in manager queue.
 */
export function markReportNotABug(
  reportId: string,
  explanation: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Marked not a bug',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: explanation.trim(),
    previousStatus: current.status,
    newStatus: 'Not a bug',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Not a bug',
    statusExplanation: `Marked as not a bug: ${explanation.trim()}`,
    updatedAt: now,
    developerTicket: undefined,
    activeClarificationQuestion: undefined,
    managerReview: {
      ...current.managerReview,
      reviewerLabel: 'Demo manager',
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

/**
 * 6. Save Draft Fields (No Status Change):
 * Allows changing priority, category, owner, environment, etc. without approving.
 * Changing an AI suggestion does not require extra confirmation clicks.
 * Logs substantive decision to history.
 */
export function saveManagerDraftFields(
  reportId: string,
  managerData: Partial<ManagerReview>,
  reason?: string
): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const targetCategory = managerData.category || current.managerReview.category || 'Unassigned';
  const targetOwner = managerData.simulatedOwner || CATEGORY_OWNER_MAP[targetCategory] || 'Unassigned';

  const updatedReview: ManagerReview = {
    ...current.managerReview,
    ...managerData,
    category: targetCategory,
    simulatedOwner: targetOwner,
    reviewerLabel: 'Demo manager',
    isManagerConfirmed: true,
  };

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Updated fields',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: reason || 'Updated category, priority, owner, or structured review fields',
    previousStatus: current.status,
    newStatus: current.status,
  };

  // If already approved as bug, sync linked developer ticket seamlessly
  let developerTicket = current.developerTicket;
  if (current.status === 'Approved as bug' && developerTicket) {
    developerTicket = {
      ...developerTicket,
      title: updatedReview.summaryTitle,
      category: targetCategory,
      owner: targetOwner,
      priority: updatedReview.priority,
      reproductionSteps: updatedReview.refinedDescription,
      expectedResult: updatedReview.refinedExpectedResult,
      actualResult: updatedReview.refinedActualResult,
      environment: updatedReview.environment || developerTicket.environment,
      missingEvidence: updatedReview.missingEvidenceNotes || developerTicket.missingEvidence,
    };
  }

  const updatedReport: UatReport = {
    ...current,
    updatedAt: now,
    managerReview: updatedReview,
    developerTicket,
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

export function revokeApproval(reportId: string): UatReport | null {
  const reports = getStoredReports();
  const index = reports.findIndex((r) => r.id === reportId);
  if (index === -1) return null;

  const current = reports[index];
  const now = new Date().toISOString();

  const historyEntry: DecisionLogEntry = {
    id: `hist-${Date.now()}`,
    action: 'Revoked approval',
    reviewer: 'Demo manager',
    timestamp: now,
    reason: 'Approval revoked. Returned to Pending review.',
    previousStatus: current.status,
    newStatus: 'Pending review',
  };

  const updatedReport: UatReport = {
    ...current,
    status: 'Pending review',
    statusExplanation: 'Approval revoked by Demo manager. Returned to Pending review.',
    updatedAt: now,
    developerTicket: undefined,
    managerReview: {
      ...current.managerReview,
      approvedAt: undefined,
      approvedBy: undefined,
    },
    history: [historyEntry, ...(current.history || [])],
  };

  reports[index] = updatedReport;
  saveStoredReports(reports);
  return updatedReport;
}

export function clearAllReports(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(COUNTER_KEY, '101');
}

/**
 * Optional user-triggered demo records loader.
 */
export function generateDemoSampleReports(): UatReport[] {
  const now = new Date();
  const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000).toISOString();
  const tenMinsAgo = new Date(now.getTime() - 10 * 60000).toISOString();

  const sample1: UatReport = {
    id: 'UAT-101',
    status: 'Approved as bug',
    createdAt: thirtyMinsAgo,
    updatedAt: tenMinsAgo,
    statusExplanation: 'Approved by Demo manager for Developer C (Data & saving).',
    developerTicket: {
      ticketId: 'DEV-UAT-101',
      reportId: 'UAT-101',
      title: 'Voucher validation causes cart total zero-out and freezes checkout CTA',
      category: 'Data & saving',
      owner: 'Developer C',
      priority: 'High',
      reproductionSteps: '1. Add items to cart ($100+).\n2. Navigate to Checkout stage 2.\n3. Enter valid coupon code SUMMER25 and click Apply.\n4. Observe subtotal calculation regression and button state.',
      expectedResult: 'Discount of 25% applied to eligible line items. Cart total recalculated to $75.00. Checkout proceed button remains active.',
      actualResult: 'Subtotal resets to $0.00 incorrectly; validation handler throws unhandled null reference.',
      environment: 'Chrome 124 / macOS Sonoma',
      missingEvidence: 'Network payload trace not provided by tester; reproduced manually on staging.',
      reviewer: 'Demo manager',
      approvedAt: tenMinsAgo,
    },
    history: [
      {
        id: 'hist-1',
        action: 'Approved as bug',
        reviewer: 'Demo manager',
        timestamp: tenMinsAgo,
        reason: 'Critical revenue impact: cart zeroes out and payment CTA freezes.',
        previousStatus: 'Pending review',
        newStatus: 'Approved as bug',
      },
      {
        id: 'hist-0',
        action: 'Updated fields',
        reviewer: 'Tester',
        timestamp: thirtyMinsAgo,
        reason: 'Report created and submitted for UAT triage',
        newStatus: 'Pending review',
      },
    ],
    testerInput: {
      testStepOrPage: 'Checkout - Apply Voucher Screen',
      originalFeedback: 'I typed SUMMER25 into the voucher box and pressed apply. The page went blank white for 2 seconds and then the order total was $0.00 instead of 25% off. I could not click proceed to pay.',
      expectedResult: 'Voucher SUMMER25 deducts 25% from the cart subtotal ($100 -> $75) and enables the payment button.',
      actualResult: 'Cart subtotal zeroed out to $0.00 and payment button became disabled/frozen.',
      submittedAt: thirtyMinsAgo,
      clarifications: [
        {
          questionId: 'demo-1',
          question: 'Which browser and operating system were you using?',
          answer: 'Chrome 124 on macOS Sonoma',
          source: 'ai_generated',
        },
      ],
    },
    managerReview: {
      summaryTitle: 'Voucher validation causes cart total zero-out and freezes checkout CTA',
      category: 'Data & saving',
      simulatedOwner: 'Developer C',
      feedbackType: 'Possible bug',
      priority: 'High',
      priorityExplanation: 'Critical revenue impact: cart zeroes out and payment CTA freezes. High severity even though network trace was omitted by tester.',
      reviewedStepOrPage: 'Checkout / Voucher Application',
      environment: 'Chrome 124 / macOS Sonoma',
      missingEvidenceNotes: 'Network trace omitted by tester; manual steps sufficient to reproduce failure.',
      uncertaintyNotes: 'Verify if issue affects all coupons or specifically percentage-based discounts.',
      refinedDescription: '1. Add items to cart ($100+).\n2. Navigate to Checkout stage 2.\n3. Enter valid coupon code SUMMER25 and click Apply.\n4. Observe subtotal calculation regression and button state.',
      refinedExpectedResult: 'Discount of 25% applied to eligible line items. Cart total recalculated to $75.00. Checkout proceed button remains active.',
      refinedActualResult: 'Subtotal resets to $0.00 incorrectly; validation handler throws unhandled null reference preventing payment submission.',
      managerNotes: 'Verified on Chrome 124. High risk for sprint release.',
      reviewerLabel: 'Demo manager',
      approvedAt: tenMinsAgo,
      approvedBy: 'Demo manager',
      isManagerConfirmed: true,
      aiDraft: {
        generatedTitle: 'Cart subtotal resets to $0.00 on applying voucher code',
        suggestedCategory: 'Data & saving',
        suggestedOwner: 'Developer C',
        suggestedPriority: 'High',
        summaryObservation: 'Calculation logic error on discount application; missing network trace.',
        evidenceProvided: ['User action steps', 'Error visual behavior', 'Browser information'],
        missingInformation: ['Backend API response payload', 'Console stack trace'],
        uncertaintyNotes: 'Uncertain whether error occurs on all promo codes or percentage discounts only.',
      },
    },
  };

  const sample2: UatReport = {
    id: 'UAT-102',
    status: 'Pending review',
    createdAt: tenMinsAgo,
    updatedAt: tenMinsAgo,
    history: [
      {
        id: 'hist-2',
        action: 'Updated fields',
        reviewer: 'Tester',
        timestamp: tenMinsAgo,
        reason: 'Report created and submitted for UAT triage',
        newStatus: 'Pending review',
      },
    ],
    testerInput: {
      testStepOrPage: 'User Settings - Profile Avatar',
      originalFeedback: 'When I change my profile photo, the thumbnail stays as the old initials avatar until I do a hard refresh of the browser.',
      expectedResult: 'Profile photo immediately updates in the top right nav header upon successful upload toast.',
      actualResult: 'Navbar still displays previous letter monogram until F5 refresh.',
      submittedAt: tenMinsAgo,
    },
    managerReview: {
      summaryTitle: 'Navbar avatar cache does not invalidate after profile photo update',
      category: 'Interface & accessibility',
      simulatedOwner: 'Developer A',
      feedbackType: 'Improvement idea',
      priority: 'Needs assessment',
      priorityExplanation: 'Requires technical investigation to see if header state can listen to auth store without hard refresh.',
      reviewedStepOrPage: 'Settings > Profile > Avatar Upload',
      environment: 'Safari / macOS',
      missingEvidenceNotes: 'No network tab recording; avatar CDN cache-control header needs inspection.',
      uncertaintyNotes: 'May be intended CDN edge caching behavior rather than client React state bug.',
      refinedDescription: 'When updating user avatar image, the global header avatar component does not listen to user state broadcast or refetch the asset URL.',
      refinedExpectedResult: 'Avatar in header syncs dynamically without manual browser refresh.',
      refinedActualResult: 'Monogram placeholder remains until full document reload.',
      managerNotes: 'Good catch by tester. Needs review on React Context / query invalidation.',
      reviewerLabel: 'Demo manager',
      isManagerConfirmed: false,
      aiDraft: {
        generatedTitle: 'Header avatar fails to reflect newly uploaded image without reload',
        suggestedCategory: 'Interface & accessibility',
        suggestedOwner: 'Developer A',
        suggestedPriority: 'Medium',
        summaryObservation: 'State synchronization delay between settings and header avatar.',
        evidenceProvided: ['Observed behavior', 'Expected outcome'],
        missingInformation: ['Image file format/size', 'Network tab cache headers'],
        uncertaintyNotes: 'Could be CDN cache policy or React state missing subscription.',
      },
    },
  };

  const existing = getStoredReports();
  const merged = [...existing, sample1, sample2];
  saveStoredReports(merged);
  localStorage.setItem(COUNTER_KEY, '103');
  return merged;
}
