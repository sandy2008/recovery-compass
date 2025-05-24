"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { generateRecoveryTips } from "@/ai/flows/generate-recovery-tips";
import type { DailyLog, UserProfile } from "@/types";
import { BotMessageSquare, Loader2, Lightbulb } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

interface ManualInput {
  painLevel: number;
  swellingLevel: number;
  medicationTaken: string;
  notes: string;
}

export default function AiTipsPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [latestLog, setLatestLog] = useState<DailyLog | null>(null);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTips, setGeneratedTips] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState<ManualInput>({
    painLevel: 5,
    swellingLevel: 5,
    medicationTaken: "",
    notes: "",
  });

  useEffect(() => {
    async function fetchLatestLog() {
      if (!user) return;
      setIsLoadingLog(true);
      try {
        const logsCollectionRef = collection(db, `users/${user.uid}/dailyLogs`);
        const q = query(logsCollectionRef, orderBy("date", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const logData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as DailyLog;
          setLatestLog(logData);
          if (logData.recoveryTips) {
            setGeneratedTips(logData.recoveryTips);
          }
        } else {
          setShowManualInput(true); // If no logs, show manual input form
        }
      } catch (error) {
        console.error("Error fetching latest log:", error);
        toast({ title: "Error", description: "Could not fetch latest log.", variant: "destructive" });
      } finally {
        setIsLoadingLog(false);
      }
    }
    fetchLatestLog();
  }, [user, toast]);

  const handleGenerateTips = async (source: "latestLog" | "manualInput") => {
    if (!user || !userProfile) {
      toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
      return;
    }

    let aiInputData;
    if (source === "latestLog" && latestLog) {
      aiInputData = {
        painLevel: latestLog.painLevel,
        swellingLevel: latestLog.swellingLevel,
        medicationTaken: latestLog.medicationsTaken.join(', ') + (latestLog.customMedication ? `, ${latestLog.customMedication}` : ''),
        notes: latestLog.notes || "No additional notes.",
        photoDataUri: latestLog.photoUrl, // Assuming photoUrl can be used, or needs conversion if it's a storage URL. Genkit might handle URLs.
        surgeryType: userProfile.surgeryType || "General Surgery",
        surgeryDate: userProfile.surgeryDate || "Not specified",
        userName: userProfile.name,
      };
    } else if (source === "manualInput") {
      aiInputData = {
        ...manualInput,
        surgeryType: userProfile.surgeryType || "General Surgery",
        surgeryDate: userProfile.surgeryDate || "Not specified",
        userName: userProfile.name,
      };
    } else {
      toast({ title: "Error", description: "No data available to generate tips.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedTips(null);
    try {
      const result = await generateRecoveryTips(aiInputData);
      setGeneratedTips(result.tips);
      // If tips were generated from the latest log, update the log with these tips
      if (source === "latestLog" && latestLog?.id) {
        const logRef = doc(db, `users/${user.uid}/dailyLogs`, latestLog.id);
        await updateDoc(logRef, { recoveryTips: result.tips, updatedAt: serverTimestamp() });
      }
      toast({ title: "Tips Generated!", description: "Personalized recovery tips are ready." });
    } catch (error: any) {
      console.error("Error generating AI tips:", error);
      toast({ title: "Generation Failed", description: error.message || "Could not generate tips.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleManualInputChange = (field: keyof ManualInput, value: string | number) => {
    setManualInput(prev => ({ ...prev, [field]: value }));
  };

  if (isLoadingLog) {
    return <div className="container mx-auto py-10 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-2">
      <PageHeader title="AI Recovery Assistant" description="Get personalized tips to improve your recovery process." />

      {!latestLog && !showManualInput && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>No Logs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              We need at least one daily log to generate personalized recovery tips.
            </p>
            <Button asChild>
              <Link href="/log">Create Your First Log</Link>
            </Button>
            <Button variant="outline" onClick={() => setShowManualInput(true)} className="ml-4">
              Or Enter Info Manually
            </Button>
          </CardContent>
        </Card>
      )}

      {latestLog && !showManualInput && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Tips Based on Your Latest Log</CardTitle>
            <CardDescription>
              Dated: {new Date(latestLog.date + "T00:00:00").toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}. 
              Pain: {latestLog.painLevel}/10, Swelling: {latestLog.swellingLevel}/10.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={() => handleGenerateTips("latestLog")} disabled={isGenerating} className="flex-1">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                {latestLog.recoveryTips ? "Re-generate Tips" : "Generate Tips from Latest Log"}
              </Button>
              <Button variant="outline" onClick={() => setShowManualInput(true)}>
                Enter Info Manually Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {showManualInput && (
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Manual Input for AI Tips</CardTitle>
            <CardDescription>Provide your current status to get personalized tips.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="manualPainLevel">Pain Level: {manualInput.painLevel}</Label>
              <Slider
                id="manualPainLevel"
                value={[manualInput.painLevel]}
                onValueChange={(val) => handleManualInputChange("painLevel", val[0])}
                max={10}
                step={1}
              />
            </div>
            <div>
              <Label htmlFor="manualSwellingLevel">Swelling Level: {manualInput.swellingLevel}</Label>
              <Slider
                id="manualSwellingLevel"
                value={[manualInput.swellingLevel]}
                onValueChange={(val) => handleManualInputChange("swellingLevel", val[0])}
                max={10}
                step={1}
              />
            </div>
            <div>
              <Label htmlFor="manualMedication">Medications Taken</Label>
              <Input
                id="manualMedication"
                value={manualInput.medicationTaken}
                onChange={(e) => handleManualInputChange("medicationTaken", e.target.value)}
                placeholder="e.g., Ibuprofen 400mg, Paracetamol 500mg"
              />
            </div>
            <div>
              <Label htmlFor="manualNotes">Additional Notes</Label>
              <Textarea
                id="manualNotes"
                value={manualInput.notes}
                onChange={(e) => handleManualInputChange("notes", e.target.value)}
                placeholder="e.g., Feeling tired, incision site is itchy"
              />
            </div>
            <Button onClick={() => handleGenerateTips("manualInput")} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              Generate Tips
            </Button>
            {latestLog && (
               <Button variant="outline" onClick={() => setShowManualInput(false)} className="w-full mt-2">
                Use Latest Log Instead
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isGenerating && !generatedTips && (
        <Alert className="mt-6">
          <BotMessageSquare className="h-5 w-5" />
          <AlertTitle>Generating Recovery Tips...</AlertTitle>
          <AlertDescription>
            Our AI is working its magic. This might take a moment.
          </AlertDescription>
        </Alert>
      )}

      {generatedTips && (
        <Card className="mt-6 shadow-xl bg-primary/10 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <BotMessageSquare className="h-6 w-6" />
              Your Personalized Recovery Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {generatedTips}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
