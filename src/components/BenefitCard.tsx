import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BenefitCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: "primary" | "accent" | "success" | "destructive";
}

const colorClasses = {
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  destructive: "text-destructive",
};

export const BenefitCard = ({ icon: Icon, title, description, color }: BenefitCardProps) => {
  return (
    <div className="p-5 glass rounded-xl transition-smooth hover:shadow-glow hover:scale-[1.02]">
      <div className={cn("flex items-center gap-2 mb-2", colorClasses[color])}>
        <Icon className="w-5 h-5" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};
