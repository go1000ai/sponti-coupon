'use client';

import { useEffect, useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, Step, TooltipRenderProps } from 'react-joyride';
import { X, ChevronRight, SkipForward } from 'lucide-react';

interface GuidedTourProps {
  tourKey: string;
  steps: Step[];
}

function CustomTooltip({
  continuous,
  index,
  step,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="bg-white rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-80 max-w-sm animate-scale-up"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-orange-400 px-4 sm:px-5 py-3 flex items-center justify-between rounded-t-2xl">
        <p className="text-white text-sm font-semibold">
          {step.title || `Step ${index + 1} of ${size}`}
        </p>
        <button
          {...closeProps}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close tour"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-4">
        <div className="text-sm text-gray-600 leading-relaxed">
          {step.content}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center justify-between rounded-b-2xl">
        <button
          {...skipProps}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </button>

        <span className="text-xs text-gray-400 font-medium">
          {index + 1} / {size}
        </span>

        {continuous && (
          <button
            {...primaryProps}
            className="bg-gradient-to-r from-primary-500 to-orange-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-primary-600 hover:to-orange-500 transition-all shadow-sm flex items-center gap-1"
          >
            {isLastStep ? 'Got it!' : (
              <>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function GuidedTour({ tourKey, steps }: GuidedTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const storageKey = `sponti_tour_${tourKey}_done`;

  useEffect(() => {
    try {
      const autoStart = localStorage.getItem('sponti_tour_auto_start');
      if (autoStart === 'false') return;

      const done = localStorage.getItem(storageKey);
      if (done) return;
    } catch {
      return;
    }

    // Delay start so the page renders first
    const timer = setTimeout(() => {
      setRun(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [storageKey]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, type, index } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      try { localStorage.setItem(storageKey, 'true'); } catch { /* noop */ }
      return;
    }

    if (action === ACTIONS.CLOSE) {
      setRun(false);
      try { localStorage.setItem(storageKey, 'true'); } catch { /* noop */ }
      return;
    }

    // If target not found at runtime, auto-advance to next step
    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + 1);
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  }, [storageKey]);

  if (!run) return null;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={run}
      continuous
      showSkipButton
      scrollOffset={80}
      disableOverlayClose={false}
      disableScrolling={false}
      spotlightClicks={false}
      callback={handleCallback}
      tooltipComponent={CustomTooltip}
      floaterProps={{
        disableAnimation: false,
        disableFlip: true,
        styles: {
          arrow: {
            length: 8,
            spread: 16,
          },
        },
      }}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
    />
  );
}
