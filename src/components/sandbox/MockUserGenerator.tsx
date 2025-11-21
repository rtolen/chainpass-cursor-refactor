import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, Copy, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  scenario: string;
  documentType: string;
  biometricQuality: string;
}

const scenarios = [
  { value: 'success', label: 'Successful Verification', description: 'All checks pass' },
  { value: 'failed_document', label: 'Failed Document', description: 'Document validation fails' },
  { value: 'failed_biometric', label: 'Failed Biometric', description: 'Face match fails' },
  { value: 'expired_id', label: 'Expired ID', description: 'Document is expired' },
  { value: 'pending_review', label: 'Pending Review', description: 'Requires manual review' },
];

const generateMockUser = (scenario: string): MockUser => {
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const randomId = Math.random().toString(36).substring(7);
  
  return {
    id: `test_user_${randomId}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    scenario,
    documentType: ['passport', 'drivers_license', 'national_id'][Math.floor(Math.random() * 3)],
    biometricQuality: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
  };
};

export const MockUserGenerator = () => {
  const { toast } = useToast();
  const [selectedScenario, setSelectedScenario] = useState('success');
  const [generatedUser, setGeneratedUser] = useState<MockUser | null>(null);

  const handleGenerate = () => {
    const user = generateMockUser(selectedScenario);
    setGeneratedUser(user);
    toast({
      title: "Mock User Generated",
      description: `Created test user: ${user.name}`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "User data copied successfully",
    });
  };

  const copyAsJSON = () => {
    if (generatedUser) {
      navigator.clipboard.writeText(JSON.stringify(generatedUser, null, 2));
      toast({
        title: "Copied to clipboard",
        description: "User data copied as JSON",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Selection */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Test Scenario</Label>
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger>
              <SelectValue placeholder="Select a scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.value} value={scenario.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{scenario.label}</span>
                    <span className="text-xs text-muted-foreground">{scenario.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerate} className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Generate Mock User
        </Button>
      </div>

      {/* Generated User Display */}
      {generatedUser && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{generatedUser.name}</h3>
            <Badge variant={generatedUser.scenario === 'success' ? 'default' : 'secondary'}>
              {scenarios.find(s => s.value === generatedUser.scenario)?.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">User ID</p>
              <p className="font-mono">{generatedUser.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-mono">{generatedUser.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-mono">{generatedUser.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Document Type</p>
              <p className="capitalize">{generatedUser.documentType.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Biometric Quality</p>
              <p className="capitalize">{generatedUser.biometricQuality}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => copyToClipboard(generatedUser.id)}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy ID
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyAsJSON}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy JSON
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerate}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New User
            </Button>
          </div>

          {/* SDK Usage Example */}
          <div className="space-y-2 pt-4 border-t">
            <p className="text-sm font-semibold">SDK Usage Example:</p>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              <code>{`const verification = await chainpass.createVerification({
  session_id: "${generatedUser.id}",
  verification_status: "pending"
});

// Expected result: ${generatedUser.scenario === 'success' ? 'Success' : 'Failure'}
// Scenario: ${scenarios.find(s => s.value === generatedUser.scenario)?.description}`}</code>
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};
