"use client"

import { useState, useEffect } from "react"
import { MoodEmojis, type DailyLog } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/providers/AuthProvider"
import { db } from "@/lib/firebase"
import { doc, updateDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Smile } from "lucide-react"
import { format } from "date-fns"

interface MoodTrackerProps {
  currentMood?: string; // Optional: pass current mood if already known
}

export default function MoodTracker({ currentMood: initialMood }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<string | undefined>(initialMood)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    setSelectedMood(initialMood);
  }, [initialMood]);

  const handleMoodSelect = async (emoji: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" })
      return
    }
    setLoading(true)
    setSelectedMood(emoji)

    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const dailyLogCollectionRef = collection(db, `users/${user.uid}/dailyLogs`);
      
      // Check if a log for today already exists
      const q = query(dailyLogCollectionRef, orderBy("date", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      
      let todaysLog: DailyLog | null = null;
      let logId: string | null = null;

      if (!querySnapshot.empty) {
        const latestLog = querySnapshot.docs[0].data() as DailyLog;
        if (latestLog.date === todayStr) {
          todaysLog = latestLog;
          logId = querySnapshot.docs[0].id;
        }
      }

      if (logId && todaysLog) {
        // Update existing log for today
        const logRef = doc(db, `users/${user.uid}/dailyLogs`, logId);
        await updateDoc(logRef, { mood: emoji, updatedAt: serverTimestamp() });
        toast({ title: "Mood Updated!", description: `Your mood for today is set to ${emoji}.` });
      } else {
        // Create a new minimal log for today with just the mood
        const newLogRef = doc(collection(db, `users/${user.uid}/dailyLogs`));
        const newLogData: Partial<DailyLog> = {
          userId: user.uid,
          date: todayStr,
          mood: emoji,
          painLevel: 0, // Default or indicate as not set
          swellingLevel: 0, // Default or indicate as not set
          medicationsTaken: [],
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        };
        await setDoc(newLogRef, newLogData);
        toast({ title: "Mood Logged!", description: `Your mood for today is set to ${emoji}.` });
      }
    } catch (error) {
      console.error("Error updating mood: ", error)
      toast({ title: "Error", description: "Could not update mood.", variant: "destructive" })
      setSelectedMood(undefined); // Revert if error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Smile className="h-6 w-6 text-primary" />
            How are you feeling?
        </CardTitle>
        <CardDescription>Quickly log your mood for today.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap justify-center gap-2">
        {MoodEmojis.map(({ emoji, label }) => (
          <Button
            key={emoji}
            variant={selectedMood === emoji ? "default" : "outline"}
            size="lg"
            onClick={() => handleMoodSelect(emoji)}
            disabled={loading}
            className={`p-3 text-3xl rounded-full aspect-square transition-all duration-150 ease-in-out transform hover:scale-110 ${selectedMood === emoji ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            aria-label={`Log mood as ${label}`}
          >
            {emoji}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
