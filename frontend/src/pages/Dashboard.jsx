import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { 
  Users, 
  Briefcase, 
  CheckSquare, 
  TrendingUp, 
  MoreHorizontal,
  Clock,
  AlertCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState({ leads: [], tasks: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };
        const { data } = await API.get('/api/dashboard', config);
        setData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-slate-500 font-medium">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-slate-500 mt-1 font-medium italic">
              Welcome back, <span className="text-indigo-600 font-bold not-italic">{user.name}</span>. Here's what's happening today.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
             <Calendar className="w-5 h-5 text-indigo-500" />
             <span className="text-sm font-bold text-slate-600">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Total Leads" 
            value={data.leads.length} 
            icon={<Briefcase className="w-6 h-6 text-indigo-600" />} 
            trend="+12% from last month"
            bgColor="bg-indigo-50"
          />
          <StatCard 
            title="Active Tasks" 
            value={data.tasks.length} 
            icon={<CheckSquare className="w-6 h-6 text-emerald-600" />} 
            trend="5 due today"
            bgColor="bg-emerald-50"
          />
          <StatCard 
            title="Team Members" 
            value={data.users.length} 
            icon={<Users className="w-6 h-6 text-amber-600" />} 
            trend="2 online now"
            bgColor="bg-amber-50"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leads Table */}
          <section className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Recent Leads</h2>
              </div>
              <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-1.5 rounded-full transition-colors">
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{lead.name}</span>
                          <span className="text-xs text-slate-400 font-medium">{lead.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 italic">
                        {lead.company}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          lead.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          lead.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tasks List */}
          <section className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 rounded-xl">
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Current Tasks</h2>
              </div>
              <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-1.5 rounded-full transition-colors">
                New Task
              </button>
            </div>
            <div className="p-6 space-y-6 flex-1 bg-white">
              {data.tasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all hover:bg-indigo-50/20 group cursor-pointer relative overflow-hidden">
                   <div className={`absolute top-0 left-0 w-1.5 h-full ${
                     task.priority === 'High' ? 'bg-red-400' : task.priority === 'Medium' ? 'bg-amber-400' : 'bg-slate-400'
                   }`} />
                  <div className="mt-1">
                    {task.priority === 'High' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === 'High' ? 'text-red-600' : task.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {task.priority} Priority
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due {task.dueDate}</span>
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-indigo-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* User List */}
          <section className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 lg:col-span-2 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Our Team</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {data.users.map((teamMember) => (
                <div key={teamMember.id} className="p-6 flex items-center space-x-4 hover:bg-slate-50 transition-colors group cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden transform group-hover:scale-110 transition-transform">
                     <span className="text-lg font-extrabold text-slate-400">{teamMember.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{teamMember.name}</h4>
                    <p className="text-xs font-semibold text-slate-400 italic">{teamMember.role}</p>
                    <div className="flex items-center mt-1.5">
                       <div className={`w-2 h-2 rounded-full mr-1.5 ${teamMember.status === 'Active' ? 'bg-emerald-500 shadow-emerald-200 shadow-lg' : 'bg-slate-300'}`} />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{teamMember.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, icon, trend, bgColor }) => (
  <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 hover:border-indigo-100 transition-all hover:translate-y-[-4px]">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl ${bgColor} shadow-sm`}>
        {icon}
      </div>
      <MoreHorizontal className="w-5 h-5 text-slate-300 cursor-pointer" />
    </div>
    <div>
      <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-extrabold text-slate-900 mt-1">{value}</p>
      <div className="flex items-center mt-2.5 space-x-1.5">
         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
         <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">{trend}</span>
      </div>
    </div>
  </div>
);

export default Dashboard;
