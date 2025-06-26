"use client";
import { CheckCircle2, Clock, DollarSign, Star, ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Stats {
  families: string;
  tasksCompleted: string;
  totalEarned: string;
  lastUpdated: number;
  nextUpdate: number;
}

export default function Landing() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<Stats>({
    families: '1+',
    tasksCompleted: '1+',
    totalEarned: '$5+',
    lastUpdated: Date.now(),
    nextUpdate: 30000
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const newStats = await response.json();
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsVisible(true);
    fetchStats();

    // Set up periodic updates
    const interval = setInterval(fetchStats, 35000); // Fetch every 35 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 backdrop-blur-sm bg-white/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-light text-gray-900 tracking-wide">Nerlo</div>
            <div className="flex items-center gap-8">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors duration-300">
                Sign in
              </Link>
              <Link href="/signup" className="px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-300 text-sm font-medium hover:shadow-lg hover:scale-105">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-8 py-32">
        <div className={`text-center mb-24 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <h1 className="text-7xl font-extralight text-gray-900 mb-8 leading-tight tracking-tight">
            Turn chores into<br />
            <span className="text-gray-500 italic">achievements</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            A simple, elegant way for families to manage tasks, track progress, and reward accomplishments.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-300 text-lg font-medium hover:shadow-xl hover:scale-105 group">
            Start your family journey
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        <div className={`grid grid-cols-3 gap-16 text-center py-24 border-t border-gray-100 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
          <div className="hover:scale-105 transition-transform duration-300 group">
            <div className={`text-5xl font-extralight text-gray-900 mb-4 tracking-tight transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              {stats.families}
            </div>
            <div className="text-base text-gray-500 font-medium">Families using Nerlo</div>
            {isLoading && <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mt-2 animate-pulse"></div>}
          </div>
          <div className="hover:scale-105 transition-transform duration-300 group">
            <div className={`text-5xl font-extralight text-gray-900 mb-4 tracking-tight transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              {stats.tasksCompleted}
            </div>
            <div className="text-base text-gray-500 font-medium">Tasks completed</div>
            {isLoading && <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-2 animate-pulse"></div>}
          </div>
          <div className="hover:scale-105 transition-transform duration-300 group">
            <div className={`text-5xl font-extralight text-gray-900 mb-4 tracking-tight transition-all duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
              {stats.totalEarned}
            </div>
            <div className="text-base text-gray-500 font-medium">Earned by kids</div>
            {isLoading && <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto mt-2 animate-pulse"></div>}
          </div>
        </div>

        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live statistics
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-gray-50 to-white py-32">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-extralight text-gray-900 mb-6 tracking-tight">How Nerlo works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
              Three simple steps to transform your family&apos;s approach to chores and responsibilities.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-16">
            <div className="text-center group hover:scale-105 transition-all duration-500">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:shadow-xl transition-shadow duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-6 tracking-wide">Create tasks</h3>
              <p className="text-gray-600 leading-relaxed text-lg font-light">
                Parents set up tasks with descriptions, time estimates, and rewards. Kids can see what&apos;s available and claim tasks they want to do.
              </p>
            </div>

            <div className="text-center group hover:scale-105 transition-all duration-500 delay-100">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:shadow-xl transition-shadow duration-300">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-6 tracking-wide">Track progress</h3>
              <p className="text-gray-600 leading-relaxed text-lg font-light">
                Kids work on tasks with built-in time tracking. They can pause, take breaks, and add notes about their work. Parents can monitor progress in real-time.
              </p>
            </div>

            <div className="text-center group hover:scale-105 transition-all duration-500 delay-200">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:shadow-xl transition-shadow duration-300">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-6 tracking-wide">Earn rewards</h3>
              <p className="text-gray-600 leading-relaxed text-lg font-light">
                Completed tasks are reviewed by parents and approved for payment. Kids can set savings goals and track their earnings over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-24">
            <h2 className="text-5xl font-extralight text-gray-900 mb-6 tracking-tight">Everything your family needs</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light leading-relaxed">
              Nerlo includes all the tools families need to manage tasks, track progress, and celebrate achievements.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-20">
            <div className="hover:scale-102 transition-transform duration-500">
              <h3 className="text-3xl font-light text-gray-900 mb-10 tracking-wide">For Parents</h3>
              <div className="space-y-8">
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Task Management</div>
                    <div className="text-gray-600 font-light">Create, assign, and track tasks with ease</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Progress Monitoring</div>
                    <div className="text-gray-600 font-light">See who&apos;s working on what in real-time</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Approval System</div>
                    <div className="text-gray-600 font-light">Review and approve completed work</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Family Analytics</div>
                    <div className="text-gray-600 font-light">Track completion rates and streaks</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hover:scale-102 transition-transform duration-500">
              <h3 className="text-3xl font-light text-gray-900 mb-10 tracking-wide">For Kids</h3>
              <div className="space-y-8">
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <Star className="w-6 h-6 text-yellow-500 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Choose Your Tasks</div>
                    <div className="text-gray-600 font-light">Pick from available tasks or claim assigned ones</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <Star className="w-6 h-6 text-yellow-500 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Time Tracking</div>
                    <div className="text-gray-600 font-light">Built-in timer with pause and break features</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <Star className="w-6 h-6 text-yellow-500 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Savings Goals</div>
                    <div className="text-gray-600 font-light">Set and track progress toward personal goals</div>
                  </div>
                </div>
                <div className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300">
                  <Star className="w-6 h-6 text-yellow-500 mt-1 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <div className="font-medium text-gray-900 text-lg mb-2">Achievement Streaks</div>
                    <div className="text-gray-600 font-light">Build momentum with daily completion streaks</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-5xl mx-auto px-8 text-center">
          <h2 className="text-5xl font-extralight text-gray-900 mb-8 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            Be among the first families to experience a better way to manage chores and rewards.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all duration-300 text-lg font-medium hover:shadow-xl hover:scale-105 group">
            Start your free account
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <div className="text-gray-500 mt-6 font-light text-lg">
            No credit card required • Set up in 2 minutes
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center text-gray-500">
            <div className="mb-6 text-lg font-light">© 2025 Nerlo. Made with ❤️ for families.</div>
            <div className="flex items-center justify-center gap-10">
              <Link href="/privacy" className="hover:text-gray-700 transition-colors duration-300 font-medium">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-700 transition-colors duration-300 font-medium">Terms</Link>
              <Link href="/support" className="hover:text-gray-700 transition-colors duration-300 font-medium">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
