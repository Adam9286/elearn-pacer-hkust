// Admin page for reviewing and approving AI-generated slide explanations

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { LectureSelector } from '@/components/admin/LectureSelector';
import { SlideList } from '@/components/admin/SlideList';
import { SlideEditor } from '@/components/admin/SlideEditor';
import {
  fetchLectureDrafts,
  fetchLectureSummaries,
  updateSlideExplanation,
  approveSlide,
  rejectSlide,
  approveAllSlides,
  triggerBatchGeneration,
  generateSingleSlide,
  type SlideExplanation,
  type LectureSummary,
} from '@/services/adminApi';
import { externalSupabase } from '@/lib/externalSupabase';
import { examSupabase } from '@/lib/examSupabase';

// Admin user ID (from memory: adambaby2004@gmail.com)
const ADMIN_EMAIL = 'adambaby2004@gmail.com';

export default function AdminReviewSlides() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [selectedLecture, setSelectedLecture] = useState('');
  const [slides, setSlides] = useState<SlideExplanation[]>([]);
  const [allSlideNumbers, setAllSlideNumbers] = useState<number[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<SlideExplanation | null>(null);
  const [selectedSlideNumber, setSelectedSlideNumber] = useState<number | null>(null);
  const [summaries, setSummaries] = useState<LectureSummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check admin access on mount
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await externalSupabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Check if user email matches admin
      const isAdminUser = user.email === ADMIN_EMAIL;
      setIsAdmin(isAdminUser);
      setIsLoading(false);

      if (isAdminUser) {
        // Load summaries
        loadSummaries();
      }
    };

    checkAdmin();
  }, []);

  const loadSummaries = async () => {
    try {
      const data = await fetchLectureSummaries();
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load summaries:', err);
    }
  };

  // Load all slide numbers for a lecture from the source table
  const loadAllSlideNumbers = async (lectureId: string): Promise<number[]> => {
    const { data, error } = await examSupabase
      .from('lecture_slides_course')
      .select('slide_number')
      .eq('lecture_id', lectureId)
      .order('slide_number', { ascending: true });

    if (error) {
      console.error('Failed to load slide numbers:', error);
      return [];
    }

    return (data || []).map(row => row.slide_number);
  };

  const loadLectureSlides = async (lectureId: string) => {
    setIsLoading(true);
    try {
      // Load both existing explanations and all slide numbers
      const [explanations, slideNumbers] = await Promise.all([
        fetchLectureDrafts(lectureId),
        loadAllSlideNumbers(lectureId),
      ]);
      
      setSlides(explanations);
      setAllSlideNumbers(slideNumbers);
      
      // Create placeholder for first slide if exists
      if (slideNumbers.length > 0) {
        const firstExplanation = explanations.find(e => e.slide_number === slideNumbers[0]);
        if (firstExplanation) {
          setSelectedSlide(firstExplanation);
          setSelectedSlideNumber(firstExplanation.slide_number);
        } else {
          // Create placeholder for missing slide
          setSelectedSlide(createPlaceholderSlide(lectureId, slideNumbers[0]));
          setSelectedSlideNumber(slideNumbers[0]);
        }
      } else {
        setSelectedSlide(null);
        setSelectedSlideNumber(null);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load slides',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a placeholder slide explanation for slides without content
  const createPlaceholderSlide = (lectureId: string, slideNumber: number): SlideExplanation => ({
    id: `placeholder-${lectureId}-${slideNumber}`,
    lecture_id: lectureId,
    slide_number: slideNumber,
    explanation: '',
    key_points: [],
    comprehension_question: null,
    status: 'draft',
    created_at: new Date().toISOString(),
  });

  const handleLectureChange = (lectureId: string) => {
    setSelectedLecture(lectureId);
    setSlides([]);
    setAllSlideNumbers([]);
    setSelectedSlide(null);
    setSelectedSlideNumber(null);
    if (lectureId) {
      loadLectureSlides(lectureId);
    }
  };

  // Handle selecting a slide number (may or may not have content)
  const handleSelectSlideNumber = (slideNumber: number) => {
    setSelectedSlideNumber(slideNumber);
    const existing = slides.find(s => s.slide_number === slideNumber);
    if (existing) {
      setSelectedSlide(existing);
    } else {
      setSelectedSlide(createPlaceholderSlide(selectedLecture, slideNumber));
    }
  };

  const handleSave = async (updates: Partial<SlideExplanation>) => {
    if (!selectedSlide) return;
    setIsSaving(true);
    try {
      await updateSlideExplanation(selectedSlide.id, updates);
      // Update local state
      const updatedSlide = { ...selectedSlide, ...updates };
      setSlides(slides.map(s => s.id === selectedSlide.id ? updatedSlide : s));
      setSelectedSlide(updatedSlide);
      toast({ title: 'Saved', description: 'Changes saved successfully' });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSlide) return;
    setIsSaving(true);
    try {
      await approveSlide(selectedSlide.id);
      const updatedSlide = { ...selectedSlide, status: 'approved' as const };
      setSlides(slides.map(s => s.id === selectedSlide.id ? updatedSlide : s));
      setSelectedSlide(updatedSlide);
      toast({ title: 'Approved', description: `Slide ${selectedSlide.slide_number} approved` });
      loadSummaries();
      
      // Auto-advance to next draft slide
      const nextDraft = slides.find(s => s.id !== selectedSlide.id && s.status === 'draft');
      if (nextDraft) {
        setSelectedSlide(nextDraft);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to approve slide',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSlide) return;
    setIsSaving(true);
    try {
      await rejectSlide(selectedSlide.id);
      const updatedSlide = { ...selectedSlide, status: 'rejected' as const };
      setSlides(slides.map(s => s.id === selectedSlide.id ? updatedSlide : s));
      setSelectedSlide(updatedSlide);
      toast({ title: 'Rejected', description: `Slide ${selectedSlide.slide_number} marked for regeneration` });
      loadSummaries();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to reject slide',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate a single slide
  const handleGenerateSingle = async () => {
    if (!selectedLecture || selectedSlideNumber === null) return;
    setIsGenerating(true);
    try {
      const generated = await generateSingleSlide(selectedLecture, selectedSlideNumber);
      
      // Add to slides array and select it
      setSlides(prev => {
        const filtered = prev.filter(s => s.slide_number !== generated.slide_number);
        return [...filtered, generated].sort((a, b) => a.slide_number - b.slide_number);
      });
      setSelectedSlide(generated);
      
      toast({
        title: 'Generated',
        description: `Slide ${selectedSlideNumber} content created`,
      });
      loadSummaries();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedSlide || !selectedLecture || selectedSlideNumber === null) return;
    setIsGenerating(true);
    try {
      const generated = await generateSingleSlide(selectedLecture, selectedSlideNumber);
      
      // Update the slide in the array
      setSlides(prev => prev.map(s => 
        s.slide_number === generated.slide_number ? generated : s
      ));
      setSelectedSlide(generated);
      
      toast({
        title: 'Regenerated',
        description: `Slide ${selectedSlideNumber} content updated`,
      });
      loadSummaries();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to regenerate',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateLecture = async () => {
    if (!selectedLecture) return;
    setIsGenerating(true);
    try {
      const result = await triggerBatchGeneration(selectedLecture, false);
      
      if (result.status === 'processing') {
        toast({
          title: 'Generation Started',
          description: `Processing ${result.to_generate} slides in background. Refresh in a moment to see progress.`,
        });
        
        // Auto-refresh after delays to show progress
        setTimeout(() => {
          loadLectureSlides(selectedLecture);
          loadSummaries();
        }, 8000);
        
        setTimeout(() => {
          loadLectureSlides(selectedLecture);
          loadSummaries();
        }, 20000);
      } else {
        // Already complete (all slides existed)
        toast({
          title: 'Already Complete',
          description: result.message,
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!selectedLecture) return;
    setIsSaving(true);
    try {
      const count = await approveAllSlides(selectedLecture);
      toast({
        title: 'Approved All',
        description: `Approved ${count} slides`,
      });
      await loadLectureSlides(selectedLecture);
      loadSummaries();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to approve all slides',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading && isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not authorized
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
        <Button onClick={() => navigate('/platform')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Platform
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/platform')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Review Slide Explanations</h1>
          </div>
          <div className="flex items-center gap-4">
            <LectureSelector
              value={selectedLecture}
              onChange={handleLectureChange}
              summaries={summaries}
            />
            {selectedLecture && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerateLecture}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Generate Missing
                </Button>
                <Button
                  variant="default"
                  onClick={handleApproveAll}
                  disabled={isSaving || slides.filter(s => s.status === 'draft').length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve All Drafts
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {selectedLecture ? (
          <>
            {/* Slide list sidebar */}
            <aside className="w-64 shrink-0">
              <SlideList
                slides={slides}
                allSlideNumbers={allSlideNumbers}
                selectedSlideNumber={selectedSlideNumber}
                onSelectSlideNumber={handleSelectSlideNumber}
              />
            </aside>

            {/* Editor panel */}
            <main className="flex-1 overflow-auto p-6">
              {selectedSlide ? (
                <SlideEditor
                  slide={selectedSlide}
                  onSave={handleSave}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRegenerate={handleRegenerate}
                  onGenerate={handleGenerateSingle}
                  isLoading={isSaving}
                  isGenerating={isGenerating}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>Select a slide from the list</p>
                </div>
              )}
            </main>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a lecture to begin reviewing</p>
          </div>
        )}
      </div>
    </div>
  );
}
