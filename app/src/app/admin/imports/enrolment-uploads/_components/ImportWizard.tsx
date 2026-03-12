'use client';

/**
 * ImportWizard Component
 * 6-step wizard for import flow:
 * 1. Upload - File selection and upload
 * 2. Sheet Selection - Choose worksheet (multi-sheet files)
 * 3. Preview - View parsed data
 * 4. Review - Edit and resolve issues
 * 5. Apply - Execute changes
 * 6. Summary - Show results
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileSpreadsheet,
  Eye,
  ClipboardCheck,
  Play,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StepUpload from './wizard/StepUpload';
import StepSheetSelect from './wizard/StepSheetSelect';
import StepPreview from './wizard/StepPreview';
import StepReview from './wizard/StepReview';
import StepApply from './wizard/StepApply';
import StepSummary from './wizard/StepSummary';

// Wizard step types
export type WizardStep = 'upload' | 'sheet' | 'preview' | 'review' | 'apply' | 'summary';

export interface SheetInfo {
  name: string;
  rowCount: number;
}

export interface WizardState {
  step: WizardStep;
  file: File | null;
  sheets: SheetInfo[];
  selectedSheet: string | null;
  batchId: string | null;
  error: string | null;
  isLoading: boolean;
  // Apply results
  applyResult: ApplyResult | null;
}

export interface ApplyResult {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
  insertedStudents?: Array<{ id: string; name: string; email: string }>;
  updatedEnrollments?: Array<{ id: string; studentName: string; className: string }>;
}

interface StepConfig {
  id: WizardStep;
  label: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'sheet', label: 'Sheet', icon: FileSpreadsheet },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
  { id: 'apply', label: 'Apply', icon: Play },
  { id: 'summary', label: 'Summary', icon: CheckCircle },
];

interface ImportWizardProps {
  /** Initial batch ID if resuming an existing import */
  initialBatchId?: string;
  /** Initial step to start at */
  initialStep?: WizardStep;
}

export default function ImportWizard({ initialBatchId, initialStep }: ImportWizardProps) {
  const router = useRouter();

  const [state, setState] = useState<WizardState>({
    step: initialStep || (initialBatchId ? 'review' : 'upload'),
    file: null,
    sheets: [],
    selectedSheet: null,
    batchId: initialBatchId || null,
    error: null,
    isLoading: false,
    applyResult: null,
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === state.step);

  // Navigation helpers
  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step, error: null }));
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, goToStep]);

  const goPrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex, goToStep]);

  // State update helpers
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // Step handlers
  const handleFileSelected = useCallback((file: File) => {
    setState(prev => ({ ...prev, file, error: null }));
  }, []);

  const handleUploadComplete = useCallback(
    (result: { batchId?: string; multiSheet?: boolean; sheets?: SheetInfo[] }) => {
      if (result.multiSheet && result.sheets) {
        // Multi-sheet file - go to sheet selection
        setState(prev => ({
          ...prev,
          sheets: result.sheets || [],
          step: 'sheet',
          error: null,
        }));
      } else if (result.batchId) {
        // Single sheet - go directly to preview
        setState(prev => ({
          ...prev,
          batchId: result.batchId || null,
          step: 'preview',
          error: null,
        }));
      }
    },
    []
  );

  const handleSheetSelected = useCallback((sheetName: string, batchId: string) => {
    setState(prev => ({
      ...prev,
      selectedSheet: sheetName,
      batchId,
      step: 'preview',
      error: null,
    }));
  }, []);

  const handlePreviewConfirmed = useCallback(() => {
    goToStep('review');
  }, [goToStep]);

  const handleReviewComplete = useCallback(() => {
    goToStep('apply');
  }, [goToStep]);

  const handleApplyComplete = useCallback((result: ApplyResult) => {
    setState(prev => ({
      ...prev,
      applyResult: result,
      step: 'summary',
      error: null,
    }));
  }, []);

  const handleDone = useCallback(() => {
    router.push('/admin/imports/enrolment-uploads');
  }, [router]);

  const handleStartNew = useCallback(() => {
    setState({
      step: 'upload',
      file: null,
      sheets: [],
      selectedSheet: null,
      batchId: null,
      error: null,
      isLoading: false,
      applyResult: null,
    });
  }, []);

  // Render step content
  const renderStepContent = () => {
    switch (state.step) {
      case 'upload':
        return (
          <StepUpload
            file={state.file}
            onFileSelected={handleFileSelected}
            onUploadComplete={handleUploadComplete}
            onError={setError}
            isLoading={state.isLoading}
            setLoading={setLoading}
          />
        );

      case 'sheet':
        return (
          <StepSheetSelect
            file={state.file}
            sheets={state.sheets}
            onSheetSelected={handleSheetSelected}
            onError={setError}
            onBack={goPrevious}
            isLoading={state.isLoading}
            setLoading={setLoading}
          />
        );

      case 'preview':
        return (
          <StepPreview
            batchId={state.batchId!}
            onConfirm={handlePreviewConfirmed}
            onBack={goPrevious}
          />
        );

      case 'review':
        return (
          <StepReview
            batchId={state.batchId!}
            onComplete={handleReviewComplete}
            onBack={goPrevious}
          />
        );

      case 'apply':
        return (
          <StepApply
            batchId={state.batchId!}
            onComplete={handleApplyComplete}
            onError={setError}
            onBack={goPrevious}
          />
        );

      case 'summary':
        return (
          <StepSummary
            result={state.applyResult!}
            onDone={handleDone}
            onStartNew={handleStartNew}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Step Indicator */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center">
          {STEPS.map((step, index) => {
            const isActive = step.id === state.step;
            const isComplete = index < currentStepIndex;
            const Icon = step.icon;

            return (
              <li key={step.id} className={cn('relative', index !== 0 && 'pl-8 flex-1')}>
                {index !== 0 && (
                  <div
                    className={cn(
                      'absolute left-0 top-4 h-0.5 w-8 -translate-y-1/2',
                      isComplete ? 'bg-blue-600' : 'bg-gray-200'
                    )}
                  />
                )}
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                    isActive && 'bg-blue-50',
                    isComplete && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={() => isComplete && goToStep(step.id)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      isActive && 'bg-blue-600 text-white',
                      isComplete && 'bg-green-600 text-white',
                      !isActive && !isComplete && 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium hidden sm:inline',
                      isActive && 'text-blue-600',
                      isComplete && 'text-green-600',
                      !isActive && !isComplete && 'text-gray-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {renderStepContent()}
      </div>
    </div>
  );
}
