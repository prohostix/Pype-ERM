import { useState, useEffect } from 'react';
import { ArrowLeft, Star, FileText, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function FacultyClassReviews({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const [reviewsData, setReviewsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  useEffect(() => {
    if (academicClass) fetchReviews();
  }, [academicClass]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/reviews`);
      setReviewsData(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedBatch) {
      setSelectedBatch(null);
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            {selectedBatch ? `Reviews for ${selectedBatch.batchName}` : `Student Reviews for ${academicClass?.name}`}
          </h2>
          <p className="text-muted-foreground text-sm">
            {selectedBatch ? "View student ratings and reviews for completed lessons in this batch." : "Select a batch to view student ratings and reviews."}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading reviews...</div>
        ) : reviewsData.length > 0 ? (
          selectedBatch ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              {selectedBatch.sessions.map((sessionData: any, i: number) => (
                <Card key={i} className="border-border/50 shadow-sm">
                  <CardHeader className="bg-muted/20 border-b pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          {sessionData.lessonTitle}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Instructor: <span className="font-medium text-foreground">{sessionData.teacherName}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {new Date(sessionData.date).toLocaleDateString()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {sessionData.reviews.map((review: any, j: number) => (
                        <div key={j} className="p-4 flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                            {review.studentName.charAt(0)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-sm">{review.studentName}</h4>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={cn("w-3.5 h-3.5", star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} 
                                />
                              ))}
                            </div>
                            {review.review && (
                              <p className="text-sm text-foreground mt-2 bg-muted/30 p-2 rounded-md border border-border/50">
                                {review.review}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
              {reviewsData.map((batchGroup, idx) => {
                const totalReviews = batchGroup.sessions.reduce((sum: number, s: any) => sum + s.reviews.length, 0);
                
                return (
                  <Card 
                    key={idx} 
                    className="cursor-pointer hover:shadow-md transition-shadow group border-primary/20 hover:border-primary/50"
                    onClick={() => setSelectedBatch(batchGroup)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6" />
                        </div>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {totalReviews} Reviews
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {batchGroup.batchName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {batchGroup.sessions.length} sessions with feedback
                      </p>
                      
                      <Button variant="ghost" className="w-full mt-4 justify-between group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        View Feedbacks <ArrowLeft className="w-4 h-4 rotate-180" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <div className="p-12 text-center border rounded-lg bg-background shadow-sm">
            <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium text-lg">No reviews found</p>
            <p className="text-muted-foreground/80 text-sm mt-1">Students have not submitted any reviews for lessons in this class yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
