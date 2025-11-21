import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export const ProgressSteps = ({ currentStep, steps }: ProgressStepsProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-smooth mb-2",
                    isCurrent && "bg-primary text-primary-foreground shadow-glow animate-glow-pulse",
                    isComplete && "bg-success text-success-foreground",
                    !isCurrent && !isComplete && "bg-secondary text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
                <span className={cn(
                  "text-xs text-center",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-smooth",
                    stepNumber < currentStep ? "bg-success" : "bg-secondary"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
