import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2 } from "lucide-react";

interface ContractViewerProps {
  contractType: "law_enforcement" | "mutual_consent" | "terms_of_service";
  onScrollComplete: () => void;
}

const CONTRACT_CONTENT = {
  law_enforcement: {
    title: "Law Enforcement Officer Disclosure Agreement",
    content: `
# LAW ENFORCEMENT OFFICER DISCLOSURE AGREEMENT

## IMPORTANT NOTICE

This agreement establishes the terms and conditions for Law Enforcement Officers (LEOs) obtaining and using a V.A.I. (Verified Adult Identity) ChainPass on platforms within the V.A.I. ecosystem.

## DEFINITIONS

**"Law Enforcement Officer"** means any person employed by a federal, state, or local law enforcement agency with arrest authority.

**"V.A.I. ChainPass"** means the verified digital identity credential issued by ChainPass.

**"Platform"** means any website, application, or service that accepts V.A.I. ChainPass for identity verification.

## DISCLOSURE REQUIREMENTS

### 1. Mandatory Transparency
You acknowledge and agree that:

a) Your status as a Law Enforcement Officer will be permanently visible to ALL users on ALL platforms within the V.A.I. ecosystem
b) Your V.A.I. code will be prefixed with "LEO-" to clearly identify your status
c) Your profile will display a gold badge icon and "LAW ENFORCEMENT OFFICER" label
d) This visibility cannot be changed, hidden, or disabled

### 2. No Covert Operations
You understand and agree that:

a) V.A.I. ChainPass is NOT to be used for undercover operations
b) V.A.I. ChainPass is NOT to be used for investigations without proper disclosure
c) Any attempt to conceal LEO status violates this agreement
d) Platforms reserve the right to refuse service based on LEO status

### 3. Professional Conduct
As a Law Enforcement Officer using this platform, you agree to:

a) Maintain professional conduct at all times
b) Not abuse your authority or position
c) Respect privacy rights of other users
d) Comply with all applicable laws and regulations

## PLATFORM RIGHTS

Platforms within the V.A.I. ecosystem reserve the right to:

a) Deny access to Law Enforcement Officers
b) Impose additional verification requirements
c) Limit functionality available to LEO users
d) Monitor LEO activity for compliance

## LIABILITY

You acknowledge that:

a) ChainPass is a neutral identity verification provider
b) ChainPass does not control platform policies
c) Platforms may have different rules regarding LEO access
d) You assume all risks associated with LEO status disclosure

## VERIFICATION

I certify that:

☐ I am a current Law Enforcement Officer with arrest authority
☐ I understand my LEO status will be permanently visible
☐ I will not use this for undercover operations
☐ I agree to maintain professional conduct

## ACKNOWLEDGMENT

By signing this agreement, I acknowledge that I have read, understood, and agree to all terms and conditions set forth herein. I understand that false certification may result in criminal prosecution.

**This agreement is legally binding and will be permanently recorded.**
    `,
  },
  mutual_consent: {
    title: "Mutual Consent and Accountability Agreement",
    content: `
# MUTUAL CONSENT AND ACCOUNTABILITY AGREEMENT

## PURPOSE

This agreement establishes the framework for consensual interactions and mutual accountability within the V.A.I. ecosystem.

## CONSENT PRINCIPLES

### 1. Informed Consent
All users agree that:

a) Consent must be freely given, specific, informed, and unambiguous
b) Consent can be withdrawn at any time
c) Prior consent does not imply future consent
d) Silence or inaction does not constitute consent

### 2. Verification Requirement
All parties agree that:

a) V.A.I. verification confirms age and identity only
b) V.A.I. verification does NOT indicate consent for any interaction
c) Consent must be obtained separately for each interaction
d) Visual or verbal confirmation of consent is required

### 3. Documentation
Users acknowledge that:

a) Platforms may require documentation of consent
b) Records of consent may be maintained for legal protection
c) Consent records are subject to privacy policies
d) False claims of consent may result in legal action

## ACCOUNTABILITY

### 1. User Responsibilities
All users agree to:

a) Respect boundaries and consent of others
b) Report violations of consent or platform rules
c) Cooperate with investigations of misconduct
d) Accept consequences for policy violations

### 2. Platform Obligations
Platforms agree to:

a) Investigate reports of consent violations
b) Take appropriate action against violators
c) Protect reporter identities when possible
d) Maintain transparent enforcement policies

### 3. Dispute Resolution
In case of disputes:

a) Platforms will review all available evidence
b) Both parties will be given opportunity to respond
c) Decisions will be based on preponderance of evidence
d) Appeals process may be available per platform policy

## LEGAL COMPLIANCE

### 1. Age Verification
Users certify that:

a) They are over 18 years of age
b) V.A.I. verification confirms legal age
c) False representation of age is prohibited
d) Platforms may verify age independently

### 2. Jurisdictional Laws
Users agree to:

a) Comply with laws in their jurisdiction
b) Understand that legal requirements vary by location
c) Accept responsibility for legal compliance
d) Not use platform for illegal activities

## PRIVACY AND SECURITY

### 1. Data Protection
Platforms commit to:

a) Protecting user privacy per published policies
b) Using industry-standard security measures
c) Notifying users of data breaches
d) Allowing users to control their data

### 2. Information Sharing
Users acknowledge that:

a) Certain information may be shared between platforms
b) Law enforcement requests may be honored
c) Court orders will be complied with
d) Terms of service govern information use

## ACKNOWLEDGMENT

By signing this agreement, I acknowledge that:

☐ I understand the principles of consent
☐ I agree to respect boundaries of others
☐ I will comply with platform rules and laws
☐ I accept accountability for my actions

**This agreement is legally binding and will be permanently recorded.**
    `,
  },
  terms_of_service: {
    title: "ChainPass V.A.I. Terms of Service",
    content: `
# CHAINPASS V.A.I. TERMS OF SERVICE

## AGREEMENT TO TERMS

By creating a V.A.I. ChainPass, you agree to be bound by these Terms of Service and all applicable laws and regulations.

## SERVICE DESCRIPTION

### 1. V.A.I. ChainPass
ChainPass provides:

a) Identity verification through ComplyCube
b) Unique V.A.I. code for age verification
c) Zero-knowledge verification technology
d) Annual renewal requirement

### 2. Verification Process
The V.A.I. verification includes:

a) Government-issued ID verification
b) Facial recognition and liveness detection
c) Biometric comparison
d) Background status declaration (LEO/Civilian)

## USER OBLIGATIONS

### 1. Truthful Information
Users must:

a) Provide accurate and complete information
b) Use their own identity (no impersonation)
c) Declare Law Enforcement status truthfully
d) Update information if circumstances change

### 2. Proper Use
Users agree to:

a) Use V.A.I. ChainPass only on authorized platforms
b) Not share or transfer V.A.I. codes
c) Report unauthorized use immediately
d) Renew verification annually

### 3. Prohibited Activities
Users shall NOT:

a) Attempt to forge or fake V.A.I. verification
b) Use V.A.I. for illegal purposes
c) Circumvent security measures
d) Interfere with service operation

## PRIVACY AND DATA

### 1. Data Collection
ChainPass collects:

a) Identity verification data
b) Biometric information
c) LEO status declaration
d) Usage and transaction data

### 2. Data Usage
Your data is used for:

a) Identity verification
b) Service improvement
c) Legal compliance
d) Fraud prevention

### 3. Data Protection
ChainPass commits to:

a) Industry-standard encryption
b) Secure data storage
c) Limited data retention
d) Compliance with privacy laws

### 4. Data Sharing
ChainPass may share data:

a) With authorized platforms (limited information)
b) With law enforcement (when required)
c) With service providers (under strict agreements)
d) In response to legal process

## FEES AND PAYMENT

### 1. Annual Fee
V.A.I. verification requires:

a) Annual payment of $XX.XX
b) Payment through secure processor
c) No refunds after verification complete
d) Renewal required for continued validity

### 2. Payment Processing
Payments are processed by:

a) Third-party payment processors
b) Secure tokenized transactions
c) PCI-compliant systems
d) Multiple payment methods accepted

## SERVICE AVAILABILITY

### 1. Uptime
ChainPass strives for:

a) 99.9% uptime
b) Scheduled maintenance windows
c) Redundant systems
d) Disaster recovery plans

### 2. Limitations
ChainPass is not responsible for:

a) Third-party platform availability
b) Internet connectivity issues
c) Device compatibility problems
d) Force majeure events

## LIABILITY

### 1. Limited Liability
ChainPass liability is limited to:

a) Amount of fees paid in last 12 months
b) Direct damages only (no consequential)
c) Actual losses incurred
d) Provable harm

### 2. Disclaimer
ChainPass is NOT liable for:

a) Third-party platform conduct
b) User interactions or disputes
c) Misuse of V.A.I. by others
d) Information accuracy on external platforms

## TERMINATION

### 1. User Termination
Users may terminate by:

a) Contacting support
b) Requesting account closure
c) Ceasing to renew annually
d) (No refunds for remaining period)

### 2. ChainPass Termination
ChainPass may terminate for:

a) Terms of Service violations
b) Fraudulent activity
c) Legal requirements
d) Business reasons (with notice)

## DISPUTE RESOLUTION

### 1. Governing Law
These terms are governed by:

a) [Jurisdiction] law
b) Federal law where applicable
c) International law for cross-border
d) Without regard to conflict of laws

### 2. Arbitration
Disputes shall be resolved by:

a) Binding arbitration
b) [Arbitration organization]
c) [Location] venue
d) Individual basis (no class action)

### 3. Exceptions
Court action permitted for:

a) Injunctive relief
b) Intellectual property claims
c) Small claims court matters
d) Emergency situations

## CHANGES TO TERMS

ChainPass may modify terms:

a) With 30 days notice
b) Via email and website posting
c) Continued use implies acceptance
d) Material changes require re-acceptance

## CONTACT

For questions or concerns:

**ChainPass Support**
Email: support@chainpass.vai
Website: www.chainpass.vai/support
Phone: 1-800-VAI-PASS

## ACKNOWLEDGMENT

By signing this agreement, I acknowledge that:

☐ I have read and understand these Terms of Service
☐ I agree to be bound by these terms
☐ I am over 18 years of age
☐ I accept the privacy and data policies

**This agreement is legally binding and will be permanently recorded.**
    `,
  },
};

export function ContractViewer({ contractType, onScrollComplete }: ContractViewerProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const contract = CONTRACT_CONTENT[contractType];

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      onScrollComplete();
    }
  };

  return (
    <Card className="w-full">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-foreground">{contract.title}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Please read this document carefully and scroll to the bottom to continue
        </p>
      </div>
      
      <ScrollArea className="h-[500px]" onScrollCapture={handleScroll}>
        <div className="p-6 prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-foreground">
            {contract.content}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/50">
        {hasScrolledToBottom ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">You have reviewed the entire document</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Scroll to the bottom to enable signing
          </p>
        )}
      </div>
    </Card>
  );
}