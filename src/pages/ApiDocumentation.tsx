import { useState } from "react";
import { Book, Code, Lock, Zap, AlertTriangle, Download, FileCode, Beaker } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { ApiRequestBuilder } from "@/components/docs/ApiRequestBuilder";
import { AuthenticationGuide } from "@/components/docs/AuthenticationGuide";
import { RateLimitsGuide } from "@/components/docs/RateLimitsGuide";
import { ErrorCodesReference } from "@/components/docs/ErrorCodesReference";
import { SdkSnippets } from "@/components/docs/SdkSnippets";
import { ApiVersioning } from "@/components/docs/ApiVersioning";
import { ApiTestingSuite } from "@/components/docs/ApiTestingSuite";
import { WebhookDebugger } from "@/components/docs/WebhookDebugger";
import { ApiPerformanceMetrics } from "@/components/docs/ApiPerformanceMetrics";
import { ApiSandbox } from "@/components/docs/ApiSandbox";
import { GraphQLSupport } from "@/components/docs/GraphQLSupport";
import { UsageAnalytics } from "@/components/docs/UsageAnalytics";
import { EndpointsReference } from "@/components/docs/EndpointsReference";
import { WebhookIntegrationGuide } from "@/components/docs/WebhookIntegrationGuide";
import apiSpec from "../../docs/CHAINPASS-API.json";

export default function ApiDocumentation() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  const downloadSpec = () => {
    const blob = new Blob([JSON.stringify(apiSpec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chainpass-api-spec.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Book className="w-8 h-8 text-primary" />
                ChainPass API Documentation
              </h1>
              <p className="text-muted-foreground mt-2">
                Complete reference for integrating ChainPass V.A.I. verification into your application
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/sandbox")}
                className="flex items-center gap-2"
              >
                <Beaker className="w-4 h-4" />
                Try Sandbox
              </Button>
              <button
                onClick={downloadSpec}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download OpenAPI Spec
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Book className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Endpoints
              </TabsTrigger>
              <TabsTrigger value="authentication" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Authentication
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="versioning" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Versioning
              </TabsTrigger>
              <TabsTrigger value="sandbox" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Sandbox
              </TabsTrigger>
              <TabsTrigger value="graphql" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                GraphQL
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="testing" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Testing
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="webhook-debug" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Webhook Debug
              </TabsTrigger>
              <TabsTrigger value="interactive" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Interactive
              </TabsTrigger>
              <TabsTrigger value="authentication" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Auth
              </TabsTrigger>
              <TabsTrigger value="builder" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="limits" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Limits
              </TabsTrigger>
              <TabsTrigger value="errors" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Errors
              </TabsTrigger>
              <TabsTrigger value="sdk" className="flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                SDK
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="versioning">
            <ApiVersioning />
          </TabsContent>

          <TabsContent value="sandbox">
            <ApiSandbox />
          </TabsContent>

          <TabsContent value="graphql">
            <GraphQLSupport />
          </TabsContent>

          <TabsContent value="analytics">
            <UsageAnalytics />
          </TabsContent>

          <TabsContent value="testing">
            <ApiTestingSuite />
          </TabsContent>

          <TabsContent value="performance">
            <ApiPerformanceMetrics />
          </TabsContent>

          <TabsContent value="webhook-debug">
            <WebhookDebugger />
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Learn how to integrate ChainPass V.A.I. verification into your application
                  </CardDescription>
                </CardHeader>
                <CardContent className="prose prose-slate max-w-none dark:prose-invert">
                  <h3>Introduction</h3>
                  <p>
                    The ChainPass API enables you to integrate verified anonymous identity (V.A.I.) 
                    functionality into your application. Our API follows RESTful principles and uses 
                    JSON for request and response bodies.
                  </p>

                  <h3>Base URL</h3>
                  <pre className="bg-muted p-3 rounded-lg">
                    https://pbxpkfotysozdmdophhg.supabase.co
                  </pre>

                  <h3>Authentication</h3>
                  <p>
                    All API requests require authentication using an API key. Include your API key 
                    in the request headers:
                  </p>
                  <pre className="bg-muted p-3 rounded-lg">
                    {`apikey: YOUR_API_KEY
Authorization: Bearer YOUR_API_KEY`}
                  </pre>

                  <h3>Core Endpoints</h3>
                  <ul>
                    <li><strong>Verification Records:</strong> Manage identity verification sessions</li>
                    <li><strong>V.A.I. Assignments:</strong> Create and manage V.A.I. codes</li>
                    <li><strong>Payments:</strong> Track verification payments</li>
                    <li><strong>Legal Agreements:</strong> Record legal consents and signatures</li>
                  </ul>

                  <h3>Quick Start</h3>
                  <ol>
                    <li>Register as a business partner</li>
                    <li>Receive your API key from ChainPass administrators</li>
                    <li>Make your first API request</li>
                    <li>Set up webhook endpoints to receive verification events</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="endpoints">
            <EndpointsReference />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookIntegrationGuide />
          </TabsContent>

          <TabsContent value="interactive">
            <Card>
              <CardHeader>
                <CardTitle>Interactive API Explorer</CardTitle>
                <CardDescription>
                  Try out API endpoints directly from your browser
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SwaggerUI spec={apiSpec} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication">
            <AuthenticationGuide />
          </TabsContent>

          <TabsContent value="builder">
            <ApiRequestBuilder />
          </TabsContent>

          <TabsContent value="limits">
            <RateLimitsGuide />
          </TabsContent>

          <TabsContent value="errors">
            <ErrorCodesReference />
          </TabsContent>

          <TabsContent value="sdk">
            <SdkSnippets />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
