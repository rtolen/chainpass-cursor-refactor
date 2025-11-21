import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileText, Shield, ArrowRight } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";
import { verificationNavigator } from "@/utils/verificationNavigation";

interface SignatureConfirmationProps {
  contractId: string;
  contractType: string;
  signedAt: string;
  vaiNumber: string;
  blockchainHash: string;
}

export function SignatureConfirmation({
  contractId,
  contractType,
  signedAt,
  vaiNumber,
  blockchainHash,
}: SignatureConfirmationProps) {
  const navigate = useNavigate();
  const contractTypeLabels = {
    law_enforcement: "Law Enforcement Officer Disclosure",
    mutual_consent: "Mutual Consent and Accountability Agreement",
    terms_of_service: "Terms of Service",
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(`https://chainpass.io/verify/${contractId}`);
    
    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ChainPass Digital Contract Certificate", 105, 20, { align: "center" });
    
    // Contract details
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Contract ID: ${contractId}`, 20, 40);
    doc.text(`V.A.I. Number: ${vaiNumber}`, 20, 50);
    doc.text(`Signed At: ${new Date(signedAt).toLocaleString()}`, 20, 60);
    doc.text(`Contract Type: ${contractTypeLabels[contractType as keyof typeof contractTypeLabels]}`, 20, 70);
    
    // Blockchain hash
    doc.setFont("helvetica", "bold");
    doc.text("Blockchain Hash:", 20, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(blockchainHash, 20, 93);
    
    // QR Code
    doc.addImage(qrCodeDataUrl, "PNG", 20, 105, 50, 50);
    doc.setFontSize(10);
    doc.text("Scan to verify", 35, 160);
    
    // Legal notice
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("This contract is legally binding and has been permanently recorded with", 20, 180);
    doc.text("cryptographic verification. The blockchain hash above serves as immutable", 20, 187);
    doc.text("proof of this contract's authenticity and timestamp.", 20, 194);
    
    // Download
    doc.save(`chainpass-contract-${contractId}.pdf`);
  };

  const handleDownload = () => {
    generatePDF();
  };

  const handleContinue = () => {
    console.log('[SignatureConfirmation] Getting success page from navigator');
    // Use smart navigation to go to success page
    const successPage = verificationNavigator.getSuccessPage();
    console.log('[SignatureConfirmation] Navigating to:', successPage);
    navigate(successPage);
  };

  return (
    <Card className="w-full p-8">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Contract Signed Successfully</h2>
          <p className="text-muted-foreground">
            Your identity has been verified and the contract has been digitally signed
          </p>
        </div>

        <div className="bg-muted rounded-lg p-6 text-left space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Contract ID</p>
            <p className="text-lg font-mono font-bold text-foreground">{contractId}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Contract Type</p>
            <p className="text-lg font-medium text-foreground">
              {contractTypeLabels[contractType as keyof typeof contractTypeLabels]}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">V.A.I. Number</p>
            <p className="text-lg font-mono font-bold text-foreground">{vaiNumber}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Signed At</p>
            <p className="text-lg font-medium text-foreground">
              {new Date(signedAt).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Blockchain Hash</p>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4 text-green-600" />
              <p className="text-xs font-mono text-foreground break-all">{blockchainHash}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button onClick={handleContinue} className="w-full" size="lg">
            Complete Verification
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <Button onClick={handleDownload} variant="outline" className="w-full" size="lg">
            <Download className="w-5 h-5 mr-2" />
            Download Signed Contract (PDF)
          </Button>

          <Button variant="ghost" className="w-full" size="lg">
            <FileText className="w-5 h-5 mr-2" />
            View Contract Details
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Important:</strong> This contract is legally binding and has been permanently recorded.
            A copy has been securely stored in our system for your records.
          </p>
        </div>
      </div>
    </Card>
  );
}