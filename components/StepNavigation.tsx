import React from "react";

import { Dispatch, SetStateAction } from "react";

type Step = "home" | "choose_client" | "add_post_content" | "suggested_ideas" | "visuals_generate";

interface StepNavigationProps {
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  steps: { key: string; label: string }[];
  disabledSteps: Step[];
}

export default function StepNavigation({ step, setStep, steps, disabledSteps }: StepNavigationProps) {
  const idx = steps.findIndex(s => s.key === step);
  return (
    <div className="border-t pt-6 mt-8 flex justify-between items-center w-full">
      <button
        className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        onClick={() => idx > 0 && setStep(steps[idx - 1].key as Step)}
        disabled={idx === 0}
      >
        Prev
      </button>
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={() => idx < steps.length - 1 && !disabledSteps.includes(steps[idx + 1].key as Step) && setStep(steps[idx + 1].key as Step)}
        disabled={idx === steps.length - 1 || disabledSteps.includes(steps[idx + 1].key as Step)}
      >
        Next
      </button>
    </div>
  );
}

