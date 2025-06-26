"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Play, Pause, Check } from 'lucide-react';
import Link from 'next/link';

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
  }

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionStart, setCurrentSessionStart] = useState<number | null>(null);

  const router = useRouter();
  const params = useParams();
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUserAndLoadTask();
  }, []);

  useEffect(() => {
    const interval: NodeJS.Timeout | null = null;
    if (startTime && !isPaused) {
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [startTime, isPaused, currentSessionStart, task?.work_time_ms]);

  // Periodic save every 30 seconds and on page unload
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

    // Auto-save every 30 seconds
    if (currentSessionStart && !isPaused) {
      saveInterval = setInterval(saveWorkTime, 30000);
    }

    // Save on page unload/refresh
    const handleBeforeUnload = () => {
      if (currentSessionStart && !isPaused && task?.id) {
        const sessionTime = Date.now() - currentSessionStart;
        const totalWorkTime = (task.work_time_ms || 0) + sessionTime;
        
        // Use sendBeacon for reliable saving on page unload
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
      
      if (taskData.started_at) {
        const dbStartTime = new Date(taskData.started_at).getTime();
        setStartTime(dbStartTime);
        
        // Only start session if not already completed
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

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        // Resume - start new session
        setIsPaused(false);
        setCurrentSessionStart(Date.now());
      } else {
        // Pause - calculate final work time and save to database
        let finalWorkTime = task?.work_time_ms || 0;
        if (currentSessionStart) {
          finalWorkTime += Date.now() - currentSessionStart;
        }
        
        const { error } = await supabase
          .from('tasks')
          .update({ work_time_ms: finalWorkTime })
          .eq('id', task?.id);

        if (error) throw error;

        // Update local state
        setTask(prev => prev ? { ...prev, work_time_ms: finalWorkTime } : null);
        setIsPaused(true);
        setCurrentSessionStart(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCompleteTask = async () => {
    try {
      // Calculate final work time
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
        })
        .eq('id', task?.id);

      if (error) throw error;

      router.push('app/?completed=true');
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
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
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