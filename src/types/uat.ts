export type DemoRole = 'tester' | 'manager' | 'developer';

export type ReportStatus = 
  | 'Pending review' 
  | 'Approved as bug'
  | 'Clarification requested'
  | 'Moved to ideas'
  | 'Deferred'
  | 'Not a bug';

export type TechnicalCategory = 
  | 'Interface & accessibility'
  | 'Functionality & workflow'
  | 'Data & saving'
  | 'Performance'
  | 'Access & permissions'
  | 'Unassigned';

export const TECHNICAL_CATEGORIES: TechnicalCategory[] = [
  'Interface & accessibility',
  'Functionality & workflow',
  'Data & saving',
  'Performance',
  'Access & permissions',
  'Unassigned',
];

export const CATEGORY_OWNER_MAP: Record<TechnicalCategory, string> = {
  'Interface & accessibility': 'Developer A',
  'Functionality & workflow': 'Developer B',
  'Data & saving': 'Developer C',
  'Performance': 'Developer D',
  'Access & permissions': 'Developer E',
  'Unassigned': 'Unassigned',
};

export type FeedbackType = 'Possible bug' | 'Improvement idea' | 'Unsure';

export const FEEDBACK_TYPES: FeedbackType[] = [
  'Possible bug',
  'Improvement idea',
  'Unsure',
];

export type ManagerPriority = 'High' | 'Needs assessment' | 'Medium' | 'Low';

export const MANAGER_PRIORITIES: ManagerPriority[] = [
  'High',
  'Needs assessment',
  'Medium',
  'Low',
];

// Backwards-compatible aliases
export type BugPriority = ManagerPriority | 'Critical (P1)' | 'High (P2)' | 'Medium (P3)' | 'Low (P4)';
export type BugCategory = TechnicalCategory | string;

export interface ClarificationQuestion {
  id: string;
  category?: 'steps' | 'expected_vs_actual' | 'environment' | string;
  question: string;
  hint?: string;
}

export interface ClarificationResponse {
  configuredModel: string;
  hasSufficientDetail: boolean;
  summaryObservation: string;
  questions: ClarificationQuestion[];
}

export interface TesterClarificationItem {
  questionId: string;
  question: string;
  answer: string;
  answeredAt?: string;
  source?: 'ai_generated' | 'manager_requested';
}

export interface TesterSubmission {
  testStepOrPage: string;
  originalFeedback: string;
  expectedResult: string;
  actualResult: string;
  submittedAt: string;
  clarifications?: TesterClarificationItem[];
}

export interface AiDraftData {
  generatedTitle?: string;
  suggestedCategory?: TechnicalCategory;
  suggestedOwner?: string;
  suggestedPriority?: ManagerPriority;
  reproductionStepsDraft?: string;
  evidenceProvided?: string[];
  missingInformation?: string[];
  uncertaintyNotes?: string;
  summaryObservation?: string;
}

export interface DeveloperTicket {
  ticketId: string; // e.g. "DEV-UAT-101"
  reportId: string; // "UAT-101"
  title: string;
  category: TechnicalCategory;
  owner: string; // "Developer A", etc.
  priority: ManagerPriority;
  reproductionSteps: string;
  expectedResult: string;
  actualResult: string;
  environment: string; // e.g. "Chrome 124 / macOS"
  missingEvidence: string; // notes on missing evidence
  reviewer: string; // "Demo manager"
  approvedAt: string;
}

export interface DecisionLogEntry {
  id: string;
  action: 
    | 'Approved as bug' 
    | 'Clarification requested' 
    | 'Clarification answered'
    | 'Moved to ideas' 
    | 'Deferred' 
    | 'Marked not a bug' 
    | 'Updated fields' 
    | 'Revoked approval';
  reviewer: string; // "Demo manager" or "Tester"
  timestamp: string;
  reason?: string;
  question?: string;
  answer?: string;
  previousStatus?: ReportStatus;
  newStatus?: ReportStatus;
}

export interface ManagerReview {
  summaryTitle: string;
  category: TechnicalCategory;
  simulatedOwner: string; // e.g. "Developer A" or "Unassigned"
  feedbackType: FeedbackType; // 'Possible bug' | 'Improvement idea' | 'Unsure'
  priority: ManagerPriority;
  priorityExplanation: string; // Rationale; missing evidence != Low priority
  reviewedStepOrPage: string;
  environment: string; // Environment details (browser, device, OS)
  missingEvidenceNotes: string; // Specific missing evidence notes
  uncertaintyNotes: string; // Known gaps or uncertainties
  refinedDescription: string;
  refinedExpectedResult: string;
  refinedActualResult: string;
  managerNotes: string;
  reviewerLabel?: string; // "Demo manager"
  approvedAt?: string;
  approvedBy?: string;
  isManagerConfirmed?: boolean; // Distinguishes manager manual confirmation from future AI suggestions
  aiDraft?: AiDraftData; // Distinct AI draft fields
}

export interface UatReport {
  id: string; // e.g. "UAT-101"
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  testerInput: TesterSubmission;
  managerReview: ManagerReview;
  developerTicket?: DeveloperTicket;
  statusExplanation?: string; // Explanation visible to tester
  activeClarificationQuestion?: {
    question: string;
    requestedAt: string;
    requestedBy: string; // "Demo manager"
  };
  history: DecisionLogEntry[];
}

