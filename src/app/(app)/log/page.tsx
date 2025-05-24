import { DailyLogForm } from "@/components/logging/DailyLogForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Log - Recovery Compass',
  description: 'Log your daily recovery status.',
};

export default function DailyLogPage() {
  return (
    <div className="container mx-auto py-2">
      <DailyLogForm />
    </div>
  );
}
