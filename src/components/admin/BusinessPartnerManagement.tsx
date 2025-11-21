import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, XCircle, Key, Copy, ExternalLink, Mail, Phone, Globe } from "lucide-react";
import { format } from "date-fns";

interface BusinessPartner {
  id: string;
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  callback_url: string;
  return_url: string;
  business_description: string;
  api_key: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

export function BusinessPartnerManagement() {
  const [selectedPartner, setSelectedPartner] = useState<BusinessPartner | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partners, isLoading } = useQuery({
    queryKey: ["business-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BusinessPartner[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await supabase.functions.invoke("generate-api-key", {
        body: { business_partner_id: partnerId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedApiKey(data.api_key);
      queryClient.invalidateQueries({ queryKey: ["business-partners"] });
      toast({
        title: "Application Approved",
        description: "API key generated successfully. Make sure to copy it now.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message,
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const partner = partners?.find(p => p.id === partnerId);
      if (!partner) throw new Error("Partner not found");

      const { error } = await supabase
        .from("business_partners")
        .update({ status: "rejected" })
        .eq("id", partnerId);

      if (error) throw error;

      // Send rejection email
      await supabase.functions.invoke("send-partner-notification", {
        body: {
          type: "rejection",
          data: {
            business_name: partner.business_name,
            contact_name: partner.contact_name,
            contact_email: partner.contact_email,
          },
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-partners"] });
      setIsDetailsOpen(false);
      toast({
        title: "Application Rejected",
        description: "The business partner has been notified via email.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Rejection Failed",
        description: error.message,
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingPartners = partners?.filter((p) => p.status === "pending") || [];
  const approvedPartners = partners?.filter((p) => p.status === "approved") || [];
  const rejectedPartners = partners?.filter((p) => p.status === "rejected") || [];

  const PartnerCard = ({ partner }: { partner: BusinessPartner }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{partner.business_name}</CardTitle>
              <CardDescription>{partner.contact_name}</CardDescription>
            </div>
          </div>
          {getStatusBadge(partner.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4" />
            {partner.contact_email}
          </div>
          {partner.website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-4 h-4" />
              {partner.website}
            </div>
          )}
          <div className="text-muted-foreground">
            Applied: {format(new Date(partner.created_at), "MMM d, yyyy")}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSelectedPartner(partner);
            setIsDetailsOpen(true);
            setGeneratedApiKey(null);
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div>Loading business partners...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Business Partner Applications</CardTitle>
          <CardDescription>
            Review and manage business partner API integration requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingPartners.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedPartners.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedPartners.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {pendingPartners.length === 0 ? (
                  <p className="text-muted-foreground col-span-2 text-center py-8">
                    No pending applications
                  </p>
                ) : (
                  pendingPartners.map((partner) => (
                    <PartnerCard key={partner.id} partner={partner} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {approvedPartners.length === 0 ? (
                  <p className="text-muted-foreground col-span-2 text-center py-8">
                    No approved partners
                  </p>
                ) : (
                  approvedPartners.map((partner) => (
                    <PartnerCard key={partner.id} partner={partner} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {rejectedPartners.length === 0 ? (
                  <p className="text-muted-foreground col-span-2 text-center py-8">
                    No rejected applications
                  </p>
                ) : (
                  rejectedPartners.map((partner) => (
                    <PartnerCard key={partner.id} partner={partner} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Business Partner Details</DialogTitle>
            <DialogDescription>
              Review application and manage partner status
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-6">
              {generatedApiKey && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        API Key Generated
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Make sure to copy this key now. It won't be shown again.
                      </p>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-3 rounded border">
                        <code className="flex-1 text-sm break-all">{generatedApiKey}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedApiKey, "API Key")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Business Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Business Name:</span>
                      <span className="font-medium">{selectedPartner.business_name}</span>
                    </div>
                    {selectedPartner.website && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Website:</span>
                        <a
                          href={selectedPartner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {selectedPartner.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedPartner.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{selectedPartner.contact_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Email:</span>
                      <div className="flex items-center gap-2">
                        <span>{selectedPartner.contact_email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(selectedPartner.contact_email, "Email")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {selectedPartner.contact_phone && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{selectedPartner.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">API Integration</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Callback URL:</span>
                      <div className="mt-1 p-2 bg-muted rounded text-xs break-all">
                        {selectedPartner.callback_url}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Return URL:</span>
                      <div className="mt-1 p-2 bg-muted rounded text-xs break-all">
                        {selectedPartner.return_url}
                      </div>
                    </div>
                    {selectedPartner.api_key && (
                      <div>
                        <span className="text-muted-foreground">API Key:</span>
                        <div className="mt-1 p-2 bg-muted rounded text-xs break-all flex items-center justify-between">
                          <code>{selectedPartner.api_key}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(selectedPartner.api_key!, "API Key")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Business Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedPartner.business_description}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Applied:</span>
                      <span>{format(new Date(selectedPartner.created_at), "PPpp")}</span>
                    </div>
                    {selectedPartner.approved_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Approved:</span>
                        <span>{format(new Date(selectedPartner.approved_at), "PPpp")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedPartner.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    onClick={() => approveMutation.mutate(selectedPartner.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? "Approving..." : "Approve & Generate API Key"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => rejectMutation.mutate(selectedPartner.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {rejectMutation.isPending ? "Rejecting..." : "Reject Application"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
