import { UserPlus, Mail, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  {
    icon: UserPlus,
    title: "1. Create Account",
    description: "Sign up with your email and create a secure password"
  },
  {
    icon: Mail,
    title: "2. Verify Your Email",
    description: "Check your inbox and click the verification link to confirm"
  },
  {
    icon: CheckCircle,
    title: "3. Sign In & Learn!",
    description: "Your progress and chats will be saved across sessions"
  }
];

const AuthTutorial = () => {
  return (
    <Card className="glass-card mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-center">
          Getting Started
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <step.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AuthTutorial;
