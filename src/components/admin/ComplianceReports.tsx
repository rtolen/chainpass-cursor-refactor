import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function ComplianceReports() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [includeActivityLogs, setIncludeActivityLogs] = useState(true);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [includeComparisons, setIncludeComparisons] = useState(true);

  const generatePDF = (reportData: any) => {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text("Compliance Audit Report", 14, yPosition);
    yPosition += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()}`, 14, yPosition);
    yPosition += 5;
    doc.text(
      `Period: ${new Date(reportData.metadata.period.start).toLocaleDateString()} - ${new Date(reportData.metadata.period.end).toLocaleDateString()}`,
      14,
      yPosition
    );
    yPosition += 15;
    doc.setTextColor(0);

    // Process each section
    reportData.sections.forEach((section: any, sectionIndex: number) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Section Title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(section.title, 14, yPosition);
      yPosition += 8;

      // Summary
      doc.setFontSize(10);
      doc.setTextColor(100);
      const summaryText = Object.entries(section.summary)
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
        .join(" | ");
      
      const splitSummary = doc.splitTextToSize(summaryText, 180);
      doc.text(splitSummary, 14, yPosition);
      yPosition += splitSummary.length * 5 + 5;

      // Data table
      if (section.data && section.data.length > 0) {
        const headers = Object.keys(section.data[0]);
        const rows = section.data.map((item: any) =>
          headers.map(header => {
            const value = item[header];
            if (typeof value === "string" && value.length > 50) {
              return value.substring(0, 47) + "...";
            }
            return value?.toString() || "N/A";
          })
        );

        autoTable(doc, {
          startY: yPosition,
          head: [headers],
          body: rows,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            // Update yPosition after table
            yPosition = data.cursor?.y || yPosition;
          },
        });

        // Get the final Y position after the table
        const finalY = (doc as any).lastAutoTable?.finalY || yPosition;
        yPosition = finalY + 10;
      } else {
        doc.text("No data available for this section", 14, yPosition);
        yPosition += 10;
      }

      // Add spacing between sections
      if (sectionIndex < reportData.sections.length - 1) {
        yPosition += 5;
      }
    });

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount} | Confidential - Internal Use Only`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    return doc;
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    if (!includeActivityLogs && !includeAnomalies && !includeComparisons) {
      toast({
        title: "No Sections Selected",
        description: "Please select at least one section to include in the report",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-compliance-report", {
        body: {
          startDate,
          endDate,
          includeActivityLogs,
          includeAnomalies,
          includeComparisons,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Generate PDF
      const pdf = generatePDF(data.report);
      
      // Download PDF
      const fileName = `compliance-report-${startDate}-to-${endDate}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Report Generated",
        description: `Successfully generated ${fileName}`,
      });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate compliance report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Compliance Reports</h2>
        <p className="text-sm text-muted-foreground">
          Generate comprehensive PDF reports for regulatory compliance and auditing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Configuration
          </CardTitle>
          <CardDescription>
            Select date range and sections to include in your compliance report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {/* Report Sections */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Include Sections</Label>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3 space-y-0">
                <Checkbox
                  id="activityLogs"
                  checked={includeActivityLogs}
                  onCheckedChange={(checked) => setIncludeActivityLogs(checked as boolean)}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="activityLogs"
                    className="font-medium cursor-pointer"
                  >
                    Activity Logs
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Detailed log of all administrative actions including timestamps, users, and IPs
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0">
                <Checkbox
                  id="anomalies"
                  checked={includeAnomalies}
                  onCheckedChange={(checked) => setIncludeAnomalies(checked as boolean)}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="anomalies"
                    className="font-medium cursor-pointer"
                  >
                    Security Anomalies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Detected anomalies with severity levels, descriptions, and resolution status
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0">
                <Checkbox
                  id="comparisons"
                  checked={includeComparisons}
                  onCheckedChange={(checked) => setIncludeComparisons(checked as boolean)}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="comparisons"
                    className="font-medium cursor-pointer"
                  >
                    Admin Activity Comparison
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Comparative analysis of admin activities and performance metrics
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download PDF Report
              </>
            )}
          </Button>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Confidential:</strong> Compliance reports contain sensitive information.
              Handle and store securely according to your organization&apos;s data protection policies.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Report Format</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">PDF</p>
            <p className="text-xs text-muted-foreground mt-1">
              Professional, print-ready format suitable for audits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Data Included</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {[includeActivityLogs, includeAnomalies, includeComparisons].filter(Boolean).length} Sections
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Comprehensive audit trail and analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Compliance Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">✓</p>
            <p className="text-xs text-muted-foreground mt-1">
              Meets regulatory documentation requirements
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
