import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressIndicator = ({ currentStep, totalSteps }: ProgressIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-smooth",
              step === currentStep
                ? "bg-primary text-primary-foreground shadow-glow"
                : step < currentStep
                ? "bg-success text-success-foreground"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {step}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                "w-16 h-1 transition-smooth",
                step < currentStep ? "bg-success" : "bg-secondary"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
