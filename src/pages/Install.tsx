import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Smartphone, Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import chainpassLogo from "@/assets/chainpass-logo.svg";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info("Please use your browser's menu to install the app");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success("App installed successfully!");
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <img src={chainpassLogo} alt="ChainPass" className="h-20 md:h-24 mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Install V.A.I. App</h1>
          <p className="text-muted-foreground">
            Get quick access to V.A.I. verification right from your home screen
          </p>
        </div>

        {/* Install Card */}
        <Card className="glass shadow-card">
          <CardHeader>
            <CardTitle>Install as App</CardTitle>
            <CardDescription>
              Install V.A.I. on your device for a native app experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isInstallable ? (
              <Button 
                onClick={handleInstallClick}
                className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-smooth shadow-glow"
              >
                <Smartphone className="w-5 h-5 mr-2" />
                Install Now
              </Button>
            ) : (
              <div className="p-4 rounded-lg bg-secondary text-center">
                <p className="text-sm text-muted-foreground">
                  To install this app, use your browser's menu and select "Add to Home Screen" or "Install App"
                </p>
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Lightning Fast</h3>
                  <p className="text-sm text-muted-foreground">
                    Instant loading with offline support
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Native Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Works just like a regular app on your device
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Secure & Private</h3>
                  <p className="text-sm text-muted-foreground">
                    All the same security features you expect
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Instructions */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Installation Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  iOS
                </span>
                iPhone / iPad
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 ml-8 list-decimal">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-success text-success-foreground text-xs flex items-center justify-center">
                  A
                </span>
                Android
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 ml-8 list-decimal">
                <li>Tap the menu icon (three dots) in Chrome</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Install;
