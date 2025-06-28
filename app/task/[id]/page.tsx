"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Play, Pause, Check, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { put } from '@vercel/blob';

export default function TaskPage() {
  interface Task {
    id: string;
    title: string;
    description?: string;
    reward: number;
    work_time_ms: number;
    status: string;
    started_at?: string;
    notes?: string;
    work_photos?: string[];
  }

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [timerTick, setTimerTick] = useState(0); 
  
  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUserAndLoadTask();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (startTime && !isPaused) {
      interval = setInterval(() => {
        setTimerTick(t => t + 1); // Rerender
        console.log(timerTick);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isPaused, currentSessionStart, task?.work_time_ms]);

  useEffect(() => {
    let saveInterval: NodeJS.Timeout | undefined;
    
    const saveWorkTime = async () => {
      if (currentSessionStart && !isPaused && task?.id) {
        const sessionTime = Date.now() - currentSessionStart;
        const totalWorkTime = (task.work_time_ms || 0) + sessionTime;
        
        try {
          await supabase
            .from('tasks')
            .update({ work_time_ms: totalWorkTime })
            .eq('id', task.id);
        } catch (error) {
          console.error('Error auto-saving work time:', error);
        }
      }
    };

    if (currentSessionStart && !isPaused) {
      saveInterval = setInterval(saveWorkTime, 30000);
    }

    const handleBeforeUnload = () => {
      if (currentSessionStart && !isPaused && task?.id) {
        const sessionTime = Date.now() - currentSessionStart;
        const totalWorkTime = (task.work_time_ms || 0) + sessionTime;
        
        navigator.sendBeacon('/api/save-work-time', JSON.stringify({
          taskId: task.id,
          workTime: totalWorkTime
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (saveInterval) clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentSessionStart, isPaused, task?.id, task?.work_time_ms]);

  const checkUserAndLoadTask = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      await loadTask();
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    }
  };

  const loadTask = async () => {
    try {
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;

      setTask(taskData);
      setUploadedImages(taskData.work_photos || []);
      
      if (taskData.started_at) {
        const dbStartTime = new Date(taskData.started_at).getTime();
        setStartTime(dbStartTime);
        
        if (taskData.status === 'in_progress') {
          setCurrentSessionStart(Date.now());
        }
      }
      
      setNotes(taskData.notes || '');
    } catch (error) {
      console.error('Error loading task:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 3) {
      alert('You can only upload a maximum of 3 photos');
      return;
    }

    setUploading(true);

    try {
      const newImageUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith('image/')) {
          alert('Please only upload image files');
          continue;
        }

        const blob = await put(`task-${task?.id}-${Date.now()}-${i}.${file.name.split('.').pop()}`, file, {
          access: 'public',
          token: 'vercel_blob_rw_YzIbsaKqZxvoC4gt_LkzYa0YQuvA3P6s5tYTOPkiadyomJM',
        });

        newImageUrls.push(blob.url);
      }

      const updatedImages = [...uploadedImages, ...newImageUrls];
      setUploadedImages(updatedImages);

      await supabase.from('tasks').update({ work_photos: updatedImages }).eq('id', task?.id);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (indexToRemove: number) => {
    const updatedImages = uploadedImages.filter((_, index) => index !== indexToRemove);
    setUploadedImages(updatedImages);

    try {
      await supabase.from('tasks').update({ work_photos: updatedImages }).eq('id', task?.id);
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        setIsPaused(false);
        setCurrentSessionStart(Date.now());
      } else {
        let finalWorkTime = task?.work_time_ms || 0;
        if (currentSessionStart) {
          finalWorkTime += Date.now() - currentSessionStart;
        }
        
        const { error } = await supabase
          .from('tasks')
          .update({ work_time_ms: finalWorkTime })
          .eq('id', task?.id);

        if (error) throw error;

        setTask(prev => prev ? { ...prev, work_time_ms: finalWorkTime } : null);
        setIsPaused(true);
        setCurrentSessionStart(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCompleteTask = async () => {
    if (uploadedImages.length === 0) {
      alert('Please upload at least one photo of your work before completing the task');
      return;
    }

    try {
      let finalWorkTime = task?.work_time_ms || 0;
      if (currentSessionStart && !isPaused) {
        finalWorkTime += Date.now() - currentSessionStart;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          work_time_ms: finalWorkTime,
          notes: notes,
          work_photos: uploadedImages,
        })
        .eq('id', task?.id);

      if (error) throw error;

      router.push('/app/?completed=true');
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentWorkTime = () => {
    let currentWorkTime = task?.work_time_ms || 0;
    
    if (currentSessionStart && !isPaused) {
      currentWorkTime += Date.now() - currentSessionStart;
    }
    
    return currentWorkTime;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-1 h-1 bg-gray-900 rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-8">Task not found</div>
          <Link href="/" className="text-gray-900 underline underline-offset-4">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-8 py-6">
          <Link href="/" className="inline-flex items-center gap-3 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-16">
        
        <div className="mb-16 text-center">
          <h1 className="text-3xl font-light text-gray-900 mb-6 tracking-tight">
            {task.title}
          </h1>
          
          {task.description && (
            <p className="text-gray-600 text-lg leading-relaxed max-w-lg mx-auto">
              {task.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-12 mb-16">
          <div className="text-center">
            <div className="text-3xl font-light text-gray-900 mb-2">
              ${task.reward.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              Reward
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-light text-gray-900 mb-2">
              {startTime ? formatTime(getCurrentWorkTime()) : '0:00'}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              Time worked
            </div>
          </div>
        </div>

        <div className="mb-16">
          <label className="block text-sm text-gray-500 uppercase tracking-wide mb-4">
            Work Photos (Required - Max 3)
          </label>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl || "/placeholder.svg"}
                  alt={`Work photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {uploadedImages.length < 3 && (
              <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Photo</span>
                  </>
                )}
              </label>
            )}
          </div>

          {uploadedImages.length === 0 && (
            <p className="text-sm text-red-500">Please upload at least one photo of your work</p>
          )}

          <p className="text-xs text-gray-400 mt-2">{uploadedImages.length}/3 photos uploaded</p>
        </div>

        <div className="flex justify-center gap-4 mb-16">
          {startTime && (
            <button
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-full hover:border-gray-300 transition-colors text-gray-700"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCompleteTask}
            disabled={uploadedImages.length === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-full transition-colors ${
              uploadedImages.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Complete</span>
          </button>
        </div>

        <div className="mb-16">
          <label className="block text-sm text-gray-500 uppercase tracking-wide mb-4">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go? What did you learn?"
            className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 resize-none focus:outline-none text-lg leading-relaxed"
            rows={4}
          />
          <div className="h-px bg-gray-200 mt-4"></div>
        </div>

        {isPaused && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              Paused
            </div>
          </div>
        )}

        {startTime && !isPaused && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Working
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
