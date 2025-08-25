import React, { useState, useEffect } from 'react';
import { ShieldCheck, BarChart2, Store, Users, LogOut, Loader2, CheckSquare, XSquare, ShoppingBag } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, onSnapshot, query, where, updateDoc, orderBy } from "firebase/firestore";

// --- Firebase Configuration ---
// IMPORTANT: Make sure this matches your project's configuration from the Firebase console.
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
                // Success! The onAuthStateChanged listener will handle the redirect.
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
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium">Total Restaurants</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.restaurants}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium">Total Users</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.users}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-gray-400 text-sm font-medium">Total Orders</h3>
                    <p className="text-3xl font-bold text-white mt-2">{stats.orders}</p>
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

// --- All Orders View ---
const AllOrdersView = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allOrders = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate().toLocaleString()
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
            <h1 className="text-3xl font-bold text-gray-100">All Orders</h1>
            <p className="text-gray-400 mt-2">A live feed of all orders across the platform.</p>
            <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-4">Date</th>
                                <th className="p-4">Restaurant</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5" className="text-center p-4">Loading...</td></tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-4 text-gray-400">{order.createdAt}</td>
                                        <td className="p-4 font-medium">{order.restaurantName}</td>
                                        <td className="p-4 text-gray-400">{order.userEmail}</td>
                                        <td className="p-4 font-medium">₹{order.total.toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full capitalize ${statusColors[order.status] || 'bg-gray-700 text-gray-300'}`}>
                                                {order.status}
                                            </span>
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
                            <li onClick={() => setView('restaurants')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'restaurants' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><Store className="mr-3" size={20}/> Restaurants</li>
                            <li onClick={() => setView('customers')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'customers' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><Users className="mr-3" size={20}/> Customers</li>
                            <li onClick={() => setView('orders')} className={`px-6 py-3 flex items-center cursor-pointer ${view === 'orders' ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700/50'}`}><ShoppingBag className="mr-3" size={20}/> All Orders</li>
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
