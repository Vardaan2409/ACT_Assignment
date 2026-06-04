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
  Calendar,
  CreditCard,
  FileText,
  Check,
  CheckCircle2,
  DollarSign,
  Activity,
  ArrowUpRight,
  Award,
  RefreshCw
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'billing', 'analytics'
  const [data, setData] = useState({ leads: [], tasks: [], users: [] });
  const [billing, setBilling] = useState({
    subscription: { plan: 'Free', status: 'active', startDate: new Date(), endDate: null },
    transactions: [],
    invoices: [],
    razorpayKeyId: ''
  });
  const [analytics, setAnalytics] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState(null);

  const { user } = useAuth();

  const fetchDashboardData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await API.get('/api/dashboard', config);
      setData(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data');
    }
  };

  const fetchBillingData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await API.get('/api/subscription/status', config);
      setBilling(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch subscription data');
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await API.get('/api/subscription/analytics', config);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDashboardData(), fetchBillingData(), fetchAnalyticsData()]);
      setLoading(false);
    };
    init();
  }, [user.token]);

  const handleSubscribe = async (planName) => {
    try {
      setError('');
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const { data: orderData } = await API.post(
        '/api/subscription/create-order', 
        { plan: planName }, 
        config
      );

      if (orderData.isMock) {
        // Handle mock mode payment
        setMockOrderDetails({
          ...orderData,
          plan: planName
        });
        setPaymentLoading(false);
        setShowMockModal(true);
        return;
      }

      // Handle real Razorpay Payment checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MERN Subscription App',
        description: `Upgrade to ${planName} Plan`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            const { data: verifyData } = await API.post(
              '/api/subscription/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              config
            );
            // Refresh data
            await Promise.all([fetchBillingData(), fetchAnalyticsData()]);
            alert(verifyData.message || 'Payment verified and Subscription updated!');
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Verification failed');
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        alert('Payment failed: ' + response.error.description);
        setPaymentLoading(false);
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error initializing subscription checkout');
      setPaymentLoading(false);
    }
  };

  const handleMockPaymentSuccess = async () => {
    try {
      setShowMockModal(false);
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      const { data: verifyData } = await API.post(
        '/api/subscription/verify-payment',
        {
          razorpay_order_id: mockOrderDetails.orderId,
          razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
          razorpay_signature: 'mock_signature_verified',
        },
        config
      );
      
      await Promise.all([fetchBillingData(), fetchAnalyticsData()]);
      alert(verifyData.message || 'Mock payment verified successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Mock verification failed');
    } finally {
      setPaymentLoading(false);
      setMockOrderDetails(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-slate-500 font-medium">Loading subscription dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const activePlan = billing.subscription?.plan || 'Free';
  const planDetails = {
    Free: { name: 'Free', price: '0', desc: 'Explore the basics' },
    Basic: { name: 'Basic', price: '499', desc: 'Perfect for small teams' },
    Pro: { name: 'Pro', price: '999', desc: 'Powerful tools for businesses' },
    Enterprise: { name: 'Enterprise', price: '2,499', desc: 'Full power capabilities' }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Subscription Management Workspace
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Manage your credentials, payments, subscriptions, and analytical reporting.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-bold text-slate-600">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex border-b border-slate-200 mb-8 space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all ${
              activeTab === 'overview'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📊 WorkSpace Overview
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all flex items-center space-x-1.5 ${
              activeTab === 'billing'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>💳 Billing & Subscriptions</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all flex items-center space-x-1.5 ${
              activeTab === 'analytics'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>📈 Platform Analytics</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center space-x-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div>
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
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Recent Leads</h2>
                  </div>
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
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Current Tasks</h2>
                  </div>
                </div>
                <div className="p-6 space-y-6 flex-1 bg-white">
                  {data.tasks.map((task) => (
                    <div key={task.id} className="flex items-start space-x-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all hover:bg-indigo-50/20 group cursor-pointer relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${task.priority === 'High' ? 'bg-red-400' : task.priority === 'Medium' ? 'bg-amber-400' : 'bg-slate-400'}`} />
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
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${task.priority === 'High' ? 'text-red-600' : task.priority === 'Medium' ? 'text-amber-600' : 'text-slate-500'}`}>
                            {task.priority} Priority
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due {task.dueDate}</span>
                        </div>
                      </div>
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
          </div>
        )}

        {/* --- BILLING & SUBSCRIPTIONS TAB --- */}
        {activeTab === 'billing' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 transform translate-x-8 -translate-y-8 opacity-10">
                <CreditCard className="w-64 h-64" />
              </div>
              <div className="space-y-3 z-10">
                <div className="flex items-center space-x-2">
                  <span className="px-3.5 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    Current Plan
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active</span>
                  </span>
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight">
                  {activePlan} Subscription
                </h2>
                <p className="text-indigo-200 text-sm font-medium">
                  {billing.subscription?.endDate
                    ? `Renews on ${new Date(billing.subscription.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                    : 'Lifetime Free access limits active'}
                </p>
              </div>
              
              <div className="mt-6 md:mt-0 flex flex-col space-y-2 z-10 min-w-[200px]">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                  <span className="text-xs text-indigo-200 block font-bold uppercase">Estimated Monthly cost</span>
                  <span className="text-2xl font-bold block mt-1">₹{planDetails[activePlan].price}</span>
                </div>
              </div>
            </div>

            {/* Plans Section */}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">
                Change or Upgrade Plan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Plan Card - Free */}
                <PlanCard
                  name="Free"
                  price="0"
                  desc="Basic capabilities to discover our framework."
                  features={['Limited listings', 'Standard support']}
                  isActive={activePlan === 'Free'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Free')}
                />
                
                {/* Plan Card - Basic */}
                <PlanCard
                  name="Basic"
                  price="499"
                  desc="Essential features for personal work or side-projects."
                  features={['More listings', 'Analytics module']}
                  isActive={activePlan === 'Basic'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Basic')}
                />
                
                {/* Plan Card - Pro */}
                <PlanCard
                  name="Pro"
                  price="999"
                  desc="Complete dashboard setup for small startups."
                  features={['Featured listings', 'CRM integrations', 'Priority support']}
                  isActive={activePlan === 'Pro'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Pro')}
                />

                {/* Plan Card - Enterprise */}
                <PlanCard
                  name="Enterprise"
                  price="2499"
                  desc="Full automation and dedicated cloud scale configurations."
                  features={['Unlimited listings', 'Team management tools', 'Dedicated VIP support']}
                  isActive={activePlan === 'Enterprise'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Enterprise')}
                />
              </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Billing Invoice History</h2>
                </div>
              </div>
              
              {billing.invoices.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold">
                  No subscription purchases yet. Free Plan accounts require no billing history.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Invoice Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Billing Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount Paid</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billing.invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-indigo-600">{inv.invoiceNumber}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{inv.plan}</td>
                          <td className="px-6 py-4 font-medium text-slate-500">
                            {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900">₹{inv.amount}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 hover:border-transparent px-4 py-2 rounded-xl transition-all"
                            >
                              View Invoice
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PLATFORM ANALYTICS TAB --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            {analytics ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales Revenue</span>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">₹{analytics.totalRevenue}</h3>
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center mt-1">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                        <span>All time captures</span>
                      </span>
                    </div>
                    <div className="p-3.5 bg-indigo-50 rounded-2xl">
                      <DollarSign className="w-7 h-7 text-indigo-600" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated MRR</span>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">₹{analytics.mrr}</h3>
                      <span className="text-[10px] text-indigo-500 font-bold block mt-1">
                        Monthly Recurring rate
                      </span>
                    </div>
                    <div className="p-3.5 bg-purple-50 rounded-2xl">
                      <Activity className="w-7 h-7 text-purple-600" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Premium Conversion</span>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics.conversionRate}%</h3>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">
                        {analytics.paidUsersCount} of {analytics.totalUsers} total users
                      </span>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-2xl">
                      <TrendingUp className="w-7 h-7 text-emerald-600" />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{analytics.totalUsers}</h3>
                      <span className="text-[10px] text-amber-500 font-bold block mt-1">
                        Subscribers base
                      </span>
                    </div>
                    <div className="p-3.5 bg-amber-50 rounded-2xl">
                      <Users className="w-7 h-7 text-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Charts / Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Subscription Distribution */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-6">Active Plan Distribution</h3>
                    <div className="space-y-5">
                      {['Free', 'Basic', 'Pro', 'Enterprise'].map(pKey => {
                        const count = analytics.planCounts[pKey] || 0;
                        const percentage = analytics.totalUsers > 0 ? ((count / analytics.totalUsers) * 100).toFixed(0) : 0;
                        const colors = {
                          Free: 'bg-slate-400',
                          Basic: 'bg-indigo-500',
                          Pro: 'bg-purple-500',
                          Enterprise: 'bg-emerald-500'
                        };
                        return (
                          <div key={pKey} className="space-y-1.5">
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-slate-700">{pKey} Plan</span>
                              <span className="text-slate-500">{count} Active ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percentage}%` }}
                                className={`h-full ${colors[pKey]}`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Revenue Growth Metrics */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight mb-3">Subscription Analytics</h3>
                      <p className="text-slate-500 text-sm font-medium mb-6">
                        Summary of current payment statistics collected from validated Razorpay orders and webhook callbacks.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500 font-bold">Free Plan Users</span>
                          <span className="text-sm text-slate-900 font-extrabold">{analytics.planCounts.Free || 0}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500 font-bold">Paid Premium Subscriptions</span>
                          <span className="text-sm text-indigo-600 font-extrabold">{analytics.paidUsersCount}</span>
                        </div>
                        <div className="flex justify-between items-center py-2.5">
                          <span className="text-sm text-slate-500 font-bold">Verified Transactions</span>
                          <span className="text-sm text-emerald-600 font-extrabold">{billing.transactions.filter(t => t.status === 'captured').length} Captured</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-50 text-indigo-800 flex items-center space-x-3">
                      <Award className="w-6 h-6 flex-shrink-0 text-indigo-600" />
                      <p className="text-xs font-semibold">
                        Automatic billing dashboard updates in real time on verification of new payments.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-semibold">
                Waiting for analytics payload...
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- MOCK PAYMENT MODAL --- */}
      {showMockModal && mockOrderDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scaleUp">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <span className="px-3.5 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider block mx-auto w-max mb-2">
                Razorpay Sandbox Simulator
              </span>
              <h3 className="text-xl font-extrabold">Complete Simulated Payment</h3>
              <p className="text-indigo-200 text-xs mt-1">Simulate official Razorpay payment success validation</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Plan Selected</span>
                  <span className="text-slate-900 font-bold">{mockOrderDetails.plan}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Amount Due</span>
                  <span className="text-slate-900 font-bold">₹{mockOrderDetails.amount / 100}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Mock Order ID</span>
                  <span className="text-slate-500 font-mono text-xs">{mockOrderDetails.orderId}</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-semibold text-center italic">
                Notice: Sandbox configuration defaults to simulated signatures to run easily without active live credentials.
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowMockModal(false);
                    setMockOrderDetails(null);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMockPaymentSuccess}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all"
                >
                  Approve Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- INVOICE VIEW MODAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 p-8">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">MERN Dashboard</span>
                <span className="text-indigo-600 font-extrabold block text-xs tracking-widest uppercase mt-0.5">Subscription System</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Number</span>
                <span className="text-lg font-bold text-slate-900 block mt-0.5">{selectedInvoice.invoiceNumber}</span>
              </div>
            </div>

            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-100 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Billed To</span>
                <span className="font-bold text-slate-800 block">{selectedInvoice.billingDetails?.name}</span>
                <span className="text-slate-500 font-medium">{selectedInvoice.billingDetails?.email}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Invoice Date</span>
                <span className="font-semibold text-slate-800">
                  {new Date(selectedInvoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-6 border-b border-slate-100 text-sm space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase block">Billing Items</span>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800">{selectedInvoice.plan} Subscription Plan Upgrade</span>
                  <span className="text-xs text-slate-400 block font-medium mt-0.5">30 Days Billing cycle</span>
                </div>
                <span className="font-extrabold text-slate-900 text-base">₹{selectedInvoice.amount}.00</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-6">
              <span className="text-sm font-bold text-slate-600">Total Paid (INR)</span>
              <span className="text-2xl font-extrabold text-slate-900">₹{selectedInvoice.amount}.00</span>
            </div>

            {/* Close Button */}
            <div className="mt-4">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all text-center"
              >
                Close Invoice Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlanCard = ({ name, price, desc, features, isActive, loading, onSelect }) => (
  <div className={`bg-white p-6 rounded-3xl border flex flex-col justify-between transition-all relative ${
    isActive 
      ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-50 ring-4 ring-indigo-50' 
      : 'border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-lg'
  }`}>
    {isActive && (
      <span className="absolute top-0 right-0 transform translate-x-2.5 -translate-y-2.5 bg-indigo-600 text-white p-1.5 rounded-full shadow-lg">
        <Check className="w-3.5 h-3.5" />
      </span>
    )}
    
    <div>
      <h3 className="text-lg font-bold text-slate-900">{name}</h3>
      <p className="text-slate-500 text-xs font-semibold mt-1 min-h-[32px]">{desc}</p>
      
      <div className="my-6">
        <span className="text-3xl font-extrabold text-slate-900">₹{price}</span>
        <span className="text-slate-500 text-xs font-bold">/mo</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start text-xs font-semibold text-slate-600">
            <Check className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>

    <button
      disabled={isActive || loading}
      onClick={onSelect}
      className={`w-full py-3 rounded-2xl text-xs font-bold transition-all text-center ${
        isActive
          ? 'bg-emerald-50 border border-emerald-100 text-emerald-700 cursor-default'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 active:scale-[0.98]'
      } disabled:opacity-75`}
    >
      {isActive ? 'Current Plan' : 'Subscribe / Upgrade'}
    </button>
  </div>
);

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
