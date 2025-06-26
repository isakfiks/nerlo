"use client";
import { Bell, CheckCircle2, Clock, DollarSign, Star, MoreHorizontal, User, Flame, LogOut, Settings, Plus, Edit3 } from 'lucide-react';
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
        await loadKidsAndSelectDefault(user.id);
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

  const loadKidsAndSelectDefault = async (userId) => {
    try {
      const { data: family } = await supabase.from('families').select('*').eq('parent_id', userId).single();

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
          await loadKidData(kidToSelect.id);
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

  const loadKidData = async (kidId) => {
    try {
      localStorage.setItem('selectedKidId', kidId);

      const { data: kidTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', kidId)
        .eq('status', 'available');

      const { data: completedKidTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', kidId)
        .in('status', ['completed', 'approved'])
        .order('completed_at', { ascending: false })
        .limit(10);

      const { data: kidGoals } = await supabase.from('goals').select('*').eq('kid_id', kidId);

      setTasks(kidTasks || []);
      setCompletedTasks(completedKidTasks || []);
      setGoals(kidGoals || []);

      calculateKidStats(kidTasks, completedKidTasks);
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
        .eq('family_id', familyId);

      const availableTasks = allTasks?.filter((task) => task.status === 'available') || [];
      const completed = allTasks?.filter((task) => ['completed', 'approved'].includes(task.status)) || [];

      setTasks(availableTasks);
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

      if (selectedKid) {
        loadKidData(selectedKid.id);
      } else if (kids.length > 0) {
        setSelectedKid(kids[0]);
        loadKidData(kids[0].id);
      }
    } catch (error) {
      console.error('Error switching to kid mode:', error);
    }
  };

  const handleKidSelection = async (kid) => {
    setSelectedKid(kid);
    await loadKidData(kid.id);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-medium text-gray-900 mb-2">Nerlo</div>
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showSessionWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm text-yellow-800">
              Parent session expires in {Math.ceil(sessionTimeRemaining / 60000)} minutes.
              <button onClick={() => setShowParentPinModal(true)} className="ml-2 underline hover:no-underline">
                Extend session
              </button>
            </p>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-xl font-medium text-gray-900">Nerlo</h1>
            </Link>
            <div className="flex items-center gap-4">
              {!isParentMode && kids.length > 1 && (
                <select
                  value={selectedKid?.id || ""}
                  onChange={(e) => {
                    const kid = kids.find((k) => k.id === e.target.value);
                    if (kid) handleKidSelection(kid);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name}
                    </option>
                  ))}
                </select>
              )}

              {isParentMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Parent Mode
                    {sessionTimeRemaining > 0 && (
                      <span className="text-xs opacity-75">({Math.ceil(sessionTimeRemaining / 60000)}m)</span>
                    )}
                  </span>
                  <button onClick={switchToKidMode} className="text-xs text-gray-500 hover:text-gray-700">
                    Exit Parent Mode
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {selectedKid && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{selectedKid.name}</span>
                  )}
                  <button
                    onClick={() => setShowParentPinModal(true)}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    Parent
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Pending:</span>
                <span className="font-medium text-orange-600">${stats.pendingEarnings.toFixed(2)}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button className="text-xs text-blue-600 hover:text-blue-700">Mark all read</button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${
                                !notification.read ? 'bg-blue-500' : 'bg-transparent'
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {notification.type === "approval" && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                                {notification.type === "reminder" && <Clock className="w-4 h-4 text-orange-500" />}
                                {notification.type === "bonus" && <Star className="w-4 h-4 text-yellow-500" />}
                                {notification.type === "payment" && <DollarSign className="w-4 h-4 text-green-500" />}
                                {notification.type === "streak" && <Flame className="w-4 h-4 text-orange-400" />}
                                <span className="text-sm font-medium text-gray-900">{notification.message}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{notification.time}</span>
                                {notification.reward && (
                                  <span className="text-xs font-medium text-green-600">
                                    +${notification.reward.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-gray-100">
                      <button className="text-sm text-gray-500 hover:text-gray-700 w-full text-center">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  <User className="text-gray-50 w-4 h-4" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
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
      </header>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="chores">Chores</option>
                    <option value="homework">Homework</option>
                    <option value="exercise">Exercise</option>
                    <option value="creative">Creative</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTask.reward}
                    onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                    className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Anyone can claim</option>
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParentPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isParentMode ? "Extend Parent Session" : "Parent Access"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {isParentMode
                ? "Enter your PIN to extend the parent session for another 30 minutes"
                : "Enter the parent PIN to access family management"}
            </p>
            <form onSubmit={handleParentPinSubmit}>
              <input
                type="password"
                value={parentPin}
                onChange={(e) => setParentPin(e.target.value)}
                className="placeholder-gray-400 text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
                placeholder="Enter parent PIN"
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowParentPinModal(false);
                    setParentPin("");
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  {isParentMode ? "Extend" : "Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="text-center">
            <div className="text-4xl font-light text-gray-900 mb-2">${stats.totalEarned.toFixed(2)}</div>
            <div className="text-sm text-gray-500">
              {isParentMode ? "Family earnings" : `${selectedKid?.name || "Your"} earnings`}
            </div>
            <div className="text-xs text-gray-400 mt-1">${totalAvailableEarnings.toFixed(2)} available to earn</div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Flame className="w-3 h-3 text-orange-400" fill="currentColor" />
                <span>{stats.weeklyStats.currentStreak} day streak</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                <span>{stats.weeklyStats.completionRate}% completion</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">{isParentMode ? "Family tasks" : "Available tasks"}</h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">{tasks.length} tasks</div>
                {isParentMode && (
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                    New Task
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white p-4 rounded-lg border transition-colors group cursor-pointer ${
                    task.urgent ? "border-orange-200 bg-orange-50/30" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        {task.urgent && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-medium">
                            Urgent
                          </span>
                        )}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{task.category}</span>
                        {isParentMode && task.kids && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">{task.kids.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{task.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{task.time_estimate}</span>
                          <span className="text-xs">•</span>
                          <span className="text-xs">{task.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">${task.reward.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">reward</div>
                      </div>
                      {isParentMode ? (
                        <button className="opacity-0 group-hover:opacity-100 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-200 flex items-center gap-1">
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      ) : (
                        <button className="opacity-0 group-hover:opacity-100 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-800">
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Recent completions</h2>
                <button className="text-sm text-gray-500 hover:text-gray-700">View all</button>
              </div>

              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between py-3 px-4 hover:bg-white rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <CheckCircle2
                          className={`w-4 h-4 ${task.status === "approved" ? "text-green-600" : "text-orange-500"}`}
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{task.title}</div>
                        <div className="text-xs text-gray-500">{task.completedAt}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">${task.reward.toFixed(2)}</span>
                        <span
                          className={`ml-2 text-xs ${task.status === "approved" ? "text-green-600" : "text-orange-500"}`}
                        >
                          {task.status === "approved" ? "Paid" : "Pending"}
                        </span>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all">
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white p-4 rounded-lg border border-gray-100 mb-8">
              <h3 className="text-sm font-medium text-gray-900 mb-4">This week</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tasks completed</span>
                  <span className="font-medium text-gray-900">{stats.weeklyStats.tasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Earned</span>
                  <span className="font-medium text-gray-900">${stats.weeklyStats.earned.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Completion rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{stats.weeklyStats.completionRate}%</span>
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Current streak</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{stats.weeklyStats.currentStreak} days</span>
                    <Flame className="w-4 h-4 text-orange-400" fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Goals</h2>
                <button className="text-sm text-gray-500 hover:text-gray-700">New</button>
              </div>

              <div className="space-y-4">
                {goals.map((goal, index) => {
                  const progress = (goal.current / goal.target) * 100;
                  const remaining = goal.target - goal.current;
                  return (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-medium text-gray-900 text-sm">{goal.name}</h3>
                        <div className="text-xs text-gray-500">{progress.toFixed(0)}%</div>
                      </div>

                      <div className="mb-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>${goal.current.toFixed(2)}</span>
                        <span>${goal.target.toFixed(2)}</span>
                      </div>

                      <div className="text-xs text-gray-600">${remaining.toFixed(2)} to go</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Tip</h4>
              <p className="text-sm text-gray-600">
                {isParentMode
                  ? "Create specific, achievable tasks with clear rewards to motivate your kids!"
                  : "Complete tasks early to build a good reputation with your parents and potentially unlock bonus tasks!"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}