"use client";

import { Bell, CheckCircle2, Star, User, Flame, LogOut, Plus, X, Check, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import type React from 'react';

export default function Dash() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isParentMode, setIsParentMode] = useState(false)
  const [showParentPinModal, setShowParentPinModal] = useState(false)
  const [parentPin, setParentPin] = useState("")
  const [selectedKid, setSelectedKid] = useState<{ id: string; name: string; } | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [taskImages, setTaskImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  interface kid {
    id: string;
    name: string;
    family_id: string;
    created_at: string;
  }

  const [kids, setKids] = useState<kid[]>([])
  const [loading, setLoading] = useState(true)
  const [parentSession, setParentSession] = useState<{ id: string; expires_at: string } | null>(null)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<{ id: string; name: string; target: number; current: number } | null>(null)

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "chores",
    reward: "",
    deadline: "",
    time_estimate: "30 min",
    difficulty: "easy",
    assigned_to: "",
  });

  const [newGoal, setNewGoal] = useState({
    name: "",
    target: "",
    current: 0,
  });

  interface Task {
    id: string;
    title: string;
    description: string;
    category: string;
    reward: number;
    deadline?: string;
    time_estimate: string;
    difficulty: string;
    status: 'available' | 'in_progress' | 'completed' | 'approved' | 'rejected';
    assigned_to?: string | null;
    family_id: string;
    created_at: string;
    completed_at?: string;
    started_at?: string;
    work_time_ms?: number;
    urgent?: boolean;
    kids?: { name: string };
    completion_notes?: string;
  }

  const [tasks, setTasks] = useState<Task[]>([]);
  const [ongoingTasks, setOngoingTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);

  interface Goal {
    id: string;
    name: string;
    target: number;
    current: number;
    kid_id: string;
    created_at: string;
  }

  const [goals, setGoals] = useState<Goal[]>([]);

  type Notification = {
    id: string;
    message: string;
    read: boolean;
    time: string;
  };

  const [notifications ] = useState<Notification[]>([]);

  const [stats, setStats] = useState({
    totalEarned: 0,
    pendingEarnings: 0,
    weeklyStats: {
      tasksCompleted: 0,
      earned: 0,
      completionRate: 0,
      currentStreak: 0,
    },
  });

  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
    const interval = setInterval(checkParentSession, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Check for completed onboarding
      const { data: family } = await supabase.from('families').select('*').eq('parent_id', user.id).single();

      if (!family) {
        // No family  found.. redirect
        router.push('/onboarding');
        return;
      }

      await checkParentSession();

      if (!isParentMode) {
        await loadKidsAndSelectDefault(user.id, family.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/landing');
    } finally {
      setLoading(false);
    }
  };

  const checkParentSession = async () => {
    try {
      if (!user) return;

      const { data: session, error } = await supabase
        .from('parent_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (session && !error) {
        setIsParentMode(true);
        setParentSession(session);
        if (!kids.length) {
          await loadFamilyData(user.id);
        }
      } else {
        // Session expired or doesn't exist
        if (isParentMode) {
          setIsParentMode(false);
          setParentSession(null);
          await loadKidsAndSelectDefault(user.id);
        }
      }
    } catch (error) {
      console.error('Error checking parent session:', error);
      if (isParentMode) {
        setIsParentMode(false);
        setParentSession(null);
      }
    }
  };

  const loadKidsAndSelectDefault = async (userId: string, familyId: string | null = null) => {
    try {
      let family;
      if (familyId) {
        family = { id: familyId };
      } else {
        const { data: familyData } = await supabase.from('families').select('*').eq('parent_id', userId).single();
        family = familyData;
      }

      if (family) {
        const { data: familyKids } = await supabase
          .from('kids')
          .select('*')
          .eq('family_id', family.id)
          .order('created_at', { ascending: true });

        setKids(familyKids || []);

        const lastSelectedKid = localStorage.getItem('selectedKidId');
        const kidToSelect = familyKids?.find((k) => k.id === lastSelectedKid) || familyKids?.[0];

        if (kidToSelect) {
          setSelectedKid(kidToSelect);
          await loadKidDataWithFamily(kidToSelect.id, family.id);
        }
      }
    } catch (error) {
      console.error('Error loading kids:', error);
    }
  };

  const loadFamilyData = async (userId: string) => {
    try {
      const { data: family } = await supabase.from('families').select('*').eq('parent_id', userId).single();

      if (family) {
        const { data: familyKids } = await supabase.from('kids').select('*').eq('family_id', family.id);
        setKids(familyKids || []);
        await loadAllFamilyTasks(family.id);
      }
    } catch (error) {
      console.error('Error loading family data:', error);
    }
  };

  const loadKidDataWithFamily = async (kidId: string, familyId: string) => {
    try {
      localStorage.setItem('selectedKidId', kidId);

      // Load tasks assigned to this kid OR available to anyone in the family
      const { data: kidTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'available')
        .or(`assigned_to.eq.${kidId},assigned_to.is.null`);

      const { data: ongoingKidTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', kidId)
        .eq('status', 'in_progress');

      const { data: completedKidTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', kidId)
        .in('status', ['completed', 'approved', 'rejected'])
        .order('completed_at', { ascending: false })
        .limit(10);

      const { data: kidGoals } = await supabase.from('goals').select('*').eq('kid_id', kidId);

      setTasks(kidTasks || []);
      setOngoingTasks(ongoingKidTasks || []);
      setCompletedTasks(completedKidTasks || []);
      setGoals(kidGoals || []);

      calculateKidStats(kidTasks || [], completedKidTasks || []);
    } catch (error) {
      console.error('Error loading kid data:', error);
    }
  };

  const loadKidData = async (kidId: string) => {
    try {
      if (!user?.id) {
        console.log('User not available, skipping loadKidData');
        return;
      }

      // Get family id
      const { data: family } = await supabase.from('families').select('*').eq('parent_id', user.id).single();

      if (!family) return;

      await loadKidDataWithFamily(kidId, family.id);
    } catch (error) {
      console.error('Error loading kid data:', error);
    }
  };

  const loadAllFamilyTasks = async (familyId: string) => {
    try {
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          kids(name)
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      const tasks = allTasks || [];
      const availableTasks = tasks.filter((task) => task.status === 'available');
      const inProgressTasks = tasks.filter((task) => task.status === 'in_progress');
      const completed = tasks.filter((task) => ['completed', 'approved', 'rejected'].includes(task.status));

      setTasks(availableTasks);
      setOngoingTasks(inProgressTasks);
      setCompletedTasks(completed);

      calculateFamilyStats(tasks);
    } catch (error) {
      console.error('Error loading family tasks:', error);
    }
  };

  const loadTaskImages = async (taskId: string) => {
    try {
      const { data: taskImagesData, error: imagesError } = await supabase
        .from('tasks')
        .select('work_photos')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (!imagesError && taskImagesData && taskImagesData.length > 0) {
        setTaskImages(taskImagesData.map((img) => img.work_photos));
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('work_photos')
        .eq('id', taskId)
        .single();

      if (!taskError && taskData?.work_photos) {
        const images = Array.isArray(taskData.work_photos)
          ? taskData.work_photos
          : JSON.parse(taskData.work_photos || '[]');
        setTaskImages(images);
      } else {
        setTaskImages([]);
      }
    } catch (error) {
      console.error('Error loading task images:', error);
      setTaskImages([]);
    }
  };

  const handleReviewTask = async (task: Task) => {
    setReviewingTask(task);
    setSelectedImageIndex(0);
    await loadTaskImages(task.id);
    setShowReviewModal(true);
  };

  const handleApproveTask = async () => {
    if (!reviewingTask) return;

    try {
      const { error } = await supabase.from('tasks').update({ status: 'approved' }).eq('id', reviewingTask.id);

      if (error) throw error;

      setShowReviewModal(false);
      setReviewingTask(null);
      setTaskImages([]);

      // Reload tasks
      const { data: family } = await supabase.from('families').select('id').eq('parent_id', user?.id).single();
      if (family) await loadAllFamilyTasks(family.id);
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Failed to approve task');
    }
  };

  const handleRejectTask = async () => {
    if (!reviewingTask) return;

    try {
      const { error } = await supabase.from('tasks').update({ status: 'rejected' }).eq('id', reviewingTask.id);

      if (error) throw error;

      setShowReviewModal(false);
      setReviewingTask(null);
      setTaskImages([]);

      // Reload tasks
      const { data: family } = await supabase.from('families').select('id').eq('parent_id', user?.id).single();
      if (family) await loadAllFamilyTasks(family.id);
    } catch (error) {
      console.error('Error rejecting task:', error);
      alert('Failed to reject task');
    }
  };

  const calculateKidStats = (availableTasks: Task[], completedTasks: Task[]) => {
    const totalEarned =
      completedTasks?.filter((task) => task.status === 'approved')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const pendingEarnings =
      completedTasks?.filter((task) => task.status === 'completed')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeekCompleted =
      completedTasks?.filter((task) => task.completed_at && new Date(task.completed_at) >= thisWeekStart) || [];

    const thisWeekAssigned = [...(availableTasks || []), ...(completedTasks || [])].filter(
      (task) => task.created_at && new Date(task.created_at) >= thisWeekStart,
    );

    const completionRate =
      thisWeekAssigned.length > 0 ? Math.round((thisWeekCompleted.length / thisWeekAssigned.length) * 100) : 0;

    const currentStreak = calculateStreak(completedTasks);

    setStats({
      totalEarned,
      pendingEarnings,
      weeklyStats: {
        tasksCompleted: thisWeekCompleted.length,
        earned: totalEarned,
        completionRate,
        currentStreak,
      },
    });
  };

  const calculateFamilyStats = (allTasks: Task[]) => {
    const totalEarned =
      allTasks?.filter((task) => task.status === 'approved')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const pendingEarnings =
      allTasks?.filter((task) => task.status === 'completed')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeekCompleted =
      allTasks?.filter(
        (task) =>
          ['completed', 'approved'].includes(task.status) &&
          task.completed_at &&
          new Date(task.completed_at) >= thisWeekStart,
      ) || [];

    const thisWeekAssigned =
      allTasks?.filter((task) => task.created_at && new Date(task.created_at) >= thisWeekStart) || [];

    const completionRate =
      thisWeekAssigned.length > 0 ? Math.round((thisWeekCompleted.length / thisWeekAssigned.length) * 100) : 0;

    const currentStreak = calculateFamilyStreak(allTasks);

    setStats({
      totalEarned,
      pendingEarnings,
      weeklyStats: {
        tasksCompleted: thisWeekCompleted.length,
        earned: totalEarned,
        completionRate,
        currentStreak,
      },
    });
  };

  // Calculate individual streak
  const calculateStreak = (completedTasks: Task[]) => {
    if (!completedTasks || completedTasks.length === 0) return 0;

    // Group tasks by completion date
    const tasksByDate: { [key: string]: Task[] } = {};
    completedTasks.forEach((task) => {
      if (task.completed_at) {
        const date = new Date(task.completed_at).toDateString();
        if (!tasksByDate[date]) {
          tasksByDate[date] = [];
        }
        tasksByDate[date].push(task);
      }
    });

    // Calculate streak
    let streak = 0;
    const currentDate = new Date();

    while (true) {
      const dateString = currentDate.toDateString();
      if (tasksByDate[dateString] && tasksByDate[dateString].length > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        if (streak === 0) {
          currentDate.setDate(currentDate.getDate() - 1);
          const yesterdayString = currentDate.toDateString();
          if (tasksByDate[yesterdayString] && tasksByDate[yesterdayString].length > 0) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    return streak;
  };

  const calculateFamilyStreak = (allTasks: Task[]) => {
    if (!allTasks || allTasks.length === 0) return 0;

    // Group tasks by kid
    const tasksByKid: { [key: string]: Task[] } = {};
    allTasks.forEach((task) => {
      if (task.assigned_to && ['completed', 'approved'].includes(task.status)) {
        if (!tasksByKid[task.assigned_to]) {
          tasksByKid[task.assigned_to] = [];
        }
        tasksByKid[task.assigned_to].push(task);
      }
    });

    // Calculate streak for each kid and return highest
    let maxStreak = 0;
    Object.values(tasksByKid).forEach((kidTasks) => {
      const kidStreak = calculateStreak(kidTasks);
      if (kidStreak > maxStreak) {
        maxStreak = kidStreak;
      }
    });

    return maxStreak;
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { data: family } = await supabase.from('families').select('id').eq('parent_id', user?.id).single();
      if (!family) return;

      const taskData = {
        ...newTask,
        reward: Number.parseFloat(newTask.reward),
        family_id: family.id,
        status: 'available',
        created_at: new Date().toISOString(),
        assigned_to: newTask.assigned_to || null,
      };

      const { error } = await supabase.from('tasks').insert(taskData);
      if (error) throw error;

      // Reset form and close modal
      setNewTask({
        title: "",
        description: "",
        category: "chores",
        reward: "",
        deadline: "",
        time_estimate: "30 min",
        difficulty: "easy",
        assigned_to: "",
      });
      setShowCreateTaskModal(false);

      // Reload tasks
      await loadAllFamilyTasks(family.id);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!selectedKid?.id && !isParentMode) {
        alert('Please select a kid first');
        return;
      }

      const goalData = {
        name: newGoal.name,
        target: Number.parseFloat(newGoal.target),
        current: editingGoal ? editingGoal.current : 0,
        kid_id: selectedKid?.id,
        created_at: new Date().toISOString(),
      };

      let error;
      if (editingGoal) {
        // Update existing goal
        ;({ error } = await supabase.from('goals').update(goalData).eq('id', editingGoal.id));
      } else {
        // Create new goal
        ;({ error } = await supabase.from('goals').insert(goalData));
      }

      if (error) throw error;

      // Reset form and close modal
      setNewGoal({
        name: '',
        target: '',
        current: 0,
      });
      setShowCreateGoalModal(false);
      setEditingGoal(null);

      // Reload goals
      if (selectedKid) {
        await loadKidData(selectedKid.id);
      }
    } catch (error) {
      console.error('Error creating/updating goal:', error);
      alert('Failed to save goal');
    }
  };

  const handleEditGoal = (goal: { id: string; name: string; target: number; current: number }) => {
    setEditingGoal(goal);
    setNewGoal({
      name: goal.name,
      target: goal.target.toString(),
      current: goal.current,
    });
    setShowCreateGoalModal(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const { error } = await supabase.from('goals').delete().eq('id', goalId);

      if (error) throw error;

      // Reload goals
      if (selectedKid) {
        await loadKidData(selectedKid.id);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    }
  };

  const handleParentPinSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { data: family } = await supabase.from('families').select('parent_pin').eq('parent_id', user?.id).single();

      if (family && family.parent_pin === parentPin) {
        const sessionExpiry = new Date();
        sessionExpiry.setMinutes(sessionExpiry.getMinutes() + 30); // 30 min

        await supabase.from('parent_sessions').update({ is_active: false }).eq('user_id', user?.id);

        // Create new sesh
        const { data: newSession, error } = await supabase
          .from('parent_sessions')
          .insert({
            user_id: user?.id,
            expires_at: sessionExpiry.toISOString(),
            is_active: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        setIsParentMode(true);
        setParentSession(newSession);
        setShowParentPinModal(false);
        setParentPin('');

        if (user?.id) {
          await loadFamilyData(user.id);
        }
      } else {
        alert('Invalid parent PIN');
      }
    } catch (error) {
      console.error('Parent PIN verification failed:', error);
      alert('Invalid parent PIN');
    }
  };

  const switchToKidMode = async () => {
    try {
      // Invalidate parent session
      if (parentSession) {
        await supabase.from('parent_sessions').update({ is_active: false }).eq('id', parentSession.id);
      }

      setIsParentMode(false);
      setParentSession(null);

      if (selectedKid && user?.id) {
        await loadKidData(selectedKid.id);
      } else if (kids.length > 0 && user?.id) {
        setSelectedKid(kids[0]);
        await loadKidData(kids[0].id);
      }
    } catch (error) {
      console.error('Error switching to kid mode:', error);
    }
  };

  const handleKidSelection = async (kid: { id: string; name: string }) => {
    setSelectedKid(kid);
    await loadKidData(kid.id);
  };

  const handleStartTask = async (taskId: string) => {
    try {
      if (!selectedKid?.id) {
        alert('Please select a kid first');
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          assigned_to: selectedKid.id,
          started_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Redirect to task page after starting
      router.push(`/task/${taskId}`);
    } catch (error) {
      console.error('Error starting task:', error);
      alert('Failed to start task');
    }
  };

  const handleSignOut = async () => {
    try {
      // Invalidate parent session if it does exists
      if (parentSession) {
        await supabase.from('parent_sessions').update({ is_active: false }).eq('id', parentSession.id);
      }

      await supabase.auth.signOut();
      localStorage.removeItem('selectedKidId');
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add session timeout warning
  const getSessionTimeRemaining = () => {
    if (!parentSession) return 0;
    const now = new Date().getTime();
    const expires = new Date(parentSession.expires_at).getTime();
    return Math.max(0, expires - now);
  };

  const sessionTimeRemaining = getSessionTimeRemaining();
  const showSessionWarning = isParentMode && sessionTimeRemaining > 0 && sessionTimeRemaining < 5 * 60 * 1000; // 5 minutes

  const totalAvailableEarnings = tasks.reduce((sum, task) => sum + task.reward, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex items-center gap-8">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-8 py-16">
          <div className="text-center mb-24">
            <div className="h-16 w-32 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 w-40 bg-gray-200 rounded mx-auto mb-6 animate-pulse"></div>
            <div className="flex items-center justify-center gap-8">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid lg:grid-cols-4 gap-16">
            <div className="lg:col-span-3">
              <div className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-6 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="h-5 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="flex items-center gap-4">
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="h-5 w-12 bg-gray-200 rounded mb-1 animate-pulse"></div>
                          <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-8 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="h-6 w-40 bg-gray-200 rounded mb-8 animate-pulse"></div>
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded mb-1 animate-pulse"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="mb-12">
                <div className="h-5 w-16 bg-gray-200 rounded mb-6 animate-pulse"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-5 w-12 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-6">
                  {[1, 2].map((i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className="bg-gray-200 h-1 rounded-full w-1/3 animate-pulse"></div>
                      </div>
                      <div className="flex justify-between mt-1">
                        <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {showSessionWarning && (
        <div className="border-b border-orange-100 px-8 py-4">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm text-orange-600">
              Session expires in {Math.ceil(sessionTimeRemaining / 60000)} minutes.
              <button onClick={() => setShowParentPinModal(true)} className="ml-2 underline underline-offset-2">
                Extend
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-lg font-medium text-gray-900">Nerlo</h1>
            </Link>

            <div className="flex items-center gap-8">
              {!isParentMode && kids.length > 1 && (
                <select
                  value={selectedKid?.id || ""}
                  onChange={(e) => {
                    const kid = kids.find((k) => k.id === e.target.value);
                    if (kid) handleKidSelection(kid);
                  }}
                  className="text-sm border-0 bg-transparent focus:outline-none text-gray-600"
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name}
                    </option>
                  ))}
                </select>
              )}
              {isParentMode ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Parent Mode</span>
                  <button onClick={switchToKidMode} className="text-xs text-gray-400 hover:text-gray-600">
                    Exit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowParentPinModal(true)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Parent Access
                </button>
              )}
              <div className="text-sm text-gray-500">${stats.pendingEarnings.toFixed(2)} pending</div>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-50 rounded-full transition-colors relative"
                >
                  <Bell className="w-4 h-4 text-gray-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">No notifications</div>
                      ) : (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-4 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="text-sm text-gray-900 mb-1">{notification.message}</div>
                            <div className="text-xs text-gray-500">{notification.time}</div>
                          </div>
                        )))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  <User className="text-white w-4 h-4" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                    <div className="p-2">
                      {isParentMode && (
                        <Link
                          href="/settings"
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span>Settings</span>
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-center mb-24">
          <div className="text-5xl font-light text-gray-900 mb-4">${stats.totalEarned.toFixed(2)}</div>
          <div className="text-gray-500 mb-6">
            {isParentMode ? "Family earnings" : `${selectedKid?.name || "Your"} total earned`}
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{stats.weeklyStats.currentStreak} day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{stats.weeklyStats.completionRate}% completion</span>
            </div>
            <div className="text-gray-400">${totalAvailableEarnings.toFixed(2)} available</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-16">
          <div className="lg:col-span-3">
            {!isParentMode && ongoingTasks.length > 0 && (
              <div className="mb-16">
                <h2 className="text-lg font-light text-gray-900 mb-8">Continue working</h2>

                <div className="space-y-6">
                  {ongoingTasks.map((task) => (
                    <div key={task.id} className="group">
                      <div className="flex items-center justify-between py-6 border-b border-gray-100">
                        <div className="flex-1">
                          <h3 className="text-gray-900 mb-2">{task.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>{task.time_estimate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-gray-900">${task.reward.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">reward</div>
                          </div>
                          <Link href={`/task/${task.id}`}>
                            <button className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
                              Continue
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-light text-gray-900">
                  {isParentMode ? "Available tasks" : "Available tasks"}
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{tasks.length}</span>
                  {isParentMode && (
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="group">
                    <div className="flex items-center justify-between py-6 border-b border-gray-100 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                      <div className="flex-1">
                        <h3 className="text-gray-900 mb-2">{task.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
                          <span>•</span>
                          <span>{task.time_estimate}</span>
                          <span>•</span>
                          <span>{task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}</span>
                          {task.urgent && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600">Urgent</span>
                            </>
                          )}
                          {isParentMode && task.assigned_to && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">Assigned to {task.kids?.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-gray-900">${task.reward.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">reward</div>
                        </div>
                        {!isParentMode && (
                          <button
                            onClick={() => handleStartTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isParentMode && ongoingTasks.length > 0 && (
              <div className="mb-16">
                <h2 className="text-lg font-light text-gray-900 mb-8">In progress</h2>

                <div className="space-y-1">
                  {ongoingTasks.map((task) => (
                    <div key={task.id} className="group">
                      <div className="flex items-center justify-between py-6 border-b border-gray-100 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                        <div className="flex-1">
                          <h3 className="text-gray-900 mb-2">{task.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>{task.time_estimate}</span>
                            <span>•</span>
                            <span className="text-blue-600">{task.kids?.name}</span>
                            {task.started_at && (
                              <>
                                <span>•</span>
                                <span>Started {new Date(task.started_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-gray-900">${task.reward.toFixed(2)}</div>
                            <div className="text-xs text-blue-600">In progress</div>
                          </div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-light text-gray-900">Recent completions</h2>
                {isParentMode && <span className="text-sm text-gray-500">{completedTasks.length} completed</span>}
              </div>

              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <div key={task.id} className="group">
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2
                            className={`w-3 h-3 ${
                              task.status === "approved"
                                ? "text-green-600"
                                : task.status === "rejected"
                                  ? "text-red-600"
                                  : "text-orange-500"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="text-gray-900 text-sm">{task.title}</div>
                          <div className="text-xs text-gray-500">
                            {isParentMode && task.kids?.name && <span>{task.kids.name} • </span>}
                            {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : task.completed_at}
                            {task.work_time_ms && <span> • {Math.round(task.work_time_ms / 60000)}min worked</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-900">${task.reward.toFixed(2)}</div>
                        <div
                          className={`text-xs ${
                            task.status === "approved"
                              ? "text-green-600"
                              : task.status === "rejected"
                                ? "text-red-600"
                                : "text-orange-500"
                          }`}
                        >
                          {task.status === "approved" ? "Paid" : task.status === "rejected" ? "Rejected" : "Pending"}
                        </div>
                        {isParentMode && task.status === "completed" && (
                          <button
                            onClick={() => handleReviewTask(task)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 transition-all"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-12">
              <h3 className="text-sm font-medium text-gray-900 mb-6">This week</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tasks completed</span>
                  <span className="text-sm text-gray-900">{stats.weeklyStats.tasksCompleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Earned</span>
                  <span className="text-sm text-gray-900">${stats.weeklyStats.earned.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Completion rate</span>
                  <span className="text-sm text-gray-900">{stats.weeklyStats.completionRate}%</span>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-gray-900">Goals</h3>
                {!isParentMode && (
                  <button
                    onClick={() => setShowCreateGoalModal(true)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    New
                  </button>
                )}
              </div>
              <div className="space-y-6">
                {goals.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-sm text-gray-400 mb-2">No goals yet</div>
                    {!isParentMode && (
                      <button
                        onClick={() => setShowCreateGoalModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Create your first goal
                      </button>
                    )}
                  </div>
                ) : (
                  goals.map((goal, index) => {
                    const progress = (goal.current / goal.target) * 100;
                    return (
                      <div key={index} className="group relative">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-900">{goal.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
                            {!isParentMode && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                <button
                                  onClick={() => handleEditGoal(goal)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="text-xs text-red-400 hover:text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className="bg-gray-900 h-1 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>${goal.current.toFixed(2)}</span>
                          <span>${goal.target.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                {isParentMode
                  ? "Create clear, achievable tasks to motivate your kids."
                  : "Complete tasks consistently to build momentum and unlock bonuses."}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReviewModal && reviewingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900">Review Task</h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewingTask(null);
                  setTaskImages([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="text-black flex flex-col lg:flex-row max-h-[calc(90vh-140px)]">
              <div className="lg:w-1/3 p-6 border-r border-gray-100 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{reviewingTask.title}</h4>
                    <p className="text-sm text-gray-600">{reviewingTask.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <div className="font-medium">{reviewingTask.category}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Reward:</span>
                      <div className="font-medium">${reviewingTask.reward.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Time estimate:</span>
                      <div className="font-medium">{reviewingTask.time_estimate}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Difficulty:</span>
                      <div className="font-medium">{reviewingTask.difficulty}</div>
                    </div>
                  </div>

                  {reviewingTask.completed_at && (
                    <div>
                      <span className="text-gray-500 text-sm">Completed:</span>
                      <div className="font-medium text-sm">{new Date(reviewingTask.completed_at).toLocaleString()}</div>
                    </div>
                  )}

                  {reviewingTask.work_time_ms && (
                    <div>
                      <span className="text-gray-500 text-sm">Time worked:</span>
                      <div className="font-medium text-sm">
                        {Math.round(reviewingTask.work_time_ms / 60000)} minutes
                      </div>
                    </div>
                  )}

                  {reviewingTask.completion_notes && (
                    <div>
                      <span className="text-gray-500 text-sm">Notes:</span>
                      <div className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">{reviewingTask.completion_notes}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:w-2/3 flex flex-col">
                {taskImages.length > 0 ? (
                  <>
                    <div className="flex-1 bg-gray-50 flex items-center justify-center p-6">
                      <img
                        src={taskImages[selectedImageIndex] || "/placeholder.svg"}
                        alt={`Task completion ${selectedImageIndex + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        crossOrigin="anonymous"
                      />
                    </div>

                    {taskImages.length > 1 && (
                      <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2 overflow-x-auto">
                          {taskImages.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                                selectedImageIndex === index
                                  ? "border-blue-500"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <img
                                src={image || "/placeholder.svg"}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            </button>
                          ))}
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-2">
                          {selectedImageIndex + 1} of {taskImages.length}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-50 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-gray-400 mb-2">No images submitted</div>
                      <div className="text-sm text-gray-500">This task was completed without photo evidence</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleRejectTask}
                  className="flex items-center gap-2 px-6 py-2 text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={handleApproveTask}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve & Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none"
                  required
                />
                <div className="h-px bg-gray-200 mt-2"></div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
                  rows={3}
                />
                <div className="h-px bg-gray-200 mt-2"></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full p-0 border-0 text-gray-900 bg-transparent focus:outline-none"
                  >
                    <option value="chores">Chores</option>
                    <option value="homework">Homework</option>
                    <option value="exercise">Exercise</option>
                    <option value="creative">Creative</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="h-px bg-gray-200 mt-2"></div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Reward ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTask.reward}
                    onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                    className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none"
                    required
                  />
                  <div className="h-px bg-gray-200 mt-2"></div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Assign to</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="w-full p-0 border-0 text-gray-900 bg-transparent focus:outline-none"
                >
                  <option value="">Anyone can claim</option>
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name}
                    </option>
                  ))}
                </select>
                <div className="h-px bg-gray-200 mt-2"></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 px-6 py-3 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium text-gray-900 mb-6">{editingGoal ? "Edit Goal" : "Create New Goal"}</h3>
            <form onSubmit={handleCreateGoal} className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Goal Name</label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none"
                  placeholder="e.g., New bike, Vacation fund"
                  required
                />
                <div className="h-px bg-gray-200 mt-2"></div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Target Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none"
                  placeholder="50.00"
                  required
                />
                <div className="h-px bg-gray-200 mt-2"></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGoalModal(false);
                    setEditingGoal(null);
                    setNewGoal({
                      name: "",
                      target: "",
                      current: 0,
                    });
                  }}
                  className="flex-1 px-6 py-3 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  {editingGoal ? "Update Goal" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParentPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isParentMode ? "Extend Session" : "Parent Access"}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {isParentMode ? "Enter your PIN to extend the session" : "Enter the parent PIN to access management"}
            </p>
            <form onSubmit={handleParentPinSubmit}>
              <input
                type="password"
                value={parentPin}
                onChange={(e) => setParentPin(e.target.value)}
                className="w-full p-0 border-0 text-gray-900 placeholder-gray-400 focus:outline-none text-center text-lg mb-2"
                placeholder="Enter PIN"
                maxLength={6}
                autoFocus
              />
              <div className="h-px bg-gray-200 mb-6"></div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowParentPinModal(false);
                    setParentPin("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  {isParentMode ? "Extend" : "Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
