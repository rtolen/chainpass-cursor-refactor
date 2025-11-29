import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Check,
  ExternalLink,
  Shield,
  Sparkles
} from "lucide-react";
import chainpassLogo from "@/assets/chainpass-logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { sessionManager } from "@/utils/sessionManager";
import { useVAIStore } from "@/store/vaiStore";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type ProcessingState = "verifying" | "generating" | "complete";

const COMPLYCUBE_DOWNLOAD_TEMPLATE = "https://api.complycube.com/v1/livePhotos/{photoID}/download";

type DebugLogEntry = {
  title: string;
  requestUrl: string;
  response: unknown;
  timestamp: string;
};

type ComplycubeRequestLog = {
  requestUrl: string;
  headers: Record<string, string>;
  method?: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  timestamp: string;
};

// Generate cryptographically secure V.A.I. code (format: 7 characters alphanumeric)
const generateVAICode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(7);
  crypto.getRandomValues(array); // Cryptographically secure random generation
  return Array.from(array, byte => chars[byte % chars.length]).join('');
};

export default function VaiProcessing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Check if ComplyCube client ID is present - if so, skip verifying stage
  const complycubeClientId = searchParams.get("complycube_client");
  const complycubeAuthorizationKeyFromQuery =
    searchParams.get("complycube_authorization_key") ||
    searchParams.get("authorizationKey");
  const complycubeLivePhotosUrl = complycubeClientId
    ? `https://api.complycube.com/v1/livePhotos?clientId=${complycubeClientId}`
    : null;
  const sessionEmail = sessionStorage.getItem("user_email") || "vairify1@gmail.com";
  const [processingState, setProcessingState] = useState<ProcessingState>(
    complycubeClientId ? "generating" : "verifying"
  );
  const [progress, setProgress] = useState(complycubeClientId ? 64 : 0);
  const [displayCode, setDisplayCode] = useState<string>("");
  const [verificationRecordId, setVerificationRecordId] = useState<string>("");
  const [livePhotoId, setLivePhotoId] = useState<string>("");
  const [photoDownloadUrl, setPhotoDownloadUrl] = useState<string>("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [complycubeAuthorizationKey, setComplycubeAuthorizationKey] = useState<string>(
    import.meta.env.VITE_COMPLYCUBE_AUTHORIZATION_KEY || ""
  );
  const [requestPhotoId, setRequestPhotoId] = useState<string>("");
  const [authorizationRequestLoading, setAuthorizationRequestLoading] = useState(false);
  const [complycubeRequestLog, setComplycubeRequestLog] = useState<ComplycubeRequestLog | null>(null);
  const [requestComplyCubeDownloadURL, setRequestComplyCubeDownloadURL] = useState<string>(
    COMPLYCUBE_DOWNLOAD_TEMPLATE
  );
  const [downloadRequestLoading, setDownloadRequestLoading] = useState(false);
  const [complycubeDownloadLog, setComplycubeDownloadLog] = useState<ComplycubeRequestLog | null>(null);
  const [debugLogs] = useState<DebugLogEntry[]>([]);

  // Check if user is LEO from session storage
  const isLEO = sessionStorage.getItem('userType') === 'leo';

  // Get V.A.I. store
  const { vaiNumber, setVAI, isGenerating, setGenerating } = useVAIStore();
  
  // Use ref to track if process has started to prevent re-running
  const processStartedRef = useRef(false);

  const authorizationRequestFetchedRef = useRef(false);
  const downloadRequestFetchedRef = useRef(false);

  const appendDebugLogs = useCallback((_entries: DebugLogEntry[]) => {}, []);
  const handleClearDebugLogs = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("vai_debug_logs");
    }
  }, []);

  const formatHeaders = (headers: Record<string, string>) =>
    Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n") || "(none)";

const buildDownloadRequestPreview = (url: string, authHeader: string) => {
  const resolvedUrl =
    url && url.length > 0 && !url.includes("{photoID}")
      ? url
      : "Waiting for resolved Request ComplyCube download URL...";
  const resolvedAuth = authHeader && authHeader.length > 0 ? authHeader : "ComplyCube authorization key not available";

  return `GET ${resolvedUrl}\n\nHeaders:\nAuthorization: ${resolvedAuth}`;
};

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedKey = sessionStorage.getItem("complycube_authorization_key");
    if (storedKey) {
      setComplycubeAuthorizationKey(storedKey);
      return;
    }

    if (complycubeAuthorizationKeyFromQuery) {
      sessionStorage.setItem("complycube_authorization_key", complycubeAuthorizationKeyFromQuery);
      setComplycubeAuthorizationKey(complycubeAuthorizationKeyFromQuery);
      return;
    }
  }, [complycubeAuthorizationKeyFromQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPhotoId = sessionStorage.getItem("complycube_request_photo_id");
    if (storedPhotoId) {
      setRequestPhotoId(storedPhotoId);
    }
  }, []);

  useEffect(() => {
    const storedDownloadUrl = sessionStorage.getItem("request_complycube_download_url");
    if (storedDownloadUrl) {
      setRequestComplyCubeDownloadURL(storedDownloadUrl);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("request_complycube_download_url", requestComplyCubeDownloadURL);
  }, [requestComplyCubeDownloadURL]);

  useEffect(() => {
    if (processingState !== "complete") return;
    if (!complycubeLivePhotosUrl || !complycubeAuthorizationKey) return;
    if (authorizationRequestFetchedRef.current) return;

    const fetchComplycubeLivePhotos = async () => {
      authorizationRequestFetchedRef.current = true;
      setAuthorizationRequestLoading(true);

      try {
        const response = await fetch(complycubeLivePhotosUrl, {
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
        });

        const contentType = response.headers.get("content-type") || "";
        let bodyText = "";

        let extractedPhotoId: string | null = null;
        if (contentType.includes("application/json")) {
          const json = await response.json();
          bodyText = JSON.stringify(json, null, 2);
          extractedPhotoId =
            json?.data?.[0]?.id ||
            json?.items?.[0]?.id ||
            json?.id ||
            null;

          if (extractedPhotoId) {
            setRequestPhotoId(extractedPhotoId);
            sessionStorage.setItem("complycube_request_photo_id", extractedPhotoId);
            if (!livePhotoId) {
              setLivePhotoId(extractedPhotoId);
            }
            const resolvedDownloadUrl = COMPLYCUBE_DOWNLOAD_TEMPLATE.replace(
              "{photoID}",
              extractedPhotoId
            );
            setRequestComplyCubeDownloadURL(resolvedDownloadUrl);
            sessionStorage.setItem("request_complycube_download_url", resolvedDownloadUrl);
          }
        } else {
          bodyText = await response.text();
        }

        setComplycubeRequestLog({
          requestUrl: complycubeLivePhotosUrl,
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
          responseStatus: response.status,
          responseBody: bodyText || "(empty response)",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setComplycubeRequestLog({
          requestUrl: complycubeLivePhotosUrl,
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      } finally {
        setAuthorizationRequestLoading(false);
      }
    };

    fetchComplycubeLivePhotos();
  }, [processingState, complycubeLivePhotosUrl, complycubeAuthorizationKey, livePhotoId]);

  useEffect(() => {
    if (processingState !== "complete") return;
    if (!complycubeAuthorizationKey) return;
    if (
      !requestComplyCubeDownloadURL ||
      requestComplyCubeDownloadURL.includes("{photoID}")
    )
      return;
    if (downloadRequestFetchedRef.current) return;

    const fetchDownloadUrl = async () => {
      downloadRequestFetchedRef.current = true;
      setDownloadRequestLoading(true);

      try {
        const response = await fetch(requestComplyCubeDownloadURL, {
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
        });

        const contentType = response.headers.get("content-type") || "";
        let bodyText = "";

        if (contentType.includes("application/json")) {
          const json = await response.json();
          bodyText = JSON.stringify(json, null, 2);
        } else {
          const buffer = await response.arrayBuffer();
          bodyText = `Binary response (${contentType || "unknown"}, ${buffer.byteLength} bytes)`;
        }

        setComplycubeDownloadLog({
          requestUrl: requestComplyCubeDownloadURL,
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
          responseStatus: response.status,
          responseBody: bodyText || "(empty response)",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        setComplycubeDownloadLog({
          requestUrl: requestComplyCubeDownloadURL,
          method: "GET",
          headers: {
            Authorization: complycubeAuthorizationKey,
          },
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      } finally {
        setDownloadRequestLoading(false);
      }
    };

    fetchDownloadUrl();
  }, [
    processingState,
    requestComplyCubeDownloadURL,
    complycubeAuthorizationKey,
  ]);

  const loadVerificationRecordDetails = useCallback(async (recordIdToLoad: string) => {
    try {
      const { data, error } = await supabase
        .from('verification_records')
        .select('request_photo_url, live_photo_id, get_photo_url')
        .eq('id', recordIdToLoad)
        .maybeSingle();

      if (error) {
        console.error('Error loading verification record details:', error);
        return;
      }

      if (data?.live_photo_id) {
        setLivePhotoId(data.live_photo_id);
      }

      if (data?.get_photo_url) {
        setPhotoDownloadUrl(data.get_photo_url);
      }
    } catch (err) {
      console.error('Unexpected error loading verification record details:', err);
    }
  }, []);

  // Process V.A.I. generation and save to database
  useEffect(() => {
    const processVAI = async () => {
      console.log('processVAI called', { vaiNumber, isGenerating, processStarted: processStartedRef.current });
      
      const sessionId = sessionManager.getSessionId();
      let recordId = sessionManager.getVerificationRecordId();

      console.log('Session info:', { sessionId, recordId, complycubeClientId });

      // CRITICAL: If V.A.I. already exists in store, use it
      if (vaiNumber) {
        console.log('V.A.I. already exists in store:', vaiNumber);
        const codeToDisplay = isLEO ? `LEO-${vaiNumber}` : vaiNumber;
        setDisplayCode(codeToDisplay);
        setProcessingState("complete");
        if (recordId) {
          setVerificationRecordId(recordId);
        }
        processStartedRef.current = false; // Reset for potential future use
        return;
      }

      // Check if generation already in progress or if we've already started
      if (isGenerating || processStartedRef.current) {
        console.log('V.A.I. generation already in progress or started', { isGenerating, processStarted: processStartedRef.current });
        return;
      }
      
      // Mark as started
      processStartedRef.current = true;
      console.log('Starting VAI processing...');

      try {
        setGenerating(true);

        const updateEmailForComplycube = async () => {
          if (!complycubeClientId) return;
          try {
            await supabase
              .from('verification_records')
              .update({ email: sessionEmail })
              .eq('complycube_verification_id', complycubeClientId);
          } catch (emailError) {
            console.error('Error updating email by ComplyCube ID:', emailError);
          }
        };

        const updateLivePhotoSession = async (shouldFetchPhoto = false) => {
          if (!complycubeClientId) return;
          const fetchPhoto = shouldFetchPhoto || !photoDataUrl;
          try {
            if (fetchPhoto) {
              setPhotoLoading(true);
            }
            const { data, error } = await supabase.functions.invoke('fetch-complycube-livephoto', {
              body: {
                clientId: complycubeClientId,
                includePhoto: fetchPhoto,
              },
            });

            if (error) {
              throw error;
            }

            if (data?.livePhotoDownloadId) {
              setLivePhotoId(data.livePhotoDownloadId);
            }

            if (data?.getPhotoIdUrl) {
              setPhotoDownloadUrl(data.getPhotoIdUrl);
            }

            if (data?.photoData && data?.photoContentType) {
              setPhotoDataUrl(`data:${data.photoContentType};base64,${data.photoData}`);
              setPhotoModalOpen(true);
            }

            const debugEntries: DebugLogEntry[] = [];
            const timestamp = new Date().toISOString();
            if (data?.debugInfo?.listRequest) {
              debugEntries.push({
                title: "ComplyCube GET livePhotos",
                requestUrl: data.debugInfo.listRequest.url,
                response: data.debugInfo.listRequest.response,
                timestamp,
              });
            }
            if (data?.debugInfo?.downloadRequest) {
              debugEntries.push({
                title: "ComplyCube GET livePhotos download",
                requestUrl: data.debugInfo.downloadRequest.url,
                response: data.debugInfo.downloadRequest.response,
                timestamp,
              });
            }

            appendDebugLogs(debugEntries);
          } catch (err) {
            console.error('Error fetching live photo session:', err);
            toast({
              title: "Live photo unavailable",
              description: err instanceof Error ? err.message : "Unable to retrieve ComplyCube live photo.",
              variant: "destructive",
            });
          } finally {
            if (fetchPhoto) {
              setPhotoLoading(false);
            }
          }
        };

        // Create or retrieve verification record
        if (!recordId) {
          console.log('Creating new verification record...', { sessionId, complycubeClientId });
          const insertPayload: TablesInsert<"verification_records"> = {
            session_id: sessionId,
            verification_status: "verified",
            biometric_confirmed: true,
            email: sessionEmail,
          };

          if (complycubeClientId) {
            insertPayload.complycube_verification_id = complycubeClientId;
          }

          const { data: newRecord, error: recordError } = await supabase
            .from('verification_records')
            .insert(insertPayload)
            .select()
            .single();

          if (recordError) {
            console.error('Error creating verification record:', recordError);
            throw recordError;
          }
          
          console.log('Verification record created:', newRecord.id);
          recordId = newRecord.id;
          sessionManager.setVerificationRecordId(recordId);
          setVerificationRecordId(recordId);
        } else {
          console.log('Updating existing verification record...', { recordId, complycubeClientId });
          // Update existing record
          const updatePayload: TablesUpdate<"verification_records"> = {
            biometric_confirmed: true,
            verification_status: 'verified',
            email: sessionEmail,
          };

          if (complycubeClientId) {
            updatePayload.complycube_verification_id = complycubeClientId;
          }

          const { error: updateError } = await supabase
            .from('verification_records')
            .update(updatePayload)
            .eq('id', recordId);
          
          if (updateError) {
            console.error('Error updating verification record:', updateError);
            throw updateError;
          }
          
          console.log('Verification record updated successfully');
          setVerificationRecordId(recordId);
        }

        // CRITICAL: Check if V.A.I. already exists in database for this record
        const { data: existingVAI, error: checkError } = await supabase
          .from('vai_assignments')
          .select('vai_code')
          .eq('verification_record_id', recordId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for existing V.A.I.:', checkError);
        }

        if (existingVAI?.vai_code) {
          console.log('Found existing V.A.I. in database:', existingVAI.vai_code);
          
          // Store in Zustand and session
          setVAI(existingVAI.vai_code, recordId, isLEO);
          sessionManager.setVaiCode(existingVAI.vai_code);
          sessionStorage.setItem('vai_number', existingVAI.vai_code);
          await updateEmailForComplycube();
          await updateLivePhotoSession();
          
          const codeToDisplay = isLEO ? `LEO-${existingVAI.vai_code}` : existingVAI.vai_code;
          setDisplayCode(codeToDisplay);
          setProcessingState("complete");
          
          toast({
            title: "✓ V.A.I. Confirmed!",
            description: "Verification complete. Continue to legal agreements.",
          });
          
          return;
        }

        // Stage 1: Verifying identity (skip if ComplyCube client ID is present)
        const stage1Timer = complycubeClientId 
          ? null 
          : setTimeout(() => {
              setProcessingState("generating");
            }, 2500);

        // Ensure we have a recordId before proceeding
        if (!recordId) {
          console.error('No recordId available for VAI generation');
          setGenerating(false);
          processStartedRef.current = false;
          toast({
            title: "Error",
            description: "Verification record not found. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Stage 2: Generate NEW V.A.I. and save to database
        // If ComplyCube client ID is present, start generating immediately
        const stage2Delay = complycubeClientId ? 0 : 5000;
        console.log('Setting up VAI generation timer', { stage2Delay, recordId });
        
        const generateAndSaveVAI = async () => {
          try {
            console.log('Starting VAI code generation...', { recordId });
            const newVAICode = generateVAICode();
            console.log('Generated VAI code:', newVAICode);
            
            // Save V.A.I. assignment to database
            const { error: vaiError } = await supabase
              .from('vai_assignments')
              .insert({
                vai_code: newVAICode,
                verification_record_id: recordId,
                status: 'complete',
              });

            if (vaiError) {
              console.error('Error saving V.A.I. to database:', vaiError);
              toast({
                title: "Error",
                description: `Failed to generate V.A.I.: ${vaiError.message}`,
                variant: "destructive",
              });
              setGenerating(false);
              processStartedRef.current = false;
              return;
            }

            console.log('VAI code saved successfully to database');
            await updateEmailForComplycube();
            await updateLivePhotoSession();
            
            // Store in Zustand and session
            setVAI(newVAICode, recordId, isLEO);
            sessionManager.setVaiCode(newVAICode);
            sessionStorage.setItem('vai_number', newVAICode);
            
            // Set display code based on user type
            const codeToDisplay = isLEO ? `LEO-${newVAICode}` : newVAICode;
            setDisplayCode(codeToDisplay);
            
            setProcessingState("complete");
            processStartedRef.current = false; // Reset for potential future use
            
            // Trigger celebration
            toast({
              title: "✓ V.A.I. Confirmed!",
              description: "Verification complete. Continue to legal agreements.",
            });
          } catch (error) {
            console.error('Error in generateAndSaveVAI:', error);
            setGenerating(false);
            processStartedRef.current = false;
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to generate V.A.I.",
              variant: "destructive",
            });
          }
        };

        // If delay is 0, call immediately, otherwise use setTimeout
        const stage2Timer = stage2Delay === 0 
          ? null 
          : setTimeout(() => {
              console.log('Stage 2 timer fired, calling generateAndSaveVAI');
              generateAndSaveVAI();
            }, stage2Delay);
        
        if (stage2Delay === 0) {
          // Call immediately for ComplyCube flow
          console.log('Calling generateAndSaveVAI immediately (ComplyCube flow)');
          generateAndSaveVAI();
        }

        // Progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 2;
          });
        }, 100);

        return () => {
          if (stage1Timer) clearTimeout(stage1Timer);
          if (stage2Timer) clearTimeout(stage2Timer);
          clearInterval(progressInterval);
        };
      } catch (error) {
        console.error('Error processing V.A.I.:', error);
        setGenerating(false);
        processStartedRef.current = false; // Reset on error
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to process verification. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Ensure generating flag is reset if we exit early
        // Note: setVAI already sets isGenerating to false, so this is just a safety net
      }
    };

    processVAI();
    // Note: isGenerating is intentionally excluded from dependencies to prevent re-running
    // when setGenerating(true) is called, which would clear timers prematurely
  }, [toast, complycubeClientId, vaiNumber, isLEO, setVAI, setGenerating, sessionEmail, appendDebugLogs]);

  useEffect(() => {
    if (verificationRecordId) {
      loadVerificationRecordDetails(verificationRecordId);
    } else {
      const existingRecordId = sessionManager.getVerificationRecordId();
      if (existingRecordId) {
        setVerificationRecordId(existingRecordId);
      }
    }
  }, [verificationRecordId, loadVerificationRecordDetails]);

  const handleContinueToVairify = () => {
    // Navigate to LEO declaration
    navigate("/leo-declaration");
  };

  // Processing UI
  if (processingState !== "complete") {
    return (
      <div className="min-h-screen bg-[#1F2937] py-8 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-center mb-12">
            <img src={chainpassLogo} alt="ChainPass" className="h-32" />
          </div>

          {/* Processing Card */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl blur-sm opacity-75"></div>
            <Card className="relative bg-[#1F2937]/90 backdrop-blur-lg border-0 shadow-2xl">
              <CardContent className="p-12 text-center space-y-8">
                {/* Animated Icon */}
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full opacity-40 animate-ping"></div>
                  <div className="relative w-full h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 flex items-center justify-center">
                    {processingState === "verifying" ? (
                      <Shield className="w-16 h-16 text-white animate-pulse" />
                    ) : (
                      <Sparkles className="w-16 h-16 text-white animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Status Text */}
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-white">
                    {processingState === "verifying" 
                      ? "Confirming Biometrics" 
                      : "Generating Your V.A.I."}
                  </h1>
                  <p className="text-gray-300 text-lg">
                    {processingState === "verifying"
                      ? "Validating biometric data from ComplyCube..."
                      : "Creating your Verifiable Anonymous Identity..."}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{processingState === "verifying" ? "64" : "84"}% complete</p>
                </div>

                {/* Processing Steps */}
                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">Payment verified</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-300">Identity documents validated</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {processingState === "generating" ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    )}
                    <span className="text-sm text-gray-300">Biometric verification complete</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {processingState === "generating" ? (
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                    )}
                    <span className="text-sm text-gray-300">Generating V.A.I. code</span>
                  </div>
                </div>

                {/* Info Text */}
                <p className="text-xs text-gray-400">
                  Please don't close this window. This usually takes 30-60 seconds.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Success/Complete UI
  return (
    <div className="min-h-screen bg-[#1F2937] py-8 px-4">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-center mb-12">
          <img src={chainpassLogo} alt="ChainPass" className="h-28" />
        </div>

        {/* Main Hero Card with Gradient Border */}
        <div className="relative mb-8">
          {/* Gradient border glow effect */}
          <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-2xl blur-sm opacity-75 animate-pulse"></div>
          
          {/* Glass-morphism card */}
          <div className="relative bg-[#1F2937]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-12">
            {/* V.A.I. Number Display */}
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">Your Verifiable Anonymous Identity</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">V.A.I. Number Generated</h1>
              </div>

              {/* V.A.I. Code with gradient and pulse animation */}
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl p-8 shadow-xl">
                  <div className="text-5xl md:text-6xl font-mono font-bold text-white tracking-widest">
                    {displayCode || "LOADING..."}
                  </div>
                </div>
              </div>

              {/* NOT ACTIVATED Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 border-2 border-amber-500/50 rounded-full">
                <span className="text-amber-500 text-2xl">⚠️</span>
                <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Not Activated</span>
              </div>

              {/* Warning Message */}
              <div className="max-w-lg mx-auto">
                <p className="text-base md:text-lg text-gray-300 font-medium leading-relaxed">
                  You must complete the documents below before your V.A.I. number is activated
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents Checklist */}
        <div className="relative mb-8">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600/30 to-blue-500/30 rounded-xl blur-sm"></div>
          <div className="relative bg-[#1F2937]/80 backdrop-blur-lg rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-white mb-6">Required Documents</h2>
            
            <div className="space-y-4">
              {/* Law Enforcement Disclosure */}
              <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">Law Enforcement Disclosure</p>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold uppercase">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Understand how we respond to law enforcement requests
                  </p>
                </div>
              </div>

              {/* Signature Agreement */}
              <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">Signature Agreement</p>
                    <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-semibold uppercase">
                      Required
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Confirm your consent and understanding
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400">
            Step 3 of 4 • Complete documents to activate your V.A.I.
          </p>
        </div>

        {/* CTA Button */}
        <div className="relative group">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-600 to-blue-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <Button
            onClick={handleContinueToVairify}
            className="relative w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg py-7 rounded-xl shadow-xl transition-all duration-300"
          >
            Complete Required Documents
            <ExternalLink className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <div className="text-center mt-6 text-sm text-gray-400 space-y-2">
          <div>
            Verification email: <span className="font-semibold text-white">{sessionEmail}</span>
          </div>
          <div className="text-xs text-gray-400 break-all">
            ComplyCube authorization key:
            <span className="block font-mono text-white mt-1 break-all">
              {complycubeAuthorizationKey || "Not available"}
            </span>
          </div>
          {complycubeLivePhotosUrl && (
            <div className="text-xs text-gray-400 break-all">
              ComplyCube live photos request URL:
              <span className="block font-mono text-white mt-1 break-all">
                {complycubeLivePhotosUrl}
              </span>
            </div>
          )}
          {livePhotoId && (
            <div className="text-xs text-gray-400 break-all">
              ComplyCube live photo ID:
              <span className="block font-mono text-white mt-1 break-all">
                {livePhotoId}
              </span>
            </div>
          )}
          {photoDownloadUrl && (
            <div className="text-xs text-gray-400 break-all">
              ComplyCube photo download URL:
              <span className="block font-mono text-white mt-1 break-all">
                {photoDownloadUrl}
              </span>
            </div>
          )}
          {requestPhotoId && (
            <div className="text-xs text-gray-400 break-all">
              Photo ID (from latest ComplyCube request):
              <span className="block font-mono text-white mt-1 break-all">
                {requestPhotoId}
              </span>
            </div>
          )}
          {requestComplyCubeDownloadURL &&
            !requestComplyCubeDownloadURL.includes("{photoID}") && (
              <div className="text-xs text-gray-400 break-all">
                Request ComplyCube download URL:
                <span className="block font-mono text-white mt-1 break-all">
                  {requestComplyCubeDownloadURL}
                </span>
              </div>
            )}
        </div>

        {photoLoading && (
          <div className="text-center mt-4 text-xs text-gray-400">
            Fetching ComplyCube live photo...
          </div>
        )}

        {photoDataUrl && (
          <div className="text-center mt-4">
            <Button
              variant="secondary"
              onClick={() => setPhotoModalOpen(true)}
              className="bg-gray-800 text-white hover:bg-gray-700"
            >
              View Verification Photo
            </Button>
          </div>
        )}

        <div className="mt-8 bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-sm text-gray-300 space-y-3">
          <h3 className="text-lg font-semibold text-white">ComplyCube Live Photos Request Log</h3>
          <p className="text-xs break-all">
            Request URL:
            <span className="block font-mono text-white mt-1 break-all">
              {complycubeLivePhotosUrl || "Not available"}
            </span>
          </p>
          <p className="text-xs break-all">
            Authorization header:
            <span className="block font-mono text-white mt-1 break-all">
              {complycubeAuthorizationKey || "Not available"}
            </span>
          </p>
          {authorizationRequestLoading && (
            <p className="text-amber-300 text-xs">Sending GET request to ComplyCube...</p>
          )}
          {complycubeRequestLog && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Status:{" "}
                <span className="text-white font-mono">
                  {complycubeRequestLog.responseStatus ?? "N/A"}
                </span>{" "}
                • Timestamp:{" "}
                <span className="text-white font-mono">{complycubeRequestLog.timestamp}</span>
              </p>
              <div className="text-xs">
                <p className="font-semibold text-gray-300 mb-1">Request</p>
                <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-white whitespace-pre-wrap break-all overflow-x-auto">
                  {`${complycubeRequestLog.method || "GET"} ${complycubeRequestLog.requestUrl}\n\nHeaders:\n${formatHeaders(
                    complycubeRequestLog.headers || {}
                  )}`}
                </pre>
              </div>
              {complycubeRequestLog.error ? (
                <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs">
                  <p className="font-semibold mb-1">Request Error</p>
                  <pre className="whitespace-pre-wrap break-all">
                    {complycubeRequestLog.error}
                  </pre>
                </div>
              ) : (
                <div className="text-xs">
                  <p className="font-semibold text-gray-300 mb-1">Response Body</p>
                  <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-white whitespace-pre-wrap break-all overflow-x-auto max-h-72">
                    {complycubeRequestLog.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
          {!authorizationRequestLoading && !complycubeRequestLog && (
            <p className="text-xs text-gray-500">
              Request log will appear here once the page has finished loading and a ComplyCube client
              ID plus authorization key are available.
            </p>
          )}
          <div className="pt-4 mt-4 border-t border-gray-800">
            <h4 className="text-base font-semibold text-white mb-2">
              ComplyCube Photo Download Request Log
            </h4>
            <p className="text-xs break-all">
              Download URL:
              <span className="block font-mono text-white mt-1 break-all">
                {requestComplyCubeDownloadURL.includes("{photoID}")
                  ? "Waiting for photo ID..."
                  : requestComplyCubeDownloadURL}
              </span>
            </p>
            {downloadRequestLoading && (
              <p className="text-amber-300 text-xs mt-2">Requesting ComplyCube photo download...</p>
            )}
          <div className="text-xs mt-3">
            <p className="font-semibold text-gray-300 mb-1">
              ComplyCube Photo Download Request (GET)
            </p>
            <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-white whitespace-pre-wrap break-all overflow-x-auto">
              {buildDownloadRequestPreview(
                requestComplyCubeDownloadURL,
                complycubeAuthorizationKey || ""
              )}
            </pre>
          </div>
            {complycubeDownloadLog && (
              <div className="space-y-2 mt-3">
                <p className="text-xs text-gray-400">
                  Status:{" "}
                  <span className="text-white font-mono">
                    {complycubeDownloadLog.responseStatus ?? "N/A"}
                  </span>{" "}
                  • Timestamp:{" "}
                  <span className="text-white font-mono">{complycubeDownloadLog.timestamp}</span>
                </p>
                <div className="text-xs">
                  <p className="font-semibold text-gray-300 mb-1">Request</p>
                  <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-white whitespace-pre-wrap break-all overflow-x-auto">
                    {`${complycubeDownloadLog.method || "GET"} ${complycubeDownloadLog.requestUrl}\n\nHeaders:\n${formatHeaders(
                      complycubeDownloadLog.headers || {}
                    )}`}
                  </pre>
                </div>
                {complycubeDownloadLog.error ? (
                  <div className="text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs">
                    <p className="font-semibold mb-1">Request Error</p>
                    <pre className="whitespace-pre-wrap break-all">
                      {complycubeDownloadLog.error}
                    </pre>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-semibold text-gray-300 mb-1">Response Body</p>
                    <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-white whitespace-pre-wrap break-all overflow-x-auto max-h-72">
                      {complycubeDownloadLog.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            )}
            {!downloadRequestLoading && !complycubeDownloadLog && (
              <p className="text-xs text-gray-500 mt-2">
                Download request will run after a photo ID is available and will show up here.
              </p>
            )}
          </div>
        </div>


        <Dialog open={isPhotoModalOpen} onOpenChange={setPhotoModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>ComplyCube Live Photo</DialogTitle>
              <DialogDescription>
                This is the live photo captured during your biometric verification session.
              </DialogDescription>
            </DialogHeader>
            {photoDataUrl ? (
              <img
                src={photoDataUrl}
                alt="ComplyCube live verification"
                className="w-full rounded-xl border border-gray-800"
              />
            ) : (
              <div className="text-center text-sm text-gray-500">
                Photo unavailable. Please try again later.
              </div>
            )}
          </DialogContent>
        </Dialog>


        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-700/50 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-purple-400 transition-colors">Support</a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
