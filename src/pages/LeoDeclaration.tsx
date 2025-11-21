import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertCircle, CheckCircle2, Star } from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { verificationNavigator } from "@/utils/verificationNavigation";
import { useVAIStore } from "@/store/vaiStore";
import { Button } from "@/components/ui/button";

export default function LeoDeclaration() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<"civilian" | "leo" | null>(null);
  const [checkboxes, setCheckboxes] = useState({
    perjury: false,
    liability: false,
    permanent: false,
    consequences: false,
  });
  const { vaiNumber } = useVAIStore();

  const displayVAI = vaiNumber || "94ZHD1H";

  const allCheckboxesChecked = Object.values(checkboxes).every((v) => v);
  const canProceed = selectedStatus && allCheckboxesChecked;

  const handleCheckbox = (key: keyof typeof checkboxes) => {
    setCheckboxes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProceed = () => {
    if (!canProceed) return;
    sessionStorage.setItem("userType", selectedStatus!);
    navigate('/verification-checkpoint?context=leo-declaration&nextStep=/legal-agreements');
  };

  const handleBypass = () => {
    sessionStorage.setItem("userType", "civilian");
    navigate('/verification-checkpoint?context=leo-declaration&nextStep=/legal-agreements');
  };

  return (
    <div className="min-h-screen bg-[#0F1419] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-white font-bold text-xl">Law Enforcement Declaration</h1>
              <p className="text-gray-400 text-sm">Required • This determines your V.A.I. type</p>
            </div>
          </div>
          <img src={chainpassLogo} alt="ChainPass" className="h-16" />
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Payment</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-500 mx-4"></div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Verification</span>
          </div>
          <div className="flex-1 h-0.5 bg-blue-500 mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <span className="text-blue-500 font-medium">Declaration</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-600 mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
            <span className="text-gray-500">Legal Agreements</span>
          </div>
          <div className="flex-1 h-0.5 bg-gray-600 mx-4"></div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
            <span className="text-gray-500">V.A.I. Generation</span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-400/90 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-white flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-white font-bold text-lg mb-1">This Declaration CANNOT Be Changed</h2>
            <p className="text-white/90 text-sm">
              Your answer permanently determines your V.A.I. type and visibility. False declarations may result in criminal liability and account termination.
            </p>
          </div>
        </div>

        {/* Main Question */}
        <div className="space-y-4">
          <h2 className="text-white text-2xl font-bold">
            Are you a law enforcement officer, government official, or agent acting in an official law enforcement capacity?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            This includes: Police officers, sheriffs, deputies, detectives, federal agents (FBI, DEA, ATF, ICE, etc.), prosecutors, district attorneys, investigators, or anyone working on behalf of law enforcement agencies.
          </p>
          <p className="text-gray-300 text-sm">
            Your selection does not prevent you from obtaining a V.A.I. ChainPass promotes accountability and transparency for all members within our adult communities.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Civilian Card */}
          <button
            onClick={() => setSelectedStatus("civilian")}
            className={`relative text-left rounded-xl p-6 border-2 transition-all ${
              selectedStatus === "civilian"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                  selectedStatus === "civilian"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-600"
                }`}
              >
                {selectedStatus === "civilian" && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">No, I am NOT law enforcement</h3>
                <p className="text-gray-400 text-sm">Your V.A.I. will look like this:</p>
              </div>
            </div>

            {/* V.A.I. Preview */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-blue-200" />
                <span className="text-blue-100 text-sm font-medium">{displayVAI}</span>
              </div>
              <p className="text-white text-xs">Verified Civilian</p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-semibold mb-2">Features:</p>
              <div className="space-y-1.5 text-xs text-gray-300">
                <p>• 7-character V.A.I. code</p>
                <p>• Blue verification badge</p>
                <p>• Standard profile display</p>
                <p>• Full platform access</p>
              </div>
            </div>
          </button>

          {/* LEO Card */}
          <button
            onClick={() => setSelectedStatus("leo")}
            className={`relative text-left rounded-xl p-6 border-2 transition-all ${
              selectedStatus === "leo"
                ? "border-amber-500 bg-amber-500/10"
                : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                  selectedStatus === "leo"
                    ? "border-amber-500 bg-amber-500"
                    : "border-gray-600"
                }`}
              >
                {selectedStatus === "leo" && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-1">Yes, I AM law enforcement</h3>
                <p className="text-gray-400 text-sm">Your V.A.I. will look like this:</p>
              </div>
            </div>

            {/* V.A.I. Preview */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-amber-200" />
                <span className="text-amber-100 text-sm font-medium">LEO-{displayVAI}</span>
              </div>
              <p className="text-white text-xs font-bold uppercase tracking-wide">LAW ENFORCEMENT OFFICER</p>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-4">
              <p className="text-gray-400 text-sm font-semibold mb-2">Features:</p>
              <div className="space-y-1.5 text-xs text-gray-300">
                <p>• "LEO-" prefix on V.A.I. code</p>
                <p>• GOLD badge visible EVERYWHERE</p>
                <p>• "LAW ENFORCEMENT OFFICER" label</p>
                <p>• Additional badge verification required</p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 font-semibold text-xs">
                  Your LEO status will be HIGHLY VISIBLE to ALL users in ALL interactions
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* How Your V.A.I. Appears to Others */}
        <div className="space-y-4">
          <h2 className="text-white text-xl font-bold">How Your V.A.I. Appears to Others</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Civilian Display */}
            <div>
              <p className="text-blue-400 font-semibold mb-3">Civilian V.A.I. Display:</p>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">Sarah</span>
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400 text-sm">917T35L</span>
                    </div>
                    <p className="text-gray-500 text-xs">Online now</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                <p>• Small blue checkmark</p>
                <p>• Clean, standard display</p>
                <p>• Blends with other profiles</p>
              </div>
            </div>

            {/* LEO Display */}
            <div>
              <p className="text-amber-400 font-semibold mb-3">Law Enforcement V.A.I. Display:</p>
              <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/30 rounded-lg p-4 border-2 border-amber-500/50">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">Martinez</span>
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300 text-sm font-bold">LEO-917T35L</span>
                    </div>
                    <p className="text-amber-400 text-xs font-bold uppercase tracking-wide">LAW ENFORCEMENT</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                <p>• Large gold badge icon</p>
                <p>• Gold/yellow highlight</p>
                <p>• "LAW ENFORCEMENT" text</p>
              </div>
            </div>
          </div>

          {/* Visibility Checklist */}
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mt-6">
            <p className="text-white font-semibold mb-4">Your LEO status will appear in:</p>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div className="space-y-2">
                <p>✓ Search results</p>
                <p>✓ VAI-CHECK verifications</p>
              </div>
              <div className="space-y-2">
                <p>✓ Profile pages</p>
                <p>✓ Reviews</p>
              </div>
              <div className="space-y-2">
                <p>✓ Messages</p>
                <p>✓ All platform interactions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Declaration */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-white text-xl font-bold mb-4">Legal Declaration</h2>
          <p className="text-gray-300 text-sm mb-6 italic">
            "I declare under penalty of perjury that my answer above is true and correct to the best of my knowledge. I understand that:"
          </p>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => handleCheckbox("perjury")}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  checkboxes.perjury
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-600 group-hover:border-gray-500"
                }`}
              >
                {checkboxes.perjury && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-gray-300 text-sm">
                False declarations may result in criminal liability under state and federal perjury laws
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => handleCheckbox("permanent")}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  checkboxes.permanent
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-600 group-hover:border-gray-500"
                }`}
              >
                {checkboxes.permanent && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-gray-300 text-sm">
                My choice cannot be changed after V.A.I. creation and is permanently binding
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => handleCheckbox("liability")}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  checkboxes.liability
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-600 group-hover:border-gray-500"
                }`}
              >
                {checkboxes.liability && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-gray-300 text-sm">
                Law enforcement status will be permanently visible to all platform users
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => handleCheckbox("consequences")}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  checkboxes.consequences
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-600 group-hover:border-gray-500"
                }`}
              >
                {checkboxes.consequences && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-gray-300 text-sm">
                I am legally responsible for this declaration and understand all consequences
              </span>
            </label>
          </div>
        </div>

        {/* Proceed Button */}
        <Button
          onClick={handleProceed}
          disabled={!canProceed}
          className={`w-full py-6 text-lg font-semibold rounded-lg transition-all ${
            canProceed
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {selectedStatus && allCheckboxesChecked
            ? "Proceed to Legal Agreements"
            : "Select an Option Above"}
        </Button>

        {/* Bypass for Testing */}
        <div className="text-center">
          <button
            onClick={handleBypass}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors underline"
          >
            Skip LEO Declaration (Testing)
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm">
          Step 3 of 5 • Almost there! Just two quick agreements.
        </p>
      </div>
    </div>
  );
}
