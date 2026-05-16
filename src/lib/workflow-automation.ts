/**
 * Automated Workflow Engine
 * Handles automatic assignment and processing of reports
 */

import type { Report, AIAnalysis } from './types';
import { departments } from './constants';

// Department names as string type
type DepartmentName = typeof departments[number] | 'Unassigned';

interface WorkflowDecision {
  suggestedDepartment: DepartmentName;
  suggestedPriority: Report['priority'];
  autoAssign: boolean;
  estimatedResolutionTime: string;
  requiresVerification: boolean;
}

/**
 * Automated workflow decision engine
 * Analyzes report and AI data to make assignment decisions
 */
export function analyzeReportForWorkflow(
  report: Partial<Report>,
  aiAnalysis?: AIAnalysis
): WorkflowDecision {
  let suggestedDepartment: DepartmentName = 'Unassigned';
  let suggestedPriority: Report['priority'] = 'Medium';
  let autoAssign = false;
  let estimatedResolutionTime = '48 hours';
  let requiresVerification = true;

  // Use AI analysis if available
  if (aiAnalysis) {
    // Map AI department suggestion
    const suggestedDept = aiAnalysis.suggestedDepartment;
    if (suggestedDept &&
      suggestedDept !== 'Unassigned' &&
      departments.includes(suggestedDept)) {
      suggestedDepartment = suggestedDept as DepartmentName;
    }

    // Map AI priority
    if (aiAnalysis.suggestedPriority) {
      suggestedPriority = aiAnalysis.suggestedPriority;
    }

    // Auto-assign if AI is confident (high severity + likely genuine)
    if (
      aiAnalysis.damageDetected &&
      aiAnalysis.verificationSuggestion === 'Likely genuine' &&
      aiAnalysis.severity !== 'Low'
    ) {
      autoAssign = true;
      requiresVerification = false;
    }

    // Adjust resolution time based on severity
    switch (aiAnalysis.severity) {
      case 'Low':
        estimatedResolutionTime = '72 hours';
        break;
      case 'Medium':
        estimatedResolutionTime = '48 hours';
        break;
      case 'High':
        estimatedResolutionTime = '24 hours';
        break;
    }
  }

  // Category-based department mapping (fallback)
  if (suggestedDepartment === 'Unassigned' && report.category) {
    suggestedDepartment = mapCategoryToDepartment(report.category);
  }

  // Priority-based adjustments
  if (suggestedPriority === 'Critical') {
    estimatedResolutionTime = '12 hours';
    autoAssign = true;
    requiresVerification = false;
  }

  return {
    suggestedDepartment,
    suggestedPriority,
    autoAssign,
    estimatedResolutionTime,
    requiresVerification,
  };
}

/**
 * Map damage category to appropriate department
 */
function mapCategoryToDepartment(category: string): DepartmentName {
  const categoryMap: Record<string, string> = {
    'Pothole': 'Engineering',
    'Crack': 'Engineering',
    'Surface failure': 'Engineering',
    'Water-logged damage': 'Drainage',
    'Manhole issue': 'Drainage',
    'Street light': 'Electricity',
    'Traffic signal': 'Traffic',
    'Road marking': 'Traffic',
    'Water leak': 'Water Supply',
    'Pipe burst': 'Water Supply',
  };

  const mapped = categoryMap[category];
  if (mapped && departments.includes(mapped)) {
    return mapped as DepartmentName;
  }
  return 'Unassigned';
}

/**
 * Determine initial status based on workflow analysis
 */
export function getInitialStatus(workflow: WorkflowDecision): Report['status'] {
  if (workflow.autoAssign) {
    return 'Assigned';
  }
  if (workflow.requiresVerification) {
    return 'Under Verification';
  }
  return 'Submitted';
}

/**
 * Auto-select best worker for department
 * Based on workload and performance
 */
export function selectBestWorker(
  department: DepartmentName,
  workers: Array<{ name: string; department: string; activeTaskCount?: number }>
): string | null {
  // Filter workers by department
  const departmentWorkers = workers.filter(w => w.department === department);

  if (departmentWorkers.length === 0) {
    return null;
  }

  // Select worker with least active tasks
  const bestWorker = departmentWorkers.reduce((best, current) => {
    const bestCount = best.activeTaskCount || 0;
    const currentCount = current.activeTaskCount || 0;
    return currentCount < bestCount ? current : best;
  });

  return bestWorker.name;
}

/**
 * Generate action log entry for automated actions
 */
export function createAutomatedActionLog(
  workflow: WorkflowDecision,
  assignedWorker?: string
) {
  return {
    status: workflow.autoAssign ? 'Assigned' as const : 'Under Verification' as const,
    timestamp: new Date().toISOString(),
    actor: 'System' as const,
    actorName: 'AI System',
    notes: workflow.autoAssign
      ? `Automatically assigned to ${workflow.suggestedDepartment} department${assignedWorker ? ` - ${assignedWorker}` : ''}. Priority: ${workflow.suggestedPriority}. Estimated resolution: ${workflow.estimatedResolutionTime}.`
      : `Report submitted for verification. Suggested department: ${workflow.suggestedDepartment}, Priority: ${workflow.suggestedPriority}.`,
  };
}

/**
 * Calculate confidence score for automation
 */
export function calculateAutomationConfidence(
  aiAnalysis?: AIAnalysis,
  hasPhoto: boolean = true,
  hasGPS: boolean = true
): number {
  let confidence = 0;

  // Base scores
  if (hasPhoto) confidence += 30;
  if (hasGPS) confidence += 20;

  if (aiAnalysis) {
    if (aiAnalysis.damageDetected) confidence += 20;
    if (aiAnalysis.verificationSuggestion === 'Likely genuine') confidence += 20;

    // Severity bonus
    if (aiAnalysis.severity === 'High') confidence += 10;

    // Department confidence
    if (aiAnalysis.suggestedDepartment !== 'Unassigned') confidence += 10;
  }

  return Math.min(confidence, 100);
}
