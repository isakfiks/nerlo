"use client";
import { Bell, CheckCircle2, Clock, DollarSign, Star, MoreHorizontal, User, Flame } from "lucide-react"
import { useState } from "react"
import Link from "next/link";

export default function Dash() {
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Mock data for while ui is being built
  const totalEarned = 247.5
  const pendingEarnings = 18.5
  
  const availableTasks = [
    { id: 1, title: "Take out trash", reward: 3.0, deadline: "Tonight", category: "Chores", difficulty: "Easy", timeEstimate: "5 min", urgent: true },
    { id: 2, title: "Walk the dog", reward: 5.0, deadline: "Daily", category: "Pet care", difficulty: "Easy", timeEstimate: "20 min", urgent: false },
    { id: 3, title: "Math homework", reward: 8.0, deadline: "Tomorrow", category: "School", difficulty: "Medium", timeEstimate: "45 min", urgent: true },
    { id: 4, title: "Clean bedroom", reward: 7.5, deadline: "Weekend", category: "Chores", difficulty: "Medium", timeEstimate: "30 min", urgent: false },
    { id: 5, title: "Grocery shopping", reward: 12.0, deadline: "Saturday", category: "Errands", difficulty: "Hard", timeEstimate: "1 hour", urgent: false },
  ]

  const completedTasks = [
    { id: 1, title: "Vacuum living room", reward: 6.0, completedAt: "2 hours ago", status: "pending" },
    { id: 2, title: "Wash dishes", reward: 4.5, completedAt: "Yesterday", status: "approved" },
    { id: 3, title: "History essay", reward: 15.0, completedAt: "2 days ago", status: "approved" },
    { id: 4, title: "Feed cats", reward: 3.0, completedAt: "3 days ago", status: "approved" },
  ]

  const goals = [
    { name: "New phone", target: 800, current: 247.5 },
    { name: "Concert tickets", target: 150, current: 89.25 },
  ]

  const weeklyStats = {
    tasksCompleted: 12,
    earned: 67.5,
    completionRate: 85,
    currentStreak: 5,
  }

  const totalAvailableEarnings = availableTasks.reduce((sum, task) => sum + task.reward, 0)

  const notifications = [
    { id: 1, type: "approval", message: "Math homework approved!", reward: 8.0, time: "5 min ago", read: false },
    { id: 2, type: "reminder", message: "Take out trash due tonight", time: "1 hour ago", read: false },
    { id: 3, type: "bonus", message: "Bonus task available: Clean garage", reward: 15.0, time: "2 hours ago", read: true },
    { id: 4, type: "payment", message: "Payment received: $22.50", time: "Yesterday", read: true },
    { id: 5, type: "streak", message: "5-day streak achieved! 🔥", time: "2 days ago", read: true },
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
            <h1 className="text-xl font-medium text-gray-900">Nerlo</h1>
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Pending:</span>
                <span className="font-medium text-orange-600">${pendingEarnings.toFixed(2)}</span>
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
                          <button className="text-xs text-blue-600 hover:text-blue-700">
                            Mark all read
                          </button>
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
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              !notification.read ? 'bg-blue-500' : 'bg-transparent'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {notification.type === 'approval' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                {notification.type === 'reminder' && <Clock className="w-4 h-4 text-orange-500" />}
                                {notification.type === 'bonus' && <Star className="w-4 h-4 text-yellow-500" />}
                                {notification.type === 'payment' && <DollarSign className="w-4 h-4 text-green-500" />}
                                {notification.type === 'streak' && <Flame className="w-4 h-4 text-orange-400" />}
                                <span className="text-sm font-medium text-gray-900">
                                  {notification.message}
                                </span>
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
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <User className="text-gray-50"></User>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="text-center">
            <div className="text-4xl font-light text-gray-900 mb-2">${totalEarned.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Your earnings</div>
            <div className="text-xs text-gray-400 mt-1">${totalAvailableEarnings.toFixed(2)} available to earn</div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Flame className="w-3 h-3 text-orange-400" fill="currentColor" />
                <span>{weeklyStats.currentStreak} day streak</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                <span>{weeklyStats.completionRate}% completion</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Available tasks</h2>
              <div className="text-sm text-gray-500">{availableTasks.length} tasks</div>
            </div>

            <div className="space-y-3">
              {availableTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-white p-4 rounded-lg border transition-colors group cursor-pointer ${
                    task.urgent ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        {task.urgent && <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-medium">Urgent</span>}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{task.category}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{task.deadline}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{task.timeEstimate}</span>
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
                      <button className="opacity-0 group-hover:opacity-100 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-800">
                        Start
                      </button>
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
                  <span className="font-medium text-gray-900">{weeklyStats.tasksCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Earned</span>
                  <span className="font-medium text-gray-900">${weeklyStats.earned.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Completion rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{weeklyStats.completionRate}%</span>
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Current streak</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{weeklyStats.currentStreak} days</span>
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
                  const progress = (goal.current / goal.target) * 100
                  const remaining = goal.target - goal.current
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
                      
                      <div className="text-xs text-gray-600">
                        ${remaining.toFixed(2)} to go
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Tip</h4>
              <p className="text-sm text-gray-600">
                Complete tasks early to build a good reputation with your parents and potentially unlock bonus tasks!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
