"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BellRing, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const [dailyLogReminder, setDailyLogReminder] = useState(false);
  const [medicationReminder, setMedicationReminder] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
      setDailyLogReminder(localStorage.getItem("dailyLogReminder") === "true");
      setMedicationReminder(localStorage.getItem("medicationReminder") === "true");
    }
  }, []);

  const handleNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Unsupported", description: "This browser does not support desktop notifications.", variant: "destructive" });
      return;
    }

    if (Notification.permission === "granted") {
      toast({ title: "Already Enabled", description: "Notifications are already enabled." });
      setNotificationsEnabled(true);
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({ title: "Success", description: "Notifications enabled!" });
        new Notification("Recovery Compass Reminders", { body: "You'll now receive reminders." });
      } else {
        setNotificationsEnabled(false);
        toast({ title: "Denied", description: "Notification permission denied.", variant: "destructive" });
      }
    } else {
        toast({ title: "Blocked", description: "Notifications are blocked. Please enable them in your browser settings.", variant: "destructive" });
    }
  };

  const toggleDailyLogReminder = (checked: boolean) => {
    if (checked && !notificationsEnabled) {
      toast({ title: "Enable Notifications First", description: "Please enable browser notifications to use reminders.", variant: "destructive"});
      return;
    }
    setDailyLogReminder(checked);
    localStorage.setItem("dailyLogReminder", String(checked));
    toast({ title: `Daily Log Reminder ${checked ? 'Enabled' : 'Disabled'}` });
     if (checked) {
      // TODO: Implement actual scheduling logic
      new Notification("Recovery Compass", { body: "Daily log reminders are now active." });
    }
  };

  const toggleMedicationReminder = (checked: boolean) => {
     if (checked && !notificationsEnabled) {
      toast({ title: "Enable Notifications First", description: "Please enable browser notifications to use reminders.", variant: "destructive"});
      return;
    }
    setMedicationReminder(checked);
    localStorage.setItem("medicationReminder", String(checked));
    toast({ title: `Medication Reminder ${checked ? 'Enabled' : 'Disabled'}` });
    if (checked) {
      // TODO: Implement actual scheduling logic
      new Notification("Recovery Compass", { body: "Medication reminders are now active." });
    }
  };
  

  return (
    <div className="container mx-auto py-2">
      <PageHeader title="Settings" description="Customize your app experience." />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sun className="inline dark:hidden h-5 w-5" /><Moon className="hidden dark:inline h-5 w-5" /> Appearance</CardTitle>
            <CardDescription>Adjust the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <Label htmlFor="theme-toggle" className="font-medium">
                Theme
              </Label>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" /> Notifications & Reminders</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!notificationsEnabled && Notification.permission !== "denied" && (
                 <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <Label htmlFor="enable-notifications" className="font-medium">Enable Browser Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                            Allow notifications to get reminders.
                        </p>
                    </div>
                    <Button id="enable-notifications" onClick={handleNotificationPermission}>Enable</Button>
                </div>
            )}
            {Notification.permission === "denied" && (
                 <div className="flex items-center justify-between rounded-lg border border-destructive bg-destructive/10 p-4">
                    <div>
                        <Label htmlFor="enable-notifications" className="font-medium text-destructive">Notifications Blocked</Label>
                        <p className="text-sm text-destructive/80">
                            Please enable notifications in your browser settings to use reminders.
                        </p>
                    </div>
                </div>
            )}

            <div className={`flex items-center justify-between rounded-lg border p-4 ${!notificationsEnabled && 'opacity-50'}`}>
              <div>
                <Label htmlFor="daily-log-reminder" className="font-medium">Daily Logging Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Get a reminder to log your recovery status each day.
                </p>
              </div>
              <Switch
                id="daily-log-reminder"
                checked={dailyLogReminder}
                onCheckedChange={toggleDailyLogReminder}
                disabled={!notificationsEnabled}
                aria-label="Toggle daily log reminder"
              />
            </div>

            <div className={`flex items-center justify-between rounded-lg border p-4 ${!notificationsEnabled && 'opacity-50'}`}>
              <div>
                <Label htmlFor="medication-reminder" className="font-medium">Medication Reminders</Label>
                 <p className="text-sm text-muted-foreground">
                  Set up reminders for your medications. (Coming soon)
                </p>
              </div>
              <Switch
                id="medication-reminder"
                checked={medicationReminder}
                onCheckedChange={toggleMedicationReminder}
                disabled={!notificationsEnabled || true} // Feature coming soon
                aria-label="Toggle medication reminder"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
