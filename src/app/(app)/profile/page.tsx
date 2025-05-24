"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional(), // Email is not editable here
  surgeryType: z.string().min(2, { message: "Surgery type is required." }),
  surgeryDate: z.date({ required_error: "Surgery date is required." }),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      surgeryType: "",
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || "",
        email: userProfile.email || "",
        surgeryType: userProfile.surgeryType || "",
        surgeryDate: userProfile.surgeryDate ? parseISO(userProfile.surgeryDate) : undefined,
      });
    }
  }, [userProfile, form]);

  async function onSubmit(values: ProfileFormData) {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name: values.name,
        surgeryType: values.surgeryType,
        surgeryDate: format(values.surgeryDate, "yyyy-MM-dd"),
        updatedAt: serverTimestamp(),
      });
      await refreshUserProfile(); // Refresh context
      toast({ title: "Profile Updated", description: "Your profile information has been saved." });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <div className="container mx-auto py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading profile...</div>;
  }

  if (!userProfile) {
    return <div className="container mx-auto py-10">Could not load profile information.</div>;
  }

  return (
    <div className="container mx-auto py-2">
      <PageHeader title="Your Profile" description="Manage your personal and surgery information." />
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Keep your information up to date for accurate tracking and tips.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} disabled />
                    </FormControl>
                    <FormDescription>Email cannot be changed.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surgeryType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Surgery</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Knee Replacement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surgeryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Surgery</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
