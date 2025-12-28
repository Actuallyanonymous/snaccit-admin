// snaccit-admin/src/App.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    ShieldCheck, BarChart2, Store, Users, LogOut, Loader2, 
    CheckSquare, XSquare, ShoppingBag, Tag, PlusCircle, 
    ToggleLeft, ToggleRight, Eye, FileText, User, Phone, Mail,
    DollarSign, Calendar, ChevronRight, Download, Inbox
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, where, updateDoc, orderBy, setDoc, serverTimestamp, getDocs } from "firebase/firestore";

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

// --- Dashboard View ---
const DashboardView = () => {
    const [stats, setStats] = useState({ restaurants: 0, users: 0, orders: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubRestaurants = onSnapshot(collection(db, "restaurants"), snapshot => {
            setStats(prev => ({ ...prev, restaurants: snapshot.size }));
        });
        const unsubUsers = onSnapshot(collection(db, "users"), snapshot => {
            setStats(prev => ({ ...prev, users: snapshot.size }));
        });
        const unsubOrders = onSnapshot(collection(db, "orders"), snapshot => {
            setStats(prev => ({ ...prev, orders: snapshot.size }));
            setIsLoading(false);
        });

        return () => {
            unsubRestaurants();
            unsubUsers();
            unsubOrders();
        };
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-green-400" size={32} /></div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
            <p className="text-gray-400 mt-2">A high-level overview of your platform's activity.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium">Total Restaurants</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.restaurants}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.users}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h3 className="text-gray-400 text-sm font-medium">Total Orders</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.orders}</p>
                </div>
            </div>
        </div>
    );
};

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

// --- [UPGRADED] Payouts & Reports View (Custom Dates + Fee Waiver) ---
const PayoutsView = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // New State for Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default Today
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);   // Default Today
    const [isFeeWaived, setIsFeeWaived] = useState(false); // Toggle for Waiver

    const [reportData, setReportData] = useState(null);
    const [selectedPayoutOrder, setSelectedPayoutOrder] = useState(null); 

    const STANDARD_MDR = 2.301; 

    // 1. Fetch Restaurants
    useEffect(() => {
        const q = query(collection(db, "restaurants"), orderBy("name"));
        const unsub = onSnapshot(q, (snapshot) => {
            setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // 2. Set Default Date to "Last Week" on load
    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    }, []);

    // 3. Report Generation Logic
    const generateReport = async () => {
        if (!selectedRestaurant) return;
        setIsGenerating(true);
        setReportData(null);
        
        try {
            // Create Date Objects from Inputs (Set time to Start of Day / End of Day)
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const q = query(
                collection(db, "orders"), 
                where("restaurantId", "==", selectedRestaurant.id),
                where("status", "==", "completed")
            );

            const querySnapshot = await getDocs(q);
            
            const rawOrders = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                createdAt: doc.data().createdAt?.toDate() 
            }));

            // Filter by Date Range in Memory
            const orders = rawOrders
                .filter(order => order.createdAt >= start && order.createdAt <= end)
                .sort((a, b) => b.createdAt - a.createdAt);

            // --- CALCULATE FINANCIALS ---
            let totalMenuValue = 0;    
            let totalCustomerPaid = 0; 
            let totalMDRFee = 0;       
            let totalNetPayout = 0;
            let totalDiscountsGiven = 0; 

            // Determine effective rate based on your toggle
            const APPLIED_RATE = isFeeWaived ? 0 : STANDARD_MDR;

            const detailedOrders = orders.map(order => {
                const menuValue = order.subtotal || 0;
                const custPaid = order.total || 0;
                const discount = Math.max(0, menuValue - custPaid);
                
                // Calculate MDR based on toggle
                const mdrFee = (custPaid * APPLIED_RATE) / 100;
                
                // Net Payout
                const netPayout = menuValue - mdrFee;

                totalMenuValue += menuValue;
                totalCustomerPaid += custPaid;
                totalMDRFee += mdrFee;
                totalNetPayout += netPayout;
                totalDiscountsGiven += discount;

                return { ...order, mdrFee, netPayout, totalDiscount: discount };
            });

            setReportData({
                orders: detailedOrders,
                summary: {
                    totalMenuValue,
                    totalCustomerPaid,
                    totalMDRFee,
                    totalNetPayout,
                    totalDiscountsGiven,
                    orderCount: detailedOrders.length,
                    appliedRate: APPLIED_RATE
                }
            });

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- CSV DOWNLOADER ---
    const downloadCSV = () => {
        if (!reportData || !selectedRestaurant) return;

        const summary = reportData.summary;
        
        const summaryRows = [
            ["PAYOUT REPORT SUMMARY"],
            ["Restaurant", selectedRestaurant.name],
            ["Period", `${startDate} to ${endDate}`],
            ["Fee Status", isFeeWaived ? "WAIVED (0%)" : `APPLIED (${STANDARD_MDR}%)`],
            [],
            ["Metric", "Amount (INR)"],
            ["Total Sales", summary.totalMenuValue.toFixed(2)],
            ["Customer Paid", summary.totalCustomerPaid.toFixed(2)],
            ["Less: MDR Fee", "-" + summary.totalMDRFee.toFixed(2)],
            ["NET SETTLEMENT", summary.totalNetPayout.toFixed(2)],
            [],
            ["TRANSACTION DETAILS"] 
        ];

        const tableHeaders = ["Date", "Order ID", "Menu Price", "Cust Paid", "MDR Fee", "Net Payout"];
        
        const orderRows = reportData.orders.map(order => [
            order.createdAt?.toLocaleDateString() || '',
            order.id,
            order.subtotal.toFixed(2),
            order.total.toFixed(2),
            order.mdrFee.toFixed(2),
            order.netPayout.toFixed(2)
        ]);

        const csvContent = [...summaryRows, tableHeaders, ...orderRows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Payout_${selectedRestaurant.name}_${startDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Auto-generate when restaurant changes
    useEffect(() => {
        if (selectedRestaurant) generateReport();
    }, [selectedRestaurant]);

    return (
        <div className="h-full flex flex-col">
            <AdminOrderDetailsModal 
                isOpen={!!selectedPayoutOrder} 
                onClose={() => setSelectedPayoutOrder(null)} 
                order={selectedPayoutOrder} 
            />

            <h1 className="text-3xl font-bold text-gray-100 mb-2">Payout Manager</h1>
            <p className="text-gray-400 mb-6">Generate settlement reports with flexible dates and fee controls.</p>

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
                                className={`p-4 rounded-lg cursor-pointer mb-2 transition-all flex justify-between items-center ${selectedRestaurant?.id === r.id ? 'bg-green-900/40 border border-green-600' : 'bg-gray-700/30 hover:bg-gray-700 border border-transparent'}`}
                            >
                                <span className="font-bold text-gray-200 truncate">{r.name}</span>
                                <ChevronRight size={18} className={`text-gray-500 ${selectedRestaurant?.id === r.id ? 'text-green-400' : ''}`}/>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Report Details */}
                <div className="w-full lg:w-3/4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex flex-col min-h-[500px]">
                    {!selectedRestaurant ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <DollarSign size={48} className="mb-4 opacity-50"/>
                            <p>Select a restaurant to begin.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* --- CONTROLS TOOLBAR --- */}
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
                                    <button onClick={generateReport} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded ml-2">
                                        <div className="flex items-center gap-1"><Eye size={16}/> View</div>
                                    </button>
                                </div>

                                {/* Fee Waiver Toggle & Export */}
                                <div className="flex items-center gap-4">
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer bg-gray-700 p-2 rounded-lg border border-gray-600"
                                        onClick={() => {
                                            setIsFeeWaived(!isFeeWaived);
                                            // Optional: Immediately regenerate when toggled? 
                                            // Better to let user click "View" or use useEffect dependency
                                        }}
                                    >
                                        <div className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ${isFeeWaived ? 'bg-green-500 justify-end' : 'bg-gray-500 justify-start'}`}>
                                            <div className="bg-white w-3 h-3 rounded-full shadow-md"></div>
                                        </div>
                                        <span className={`text-sm font-bold ${isFeeWaived ? 'text-green-400' : 'text-gray-400'}`}>
                                            Waive Fees
                                        </span>
                                    </div>

                                    <button 
                                        onClick={downloadCSV}
                                        disabled={!reportData}
                                        className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg flex items-center gap-2 disabled:opacity-50" 
                                    >
                                        <Download size={18}/> CSV
                                    </button>
                                </div>
                            </div>

                            {/* Report Content */}
                            {isGenerating ? (
                                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-green-400" size={32}/></div>
                            ) : reportData ? (
                                <div className="flex-1 overflow-y-auto p-6">
                                    
                                    {/* 1. Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Orders</p>
                                            <p className="text-2xl font-bold text-white mt-1">{reportData.summary.orderCount}</p>
                                        </div>
                                        <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Total Sales</p>
                                            <p className="text-2xl font-bold text-white mt-1">₹{reportData.summary.totalMenuValue.toFixed(2)}</p>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${isFeeWaived ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                                            <p className={`text-xs uppercase font-bold ${isFeeWaived ? 'text-green-400' : 'text-red-400'}`}>
                                                MDR Fees ({reportData.summary.appliedRate}%)
                                            </p>
                                            <p className={`text-2xl font-bold mt-1 ${isFeeWaived ? 'text-green-400 line-through' : 'text-red-400'}`}>
                                                ₹{reportData.summary.totalMDRFee.toFixed(2)}
                                            </p>
                                            {isFeeWaived && <span className="text-xs text-green-300">WAIVED</span>}
                                        </div>
                                        <div className="bg-gradient-to-br from-green-800 to-green-900 p-4 rounded-xl border border-green-500 shadow-lg">
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
                                                    <th className="p-3">ID</th>
                                                    <th className="p-3 text-right">Menu Price</th>
                                                    <th className="p-3 text-right text-red-400">Fee</th>
                                                    <th className="p-3 text-right text-green-400 font-bold">Net</th>
                                                    <th className="p-3 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700">
                                                {reportData.orders.map(order => (
                                                    <tr key={order.id} className="hover:bg-gray-800/50">
                                                        <td className="p-3 text-gray-400">{order.createdAt?.toLocaleDateString()}</td>
                                                        <td className="p-3 font-mono text-xs text-gray-500">{order.id.slice(0,6)}</td>
                                                        <td className="p-3 text-right font-medium">₹{order.subtotal}</td>
                                                        <td className="p-3 text-right text-red-400">
                                                            {order.mdrFee > 0 ? `-₹${order.mdrFee.toFixed(2)}` : <span className="text-gray-600">-</span>}
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-green-400">₹{order.netPayout.toFixed(2)}</td>
                                                        <td className="p-3 text-center">
                                                            <button onClick={() => setSelectedPayoutOrder(order)} className="text-gray-400 hover:text-white"><Eye size={16}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Restaurant Management View ---
const RestaurantView = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "restaurant"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const restaurantUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRestaurants(restaurantUsers);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApproval = async (userId, newStatus) => {
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, { approvalStatus: newStatus });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Restaurant Management</h1>
            <p className="text-gray-400 mt-2">Approve and manage restaurant partners.</p>
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-4">Email</th>
                                <th className="p-4">FSSAI License</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="4" className="text-center p-4">Loading...</td></tr>
                            ) : (
                                restaurants.map(resto => (
                                    <tr key={resto.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-4 font-medium">{resto.email}</td>
                                        <td className="p-4 text-gray-400">{resto.fssaiLicense}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                                resto.approvalStatus === 'approved' ? 'bg-green-900 text-green-300' :
                                                resto.approvalStatus === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                                                'bg-red-900 text-red-300'
                                            }`}>
                                                {resto.approvalStatus}
                                            </span>
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            {resto.approvalStatus === 'pending' && (
                                                <>
                                                    <button onClick={() => handleApproval(resto.id, 'approved')} className="text-green-400 hover:text-green-300"><CheckSquare size={20}/></button>
                                                    <button onClick={() => handleApproval(resto.id, 'declined')} className="text-red-400 hover:text-red-300"><XSquare size={20}/></button>
                                                </>
                                            )}
                                        </td>
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
    };

    return (
        <div>
            {/* Modal Injection */}
            <AdminOrderDetailsModal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                order={selectedOrder} 
            />

            <h1 className="text-3xl font-bold text-gray-100">All Orders</h1>
            <p className="text-gray-400 mt-2">A live feed of all orders across the platform.</p>
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
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
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center p-4">Loading...</td></tr>
                            ) : (
                                orders.map(order => (
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
                                                {order.status}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
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
        expiryDate: ''
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
        const { name, value } = e.target;
        setNewCoupon(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        if (!newCoupon.code || !newCoupon.expiryDate || newCoupon.value <= 0) {
            alert("Please fill all fields correctly.");
            return;
        }
        const couponId = newCoupon.code.toUpperCase();
        const couponRef = doc(db, "coupons", couponId);
        
        await setDoc(couponRef, {
            type: newCoupon.type,
            value: Number(newCoupon.value),
            minOrderValue: Number(newCoupon.minOrderValue),
            isActive: true,
            createdAt: serverTimestamp(),
            expiryDate: new Date(newCoupon.expiryDate)
        });
        
        setNewCoupon({ code: '', type: 'fixed', value: 0, minOrderValue: 0, expiryDate: '' });
    };

    const handleToggleActive = async (couponId, currentStatus) => {
        const couponRef = doc(db, "coupons", couponId);
        await updateDoc(couponRef, { isActive: !currentStatus });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-100">Coupon Management</h1>
            <p className="text-gray-400 mt-2">Create and manage discount codes for users.</p>
            
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Create New Coupon</h2>
                <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <input name="code" value={newCoupon.code} onChange={handleInputChange} placeholder="Coupon Code (e.g., WELCOME50)" className="bg-gray-700 border border-gray-600 rounded-lg p-2" required />
                    <select name="type" value={newCoupon.type} onChange={handleInputChange} className="bg-gray-700 border border-gray-600 rounded-lg p-2">
                        <option value="fixed">Fixed Amount (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                    </select>
                    <input name="value" type="number" value={newCoupon.value} onChange={handleInputChange} placeholder="Discount Value" className="bg-gray-700 border border-gray-600 rounded-lg p-2" required />
                    <input name="minOrderValue" type="number" value={newCoupon.minOrderValue} onChange={handleInputChange} placeholder="Min Order Value (₹)" className="bg-gray-700 border border-gray-600 rounded-lg p-2" required />
                    <input name="expiryDate" type="date" value={newCoupon.expiryDate} onChange={handleInputChange} className="bg-gray-700 border border-gray-600 rounded-lg p-2" required />
                    <button type="submit" className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"><PlusCircle size={18}/>Create</button>
                </form>
            </div>

            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Existing Coupons</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="border-b border-gray-700"><th className="p-4">Code</th><th className="p-4">Type</th><th className="p-4">Value</th><th className="p-4">Min Order</th><th className="p-4">Expires</th><th className="p-4">Status</th></tr></thead>
                        <tbody>
                            {isLoading ? <tr><td colSpan="6" className="text-center p-4">Loading...</td></tr> : coupons.map(c => (
                                <tr key={c.id} className="border-b border-gray-700">
                                    <td className="p-4 font-mono font-bold">{c.id}</td>
                                    <td className="p-4 capitalize">{c.type}</td>
                                    <td className="p-4">{c.type === 'fixed' ? `₹${c.value}` : `${c.value}%`}</td>
                                    <td className="p-4">₹{c.minOrderValue}</td>
                                    <td className="p-4">{c.expiryDate.toDate().toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <button onClick={() => handleToggleActive(c.id, c.isActive)} className="flex items-center gap-2">
                                            {c.isActive ? <ToggleRight size={24} className="text-green-400"/> : <ToggleLeft size={24} className="text-gray-500"/>}
                                            {c.isActive ? 'Active' : 'Inactive'}
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

    const renderView = () => {
        switch(view) {
            case 'dashboard': return <DashboardView />;
            case 'restaurants': return <RestaurantView />;
            case 'customers': return <CustomersView />;
            case 'orders': return <AllOrdersView />;
            case 'coupons': return <CouponsView />;
            case 'payouts': return <PayoutsView />; 
            case 'messages': return <MessagesView />;
            default: return <DashboardView />;
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900"><Loader2 className="animate-spin text-green-400" size={48} /></div>;
    }

    return (
        <>
            {!user ? (
                <AdminLoginPage />
            ) : (
                <div className="flex min-h-screen bg-gray-900 text-gray-300">
                    <nav className="w-64 bg-gray-800 shadow-lg flex-shrink-0">
                        <div className="p-6 border-b border-gray-700"><h2 className="text-2xl font-bold text-green-400">Snaccit HQ</h2></div>
                        <ul className="py-4">
                            <li onClick={() => setView('dashboard')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'dashboard' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><BarChart2 className="mr-3" size={20}/> Dashboard</li>
                            <li onClick={() => setView('orders')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'orders' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><ShoppingBag className="mr-3" size={20}/> All Orders</li>
                            <li onClick={() => setView('payouts')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'payouts' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><DollarSign className="mr-3" size={20}/> Payouts & Reports</li>
                            <li onClick={() => setView('restaurants')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'restaurants' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><Store className="mr-3" size={20}/> Restaurants</li>
                            <li onClick={() => setView('customers')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'customers' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><Users className="mr-3" size={20}/> Customers</li>
                            <li onClick={() => setView('coupons')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'coupons' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><Tag className="mr-3" size={20}/> Coupons</li>
                            <li onClick={() => setView('messages')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'messages' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}>
        <Inbox className="mr-3" size={20}/> Inbox
    </li>
                        </ul>
                        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-700">
                            <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"><LogOut className="mr-2" size={16}/>Logout</button>
                        </div>
                    </nav>
                    <main className="flex-1 p-10 overflow-y-auto">
                        {renderView()}
                    </main>
                </div>
            )}
        </>
    );
};

export default App;