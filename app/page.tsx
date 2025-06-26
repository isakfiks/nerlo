"use client";
import { Bell, CheckCircle2, Clock, DollarSign, Star, User, Flame, LogOut, Settings, Plus, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function Dash() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [user, setUser] = useState(null)
  const [isParentMode, setIsParentMode] = useState(false)
  const [showParentPinModal, setShowParentPinModal] = useState(false)
  const [parentPin, setParentPin] = useState("")
  const [selectedKid, setSelectedKid] = useState(null)
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [parentSession, setParentSession] = useState(null)

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
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

  const [tasks, setTasks] = useState([]);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
      router.push('/login');
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

  const loadKidsAndSelectDefault = async (userId, familyId = null) => {
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

  const loadFamilyData = async (userId) => {
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

  const loadKidDataWithFamily = async (kidId, familyId) => {
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
        .in('status', ['completed', 'approved'])
        .order('completed_at', { ascending: false })
        .limit(10);

      const { data: kidGoals } = await supabase.from('goals').select('*').eq('kid_id', kidId);

      setTasks(kidTasks || []);
      setOngoingTasks(ongoingKidTasks || []);
      setCompletedTasks(completedKidTasks || []);
      setGoals(kidGoals || []);

      calculateKidStats(kidTasks, completedKidTasks);
    } catch (error) {
      console.error('Error loading kid data:', error);
    }
  };

  const loadKidData = async (kidId) => {
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

  const loadAllFamilyTasks = async (familyId) => {
    try {
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          kids(name)
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      const availableTasks = allTasks?.filter((task) => task.status === 'available') || [];
      const inProgressTasks = allTasks?.filter((task) => task.status === 'in_progress') || [];
      const completed = allTasks?.filter((task) => ['completed', 'approved'].includes(task.status)) || [];

      setTasks(availableTasks);
      setOngoingTasks(inProgressTasks);
      setCompletedTasks(completed);

      calculateFamilyStats(allTasks);
    } catch (error) {
      console.error('Error loading family tasks:', error);
    }
  };

  const calculateKidStats = (availableTasks, completedTasks) => {
    const totalEarned =
      completedTasks?.filter((task) => task.status === 'approved')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const pendingEarnings =
      completedTasks?.filter((task) => task.status === 'completed')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    setStats({
      totalEarned,
      pendingEarnings,
      weeklyStats: {
        tasksCompleted: completedTasks?.length || 0,
        earned: totalEarned,
        completionRate: 85, // Calc based on assigned vs completed
        currentStreak: 5, // Calc based on consecutive days
      },
    });
  };

  const calculateFamilyStats = (allTasks) => {
    const totalEarned =
      allTasks?.filter((task) => task.status === 'approved')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    const pendingEarnings =
      allTasks?.filter((task) => task.status === 'completed')?.reduce((sum, task) => sum + task.reward, 0) || 0;

    setStats({
      totalEarned,
      pendingEarnings,
      weeklyStats: {
        tasksCompleted: allTasks?.filter((task) => task.status === 'completed').length || 0,
        earned: totalEarned,
        completionRate: 85,
        currentStreak: 5,
      },
    });
  };

  // New function to handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const { data: family } = await supabase.from('families').select('id').eq('parent_id', user.id).single();

      if (!family) return;

      const taskData = {
        ...newTask,
        reward: Number.parseFloat(newTask.reward),
        family_id: family.id,
        status: 'available',
        created_at: new Date().toISOString(),
        assigned_to: newTask.assigned_to || null, // Convert empty string to null
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

  const handleParentPinSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data: family } = await supabase.from('families').select('parent_pin').eq('parent_id', user.id).single();

      if (family && family.parent_pin === parentPin) {
        const sessionExpiry = new Date();
        sessionExpiry.setMinutes(sessionExpiry.getMinutes() + 30); // 30 min

        await supabase.from('parent_sessions').update({ is_active: false }).eq('user_id', user.id);

        // Create new sesh
        const { data: newSession, error } = await supabase
          .from('parent_sessions')
          .insert({
            user_id: user.id,
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
        setParentPin("");
        await loadFamilyData(user.id);
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

  const handleKidSelection = async (kid) => {
    setSelectedKid(kid);
    await loadKidData(kid.id);
  };

  const handleStartTask = async (taskId) => {
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
          started_at: new Date().toISOString()
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

  const handleCompleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Reload kid data to update task lists
      if (selectedKid) {
        await loadKidData(selectedKid.id);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task');
    }
  };

  const handleSignOut = async () => {
    try {
      // Invalidate parent session if exists
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-1 h-1 bg-gray-900 rounded-full animate-pulse"></div>
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

              <div className="text-sm text-gray-500">
                ${stats.pendingEarnings.toFixed(2)} pending
              </div>

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
                        <div className="p-6 text-center text-gray-400 text-sm">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className="p-4 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="text-sm text-gray-900 mb-1">{notification.message}</div>
                            <div className="text-xs text-gray-500">{notification.time}</div>
                          </div>
                        ))
                      )}
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
          <div className="text-5xl font-light text-gray-900 mb-4">
            ${stats.totalEarned.toFixed(2)}
          </div>
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
            <div className="text-gray-400">
              ${totalAvailableEarnings.toFixed(2)} available
            </div>
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
                          <span>{task.category}</span>
                          <span>•</span>
                          <span>{task.time_estimate}</span>
                          <span>•</span>
                          <span>{task.difficulty}</span>
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
                {isParentMode && (
                  <span className="text-sm text-gray-500">{completedTasks.length} completed</span>
                )}
              </div>
              
              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <div key={task.id} className="group">
                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className={`w-3 h-3 ${task.status === "approved" ? "text-green-600" : "text-orange-500"}`} />
                        </div>
                        <div>
                          <div className="text-gray-900 text-sm">{task.title}</div>
                          <div className="text-xs text-gray-500">
                            {isParentMode && task.kids?.name && (
                              <span>{task.kids.name} • </span>
                            )}
                            {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : task.completedAt}
                            {task.work_time_ms && (
                              <span> • {Math.round(task.work_time_ms / 60000)}min worked</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-900">${task.reward.toFixed(2)}</div>
                        <div className={`text-xs ${task.status === "approved" ? "text-green-600" : "text-orange-500"}`}>
                          {task.status === "approved" ? "Paid" : "Pending"}
                        </div>
                        {isParentMode && task.status === "completed" && (
                          <button
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('tasks')
                                  .update({ status: 'approved' })
                                  .eq('id', task.id);

                                if (error) throw error;

                                // Reload tasks
                                const { data: family } = await supabase.from('families').select('id').eq('parent_id', user.id).single();
                                if (family) await loadAllFamilyTasks(family.id);
                              } catch (error) {
                                console.error('Error approving task:', error);
                                alert('Failed to approve task');
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-green-600 text-white rounded-full text-xs hover:bg-green-700 transition-all"
                          >
                            Approve
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
                <button className="text-xs text-gray-500 hover:text-gray-700">New</button>
              </div>

              <div className="space-y-6">
                {goals.map((goal, index) => {
                  const progress = (goal.current / goal.target) * 100;
                  return (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-900">{goal.name}</span>
                        <span className="text-xs text-gray-500">{progress.toFixed(0)}%</span>
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
                })}
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
                <button type="submit" className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
                  Create Task
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
              {isParentMode
                ? "Enter your PIN to extend the session"
                : "Enter the parent PIN to access management"}
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
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors">
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