"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { DefaultMedications, MoodEmojis, type DailyLog, type UserProfile } from "@/types";
import Image from "next/image";
import { useState, useEffect } from "react";
import { AlertCircle, BotMessageSquare, CheckCircle, Loader2, UploadCloud, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { generateRecoveryTips } from "@/ai/flows/generate-recovery-tips";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const formSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  painLevel: z.number().min(0).max(10),
  swellingLevel: z.number().min(0).max(10),
  medicationsTaken: z.array(z.string()),
  customMedication: z.string().optional(),
  mood: z.string().optional(),
  notes: z.string().max(1000, "Notes can be up to 1000 characters.").optional(),
  photo: z.any()
    .refine(file => file ? file.size <= MAX_FILE_SIZE : true, "Max image size is 5MB.")
    .refine(file => file ? ALLOWED_IMAGE_TYPES.includes(file.type) : true, "Only .jpg, .png, .webp, and .gif formats are supported.")
    .optional(),
});

type DailyLogFormData = z.infer<typeof formSchema>;

interface DailyLogFormProps {
  logToEdit?: DailyLog | null; // Existing log data for editing
}

export function DailyLogForm({ logToEdit }: DailyLogFormProps) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const [generatedTips, setGeneratedTips] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(logToEdit?.photoUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<DailyLogFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: logToEdit?.date || today,
      painLevel: logToEdit?.painLevel ?? 5,
      swellingLevel: logToEdit?.swellingLevel ?? 5,
      medicationsTaken: logToEdit?.medicationsTaken ?? [],
      customMedication: logToEdit?.customMedication ?? "",
      mood: logToEdit?.mood ?? MoodEmojis[2].emoji, // Neutral
      notes: logToEdit?.notes ?? "",
      photo: undefined,
    },
  });

   useEffect(() => {
    if (logToEdit) {
      form.reset({
        date: logToEdit.date,
        painLevel: logToEdit.painLevel,
        swellingLevel: logToEdit.swellingLevel,
        medicationsTaken: logToEdit.medicationsTaken,
        customMedication: logToEdit.customMedication,
        mood: logToEdit.mood,
        notes: logToEdit.notes,
        photo: undefined, // Photo handling is separate
      });
      setImagePreview(logToEdit.photoUrl || null);
      setGeneratedTips(logToEdit.recoveryTips || null);
    }
  }, [logToEdit, form]);


  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file client-side before setting for preview
      if (file.size > MAX_FILE_SIZE) {
        form.setError("photo", { type: "manual", message: "Max image size is 5MB." });
        setImagePreview(null);
        return;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        form.setError("photo", { type: "manual", message: "Only .jpg, .png, .webp, and .gif formats are supported." });
        setImagePreview(null);
        return;
      }
      form.clearErrors("photo");
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue("photo", file); // Set for react-hook-form
    } else {
      setImagePreview(null);
      form.setValue("photo", undefined);
    }
  };
  
  const removePhoto = async () => {
    setImagePreview(null);
    form.setValue("photo", undefined); // Clear file input
    // If editing and photo existed, mark for deletion or delete immediately
    if (logToEdit?.photoPath) {
      // Consider adding a flag to delete on submit, or delete immediately if sure
      // For now, just clear preview and form value
      toast({title: "Photo Removed", description: "The photo will be removed when you save the log."});
    }
  };

  async function onSubmit(values: DailyLogFormData) {
    if (!user || !userProfile) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setGeneratedTips(null);

    try {
      let photoUrl: string | undefined = logToEdit?.photoUrl;
      let photoPath: string | undefined = logToEdit?.photoPath;
      const file = values.photo;

      if (file) {
        setIsUploading(true);
        // Delete old photo if it exists and a new one is uploaded
        if (logToEdit?.photoPath) {
            const oldPhotoRef = ref(storage, logToEdit.photoPath);
            try { await deleteObject(oldPhotoRef); } catch (e) { console.warn("Old photo not found or deletion failed:", e); }
        }
        const filePath = `users/${user.uid}/logs/${values.date}_${file.name}`;
        const photoRef = ref(storage, filePath);
        await uploadBytes(photoRef, file);
        photoUrl = await getDownloadURL(photoRef);
        photoPath = filePath;
        setIsUploading(false);
      } else if (logToEdit && !imagePreview) { // Photo was removed
          if (logToEdit.photoPath) {
              const oldPhotoRef = ref(storage, logToEdit.photoPath);
              try { await deleteObject(oldPhotoRef); } catch (e) { console.warn("Old photo not found or deletion failed:", e); }
          }
          photoUrl = undefined;
          photoPath = undefined;
      }


      const logData: Omit<DailyLog, "id" | "createdAt" | "updatedAt"> & { createdAt?: Timestamp, updatedAt: Timestamp } = {
        userId: user.uid,
        date: values.date,
        painLevel: values.painLevel,
        swellingLevel: values.swellingLevel,
        medicationsTaken: values.medicationsTaken.includes("Other") && values.customMedication
          ? [...values.medicationsTaken.filter(m => m !== "Other"), values.customMedication]
          : values.medicationsTaken,
        customMedication: values.medicationsTaken.includes("Other") ? values.customMedication : undefined,
        mood: values.mood,
        notes: values.notes,
        photoUrl: photoUrl,
        photoPath: photoPath,
        updatedAt: serverTimestamp() as Timestamp,
      };

      let finalLogData = logData;

      if (logToEdit?.id) {
        const logRef = doc(db, `users/${user.uid}/dailyLogs`, logToEdit.id);
        await updateDoc(logRef, logData);
        finalLogData = { ...logToEdit, ...logData }; // for AI tips
        toast({ title: "Log Updated", description: "Your daily log has been successfully updated.", icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
      } else {
        // Check if log for this date already exists
        const q = query(collection(db, `users/${user.uid}/dailyLogs`), where("date", "==", values.date));
        const existingDocs = await getDocs(q);
        if (!existingDocs.empty) {
          toast({ title: "Log Exists", description: `A log for ${format(parseISO(values.date), "PPP")} already exists. You can edit it from the dashboard or history.`, variant: "destructive", duration: 7000, icon: <AlertCircle className="h-5 w-5 text-yellow-500" /> });
          setIsLoading(false);
          return;
        }
        logData.createdAt = serverTimestamp() as Timestamp;
        const docRef = await addDoc(collection(db, `users/${user.uid}/dailyLogs`), logData);
        finalLogData = { ...logData, id: docRef.id, createdAt: logData.createdAt! }; // for AI tips
        toast({ title: "Log Submitted", description: "Your daily log has been successfully submitted.", icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
      }
      
      // AI Tip Generation
      setIsGeneratingTips(true);
      try {
        const aiInput = {
          painLevel: finalLogData.painLevel,
          swellingLevel: finalLogData.swellingLevel,
          medicationTaken: finalLogData.medicationsTaken.join(', ') + (finalLogData.customMedication ? `, ${finalLogData.customMedication}` : ''),
          notes: finalLogData.notes || "No additional notes.",
          photoDataUri: file ? imagePreview || undefined : (logToEdit?.photoUrl ? logToEdit.photoUrl : undefined), // Use preview for new/changed, existing URL otherwise
          surgeryType: userProfile.surgeryType || "General Surgery",
          surgeryDate: userProfile.surgeryDate || "Not specified",
          userName: userProfile.name,
        };
        const aiResult = await generateRecoveryTips(aiInput);
        setGeneratedTips(aiResult.tips);

        // Save AI tips to Firestore log
        if (finalLogData.id) {
          const logRefToUpdateTips = doc(db, `users/${user.uid}/dailyLogs`, finalLogData.id);
          await updateDoc(logRefToUpdateTips, { recoveryTips: aiResult.tips, updatedAt: serverTimestamp() });
        }

      } catch (aiError: any) {
        console.error("AI Tip Generation Error:", aiError);
        toast({ title: "AI Tip Generation Failed", description: aiError.message || "Could not generate recovery tips.", variant: "destructive", icon: <XCircle className="h-5 w-5 text-red-500" /> });
      } finally {
        setIsGeneratingTips(false);
      }

      // Don't redirect immediately if tips are shown on this page.
      // router.push("/dashboard"); // Or to a page showing the log and tips
    } catch (error: any) {
      console.error("Error submitting log:", error);
      toast({ title: "Submission Failed", description: error.message || "An unexpected error occurred.", variant: "destructive", icon: <XCircle className="h-5 w-5 text-red-500" /> });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{logToEdit ? "Edit Daily Log" : "Create Daily Log"}</CardTitle>
        <CardDescription>
          {logToEdit ? `Editing log for ${format(parseISO(logToEdit.date), "PPP")}` : `Log your recovery status for ${format(parseISO(form.watch("date")), "PPP")}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {!logToEdit && (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Input type="date" {...field} max={today} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="painLevel"
              render={({ field: { onChange, value, ...restField } }) => (
                <FormItem>
                  <FormLabel>Pain Level: {value}</FormLabel>
                  <FormControl>
                    <Slider
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      min={0}
                      max={10}
                      step={1}
                      {...restField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="swellingLevel"
              render={({ field: { onChange, value, ...restField } }) => (
                <FormItem>
                  <FormLabel>Swelling Level: {value}</FormLabel>
                  <FormControl>
                    <Slider
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      min={0}
                      max={10}
                      step={1}
                      {...restField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicationsTaken"
              render={() => (
                <FormItem>
                  <FormLabel>Medications Taken</FormLabel>
                  <div className="space-y-2">
                    {DefaultMedications.map((med) => (
                      <FormField
                        key={med}
                        control={form.control}
                        name="medicationsTaken"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(med)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value ?? []), med])
                                    : field.onChange(
                                        (field.value ?? []).filter(
                                          (value) => value !== med
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{med}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                    <FormField
                        control={form.control}
                        name="medicationsTaken"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes("Other")}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...(field.value ?? []), "Other"]
                                    : (field.value ?? []).filter((value) => value !== "Other");
                                  field.onChange(newValue);
                                  if (!checked) {
                                    form.setValue("customMedication", ""); // Clear custom field if "Other" is unchecked
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        )}
                      />
                      {form.watch("medicationsTaken")?.includes("Other") && (
                        <FormField
                          control={form.control}
                          name="customMedication"
                          render={({ field }) => (
                            <FormItem className="pl-7">
                              <FormControl>
                                <Input placeholder="Specify other medication" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {MoodEmojis.map(({ emoji, label }) => (
                        <Button
                          key={emoji}
                          type="button"
                          variant={field.value === emoji ? "default" : "outline"}
                          onClick={() => field.onChange(emoji)}
                          className={`p-3 text-2xl rounded-full aspect-square ${field.value === emoji ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          aria-label={label}
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional details about your recovery..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="photo"
                render={({ field: { onChange, value, ...rest }}) => ( // onChange is not directly used by Input type file
                <FormItem>
                    <FormLabel>Recovery Photo (Optional)</FormLabel>
                    <FormControl>
                    <div className="flex items-center gap-4">
                        <Input 
                        id="photo" 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoChange} // Use custom handler
                        className="hidden"
                        disabled={isUploading}
                        {...rest}
                        />
                        <label htmlFor="photo" className={cn(
                            "cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
                            isUploading && "opacity-50 cursor-not-allowed"
                        )}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isUploading ? "Uploading..." : (imagePreview ? "Change Photo" : "Upload Photo")}
                        </label>
                        {isUploading && <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                    </FormControl>
                    <FormDescription>Max 5MB. JPG, PNG, WEBP, GIF allowed.</FormDescription>
                    <FormMessage />
                    {imagePreview && (
                    <div className="mt-4 relative w-48 h-48 border rounded-md overflow-hidden">
                        <Image src={imagePreview} alt="Photo preview" layout="fill" objectFit="cover" data-ai-hint="medical recovery" />
                        <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute top-1 right-1 h-7 w-7" 
                        onClick={removePhoto}
                        aria-label="Remove photo"
                        >
                        <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                    )}
                </FormItem>
                )}
            />
            
            <Button type="submit" className="w-full" disabled={isLoading || isUploading || isGeneratingTips}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {logToEdit ? "Update Log" : "Submit Log"}
              {(isUploading || isGeneratingTips) && "..."}
            </Button>
          </form>
        </Form>

        {isGeneratingTips && (
          <Alert className="mt-6">
            <BotMessageSquare className="h-5 w-5" />
            <AlertTitle>Generating Recovery Tips...</AlertTitle>
            <AlertDescription>
              Our AI is analyzing your log to provide personalized advice. This might take a moment.
              <Progress value={undefined} className="w-full mt-2 h-2 animate-pulse" />
            </AlertDescription>
          </Alert>
        )}

        {generatedTips && (
          <Alert variant="default" className="mt-6 bg-primary/10 border-primary/30">
             <BotMessageSquare className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">AI Recovery Tips</AlertTitle>
            <AlertDescription>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {generatedTips}
              </div>
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Minimal Progress component for indeterminate state
const Progress = ({ value, className }: { value?: number; className?: string }) => (
  <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
    <div
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: value !== undefined ? `translateX(-${100 - (value || 0)}%)` : undefined }}
    />
  </div>
);
