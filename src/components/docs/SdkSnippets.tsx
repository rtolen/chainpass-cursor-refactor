import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SdkSnippets = () => {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard",
    });
  };

  const downloadSnippet = (code: string, filename: string) => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded!",
      description: `${filename} has been downloaded`,
    });
  };

  const javascriptSnippet = `// ChainPass API Client - JavaScript/Node.js
class ChainPassClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://pbxpkfotysozdmdophhg.supabase.co';
  }

  async request(endpoint, method = 'GET', body = null) {
    const headers = {
      'apikey': this.apiKey,
      'Authorization': \`Bearer \${this.apiKey}\`,
      'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Create verification record
  async createVerificationRecord(sessionId) {
    return this.request('/rest/v1/verification_records', 'POST', {
      session_id: sessionId,
      verification_status: 'pending'
    });
  }

  // Create V.A.I. assignment
  async createVAIAssignment(verificationRecordId, vaiCode) {
    return this.request('/rest/v1/vai_assignments', 'POST', {
      verification_record_id: verificationRecordId,
      vai_code: vaiCode,
      status: 'active'
    });
  }

  // Process payment
  async createPayment(verificationRecordId, amount) {
    return this.request('/rest/v1/payments', 'POST', {
      verification_record_id: verificationRecordId,
      amount,
      status: 'pending'
    });
  }

  // Send to Vairify
  async sendToVairify(vaiNumber, userData) {
    return this.request('/functions/v1/send-to-vairify', 'POST', {
      vai_number: vaiNumber,
      user_data: userData
    });
  }
}

// Usage example
const client = new ChainPassClient('your_api_key_here');

try {
  const verification = await client.createVerificationRecord('session_123');
  console.log('Verification created:', verification);
} catch (error) {
  console.error('Error:', error.message);
}`;

  const pythonSnippet = `# ChainPass API Client - Python
import requests
import json

class ChainPassClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = 'https://pbxpkfotysozdmdophhg.supabase.co'
        self.headers = {
            'apikey': api_key,
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def request(self, endpoint, method='GET', body=None):
        url = f'{self.base_url}{endpoint}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=body)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=body)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f'API request failed: {str(e)}')

    def create_verification_record(self, session_id):
        """Create a new verification record"""
        return self.request('/rest/v1/verification_records', 'POST', {
            'session_id': session_id,
            'verification_status': 'pending'
        })

    def create_vai_assignment(self, verification_record_id, vai_code):
        """Create a V.A.I. assignment"""
        return self.request('/rest/v1/vai_assignments', 'POST', {
            'verification_record_id': verification_record_id,
            'vai_code': vai_code,
            'status': 'active'
        })

    def create_payment(self, verification_record_id, amount):
        """Process a payment"""
        return self.request('/rest/v1/payments', 'POST', {
            'verification_record_id': verification_record_id,
            'amount': amount,
            'status': 'pending'
        })

    def send_to_vairify(self, vai_number, user_data):
        """Send data to Vairify platform"""
        return self.request('/functions/v1/send-to-vairify', 'POST', {
            'vai_number': vai_number,
            'user_data': user_data
        })

# Usage example
client = ChainPassClient('your_api_key_here')

try:
    verification = client.create_verification_record('session_123')
    print(f'Verification created: {verification}')
except Exception as e:
    print(f'Error: {str(e)}')`;

  const phpSnippet = `<?php
// ChainPass API Client - PHP

class ChainPassClient {
    private $apiKey;
    private $baseUrl = 'https://pbxpkfotysozdmdophhg.supabase.co';

    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }

    private function request($endpoint, $method = 'GET', $body = null) {
        $headers = [
            'apikey: ' . $this->apiKey,
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init($this->baseUrl . $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            $error = json_decode($response, true);
            throw new Exception($error['message'] ?? 'API request failed');
        }

        return json_decode($response, true);
    }

    public function createVerificationRecord($sessionId) {
        return $this->request('/rest/v1/verification_records', 'POST', [
            'session_id' => $sessionId,
            'verification_status' => 'pending'
        ]);
    }

    public function createVAIAssignment($verificationRecordId, $vaiCode) {
        return $this->request('/rest/v1/vai_assignments', 'POST', [
            'verification_record_id' => $verificationRecordId,
            'vai_code' => $vaiCode,
            'status' => 'active'
        ]);
    }

    public function createPayment($verificationRecordId, $amount) {
        return $this->request('/rest/v1/payments', 'POST', [
            'verification_record_id' => $verificationRecordId,
            'amount' => $amount,
            'status' => 'pending'
        ]);
    }

    public function sendToVairify($vaiNumber, $userData) {
        return $this->request('/functions/v1/send-to-vairify', 'POST', [
            'vai_number' => $vaiNumber,
            'user_data' => $userData
        ]);
    }
}

// Usage example
$client = new ChainPassClient('your_api_key_here');

try {
    $verification = $client->createVerificationRecord('session_123');
    echo 'Verification created: ' . json_encode($verification);
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage();
}
?>`;

  const rubySnippet = `# ChainPass API Client - Ruby
require 'net/http'
require 'json'
require 'uri'

class ChainPassClient
  def initialize(api_key)
    @api_key = api_key
    @base_url = 'https://pbxpkfotysozdmdophhg.supabase.co'
  end

  def request(endpoint, method = 'GET', body = nil)
    uri = URI.parse(@base_url + endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    case method
    when 'GET'
      request = Net::HTTP::Get.new(uri.request_uri)
    when 'POST'
      request = Net::HTTP::Post.new(uri.request_uri)
    when 'PATCH'
      request = Net::HTTP::Patch.new(uri.request_uri)
    end

    request['apikey'] = @api_key
    request['Authorization'] = "Bearer #{@api_key}"
    request['Content-Type'] = 'application/json'
    request.body = body.to_json if body

    response = http.request(request)
    
    if response.code.to_i >= 400
      error = JSON.parse(response.body)
      raise StandardError.new(error['message'] || 'API request failed')
    end

    JSON.parse(response.body)
  end

  def create_verification_record(session_id)
    request('/rest/v1/verification_records', 'POST', {
      session_id: session_id,
      verification_status: 'pending'
    })
  end

  def create_vai_assignment(verification_record_id, vai_code)
    request('/rest/v1/vai_assignments', 'POST', {
      verification_record_id: verification_record_id,
      vai_code: vai_code,
      status: 'active'
    })
  end

  def create_payment(verification_record_id, amount)
    request('/rest/v1/payments', 'POST', {
      verification_record_id: verification_record_id,
      amount: amount,
      status: 'pending'
    })
  end

  def send_to_vairify(vai_number, user_data)
    request('/functions/v1/send-to-vairify', 'POST', {
      vai_number: vai_number,
      user_data: user_data
    })
  end
end

# Usage example
client = ChainPassClient.new('your_api_key_here')

begin
  verification = client.create_verification_record('session_123')
  puts "Verification created: #{verification}"
rescue StandardError => e
  puts "Error: #{e.message}"
end`;

  const curlSnippet = `#!/bin/bash
# ChainPass API Client - cURL Examples

API_KEY="your_api_key_here"
BASE_URL="https://pbxpkfotysozdmdophhg.supabase.co"

# Create Verification Record
curl -X POST "$BASE_URL/rest/v1/verification_records" \\
  -H "apikey: $API_KEY" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "session_123",
    "verification_status": "pending"
  }'

# Create V.A.I. Assignment
curl -X POST "$BASE_URL/rest/v1/vai_assignments" \\
  -H "apikey: $API_KEY" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "verification_record_id": "verification_id",
    "vai_code": "VAI-12345",
    "status": "active"
  }'

# Create Payment
curl -X POST "$BASE_URL/rest/v1/payments" \\
  -H "apikey: $API_KEY" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "verification_record_id": "verification_id",
    "amount": 9900,
    "status": "pending"
  }'

# Send to Vairify
curl -X POST "$BASE_URL/functions/v1/send-to-vairify" \\
  -H "apikey: $API_KEY" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vai_number": "VAI-12345",
    "user_data": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'`;

  const snippets = {
    javascript: { code: javascriptSnippet, filename: "chainpass-client.js" },
    python: { code: pythonSnippet, filename: "chainpass_client.py" },
    php: { code: phpSnippet, filename: "ChainPassClient.php" },
    ruby: { code: rubySnippet, filename: "chainpass_client.rb" },
    curl: { code: curlSnippet, filename: "chainpass-api.sh" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDK Code Snippets</CardTitle>
        <CardDescription>
          Ready-to-use code examples in multiple programming languages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="php">PHP</TabsTrigger>
            <TabsTrigger value="ruby">Ruby</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
          </TabsList>

          {Object.entries(snippets).map(([lang, { code, filename }]) => (
            <TabsContent key={lang} value={lang} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(code)}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSnippet(code, filename)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{code}</code>
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
