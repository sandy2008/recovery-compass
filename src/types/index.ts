import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  id: string; // Firebase UID
  name: string;
  email: string;
  surgeryType?: string;
  surgeryDate?: string; // ISO date string YYYY-MM-DD
}

export interface DailyLog {
  id?: string; // Firestore document ID
  userId: string;
  date: string; // ISO date string, YYYY-MM-DD
  painLevel: number; // 1-10
  swellingLevel: number; // 1-10
  medicationsTaken: string[];
  customMedication?: string;
  mood?: string; // Emoji character
  notes?: string;
  photoUrl?: string; // URL from Firebase Storage
  photoPath?: string; // Path in Firebase Storage for deletion
  createdAt: Timestamp;
  updatedAt: Timestamp;
  recoveryTips?: string; // AI generated tips
}

export const MoodEmojis: { emoji: string; label: string }[] = [
  { emoji: "😊", label: "Happy" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😟", label: "Worried" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😣", label: "In Pain" },
];

export const DefaultMedications: string[] = [
  "Paracetamol",
  "Ibuprofen",
  "Prescription Opioids (e.g., Oxycodone)",
  "Antibiotics",
  "Anti-inflammatory drugs",
];

export type FirebaseUser = import('firebase/auth').User;
