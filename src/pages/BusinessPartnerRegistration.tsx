import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Building2 } from "lucide-react";
import vairifyLogo from "@/assets/vairify-logo.svg";

const formSchema = z.object({
  business_name: z.string().min(2, "Business name must be at least 2 characters"),
  contact_name: z.string().min(2, "Contact name must be at least 2 characters"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  callback_url: z.string().url("Invalid callback URL"),
  return_url: z.string().url("Invalid return URL"),
  business_description: z.string().min(10, "Please provide at least 10 characters describing your business use case"),
});

type FormData = z.infer<typeof formSchema>;

const BusinessPartnerRegistration = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      const submitData = {
        business_name: data.business_name,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        website: data.website || null,
        callback_url: data.callback_url,
        return_url: data.return_url,
        business_description: data.business_description,
      };

      const { error } = await supabase.from("business_partners").insert([submitData]);

      if (error) throw error;

      toast.success("Application Submitted!", {
        description: "Your business partner application has been submitted successfully. We'll review it and get back to you soon.",
      });

      form.reset();
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Submission Failed", {
        description: "There was an error submitting your application. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={vairifyLogo} alt="V.A.I.rify" className="h-16" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">Business Partner Registration</CardTitle>
            </div>
            <CardDescription className="text-base">
              Apply to integrate ChainPass V.A.I. verification API into your platform. Once approved, you'll receive API credentials and technical documentation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Company Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@company.com" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Stored securely for business communication and API notifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Stored for partner support and urgent notifications only
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://yourcompany.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="callback_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Callback URL *</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://yourapi.com/vai-callback" {...field} />
                      </FormControl>
                      <FormDescription>
                        The URL where we'll send verification results
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
                        <Input type="url" placeholder="https://yoursite.com/verification-complete" {...field} />
                      </FormControl>
                      <FormDescription>
                        Where users will be redirected after completing verification
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="business_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Use Case Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your business and how you plan to use the V.A.I. verification API..."
                          className="min-h-32"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Help us understand your integration needs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  * Required fields. Applications are typically reviewed within 2-3 business days.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BusinessPartnerRegistration;
