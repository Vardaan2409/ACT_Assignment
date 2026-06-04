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
  RefreshCw,
  Home,
  Zap,
  MapPin,
  PlusCircle,
  ChevronRight,
  TrendingDown,
  BarChart4
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'billing', 'analytics', 'properties', 'boosts'
  const [data, setData] = useState({ leads: [], tasks: [], users: [] });
  const [billing, setBilling] = useState({
    subscription: { plan: 'Free', status: 'active', startDate: new Date(), endDate: null },
    transactions: [],
    invoices: [],
    razorpayKeyId: ''
  });
  const [analytics, setAnalytics] = useState(null);
  
  // Properties state
  const [properties, setProperties] = useState([]);
  const [myBoosts, setMyBoosts] = useState({ listings: [], boostConfig: {} });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Modals / Selection states
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState(null);
  const [mockType, setMockType] = useState('subscription'); // 'subscription' or 'boost'
  
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [newProperty, setNewProperty] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    isVerified: false,
    isOwnerListed: false
  });

  const [showBoostModal, setShowBoostModal] = useState(false);
  const [selectedPropertyForBoost, setSelectedPropertyForBoost] = useState(null);

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

  const fetchPropertiesData = async () => {
    try {
      const { data } = await API.get('/api/properties');
      setProperties(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyBoostsData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await API.get('/api/properties/my-boosts', config);
      setMyBoosts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchBillingData(),
        fetchAnalyticsData(),
        fetchPropertiesData(),
        fetchMyBoostsData()
      ]);
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
        setMockType('subscription');
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
            await API.post(
              '/api/subscription/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              config
            );
            await Promise.all([fetchBillingData(), fetchAnalyticsData()]);
            alert('Subscription payment verified successfully! 🚀');
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Verification failed');
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#4f46e5' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setError('Error initializing subscription checkout');
      setPaymentLoading(false);
    }
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await API.post('/api/properties', newProperty, config);
      setShowAddPropertyModal(false);
      setNewProperty({
        title: '',
        description: '',
        price: '',
        location: '',
        isVerified: false,
        isOwnerListed: false
      });
      await Promise.all([fetchPropertiesData(), fetchMyBoostsData()]);
      alert('Property published successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to publish listing');
    }
  };

  const handleTriggerBoost = async (property) => {
    setSelectedPropertyForBoost(property);
    setShowBoostModal(true);
  };

  const handlePurchaseBoost = async (boostType) => {
    try {
      setError('');
      setPaymentLoading(true);
      setShowBoostModal(false);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      const { data: orderData } = await API.post(
        '/api/properties/boost/create-order',
        { propertyId: selectedPropertyForBoost._id, boostType },
        config
      );

      if (orderData.isMock) {
        setMockType('boost');
        setMockOrderDetails({
          ...orderData,
          boostType
        });
        setPaymentLoading(false);
        setShowMockModal(true);
        return;
      }

      // Handle Real Razorpay Checkout for boosts
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Property Listing Boost',
        description: `Unlock ${boostType} Visibility`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            await API.post(
              '/api/properties/boost/verify',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                propertyId: orderData.propertyId,
                boostType: orderData.boostType
              },
              config
            );
            await Promise.all([fetchPropertiesData(), fetchMyBoostsData(), fetchAnalyticsData()]);
            alert('Payment verified and Listing Boosted successfully! ⚡');
          } catch (err) {
            console.error(err);
            setError('Verification failed');
          } finally {
            setPaymentLoading(false);
            setSelectedPropertyForBoost(null);
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: '#4f46e5' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setError('Error initiating boost payment');
      setPaymentLoading(false);
    }
  };

  const handleMockPaymentSuccess = async () => {
    try {
      setShowMockModal(false);
      setPaymentLoading(true);
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      if (mockType === 'subscription') {
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
      } else if (mockType === 'boost') {
        const { data: verifyData } = await API.post(
          '/api/properties/boost/verify',
          {
            razorpay_order_id: mockOrderDetails.orderId,
            razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
            razorpay_signature: 'mock_signature_verified',
            propertyId: mockOrderDetails.propertyId,
            boostType: mockOrderDetails.boostType
          },
          config
        );
        await Promise.all([fetchPropertiesData(), fetchMyBoostsData(), fetchAnalyticsData()]);
        alert(verifyData.message || 'Mock boost payment verified successfully! ⚡');
      }
    } catch (err) {
      console.error(err);
      setError('Mock verification failed');
    } finally {
      setPaymentLoading(false);
      setMockOrderDetails(null);
      setSelectedPropertyForBoost(null);
    }
  };

  const trackInteraction = async (propertyId, action) => {
    try {
      await API.post(`/api/properties/${propertyId}/interact`, { action });
      await fetchPropertiesData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
            <p className="text-slate-500 font-medium">Loading workspace...</p>
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
              CRM & Subscriptions Dashboard
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              Manage listings, payments, boosts, and platforms analytics.
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
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-200 mb-8 space-x-8 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all ${
              activeTab === 'overview'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📊 Workspace Overview
          </button>
          
          <button
            onClick={() => setActiveTab('properties')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all flex items-center space-x-1.5 ${
              activeTab === 'properties'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>🏠 Property Marketplace</span>
          </button>

          <button
            onClick={() => setActiveTab('boosts')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all flex items-center space-x-1.5 ${
              activeTab === 'boosts'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Boost Dashboard</span>
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

        {/* --- WORKSPACE OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div>
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
            </div>
          </div>
        )}

        {/* --- PROPERTIES MARKETPLACE TAB --- */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Active Listings</h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  Properties sorted dynamically by their search ranking index scores.
                </p>
              </div>
              <button
                onClick={() => setShowAddPropertyModal(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Create Listing</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {properties.map((prop, idx) => (
                <div
                  key={prop._id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-xl shadow-slate-100 flex flex-col justify-between transition-all relative ${
                    prop.activeBoost 
                      ? 'border-indigo-400 shadow-indigo-50/50 ring-2 ring-indigo-100' 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* Position Badge / Score badge */}
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                    <span className="bg-slate-900/80 backdrop-blur-md text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center shadow-sm">
                      Rank #{idx + 1}
                    </span>
                    <span className="bg-indigo-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-full shadow-md">
                      Score: {prop.rankingScore}
                    </span>
                    {prop.activeBoost && (
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-black text-xs px-3 py-1.5 rounded-full flex items-center shadow-md animate-pulse">
                        <Zap className="w-3.5 h-3.5 mr-1 fill-slate-900" />
                        <span>{prop.activeBoost.boostType}</span>
                      </span>
                    )}
                  </div>

                  <div className="p-8 space-y-4">
                    <div className="pt-6">
                      <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold mb-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{prop.location}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{prop.title}</h3>
                      <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{prop.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {prop.isVerified && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          ✓ Verified (+20)
                        </span>
                      )}
                      {prop.isOwnerListed && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          👤 Owner Listed (+15)
                        </span>
                      )}
                      {Math.ceil(Math.abs(new Date() - new Date(prop.createdAt)) / (1000 * 60 * 60 * 24)) <= 7 && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          🕒 New Listing (+10)
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Asking Price</span>
                        <span className="text-2xl font-black text-slate-950">₹{(prop.price / 10000000).toFixed(2)} Cr</span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Impressions</span>
                        <span className="text-base font-extrabold text-slate-700">{prop.impressions}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 border-t border-slate-100 flex space-x-3">
                    <button
                      onClick={() => {
                        trackInteraction(prop._id, 'click');
                        alert('Listing click tracked! Analytics improved.');
                      }}
                      className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                    >
                      View Property Details
                    </button>
                    
                    <button
                      onClick={() => handleTriggerBoost(prop)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-100 flex justify-center items-center space-x-1.5 transition-all"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Boost Listing Visibility</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- BOOST PERFORMANCE DASHBOARD TAB --- */}
        {activeTab === 'boosts' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Boost Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold opacity-80 uppercase block">Active boosted listings</span>
                  <h3 className="text-3xl font-extrabold mt-1">
                    {myBoosts.listings.filter(l => l.activeBoost).length} Listings
                  </h3>
                  <span className="text-[10px] block font-semibold mt-1 bg-white/20 px-2 py-0.5 rounded-full w-max">
                    Enhanced indexing rank active
                  </span>
                </div>
                <Zap className="w-12 h-12 fill-white opacity-20" />
              </div>

              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold opacity-80 uppercase block">Total Boost Clicks</span>
                  <h3 className="text-3xl font-extrabold mt-1">
                    {myBoosts.listings.reduce((sum, l) => sum + (l.activeBoost ? l.clicks : 0), 0)} Clicks
                  </h3>
                  <span className="text-[10px] block font-semibold mt-1">
                    Direct user interaction tracking
                  </span>
                </div>
                <TrendingUp className="w-12 h-12 opacity-20" />
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold opacity-80 uppercase block">Estimated Leads Increase</span>
                  <h3 className="text-3xl font-extrabold mt-1">
                    +{myBoosts.listings.filter(l => l.activeBoost).length * 125}%
                  </h3>
                  <span className="text-[10px] block font-semibold mt-1">
                    Across all premium exposures
                  </span>
                </div>
                <BarChart4 className="w-12 h-12 opacity-20" />
              </div>
            </div>

            {/* Performance Listings Analysis */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Boost Tracker & Metrics</h3>
              </div>
              
              {myBoosts.listings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-semibold">
                  You have not published any properties yet. Navigate to Marketplace to add a listing.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myBoosts.listings.map(listing => (
                    <div key={listing._id} className="p-6 md:p-8 hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row justify-between lg:items-center space-y-6 lg:space-y-0">
                      
                      {/* Left Info */}
                      <div className="space-y-2.5">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-lg font-bold text-slate-900">{listing.title}</h4>
                          {listing.activeBoost ? (
                            <span className="bg-amber-100 text-amber-700 border border-amber-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center">
                              <Zap className="w-3 h-3 mr-0.5 fill-amber-700" />
                              <span>{listing.activeBoost.boostType}</span>
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                              Unboosted
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-slate-400 font-bold">
                          <span className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                            <span>{listing.location}</span>
                          </span>
                          <span>•</span>
                          <span>Asking Price: ₹{(listing.price / 10000000).toFixed(2)} Cr</span>
                        </div>

                        {listing.activeBoost ? (
                          <div className="text-xs text-indigo-600 font-bold flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>Expires in <span className="underline">{listing.remainingDays} days</span> ({new Date(listing.activeBoost.endDate).toLocaleDateString()})</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 font-semibold italic">
                            No active visibility boosts. This listing displays in standard organic ranks.
                          </div>
                        )}
                      </div>

                      {/* Performance Indicators */}
                      <div className="flex flex-wrap gap-6 items-center">
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center min-w-[90px] shadow-sm">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Impressions</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">{listing.impressions}</span>
                          {listing.activeBoost && (
                            <span className="text-[9px] text-emerald-600 font-bold">+{listing.analytics?.impressionGain} boost</span>
                          )}
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center min-w-[90px] shadow-sm">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Clicks</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">{listing.clicks}</span>
                          {listing.activeBoost && (
                            <span className="text-[9px] text-emerald-600 font-bold">+{listing.analytics?.clickGain} boost</span>
                          )}
                        </div>

                        <div className="bg-white p-3.5 rounded-2xl border border-slate-100 text-center min-w-[90px] shadow-sm">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Leads Count</span>
                          <span className="text-lg font-black text-slate-900 mt-0.5 block">{listing.leadsCount}</span>
                          {listing.activeBoost && (
                            <span className="text-[9px] text-emerald-600 font-bold">+{listing.analytics?.leadGain} conversion</span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col space-y-1.5 min-w-[130px]">
                          {listing.activeBoost ? (
                            <button
                              onClick={() => handleTriggerBoost(listing)}
                              className="py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold text-center transition-all"
                            >
                              Extend Boost
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTriggerBoost(listing)}
                              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1 shadow-md shadow-indigo-50 transition-all"
                            >
                              <Zap className="w-3.5 h-3.5 fill-white" />
                              <span>Boost Listing</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => {
                              trackInteraction(listing._id, 'lead');
                              alert('Listing lead interaction simulated!');
                              fetchMyBoostsData();
                            }}
                            className="py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold text-center transition-all"
                          >
                            Simulate Lead
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
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
                <PlanCard
                  name="Free"
                  price="0"
                  desc="Basic capabilities to discover our framework."
                  features={['Limited listings', 'Standard support']}
                  isActive={activePlan === 'Free'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Free')}
                />
                
                <PlanCard
                  name="Basic"
                  price="499"
                  desc="Essential features for personal work or side-projects."
                  features={['More listings', 'Analytics module']}
                  isActive={activePlan === 'Basic'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Basic')}
                />
                
                <PlanCard
                  name="Pro"
                  price="999"
                  desc="Complete dashboard setup for small startups."
                  features={['Featured listings', 'CRM integrations', 'Priority support']}
                  isActive={activePlan === 'Pro'}
                  loading={paymentLoading}
                  onSelect={() => handleSubscribe('Pro')}
                />

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

      {/* --- ADD LISTING FORM MODAL --- */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scaleUp p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-extrabold text-slate-950">Add Property Listing</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Publish a property to begin matching with search scores</p>
            </div>

            <form onSubmit={handleAddProperty} className="space-y-4 text-sm font-semibold">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold">Property Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Villa with swimming pool"
                  value={newProperty.title}
                  onChange={e => setNewProperty({...newProperty, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Asking Price (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000000"
                    value={newProperty.price}
                    onChange={e => setNewProperty({...newProperty, price: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Whitefield, Bangalore"
                    value={newProperty.location}
                    onChange={e => setNewProperty({...newProperty, location: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold">Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Summarize structural elements and amenities details..."
                  value={newProperty.description}
                  onChange={e => setNewProperty({...newProperty, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none"
                />
              </div>

              <div className="flex space-x-6 pt-2">
                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProperty.isVerified}
                    onChange={e => setNewProperty({...newProperty, isVerified: e.target.checked})}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <span>Verified Listing (+20 score)</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProperty.isOwnerListed}
                    onChange={e => setNewProperty({...newProperty, isOwnerListed: e.target.checked})}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                  />
                  <span>Owner Listed (+15 score)</span>
                </label>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all text-center"
                >
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BOOST CHECKOUT OPTIONS MODAL --- */}
      {showBoostModal && selectedPropertyForBoost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scaleUp p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-2xl font-extrabold text-slate-900">Boost Search Visibility</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Elevate <span className="text-indigo-600">{selectedPropertyForBoost.title}</span> using premium ranking factors.
              </p>
            </div>

            <div className="space-y-4">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Choose Boost Package</span>
              
              <div className="grid grid-cols-1 gap-3.5">
                <BoostPackageRow
                  title="Featured Boost (7 Days)"
                  price="₹199"
                  score="+40 Rank index points"
                  onSelect={() => handlePurchaseBoost('Featured 7 Days')}
                />
                <BoostPackageRow
                  title="Featured Boost (15 Days)"
                  price="₹349"
                  score="+40 Rank index points"
                  onSelect={() => handlePurchaseBoost('Featured 15 Days')}
                />
                <BoostPackageRow
                  title="Featured Boost (30 Days)"
                  price="₹599"
                  score="+40 Rank index points"
                  onSelect={() => handlePurchaseBoost('Featured 30 Days')}
                />
                <BoostPackageRow
                  title="Premium Placement Boost (30 Days)"
                  price="₹899"
                  score="+60 Rank index points"
                  onSelect={() => handlePurchaseBoost('Premium Placement')}
                />
                <BoostPackageRow
                  title="Homepage Placement Boost (30 Days)"
                  price="₹1299"
                  score="+60 Rank index points"
                  onSelect={() => handlePurchaseBoost('Homepage Placement')}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowBoostModal(false);
                  setSelectedPropertyForBoost(null);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold text-center transition-all"
              >
                Close Boost Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOCK PAYMENT SANDBOX MODAL --- */}
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
                  <span className="text-slate-500">Upgrade Option</span>
                  <span className="text-slate-900 font-bold">
                    {mockType === 'subscription' ? mockOrderDetails.plan : mockOrderDetails.boostType}
                  </span>
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
                    setSelectedPropertyForBoost(null);
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

            <div className="flex justify-between items-center py-6">
              <span className="text-sm font-bold text-slate-600">Total Paid (INR)</span>
              <span className="text-2xl font-extrabold text-slate-900">₹{selectedInvoice.amount}.00</span>
            </div>

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

const BoostPackageRow = ({ title, price, score, onSelect }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group">
    <div>
      <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</span>
      <span className="text-xs text-slate-400 block font-semibold mt-0.5">{score}</span>
    </div>
    <div className="flex items-center space-x-3">
      <span className="text-base font-extrabold text-slate-900">{price}</span>
      <button
        onClick={onSelect}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 flex items-center"
      >
        <span>Buy Boost</span>
        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
      </button>
    </div>
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
