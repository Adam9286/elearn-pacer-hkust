// Lecture selector dropdown for admin review page

import { chapters } from '@/data/courseContent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { LectureSummary } from '@/services/adminApi';

interface LectureSelectorProps {
  value: string;
  onChange: (lectureId: string) => void;
  summaries: LectureSummary[];
}

// Extract all lecture IDs from course content
const allLectures = chapters.flatMap(chapter =>
  chapter.lessons
    .filter(lesson => lesson.lectureFile)
    .map(lesson => ({
      lectureFile: lesson.lectureFile!,
      title: lesson.title,
      chapterTitle: chapter.title,
    }))
);

export function LectureSelector({ value, onChange, summaries }: LectureSelectorProps) {
  const getSummary = (lectureId: string) => 
    summaries.find(s => s.lecture_id === lectureId);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-md">
        <SelectValue placeholder="Select a lecture to review..." />
      </SelectTrigger>
      <SelectContent>
        {allLectures.map(lecture => {
          const summary = getSummary(lecture.lectureFile);
          return (
            <SelectItem key={lecture.lectureFile} value={lecture.lectureFile}>
              <div className="flex items-center justify-between w-full gap-4">
                <span className="flex-1">
                  <span className="font-medium">{lecture.lectureFile}</span>
                  <span className="text-muted-foreground ml-2">— {lecture.title}</span>
                </span>
                {summary && (
                  <div className="flex gap-1 text-xs">
                    {summary.approved > 0 && (
                      <Badge variant="default" className="bg-green-600 text-xs px-1.5">
                        {summary.approved}
                      </Badge>
                    )}
                    {summary.draft > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {summary.draft}
                      </Badge>
                    )}
                    {summary.rejected > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5">
                        {summary.rejected}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
