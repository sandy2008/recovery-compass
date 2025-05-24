"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { BarChart, LineChart, Smile, TrendingUp, ListChecks } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PainSwellingChart from "@/components/dashboard/PainSwellingChart";
import MoodTracker from "@/components/dashboard/MoodTracker";
import { DailyLog } from "@/types";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchDailyLogs(userId: string): Promise<DailyLog[]> {
  const logsCollectionRef = collection(db, `users/${userId}/dailyLogs`);
  const q = query(logsCollectionRef, orderBy("date", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog));
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();

  const { data: dailyLogs, isLoading: isLoadingLogs, error: logsError } = useQuery<DailyLog[], Error>({
    queryKey: ['dailyLogs', user?.uid],
    queryFn: () => fetchDailyLogs(user!.uid),
    enabled: !!user,
  });

  const recentLogs = dailyLogs?.slice(-7) || []; // Get last 7 logs for example

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const lastLogDate = dailyLogs && dailyLogs.length > 0 ? new Date(dailyLogs[dailyLogs.length-1].date + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const needsToLogToday = !lastLogDate || lastLogDate.getTime() < today.getTime();

  return (
    <div className="container mx-auto py-2">
      <PageHeader
        title={`${getGreeting()}, ${userProfile?.name || "User"}!`}
        description="Here's an overview of your recovery progress."
      />

      {needsToLogToday && (
        <Card className="mb-6 bg-primary/20 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Ready for today's log?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3">
              It looks like you haven't logged your recovery status today. Consistent logging helps track your progress effectively.
            </p>
            <Button asChild>
              <Link href="/log">Log Today's Status</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Pain & Swelling Trends
            </CardTitle>
            <CardDescription>Visualizing your pain and swelling levels over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}
            {logsError && <p className="text-destructive">Error loading chart data: {logsError.message}</p>}
            {!isLoadingLogs && !logsError && dailyLogs && dailyLogs.length > 0 && (
              <PainSwellingChart logs={dailyLogs} />
            )}
            {!isLoadingLogs && (!dailyLogs || dailyLogs.length === 0) && (
              <p className="text-muted-foreground text-center py-10">No logs yet. Start logging to see your trends!</p>
            )}
          </CardContent>
        </Card>

        <MoodTracker currentMood={recentLogs.length > 0 ? recentLogs[recentLogs.length-1].mood : undefined} />

        <Card>
          <CardHeader>
            <CardTitle>Recovery Milestones</CardTitle>
            <CardDescription>Key stages in your recovery journey.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Day 1-3: Peak swelling and discomfort expected.</li>
              <li>Week 1: Follow-up appointment.</li>
              <li>Week 2-4: Gradual increase in activity.</li>
              <li>Month 2-3: Significant improvement in mobility.</li>
            </ul>
            <p className="mt-4 text-xs italic">*These are general milestones. Your recovery may vary.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>A quick look at your most recent entries.</CardDescription>
          </CardHeader>
          <CardContent>
          {isLoadingLogs && <Skeleton className="h-20 w-full" />}
          {logsError && <p className="text-destructive">Error loading recent logs.</p>}
          {!isLoadingLogs && dailyLogs && dailyLogs.length > 0 ? (
            <ul className="space-y-3">
              {dailyLogs.slice(-3).reverse().map(log => (
                <li key={log.id} className="p-3 border rounded-md shadow-sm bg-card">
                  <p className="font-semibold">{new Date(log.date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p>Pain: {log.painLevel}/10, Swelling: {log.swellingLevel}/10</p>
                  {log.mood && <p>Mood: {log.mood}</p>}
                  {log.notes && <p className="text-sm text-muted-foreground truncate">Notes: {log.notes}</p>}
                </li>
              ))}
            </ul>
          ) : (
            !isLoadingLogs && <p className="text-muted-foreground">No recent logs available.</p>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
