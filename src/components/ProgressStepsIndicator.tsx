import { Check } from "lucide-react";
import { verificationNavigator } from "@/utils/verificationNavigation";

interface ProgressStepsIndicatorProps {
  currentPath: string;
}

export const ProgressStepsIndicator = ({ currentPath }: ProgressStepsIndicatorProps) => {
  const steps = verificationNavigator.getRequiredSteps();
  const currentStepIndex = steps.findIndex(step => step.path === currentPath);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <div key={step.path} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                    ${isUpcoming ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <p
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {step.label}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-all
                    ${isCompleted ? 'bg-primary' : 'bg-muted'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
