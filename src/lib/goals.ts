import 'server-only';

import goalsData from '@/assets/static/json/goals.json';
import { ageAtDate } from '@/lib/age';

export type GoalJournalEntry = {
  id: string;
  date: string;
  kind: 'goal' | 'shift' | 'reflection';
  title: string;
  summary: string;
  tags?: string[];
  age?: number | null;
};

export async function getGoalChangelog(): Promise<GoalJournalEntry[]> {
  return (goalsData as Omit<GoalJournalEntry, 'age'>[])
    .map((entry) => ({
      ...entry,
      age: ageAtDate(entry.date),
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}
