import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const formSchema = z.object({
  business_name: z.string().min(2, "Business name must be at least 2 characters").max(100),
  contact_name: z.string().min(2, "Contact name must be at least 2 characters").max(100),
  contact_email: z.string().email("Invalid email address").max(255),
  contact_phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  callback_url: z.string().url("Invalid callback URL"),
  return_url: z.string().url("Invalid return URL"),
  business_description: z.string().min(10, "Please provide at least 10 characters").max(1000),
});

type FormData = z.infer<typeof formSchema>;

export default function BusinessRegistration() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      website: "",
      callback_url: "",
      return_url: "",
      business_description: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.from("business_partners").insert([
        {
          business_name: data.business_name,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          website: data.website || null,
          callback_url: data.callback_url,
          return_url: data.return_url,
          business_description: data.business_description,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and contact you within 2-3 business days.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
      });
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Application Submitted Successfully!</CardTitle>
            <CardDescription>
              Thank you for your interest in partnering with ChainPass. We'll review your application and contact you at {form.getValues("contact_email")} within 2-3 business days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Business Partner Registration</CardTitle>
                <CardDescription>
                  Apply to integrate ChainPass V.A.I. verification into your platform
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Business Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description & Use Case *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your business and how you plan to use ChainPass V.A.I. verification..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Help us understand your verification needs and use case
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Contact Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">API Integration Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="callback_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Callback URL *</FormLabel>
                        <FormControl>
                          <Input placeholder="https://api.example.com/chainpass/callback" {...field} />
                        </FormControl>
                        <FormDescription>
                          Where ChainPass will send verification results
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="return_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return URL *</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/verification-complete" {...field} />
                        </FormControl>
                        <FormDescription>
                          Where users will be redirected after verification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    After submission, our team will review your application and contact you within 2-3 business days. Upon approval, you'll receive your API credentials and integration documentation.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
