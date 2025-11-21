import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Trash2, Play, Share2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestScenario {
  id: string;
  name: string;
  description: string | null;
  test_type: string;
  configuration: any;
  mock_data: any;
  tags: string[];
  is_public: boolean;
  created_at: string;
}

interface SavedScenariosManagerProps {
  onLoadScenario?: (scenario: TestScenario) => void;
  currentScenario?: {
    testType: string;
    configuration: any;
    mockData?: any;
  };
}

export function SavedScenariosManager({ onLoadScenario, currentScenario }: SavedScenariosManagerProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [scenarioTags, setScenarioTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user logged in");
      return;
    }

    const { data, error } = await supabase
      .from("sandbox_test_scenarios")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading scenarios:", error);
      return;
    }

    setScenarios(data || []);
  };

  const handleSaveScenario = async () => {
    if (!scenarioName || !currentScenario) {
      toast({
        title: "Error",
        description: "Please enter a scenario name",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save scenarios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("sandbox_test_scenarios")
        .insert({
          user_id: user.id,
          name: scenarioName,
          description: scenarioDescription || null,
          test_type: currentScenario.testType,
          configuration: currentScenario.configuration,
          mock_data: currentScenario.mockData || null,
          tags: scenarioTags ? scenarioTags.split(",").map(t => t.trim()) : [],
          is_public: isPublic,
        });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Test scenario saved successfully",
      });

      setIsSaveDialogOpen(false);
      setScenarioName("");
      setScenarioDescription("");
      setScenarioTags("");
      setIsPublic(false);
      
      loadScenarios();
    } catch (error: any) {
      console.error("Error saving scenario:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save scenario",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    const { error } = await supabase
      .from("sandbox_test_scenarios")
      .delete()
      .eq("id", scenarioId);

    if (error) {
      console.error("Error deleting scenario:", error);
      toast({
        title: "Error",
        description: "Failed to delete scenario",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Deleted",
      description: "Scenario deleted successfully",
    });

    loadScenarios();
  };

  const handleLoadScenario = (scenario: TestScenario) => {
    if (onLoadScenario) {
      onLoadScenario(scenario);
    }
    toast({
      title: "Loaded",
      description: `Scenario "${scenario.name}" loaded`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Scenarios</h3>
        
        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!currentScenario}>
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Test Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  placeholder="E.g., Complete Verification Flow"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe what this scenario tests..."
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                <Input
                  placeholder="verification, payment, webhook"
                  value={scenarioTags}
                  onChange={(e) => setScenarioTags(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublic(!isPublic)}
                >
                  {isPublic ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  {isPublic ? "Public" : "Private"}
                </Button>
              </div>
              <Button onClick={handleSaveScenario} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save Scenario"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {scenarios.length === 0 ? (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                No saved scenarios yet. Save your current test to get started.
              </p>
            </Card>
          ) : (
            scenarios.map((scenario) => (
              <Card key={scenario.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{scenario.name}</h4>
                      {scenario.is_public && (
                        <Badge variant="outline" className="text-xs">
                          <Share2 className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    {scenario.description && (
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadScenario(scenario)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="secondary">{scenario.test_type}</Badge>
                  {scenario.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(scenario.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
