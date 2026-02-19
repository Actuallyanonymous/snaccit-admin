import React, { useState, useEffect } from 'react'; // Removed useMemo (unused)
import { 
    BarChart2, Store, Users, LogOut, Loader2, 
    CheckSquare, XSquare, ShoppingBag, Tag, PlusCircle, 
    ToggleLeft, ToggleRight, Eye, FileText,
    DollarSign, ChevronRight, Download, Inbox, Clock, Gift, Search, Phone, Trash2
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, where, updateDoc, orderBy, setDoc, serverTimestamp, getDocs, addDoc, limit, deleteDoc, Timestamp } from "firebase/firestore";
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts'; // Removed Cell (unused)


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDDFCPcfBKcvrkjqidsXstHqe8Og_3u36k",
  authDomain: "snaccit-7d853.firebaseapp.com",
  projectId: "snaccit-7d853",
  storageBucket: "snaccit-7d853.appspot.com",
  messagingSenderId: "523142849231",
  appId: "1:523142849231:web:f10e23785d6451f510cdba"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Login Page Component ---
const AdminLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().role === 'admin') {
                // Success!
            } else {
                await signOut(auth);
                setError("Access Denied. You do not have admin privileges.");
            }
        } catch (err) {
            setError("Invalid email or password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-green-400">Snaccit HQ</h1>
                    <p className="mt-2 text-gray-400">Administrator Panel</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                    </div>
                    {error && <p className="text-sm text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoading} className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Points Manager View (Updated for Mobile Search & Activity Logs) ---
const PointsManagerView = () => {
    const [searchMobile, setSearchMobile] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [pointsToAdd, setPointsToAdd] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [recentActivity, setRecentActivity] = useState([]);

    // Fetch Recent Activity on Load
    useEffect(() => {
        const q = query(collection(db, "points_history"), orderBy("timestamp", "desc"), limit(10));
        const unsub = onSnapshot(q, (snapshot) => {
            setRecentActivity(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        setFoundUser(null);
        setMessage({ text: '', type: '' });
        
        // Clean the input: ensure it starts with +91 if not provided
        let formattedMobile = searchMobile.trim();
        if (!formattedMobile.startsWith('+')) {
            formattedMobile = `+91${formattedMobile}`;
        }

        try {
            // Search by mobile number field
            const q = query(collection(db, "users"), where("mobile", "==", formattedMobile));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setMessage({ text: 'No user found with this mobile number.', type: 'error' });
            } else {
                const userDoc = querySnapshot.docs[0];
                setFoundUser({ id: userDoc.id, ...userDoc.data() });
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Search failed. Check console.', type: 'error' });
        }
    };

    const handleUpdatePoints = async () => {
        if (!foundUser || pointsToAdd === 0) return;
        setIsProcessing(true);
        
        try {
            const userRef = doc(db, "users", foundUser.id);
            const historyRef = collection(db, "points_history");
            const newPoints = (foundUser.points || 0) + parseInt(pointsToAdd);
            
            // 1. Update User Profile & set Notification
            await updateDoc(userRef, { 
                points: newPoints,
                pointsNotification: {
                    amount: pointsToAdd,
                    timestamp: serverTimestamp(),
                    read: false
                }
            });

            // 2. Create Audit Log for "Recent Activity"
            await addDoc(historyRef, {
                adminEmail: auth.currentUser.email,
                targetUserId: foundUser.id,
                targetUserName: foundUser.username,
                targetMobile: foundUser.mobile,
                pointsChanged: parseInt(pointsToAdd),
                newBalance: newPoints,
                timestamp: serverTimestamp()
            });

            setFoundUser(prev => ({ ...prev, points: newPoints }));
            setMessage({ text: `Successfully updated balance!`, type: 'success' });
            setPointsToAdd(0);
        } catch (err) {
            console.error(err);
            setMessage({ text: 'Update failed.', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-100">Points Manager</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search & Actions Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                            <Phone size={18}/> Search by Mobile
                        </h3>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <input 
                                type="tel" 
                                placeholder="e.g. 9876543210" 
                                value={searchMobile}
                                onChange={(e) => setSearchMobile(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                required
                            />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">
                                Find User
                            </button>
                        </form>
                    </div>

                    {foundUser && (
                        <div className="bg-gray-800 p-6 rounded-2xl border border-green-500/30 shadow-xl animate-fade-in-up">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-white">{foundUser.username}</h3>
                                <p className="text-sm text-gray-400">{foundUser.mobile}</p>
                                <div className="mt-2 inline-block bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                                    Current Balance: {foundUser.points || 0} pts
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-400">Add or Subtract Points</label>
                                <input 
                                    type="number" 
                                    value={pointsToAdd}
                                    onChange={(e) => setPointsToAdd(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-2xl font-black text-green-400 text-center focus:ring-2 focus:ring-green-500 outline-none"
                                />
                                <button 
                                    onClick={handleUpdatePoints}
                                    disabled={isProcessing || pointsToAdd == 0}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin"/> : 'Confirm Update'}
                                </button>
                            </div>
                        </div>
                    )}
                    {message.text && (
                        <div className={`p-4 rounded-xl text-center font-bold text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Recent Activity Column */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-gray-700 bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                                <FileText size={20} className="text-blue-400"/> Recent Activity Log
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[600px]">
                            {recentActivity.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900 text-gray-500 font-bold uppercase text-xs sticky top-0">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Change</th>
                                            <th className="p-4">Admin</th>
                                            <th className="p-4 text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {recentActivity.map(log => (
                                            <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-bold text-gray-200">{log.targetUserName}</p>
                                                    <p className="text-xs text-gray-500">{log.targetMobile}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`font-black ${log.pointsChanged > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {log.pointsChanged > 0 ? '+' : ''}{log.pointsChanged} pts
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-xs">{log.adminEmail?.split('@')[0]}</td>
                                                <td className="p-4 text-right text-gray-500 text-xs">
                                                    {log.timestamp?.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-20 text-center text-gray-600">No recent activity recorded.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Dashboard View (Enhanced with Trends) ---
const DashboardView = () => {
    const [stats, setStats] = useState({ restaurants: 0, users: 0, orders: 0 });
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState(7); // Default 7 days
    const [wowData, setWowData] = useState([]);

    useEffect(() => {
    const unsubResto = onSnapshot(collection(db, "restaurants"), s => setStats(p => ({ ...p, restaurants: s.size })));
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            const startOfCurrent = new Date();
            startOfCurrent.setDate(now.getDate() - timeRange);
            
            const startOfPrevious = new Date();
            startOfPrevious.setDate(now.getDate() - (timeRange * 2));

            // 1. Fetch data for the full 2x range
            const userQ = query(collection(db, "users"), where("createdAt", ">=", startOfPrevious));
            const orderQ = query(collection(db, "orders"), where("createdAt", ">=", startOfPrevious));
            const activityQ = query(collection(db, "activity_logs"), where("createdAt", ">=", startOfPrevious));

            const [userSnap, orderSnap, activitySnap] = await Promise.all([
                getDocs(userQ), getDocs(orderQ), getDocs(activityQ)
            ]);

            // 2. Initialize Buckets for WoW
            let currentUsers = 0, prevUsers = 0;
            let currentRev = 0, prevRev = 0;
            const dailyData = {};

            // Helper to check if date is in current period
            const isCurrent = (date) => date >= startOfCurrent;

            // 3. Process Users
            userSnap.forEach(doc => {
                const data = doc.data();
                if (!data.createdAt) return;
                const d = data.createdAt.toDate();
                if (isCurrent(d)) currentUsers++; else prevUsers++;
                
                // Keep existing daily trend logic
                if (isCurrent(d)) {
                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!dailyData[dateStr]) dailyData[dateStr] = { date: dateStr, signups: 0, successfulOrders: 0, failedOrders: 0, totalMinutes: 0, sessionCount: 0 };
                    dailyData[dateStr].signups++;
                }
            });

            // 4. Process Orders
            orderSnap.forEach(doc => {
                const data = doc.data();
                if (!data.createdAt) return;
                const d = data.createdAt.toDate();
                const successStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
                const isSuccess = successStatuses.includes(data.status);
                const orderVal = data.total || 0;

                if (isCurrent(d)) {
                    if (isSuccess) currentRev += orderVal;
                } else {
                    if (isSuccess) prevRev += orderVal;
                }

                if (isCurrent(d) && dailyData[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })]) {
                    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (isSuccess) dailyData[dateStr].successfulOrders++;
                    else if (data.status === 'payment_failed') dailyData[dateStr].failedOrders++;
                }
            });

            // 5. Calculate WoW Growth Percentage
            const calcGrowth = (curr, prev) => prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

            setWowData([
                { name: 'Revenue', current: currentRev, previous: prevRev, growth: calcGrowth(currentRev, prevRev) },
                { name: 'Users', current: currentUsers, previous: prevUsers, growth: calcGrowth(currentUsers, prevUsers) }
            ]);

            // 6. Map Daily Trend for existing charts
            const finalChartData = Object.values(dailyData).reverse();
            setChartData(finalChartData);
            
            setStats(prev => ({ 
                ...prev, 
                users: currentUsers, 
                orders: orderSnap.docs.filter(d => d.data().createdAt?.toDate() >= startOfCurrent).length,
                revenue: currentRev
            }));

        } catch (error) {
            console.error("Dashboard Data Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
    return () => unsubResto();
}, [timeRange]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-green-400" size={32} /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-100">Executive Overview</h1>
                    <p className="text-gray-400 mt-1">Tracking growth and engagement trends.</p>
                </div>
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    {[7, 30].map(days => (
                        <button 
                            key={days}
                            onClick={() => setTimeRange(days)}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeRange === days ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Last {days} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
    <StatCard title="Total Restaurants" value={stats.restaurants} icon={<Store className="text-blue-400"/>} trend="+2" />
    <StatCard title="New Signups" value={stats.users} icon={<Users className="text-green-400"/>} trend="Last 7D" />
    <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingBag className="text-orange-400"/>} trend="Live" />
    <StatCard title="Avg. Session" value={stats.avgSession || "0m"} icon={<Clock className="text-purple-400"/>} trend="Active" />
</div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* signup Trend Chart */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                        <Users size={20} className="text-green-400"/> Customer Sign-up Trend
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="signups" stroke="#4ade80" strokeWidth={3} fillOpacity={1} fill="url(#colorSignups)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- Successful Order Volume Chart --- */}
<div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
        <CheckSquare size={20} className="text-green-400"/> Successful Orders
    </h3>
    <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="successfulOrders" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
</div>

{/* --- Failed Payment Volume Chart --- */}
<div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
        <XSquare size={20} className="text-red-400"/> Failed Payments
    </h3>
    <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#374151'}} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="failedOrders" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
</div>

{/* --- NEW SECTION: WoW GROWTH ANALYTICS --- */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
    {/* Revenue Growth Graph */}
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                    <DollarSign size={20} className="text-blue-400"/> Revenue WoW Growth
                </h3>
                <p className="text-xs text-gray-500">Comparing current vs previous {timeRange} days</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${wowData[0]?.growth >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {wowData[0]?.growth >= 0 ? '+' : ''}{wowData[0]?.growth}%
            </span>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[wowData[0]]} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-gray-900 p-4 border border-gray-700 rounded-lg shadow-xl">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-2">Revenue Comparison</p>
                                    <p className="text-white text-sm">Current: <span className="font-bold text-blue-400">₹{payload[0].value}</span></p>
                                    <p className="text-white text-sm">Previous: <span className="font-bold text-gray-400">₹{payload[1].value}</span></p>
                                </div>
                            );
                        }
                        return null;
                    }} />
                    <Bar dataKey="current" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={40} name="Current Period" />
                    <Bar dataKey="previous" fill="#475569" radius={[0, 4, 4, 0]} barSize={40} name="Previous Period" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Current Period</div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><span className="w-3 h-3 bg-gray-600 rounded-full"></span> Previous Period</div>
        </div>
    </div>

    {/* User Growth Graph */}
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                    <Users size={20} className="text-green-400"/> User Base Growth
                </h3>
                <p className="text-xs text-gray-500">Comparing signups WoW</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${wowData[1]?.growth >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {wowData[1]?.growth >= 0 ? '+' : ''}{wowData[1]?.growth}%
            </span>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[wowData[1]]} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                         if (active && payload && payload.length) {
                            return (
                                <div className="bg-gray-900 p-4 border border-gray-700 rounded-lg shadow-xl">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-2">User Comparison</p>
                                    <p className="text-white text-sm">Current: <span className="font-bold text-green-400">{payload[0].value} New</span></p>
                                    <p className="text-white text-sm">Previous: <span className="font-bold text-gray-400">{payload[1].value} New</span></p>
                                </div>
                            );
                        }
                        return null;
                    }} />
                    <Bar dataKey="current" fill="#10b981" radius={[0, 4, 4, 0]} barSize={40} />
                    <Bar dataKey="previous" fill="#475569" radius={[0, 4, 4, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Current Period</div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400"><span className="w-3 h-3 bg-gray-600 rounded-full"></span> Previous Period</div>
        </div>
    </div>
</div>

                {/* Engagement / Time Spent (Detailed Trend) */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                        <Clock size={20} className="text-purple-400"/> User Engagement (Average Minutes on Site)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Line type="stepAfter" dataKey="avgTime" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="mt-4 text-xs text-gray-500 italic">* Engagement time is calculated based on session logs from the customer app.</p>
                </div>
            </div>
        </div>
    );
};

// --- Helper Component for Stat Cards ---
const StatCard = ({ title, value, icon, trend }) => (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg group hover:border-green-500/50 transition-all">
        <div className="flex justify-between items-start">
            <div className="p-3 bg-gray-900 rounded-xl">{icon}</div>
            <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">{trend}</span>
        </div>
        <div className="mt-4">
            <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
            <p className="text-3xl font-black text-white mt-1">{value}</p>
        </div>
    </div>
);

// --- [UPDATED] Admin Order Details Modal ---
const AdminOrderDetailsModal = ({ isOpen, onClose, order }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        if (isOpen && order && order.userId) {
            setIsLoadingUser(true);
            const userDocRef = doc(db, "users", order.userId);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setUserInfo(docSnap.data());
                } else {
                    setUserInfo({ username: 'Unknown User', mobile: 'N/A' });
                }
                setIsLoadingUser(false);
            }).catch(err => {
                console.error("Error fetching user details:", err);
                setIsLoadingUser(false);
            });
        } else {
            setUserInfo(null);
        }
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    const couponVal = (order.subtotal - order.total) - (order.pointsValue || 0);
    const finalCouponValue = Math.max(0, couponVal);

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-700 text-gray-100">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
                        <FileText size={20}/> Order #{order.id.slice(-6).toUpperCase()}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XSquare size={24} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Customer Info Section */}
                    <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">Customer Information</h3>
                        {isLoadingUser ? (
                            <div className="flex items-center gap-2 text-gray-400"><Loader2 className="animate-spin" size={16}/> Loading customer info...</div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-gray-600 pb-1">
                                    <span className="text-gray-400">Name</span>
                                    <span className="font-semibold text-gray-200">{userInfo?.username || 'Guest'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-600 pb-1">
                                    <span className="text-gray-400">Phone</span>
                                    <span className="font-semibold text-gray-200">{userInfo?.mobile || userInfo?.phoneNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Email</span>
                                    <span className="font-semibold text-gray-200">{userInfo?.email || order.userEmail || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Details Section */}
                    <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">Order Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-600 pb-1">
                                <span className="text-gray-400">Delivery Slot</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${order.arrivalTime === 'ASAP' ? 'bg-amber-900/60 text-amber-300' : 'bg-blue-900/60 text-blue-300'}`}>
                                    {order.arrivalTime || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-600 pb-1">
                                <span className="text-gray-400">Payment Method</span>
                                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${order.paymentDetails?.method === 'cod' ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                                    {order.paymentDetails?.method === 'cod' ? 'Cash on Delivery' : 'Online (Prepaid)'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status</span>
                                <span className="font-semibold text-gray-200 capitalize">{order.status?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Items Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Items Ordered</h3>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start border-b border-gray-700 pb-3 last:border-0">
                                    <div>
                                        <p className="font-semibold text-gray-200">{item.quantity} x {item.name}</p>
                                        <p className="text-xs text-gray-500">{item.size} {item.addons && item.addons.length > 0 && `+ ${item.addons.join(', ')}`}</p>
                                    </div>
                                    <p className="font-medium text-gray-300">₹{item.price.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Breakdown Section (Detailed) */}
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">Payment Breakdown</h3>
                        
                        <div className="flex justify-between text-sm text-gray-300 mb-2">
                            <span>Subtotal (Menu Value)</span>
                            <span className="font-medium">₹{order.subtotal?.toFixed(2) || order.total.toFixed(2)}</span>
                        </div>

                        {/* Coupon Row */}
                        {finalCouponValue > 0 && (
                             <div className="flex justify-between text-sm text-yellow-500 mb-1">
                                <span>Coupon Applied {order.couponCode && `(${order.couponCode})`}</span>
                                <span>- ₹{finalCouponValue.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Points Row */}
                        {order.pointsValue > 0 && (
                             <div className="flex justify-between text-sm text-amber-500 mb-1">
                                <span>Points Redeemed ({order.pointsRedeemed} pts)</span>
                                <span>- ₹{order.pointsValue.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-lg font-bold text-white border-t border-gray-600 pt-3 mt-2">
                            <span>Customer Paid</span>
                            <span className="text-blue-400">₹{order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl">
                     <button onClick={onClose} className="w-full bg-gray-700 text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-600 transition-colors">
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Add Expense Modal Component ---
const AddExpenseModal = ({ isOpen, onClose, expenseForm, setExpenseForm, onSave, isSaving }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-gray-100">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
                        <PlusCircle size={20}/> Add Manual Expense
                    </h2>
                    <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-white disabled:opacity-50">
                        <XSquare size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Date</label>
                        <input 
                            type="date" 
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Category/Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Category/Title *</label>
                        <input 
                            type="text" 
                            placeholder="e.g., Marketing, Operations, Salaries"
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Note/Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Description (Optional)</label>
                        <textarea 
                            rows="3"
                            placeholder="Additional details about this expense..."
                            value={expenseForm.note}
                            onChange={(e) => setExpenseForm({...expenseForm, note: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500 resize-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Amount (₹) *</label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                            disabled={isSaving}
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-700 bg-gray-900 rounded-b-2xl flex gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={isSaving}
                        className="flex-1 bg-gray-700 text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={18}/>
                                Saving...
                            </>
                        ) : (
                            'Add Expense'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Burn Rate & Financials View ---
const BurnRateView = () => {
    const [financials, setFinancials] = useState({
        pointsBurn: 0,
        couponBurn: 0,
        pgCharges: 0,
        ordersCount: 0,
        totalRevenue: 0
    });
    const [manualExpenses, setManualExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [detailedRedemptions, setDetailedRedemptions] = useState({ points: [], coupons: [] });
    
    // Expense Modal State
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        note: '',
        amount: ''
    });
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    
    // Date Range State
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Default: last 30 days
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchFinancialData = async () => {
    setIsLoading(true);
    
    try {
        // Create date range for query
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        // Query only with createdAt to avoid composite index requirement
        // We'll filter by status in JavaScript
        const q = query(
            collection(db, "orders"),
            where("createdAt", ">=", Timestamp.fromDate(startDateTime))
        );
        const orderSnap = await getDocs(q);
        
        console.log("Burn Rate Debug: Fetched", orderSnap.size, "orders from", startDate, "to", endDate);

        let points = 0;
        let coupons = 0;
        let revenue = 0;
        let count = 0;
        const pointsOrders = [];
        const couponsOrders = [];
        
        // Group orders by restaurant to calculate PG charges correctly
        const ordersByRestaurant = {};

        orderSnap.forEach(doc => {
            const data = doc.data();
            const orderCreatedAt = data.createdAt?.toDate();
            
            // Filter by status and end date in JavaScript
            if (data.status !== 'completed') {
                return; // Skip non-completed orders
            }
            
            if (!orderCreatedAt || orderCreatedAt > endDateTime) {
                return; // Skip orders outside the date range
            }
            
            const orderTotal = data.total || 0;
            const orderSubtotal = data.subtotal || orderTotal;
            const orderPoints = data.pointsValue || 0;
            const restaurantId = data.restaurantId;

            points += orderPoints;
            revenue += orderTotal;
            
            // Track points redemptions
            if (orderPoints > 0) {
                pointsOrders.push({
                    id: doc.id,
                    customerName: data.userName || 'Customer',
                    customerPhone: data.userPhone || 'N/A',
                    date: orderCreatedAt,
                    pointsUsed: orderPoints,
                    orderTotal: orderTotal,
                    restaurantId: restaurantId
                });
            }
            
            // Coupon discount calculation
            const disc = orderSubtotal - orderTotal - orderPoints;
            if (disc > 0) {
                coupons += disc;
                couponsOrders.push({
                    id: doc.id,
                    customerName: data.userName || 'Customer',
                    customerPhone: data.userPhone || 'N/A',
                    date: orderCreatedAt,
                    couponCode: data.couponCode || 'Unknown',
                    discountAmount: disc,
                    orderTotal: orderTotal,
                    restaurantId: restaurantId
                });
            }
            
            count++;
            
            // Group by restaurant for PG charge calculation
            if (!ordersByRestaurant[restaurantId]) {
                ordersByRestaurant[restaurantId] = 0;
            }
            ordersByRestaurant[restaurantId] += orderTotal;
        });

        console.log("Burn Rate Results: count=", count, "revenue=", revenue, "points=", points, "coupons=", coupons);

        // Calculate PG charges ONLY for restaurants with waiveFee = true
        let pgCharges = 0;
        const restaurantIds = Object.keys(ordersByRestaurant);
        
        for (const rid of restaurantIds) {
            const restoDoc = await getDoc(doc(db, "restaurants", rid));
            const restoData = restoDoc.data();
            
            // Only count PG charges if Snaccit is waiving fees for this restaurant
            if (restoData?.waiveFee === true) {
                const restoRevenue = ordersByRestaurant[rid];
                pgCharges += (restoRevenue * 2.301) / 100; // 2.301% PG fee
            }
        }

        // Fetch Manual Expenses
        const expQ = query(collection(db, "admin_expenses"));
        const expSnap = await getDocs(expQ);
        setManualExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        setFinancials({
            pointsBurn: points,
            couponBurn: coupons,
            pgCharges: pgCharges,
            ordersCount: count,
            totalRevenue: revenue
        });
        
        setDetailedRedemptions({
            points: pointsOrders,
            coupons: couponsOrders
        });
    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        setIsLoading(false);
    }
};

        fetchFinancialData();
    }, [startDate, endDate]);

    // Handle Add Expense
    const handleAddExpense = async () => {
        // Validation
        if (!expenseForm.category.trim()) {
            alert('Please enter a category/title');
            return;
        }
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setIsSavingExpense(true);
        try {
            await addDoc(collection(db, 'admin_expenses'), {
                date: expenseForm.date,
                category: expenseForm.category.trim(),
                note: expenseForm.note.trim(),
                amount: parseFloat(expenseForm.amount),
                createdAt: serverTimestamp()
            });
            
            // Reset form and close modal
            setExpenseForm({
                date: new Date().toISOString().split('T')[0],
                category: '',
                note: '',
                amount: ''
            });
            setIsExpenseModalOpen(false);
            
            // Refresh data
            const expQ = query(collection(db, "admin_expenses"));
            const expSnap = await getDocs(expQ);
            setManualExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Failed to add expense. Please try again.');
        } finally {
            setIsSavingExpense(false);
        }
    };

    // Handle Delete Expense
    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        
        try {
            await deleteDoc(doc(db, 'admin_expenses', expenseId));
            
            // Refresh data
            const expQ = query(collection(db, "admin_expenses"));
            const expSnap = await getDocs(expQ);
            setManualExpenses(expSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense.');
        }
    };

    const totalManualBurn = manualExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const directBurn = financials.pointsBurn + financials.couponBurn + financials.pgCharges;
    const grossBurn = directBurn + totalManualBurn;

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-400" size={32} /></div>;

    return (
        <div className="space-y-8">
            {/* Add Expense Modal */}
            <AddExpenseModal 
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                expenseForm={expenseForm}
                setExpenseForm={setExpenseForm}
                onSave={handleAddExpense}
                isSaving={isSavingExpense}
            />
            
            <div>
                <h1 className="text-3xl font-bold text-gray-100">Burn Rate Tracker</h1>
                
                {/* Date Range Selector */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400 font-medium">From:</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400 font-medium">To:</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-gray-800 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div className="text-xs text-gray-500 italic">
                        {financials.ordersCount} completed orders in selected period
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl">
                    <p className="text-red-400 text-sm font-bold uppercase">Total Burn (Selected Period)</p>
                    <p className="text-4xl font-black text-white mt-2">₹{grossBurn.toFixed(2)}</p>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/50 p-6 rounded-2xl">
                    <p className="text-orange-400 text-sm font-bold uppercase">Discount & PG Burn</p>
                    <p className="text-4xl font-black text-white mt-2">₹{directBurn.toFixed(2)}</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-500/50 p-6 rounded-2xl">
                    <p className="text-blue-400 text-sm font-bold uppercase">Total Revenue (Selected Period)</p>
                    <p className="text-4xl font-black text-white mt-2">₹{financials.totalRevenue.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-orange-400"><ShoppingBag size={20}/> Customer-Side Costs</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                            <span className="text-gray-400 font-medium">Points Redeemed</span>
                            <span className="text-white font-bold">₹{financials.pointsBurn.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                            <span className="text-gray-400 font-medium">Coupon Discounts</span>
                            <span className="text-white font-bold">₹{financials.couponBurn.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                            <div>
                                <span className="text-gray-400 font-medium">PG Charges (Waived Restaurants)</span>
                                <p className="text-xs text-gray-500 mt-0.5">2.301% fee on restaurants where Snaccit covers PG costs</p>
                            </div>
                            <span className="text-white font-bold">₹{financials.pgCharges.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-green-400"><DollarSign size={20}/> Operational & Marketing</h3>
                        <button 
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <PlusCircle size={16}/> Add Expense
                        </button>
                    </div>
                    <div className="flex-1 space-y-3">
                        {manualExpenses.length > 0 ? manualExpenses.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-xl border border-gray-600/50 group">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-200">{exp.category}</p>
                                        {exp.date && <span className="text-xs text-gray-500">({new Date(exp.date).toLocaleDateString()})</span>}
                                    </div>
                                    {exp.note && <p className="text-xs text-gray-500 mt-0.5">{exp.note}</p>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-red-400">-₹{exp.amount}</span>
                                    <button 
                                        onClick={() => handleDeleteExpense(exp.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
                                        title="Delete expense"
                                    >
                                        <XSquare size={18}/>
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 italic mb-3">No manual expenses logged.</p>
                                <button 
                                    onClick={() => setIsExpenseModalOpen(true)}
                                    className="bg-green-600/20 border border-green-600/50 hover:bg-green-600/30 text-green-400 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                                >
                                    + Add Your First Expense
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Detailed Redemptions Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Points Redemptions Table */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-400">
                        <Gift size={20}/> Points Redemptions ({detailedRedemptions.points.length})
                    </h3>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800 border-b border-gray-600">
                                <tr className="text-gray-400 text-xs uppercase">
                                    <th className="pb-3 text-left">Customer</th>
                                    <th className="pb-3 text-left">Date</th>
                                    <th className="pb-3 text-right">Points Used</th>
                                    <th className="pb-3 text-right">Order Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailedRedemptions.points.length > 0 ? (
                                    detailedRedemptions.points.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="py-3">
                                                <p className="font-medium text-gray-200">{item.customerName}</p>
                                                <p className="text-xs text-gray-500">{item.customerPhone}</p>
                                            </td>
                                            <td className="py-3 text-gray-400 text-xs">
                                                {item.date.toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right font-bold text-blue-400">
                                                ₹{item.pointsUsed.toFixed(2)}
                                            </td>
                                            <td className="py-3 text-right text-gray-300">
                                                ₹{item.orderTotal.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-10 text-center text-gray-500 italic">
                                            No points redeemed in this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Coupon Redemptions Table */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-purple-400">
                        <Tag size={20}/> Coupon Redemptions ({detailedRedemptions.coupons.length})
                    </h3>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800 border-b border-gray-600">
                                <tr className="text-gray-400 text-xs uppercase">
                                    <th className="pb-3 text-left">Customer</th>
                                    <th className="pb-3 text-left">Coupon</th>
                                    <th className="pb-3 text-left">Date</th>
                                    <th className="pb-3 text-right">Discount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailedRedemptions.coupons.length > 0 ? (
                                    detailedRedemptions.coupons.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="py-3">
                                                <p className="font-medium text-gray-200">{item.customerName}</p>
                                                <p className="text-xs text-gray-500">{item.customerPhone}</p>
                                            </td>
                                            <td className="py-3">
                                                <span className="text-xs font-mono bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                                                    {item.couponCode}
                                                </span>
                                            </td>
                                            <td className="py-3 text-gray-400 text-xs">
                                                {item.date.toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right font-bold text-purple-400">
                                                ₹{item.discountAmount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-10 text-center text-gray-500 italic">
                                            No coupons redeemed in this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- [FINAL COMPLETE] Payouts & Reports View (With CSV & Full UI) ---
const PayoutsView = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [restaurantData, setRestaurantData] = useState(null); // Live data for fee status
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Date Filters (Defaulting to Last 7 Days)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [reportData, setReportData] = useState(null);
    const [selectedPayoutOrder, setSelectedPayoutOrder] = useState(null); 

    const STANDARD_MDR = 2.301; 

    // 1. Fetch List of Restaurants
    useEffect(() => {
        const q = query(collection(db, "restaurants"), orderBy("name"));
        const unsub = onSnapshot(q, (snapshot) => {
            setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // 2. Listen to Selected Restaurant (For Real-time Fee Status)
    useEffect(() => {
        if (selectedRestaurant) {
            const unsub = onSnapshot(doc(db, "restaurants", selectedRestaurant.id), (doc) => {
                setRestaurantData(doc.data());
            });
            return () => unsub();
        }
    }, [selectedRestaurant]);

    // 3. Toggle Fee Waiver (Saves to DB)
    const toggleFeeWaiver = async () => {
        if (!selectedRestaurant || !restaurantData) return;
        const newValue = !restaurantData.waiveFee;
        
        try {
            await updateDoc(doc(db, "restaurants", selectedRestaurant.id), {
                waiveFee: newValue
            });
        } catch (error) {
            console.error("Failed to update fee status:", error);
            alert("Error updating database.");
        }
    };

    // 4. Generate Report Logic
    const generateReport = async () => {
        if (!selectedRestaurant || !restaurantData) return;
        setIsGenerating(true);
        setReportData(null);
        
        try {
            // Set time boundaries to cover the full selected days
            const start = new Date(startDate); start.setHours(0, 0, 0, 0);
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, "orders"), 
                where("restaurantId", "==", selectedRestaurant.id),
                where("status", "==", "completed")
            );

            const querySnapshot = await getDocs(q);
            
            // Filter by date range in memory (Firestore range queries can be tricky with multiple filters)
            const orders = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }))
                .filter(order => order.createdAt >= start && order.createdAt <= end)
                .sort((a, b) => b.createdAt - a.createdAt);

            // --- CALCULATE FINANCIALS ---
            let totalMenuValue = 0;    
            let totalCustomerPaid = 0; 
            let totalMDRFee = 0;       
            let totalNetPayout = 0;
            let totalDiscountsGiven = 0; 

            // USE DATABASE VALUE: If waiveFee is true, rate is 0. Else 2.301%.
            const isWaived = restaurantData.waiveFee === true; 
            const APPLIED_RATE = isWaived ? 0 : STANDARD_MDR;

            const detailedOrders = orders.map(order => {
                const menuValue = order.subtotal || 0;
                const custPaid = order.total || 0;
                const isCodOrder = order.paymentDetails?.method === 'cod';
                // Discount is difference between Menu Price and what Customer Paid
                const discount = Math.max(0, menuValue - custPaid);
                
                // Fee Calculation - COD orders have NO MDR fee
                const mdrFee = isCodOrder ? 0 : (custPaid * APPLIED_RATE) / 100;
                
                // Payout Calculation
                // For COD: Restaurant already got cash from customer, so we only pay the discount
                // For Online: We pay menu value minus MDR fee
                const netPayout = isCodOrder ? discount : (menuValue - mdrFee);

                totalMenuValue += menuValue;
                totalCustomerPaid += custPaid;
                totalMDRFee += mdrFee;
                totalNetPayout += netPayout;
                totalDiscountsGiven += discount;

                return { ...order, mdrFee, netPayout, totalDiscount: discount, isCodOrder };
            });

            setReportData({
                orders: detailedOrders,
                summary: {
                    totalMenuValue, totalCustomerPaid, totalMDRFee, totalNetPayout,
                    totalDiscountsGiven, orderCount: detailedOrders.length, appliedRate: APPLIED_RATE
                }
            });

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };

    // 5. CSV Downloader Function (Restored)
    const downloadCSV = () => {
        if (!reportData || !selectedRestaurant) return;

        const summary = reportData.summary;
        const isWaived = restaurantData?.waiveFee;

        // 1. Summary Section
        const summaryRows = [
            ["PAYOUT REPORT SUMMARY"],
            ["Restaurant", selectedRestaurant.name],
            ["Period", `${startDate} to ${endDate}`],
            ["Fee Status", isWaived ? "WAIVED (0%)" : `APPLIED (${STANDARD_MDR}%)`],
            [],
            ["Metric", "Amount (INR)"],
            ["Total Sales (Gross)", summary.totalMenuValue.toFixed(2)],
            ["Customer Paid", summary.totalCustomerPaid.toFixed(2)],
            ["Less: MDR Fee", "-" + summary.totalMDRFee.toFixed(2)],
            ["NET SETTLEMENT", summary.totalNetPayout.toFixed(2)],
            [],
            ["TRANSACTION DETAILS"] // Spacer
        ];

        // 2. Headers
        const tableHeaders = ["Date", "Order ID", "Menu Price", "Cust Paid", "Total Discount", "MDR Fee", "Net Payout"];

        // 3. Rows
        const orderRows = reportData.orders.map(order => [
            order.createdAt?.toLocaleDateString() || '',
            order.id,
            order.subtotal.toFixed(2),
            order.total.toFixed(2),
            order.totalDiscount.toFixed(2),
            order.mdrFee.toFixed(2),
            order.netPayout.toFixed(2)
        ]);

        // 4. Generate Blob
        const csvContent = [...summaryRows, tableHeaders, ...orderRows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const filename = `Payout_${selectedRestaurant.name.replace(/ /g, '_')}_${startDate}_to_${endDate}.csv`;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Auto-generate when restaurant or data changes
    useEffect(() => {
        if (selectedRestaurant && restaurantData) generateReport();
    }, [selectedRestaurant, restaurantData]); 

    // --- RENDER ---
    return (
        <div className="h-full flex flex-col">
            {/* Modal for Order Details */}
            <AdminOrderDetailsModal 
                isOpen={!!selectedPayoutOrder} 
                onClose={() => setSelectedPayoutOrder(null)} 
                order={selectedPayoutOrder} 
            />

            <h1 className="text-3xl font-bold text-gray-100 mb-2">Payout Manager</h1>
            <p className="text-gray-400 mb-6">Select a restaurant, choose dates, and manage fee waivers.</p>

            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                
                {/* LEFT: Restaurant List */}
                <div className="w-full lg:w-1/4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                        <h2 className="font-bold text-gray-200">Select Partner</h2>
                    </div>
                    <div className="overflow-y-auto p-2 flex-1">
                        {isLoading ? <Loader2 className="animate-spin mx-auto mt-4 text-green-400"/> : 
                         restaurants.map(r => (
                            <div 
                                key={r.id} 
                                onClick={() => setSelectedRestaurant(r)}
                                className={`p-4 rounded-lg cursor-pointer mb-2 flex justify-between items-center transition-all ${selectedRestaurant?.id === r.id ? 'bg-green-900/40 border border-green-600' : 'bg-gray-700/30 hover:bg-gray-700 border border-transparent'}`}
                            >
                                <span className="font-bold text-gray-200 truncate">{r.name}</span>
                                <ChevronRight size={18} className={`text-gray-500 ${selectedRestaurant?.id === r.id ? 'text-green-400' : ''}`}/>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Report Details */}
                <div className="w-full lg:w-3/4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-[500px]">
                    {!selectedRestaurant || !restaurantData ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <DollarSign size={48} className="mb-4 opacity-50"/>
                            <p>Select a restaurant to begin.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Toolbar: Dates & Toggles */}
                            <div className="p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg space-y-4 md:space-y-0 md:flex md:justify-between md:items-end">
                                
                                {/* Date Selection */}
                                <div className="flex gap-2 items-end">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">From</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">To</label>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded p-2" />
                                    </div>
                                    <button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded ml-2 shadow-lg transition-transform active:scale-95">
                                        <div className="flex items-center gap-1"><Eye size={16}/> View</div>
                                    </button>
                                </div>

                                {/* Fee Waiver & Export */}
                                <div className="flex items-center gap-4">
                                    {/* Real-time DB Toggle */}
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer bg-gray-700 p-2 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors"
                                        onClick={toggleFeeWaiver}
                                        title="Click to toggle fee status for this restaurant"
                                    >
                                        <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ${restaurantData.waiveFee ? 'bg-green-500 justify-end' : 'bg-red-500 justify-start'}`}>
                                            <div className="bg-white w-3 h-3 rounded-full shadow-md"></div>
                                        </div>
                                        <span className={`text-sm font-bold ${restaurantData.waiveFee ? 'text-green-400' : 'text-red-400'}`}>
                                            {restaurantData.waiveFee ? 'Fees Waived' : 'Fees Active'}
                                        </span>
                                    </div>

                                    <button 
                                        onClick={downloadCSV}
                                        disabled={!reportData || reportData.orders.length === 0}
                                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-transform active:scale-95" 
                                    >
                                        <Download size={18}/> <span className="hidden sm:inline">Export</span>
                                    </button>
                                </div>
                            </div>

                            {/* Report Data Area */}
                            {isGenerating ? (
                                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-green-400" size={32}/></div>
                            ) : reportData ? (
                                <div className="flex-1 overflow-y-auto p-6">
                                    
                                    {/* 1. Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Total Sales</p>
                                            <p className="text-2xl font-bold text-white mt-1">₹{reportData.summary.totalMenuValue.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Customer Paid</p>
                                            <p className="text-2xl font-bold text-blue-400 mt-1">₹{reportData.summary.totalCustomerPaid.toFixed(2)}</p>
                                        </div>
                                        
                                        {/* Dynamic Fee Card */}
                                        <div className={`p-4 rounded-xl border ${restaurantData.waiveFee ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                            <p className={`text-xs uppercase font-bold ${restaurantData.waiveFee ? 'text-green-400' : 'text-red-400'}`}>
                                                MDR Fees ({reportData.summary.appliedRate}%)
                                            </p>
                                            <p className={`text-2xl font-bold mt-1 ${restaurantData.waiveFee ? 'text-green-400 line-through' : 'text-red-400'}`}>
                                                ₹{reportData.summary.totalMDRFee.toFixed(2)}
                                            </p>
                                            {restaurantData.waiveFee && <span className="text-xs text-green-300 font-bold">SPONSORED</span>}
                                        </div>

                                        <div className="bg-gradient-to-br from-green-800 to-green-900 p-4 rounded-xl border border-green-500 shadow-lg relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign size={48}/></div>
                                            <p className="text-xs text-green-200 uppercase font-bold">Net Payout</p>
                                            <p className="text-3xl font-black text-white mt-1">₹{reportData.summary.totalNetPayout.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* 2. Detailed Table */}
                                    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-md">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-800 text-gray-400 font-bold uppercase text-xs">
                                                <tr>
                                                    <th className="p-3">Date</th>
                                                    <th className="p-3">Order ID</th>
                                                    <th className="p-3 text-right">Menu Price</th>
                                                    <th className="p-3 text-right">Cust Paid</th>
                                                    <th className="p-3 text-right text-red-400">Fee</th>
                                                    <th className="p-3 text-right text-green-400 font-bold">Net Payout</th>
                                                    <th className="p-3 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {reportData.orders.length > 0 ? reportData.orders.map(order => (
                                                    <tr key={order.id} className="hover:bg-gray-800/50 transition-colors">
                                                        <td className="p-3 text-gray-400">{order.createdAt?.toLocaleDateString()}</td>
                                                        <td className="p-3 font-mono text-xs">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-gray-500">{order.id.slice(0,6)}...</span>
                                                                {order.isCodOrder && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-400 border border-amber-500/30 w-fit">💵 COD</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-medium text-gray-300">₹{order.subtotal}</td>
                                                        <td className="p-3 text-right text-blue-300">₹{order.total}</td>
                                                        <td className="p-3 text-right text-red-400">
                                                            {order.mdrFee > 0 ? `-₹${order.mdrFee.toFixed(2)}` : order.isCodOrder ? <span className="text-amber-400 text-xs font-bold">COD (₹0)</span> : <span className="text-gray-600">-</span>}
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-green-400 bg-green-900/10">₹{order.netPayout.toFixed(2)}</td>
                                                        <td className="p-3 text-center">
                                                            <button 
                                                                onClick={() => setSelectedPayoutOrder(order)} 
                                                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16}/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="7" className="p-8 text-center text-gray-500 italic">No transactions found in this range.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3 text-right">* Net Payout = Menu Price - ({reportData.summary.appliedRate}% of Customer Paid Amount)</p>

                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Updated Restaurant Management View ---
const RestaurantView = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch from "restaurants" collection
        const q = query(collection(db, "restaurants"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const restoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRestaurants(restoData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggleVisibility = async (restoId, currentStatus) => {
        try {
            const restoRef = doc(db, "restaurants", restoId);
            // If it's undefined or true, turn it off (false). If it's false, turn it on (true).
            const nextStatus = currentStatus === false ? true : false;
            
            await updateDoc(restoRef, { 
                isVisible: nextStatus 
            });
        } catch (err) {
            console.error("Error updating visibility:", err);
        }
    };

    const handleToggleCOD = async (restoId, currentStatus) => {
        try {
            const restoRef = doc(db, "restaurants", restoId);
            const nextStatus = currentStatus === true ? false : true;
            
            await updateDoc(restoRef, { 
                codEnabled: nextStatus 
            });
        } catch (err) {
            console.error("Error updating COD status:", err);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-100">Restaurant Visibility</h1>
            
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="p-5">Restaurant Name</th>
                            <th className="p-5 text-center">Show on Main App?</th>
                            <th className="p-5 text-center">COD Enabled?</th>
                            <th className="p-5 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {isLoading ? (
                            <tr><td colSpan="4" className="text-center p-10"><Loader2 className="animate-spin mx-auto text-green-400" /></td></tr>
                        ) : (
                            restaurants.map(resto => (
                                <tr key={resto.id} className="hover:bg-gray-700/30">
                                    <td className="p-5 font-bold text-gray-200">{resto.name}</td>
                                    <td className="p-5">
                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => handleToggleVisibility(resto.id, resto.isVisible)}
                                                className="flex items-center gap-2"
                                            >
                                                {resto.isVisible !== false ? (
                                                    <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
                                                        <ToggleRight size={20} />
                                                        <span className="text-[10px] font-black uppercase">Visible</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-500 bg-gray-500/10 px-3 py-1.5 rounded-full border border-gray-500/20">
                                                        <ToggleLeft size={20} />
                                                        <span className="text-[10px] font-black uppercase">Hidden</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => handleToggleCOD(resto.id, resto.codEnabled)}
                                                className="flex items-center gap-2"
                                            >
                                                {resto.codEnabled === true ? (
                                                    <div className="flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                                                        <ToggleRight size={20} />
                                                        <span className="text-[10px] font-black uppercase">COD ON</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-gray-500 bg-gray-500/10 px-3 py-1.5 rounded-full border border-gray-500/20">
                                                        <ToggleLeft size={20} />
                                                        <span className="text-[10px] font-black uppercase">COD OFF</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className={`px-2 py-1 text-[10px] font-black uppercase rounded ${resto.isOpen !== false ? 'bg-blue-900/40 text-blue-400' : 'bg-red-900/40 text-red-400'}`}>
                                            {resto.isOpen !== false ? 'Open' : 'Closed'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminCashProcessor = () => {
    const [requests, setRequests] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "cash_requests"), where("status", "==", "pending_admin"));
        return onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, []);

    const processToPoints = async (req) => {
    setIsProcessing(true);
    try {
        const userRef = doc(db, "users", req.userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            alert("User profile not found in database.");
            return;
        }

        const currentPoints = userSnap.data()?.points || 0;
        const cashAmount = Number(req.amountConfirmed);
        const pointsToCredit = cashAmount * 10; // <--- Conversion: ₹1 = 10 Points

        // 1. Add multiplied points to user
        await updateDoc(userRef, {
            points: currentPoints + pointsToCredit,
            pointsNotification: {
                amount: pointsToCredit, // User sees "You received 500 points"
                timestamp: serverTimestamp(),
                read: false
            }
        });

        // 2. Mark request as completed
        await updateDoc(doc(db, "cash_requests", req.id), {
            status: 'completed',
            processedBy: auth.currentUser.email,
            pointsIssued: pointsToCredit // Helpful for record keeping
        });

        // 3. Log to points_history
        await addDoc(collection(db, "points_history"), {
            adminEmail: auth.currentUser.email,
            targetUserId: req.userId,
            targetUserName: req.userName,
            pointsChanged: pointsToCredit, // Log the 10x value
            type: 'cash_deposit',
            timestamp: serverTimestamp()
        });

        alert(`Successfully added ${pointsToCredit} points (₹${cashAmount} x 10)!`);
    } catch (error) {
        console.error(error);
        alert("Failed to process points.");
    } finally {
        setIsProcessing(false);
    }
};

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Finalize Cash Deposits</h1>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-black">
                        <tr>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Restaurant</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td className="p-4 text-white font-bold">{req.userName}</td>
                                <td className="p-4 text-gray-400">{req.restaurantName}</td>
                                <td className="p-4 text-green-400 font-black">₹{req.amountConfirmed}</td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => processToPoints(req)}
                                        disabled={isProcessing}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Add {req.amountConfirmed * 10} Points
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PendingApprovalsView = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Query users collection for pending restaurant roles
        const q = query(
            collection(db, "users"), 
            where("role", "==", "restaurant"), 
            where("approvalStatus", "==", "pending")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApprove = async (userId) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                approvalStatus: 'approved'
            });
            alert("Restaurant approved successfully!");
        } catch (err) {
            console.error("Approval error:", err);
            alert("Failed to approve restaurant.");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-100">Pending Registrations</h1>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="p-5">Email</th>
                            <th className="p-5">FSSAI License</th>
                            <th className="p-5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {isLoading ? (
                            <tr><td colSpan="3" className="text-center p-10"><Loader2 className="animate-spin mx-auto text-green-400" /></td></tr>
                        ) : pendingUsers.length === 0 ? (
                            <tr><td colSpan="3" className="text-center p-10 text-gray-500">No pending approvals.</td></tr>
                        ) : (
                            pendingUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-700/30">
                                    <td className="p-5 text-gray-200">{user.email}</td>
                                    <td className="p-5 text-gray-400 font-mono">{user.fssaiLicense}</td>
                                    <td className="p-5">
                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => handleApprove(user.id)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                                            >
                                                Approve Partner
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Customers View ---
const CustomersView = () => {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("email"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const customerUsers = allUsers.filter(user => user.role !== 'admin' && user.role !== 'restaurant');
            setCustomers(customerUsers);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Customer Management</h1>
            <p className="text-gray-400 mt-2">View all registered customers on the platform.</p>
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-4">Email</th>
                                <th className="p-4">Username</th>
                                <th className="p-4">Mobile</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="3" className="text-center p-4">Loading...</td></tr>
                            ) : (
                                customers.map(user => (
                                    <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-4 font-medium">{user.email}</td>
                                        <td className="p-4 text-gray-400">{user.username || 'N/A'}</td>
                                        <td className="p-4 text-gray-400">{user.mobile || 'N/A'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- All Orders View (Updated) ---
const AllOrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null); // Modal State

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toLocaleString()
            }));
            setOrders(allOrders);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const statusColors = {
        pending: 'bg-yellow-900 text-yellow-300',
        accepted: 'bg-blue-900 text-blue-300',
        preparing: 'bg-indigo-900 text-indigo-300',
        ready: 'bg-green-900 text-green-300',
        completed: 'bg-gray-700 text-gray-300',
        declined: 'bg-red-900 text-red-300',
        payment_failed: 'bg-red-900 text-red-300',
    };

    return (
        <div>
            {/* Modal Injection */}
            <AdminOrderDetailsModal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                order={selectedOrder} 
            />

            <h1 className="text-2xl md:text-3xl font-bold text-gray-100">All Orders</h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">A live feed of all orders across the platform.</p>

            {isLoading ? (
                <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 py-12">
                    <Loader2 className="animate-spin" size={20} /> Loading orders...
                </div>
            ) : (
                <>
                    {/* --- Mobile Card Layout (visible below md) --- */}
                    <div className="mt-4 space-y-3 md:hidden">
                        {orders.map(order => (
                            <div key={order.id} 
                                 className="bg-gray-800 rounded-xl p-4 border border-gray-700 active:bg-gray-700/50 transition-colors"
                                 onClick={() => setSelectedOrder(order)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <p className="font-semibold text-gray-100 text-sm truncate">{order.restaurantName}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{order.userEmail}</p>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full capitalize whitespace-nowrap ${statusColors[order.status] || 'bg-gray-700 text-gray-300'}`}>
                                        {order.status?.replace('_', ' ') || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                                    <span className="text-green-400 font-bold text-base">₹{order.total.toFixed(2)}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] text-gray-500">{order.createdAt}</span>
                                        <Eye size={16} className="text-blue-400 flex-shrink-0" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* --- Desktop Table Layout (visible at md and above) --- */}
                    <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Restaurant</th>
                                        <th className="p-4">Customer ID / Email</th>
                                        <th className="p-4">Total</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-4 text-gray-400 text-sm">{order.createdAt}</td>
                                            <td className="p-4 font-medium">{order.restaurantName}</td>
                                            <td className="p-4 text-gray-400">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500 uppercase">ID: {order.userId.slice(0,6)}...</span>
                                                    <span>{order.userEmail}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 font-medium text-green-400">₹{order.total.toFixed(2)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-700 text-gray-300'}`}>
                                                    {order.status?.replace('_', ' ') || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <button 
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-700 transition-colors"
                                                    title="View Full Details"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


// --- Coupons Management View ---
const CouponsView = () => {
    const [coupons, setCoupons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        type: 'fixed',
        value: 0,
        minOrderValue: 0,
        expiryDate: '',
        usageLimit: 'once',
        allowAsap: true
    });

    useEffect(() => {
        const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewCoupon(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        if (!newCoupon.code || !newCoupon.expiryDate || newCoupon.value <= 0) {
            alert("Please fill all fields correctly.");
            return;
        }
        const couponId = newCoupon.code.toUpperCase();
        const couponRef = doc(db, "coupons", couponId);
        
        try {
            await setDoc(couponRef, {
                type: newCoupon.type,
                value: Number(newCoupon.value),
                minOrderValue: Number(newCoupon.minOrderValue),
                usageLimit: newCoupon.usageLimit, 
                allowAsap: newCoupon.allowAsap,
                isActive: true,
                createdAt: serverTimestamp(),
                expiryDate: new Date(newCoupon.expiryDate)
            });
            
            // Reset state
            setNewCoupon({ code: '', type: 'fixed', value: 0, minOrderValue: 0, expiryDate: '', usageLimit: 'once', allowAsap: true });
        } catch (error) {
            console.error("Error creating coupon:", error);
            alert("Failed to create coupon.");
        }
    };

    const handleToggleActive = async (couponId, currentStatus) => {
        const couponRef = doc(db, "coupons", couponId);
        await updateDoc(couponRef, { isActive: !currentStatus });
    };

    const handleDeleteCoupon = async (couponId) => {
        if (window.confirm(`Are you sure you want to delete coupon "${couponId}"? This action cannot be undone.`)) {
            try {
                const couponRef = doc(db, "coupons", couponId);
                await deleteDoc(couponRef);
                alert("Coupon deleted successfully!");
            } catch (error) {
                console.error("Error deleting coupon:", error);
                alert("Failed to delete coupon. Please try again.");
            }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Coupon Management</h1>
            <p className="text-gray-400 mt-2">Create and manage discount codes for users.</p>
            
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-100">Create New Coupon</h2>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    
                    {/* Column 1: Code */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Coupon Code</label>
                        <input name="code" value={newCoupon.code} onChange={handleInputChange} placeholder="e.g. WELCOME50" className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>

                    {/* Column 2: Usage Limit */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Usage Limit</label>
                        <select name="usageLimit" value={newCoupon.usageLimit} onChange={handleInputChange} className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="once">Once Per Mobile Number</option>
                            <option value="unlimited">Unlimited Use</option>
                        </select>
                    </div>

                    {/* Column 3: Type */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Discount Type</label>
                        <select name="type" value={newCoupon.type} onChange={handleInputChange} className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500">
                            <option value="fixed">Fixed Amount (₹)</option>
                            <option value="percentage">Percentage (%)</option>
                        </select>
                    </div>

                    {/* Column 4: Value */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Discount Value</label>
                        <input name="value" type="number" value={newCoupon.value} onChange={handleInputChange} placeholder="0" className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>

                    {/* Column 5: Min Order */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Min Order (₹)</label>
                        <input name="minOrderValue" type="number" value={newCoupon.minOrderValue} onChange={handleInputChange} placeholder="0" className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>

                    {/* Column 6: Expiry */}
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-400 mb-1">Expiry Date</label>
                        <input name="expiryDate" type="date" value={newCoupon.expiryDate} onChange={handleInputChange} className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>

                    {/* Column 7: ASAP Toggle */}
                    <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-700 border border-gray-600 rounded-lg p-2.5 hover:bg-gray-600 transition-colors">
                            <input 
                                name="allowAsap" 
                                type="checkbox" 
                                checked={newCoupon.allowAsap} 
                                onChange={handleInputChange} 
                                className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-xs text-gray-300">Allow for ASAP Orders</span>
                        </label>
                    </div>
                    
                    {/* Submit Button spanning across or sitting in a column */}
                    <div className="md:col-span-3 mt-4">
                        <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2">
                            <PlusCircle size={20}/> Create Coupon
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4 text-gray-100">Existing Coupons</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                                <th className="p-4">Code</th>
                                <th className="p-4">Limit</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Value</th>
                                <th className="p-4">Min Order</th>
                                <th className="p-4">Expires</th>
                                <th className="p-4">ASAP</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="9" className="text-center p-4">Loading...</td></tr>
                            ) : coupons.map(c => (
                                <tr key={c.id} className="border-b border-gray-700 text-gray-300">
                                    <td className="p-4 font-mono font-bold text-white">{c.id}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.usageLimit === 'unlimited' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
                                            {c.usageLimit || 'Once'}
                                        </span>
                                    </td>
                                    <td className="p-4 capitalize">{c.type}</td>
                                    <td className="p-4">{c.type === 'fixed' ? `₹${c.value}` : `${c.value}%`}</td>
                                    <td className="p-4">₹{c.minOrderValue}</td>
                                    <td className="p-4">{c.expiryDate?.toDate ? c.expiryDate.toDate().toLocaleDateString() : 'N/A'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.allowAsap !== false ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'}`}>
                                            {c.allowAsap !== false ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleToggleActive(c.id, c.isActive)} className="flex items-center gap-2 transition-colors">
                                            {c.isActive ? <ToggleRight size={24} className="text-green-400"/> : <ToggleLeft size={24} className="text-gray-500"/>}
                                            <span className={c.isActive ? 'text-green-400' : 'text-gray-500'}>{c.isActive ? 'Active' : 'Inactive'}</span>
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => handleDeleteCoupon(c.id)} 
                                            className="p-2 bg-gray-700 hover:bg-red-600 rounded-lg transition-colors text-gray-400 hover:text-white"
                                            title="Delete Coupon"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Messages / Inbox View ---
const MessagesView = () => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Query the new collection
        const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                // Safety check for date in case serverTimestamp hasn't processed yet
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date() 
            })));
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const markAsRead = async (id, currentStatus) => {
        if (currentStatus !== 'read') {
            await updateDoc(doc(db, "contact_messages", id), { status: 'read' });
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Inbox</h1>
            <p className="text-gray-400 mt-2">Messages from the Contact Us page.</p>

            <div className="mt-8 space-y-4">
                {isLoading ? (
                    <div className="text-center p-8"><Loader2 className="animate-spin text-green-400 mx-auto" /></div>
                ) : messages.length === 0 ? (
                    <div className="bg-gray-800 p-12 rounded-lg text-center border border-gray-700">
                        <Inbox size={48} className="mx-auto text-gray-600 mb-4"/>
                        <p className="text-gray-400">No messages yet.</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div 
                            key={msg.id} 
                            onClick={() => markAsRead(msg.id, msg.status)}
                            className={`bg-gray-800 p-6 rounded-lg border transition-all cursor-pointer ${msg.status === 'unread' ? 'border-l-4 border-l-green-500 border-gray-700 shadow-lg' : 'border-gray-700 opacity-80'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className={`text-lg font-bold ${msg.status === 'unread' ? 'text-white' : 'text-gray-300'}`}>
                                        {msg.subject}
                                    </h3>
                                    <p className="text-sm text-green-400">{msg.name} <span className="text-gray-500">&lt;{msg.email}&gt;</span></p>
                                </div>
                                <span className="text-xs text-gray-500">{msg.createdAt.toLocaleString()}</span>
                            </div>
                            <p className="text-gray-300 mt-2 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                {msg.message}
                            </p>
                            {msg.status === 'unread' && (
                                <div className="mt-2 text-right">
                                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">NEW MESSAGE</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                getDoc(userDocRef).then(userDoc => {
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
                        setUser(user);
                    } else {
                        signOut(auth);
                        setUser(null);
                    }
                    setIsLoading(false);
                });
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={20}/> },
        { id: 'approvals', label: 'Pending Approvals', icon: <CheckSquare size={20}/> },
        { id: 'cashRequests', label: 'Cash Requests', icon: <DollarSign size={20}/> },
        { id: 'orders', label: 'All Orders', icon: <ShoppingBag size={20}/> },
        { id: 'payouts', label: 'Payouts', icon: <DollarSign size={20}/> },
        { id: 'restaurants', label: 'Restaurants', icon: <Store size={20}/> },
        { id: 'customers', label: 'Customers', icon: <Users size={20}/> },
        { id: 'coupons', label: 'Coupons', icon: <Tag size={20}/> },
        { id: 'messages', label: 'Inbox', icon: <Inbox size={20}/> },
        { id: 'burn', label: 'Burn Rate', icon: <DollarSign size={20}/> },
        { id: 'points', label: 'Points', icon: <Gift size={20}/> },
    ];

    const renderView = () => {
        switch(view) {
            case 'dashboard': return <DashboardView />;
            case 'approvals': return <PendingApprovalsView />;
            case 'restaurants': return <RestaurantView />;
            case 'customers': return <CustomersView />;
            case 'orders': return <AllOrdersView />;
            case 'coupons': return <CouponsView />;
            case 'payouts': return <PayoutsView />; 
            case 'messages': return <MessagesView />;
            case 'burn': return <BurnRateView />;
            case 'points': return <PointsManagerView />;
            case 'cashRequests': return <AdminCashProcessor />;
            default: return <DashboardView />;
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen bg-gray-900"><Loader2 className="animate-spin text-green-400" size={48} /></div>;

    return (
        <>
            {!user ? (
                <AdminLoginPage />
            ) : (
                <div className="flex h-screen bg-gray-900 text-gray-300 overflow-hidden">
                    {/* Mobile Sidebar Overlay */}
                    {isSidebarOpen && (
                        <div 
                            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                            onClick={() => setIsSidebarOpen(false)}
                        ></div>
                    )}

                    {/* Sidebar */}
                    <nav className={`
                        fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 shadow-xl transition-transform duration-300 transform
                        lg:relative lg:translate-x-0
                        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    `}>
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-green-400">Snaccit HQ</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400">
                                <XSquare size={24} />
                            </button>
                        </div>
                        <ul className="py-4 overflow-y-auto h-[calc(100vh-160px)]">
                            {navItems.map((item) => (
                                <li 
                                    key={item.id}
                                    onClick={() => { setView(item.id); setIsSidebarOpen(false); }} 
                                    className={`px-6 py-3 flex items-center cursor-pointer transition-colors ${view === item.id ? 'bg-green-600/10 text-green-400 border-r-4 border-green-500' : 'hover:bg-gray-700/50'}`}
                                >
                                    <span className="mr-3">{item.icon}</span> {item.label}
                                </li>
                            ))}
                        </ul>
                        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-700 bg-gray-800">
                            <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">
                                <LogOut className="mr-2" size={16}/>Logout
                            </button>
                        </div>
                    </nav>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                        {/* Mobile Top Header */}
                        <header className="lg:hidden flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                            <button onClick={toggleSidebar} className="p-2 text-gray-400 bg-gray-700 rounded-lg">
                                <Search size={20} /> {/* Or a Menu Icon */}
                            </button>
                            <h2 className="text-xl font-bold text-green-400">Snaccit HQ</h2>
                            <div className="w-10"></div> {/* Spacer */}
                        </header>

                        <main className="flex-1 p-4 md:p-10 overflow-y-auto">
                            {renderView()}
                        </main>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;