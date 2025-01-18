import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend, ResponsiveContainer } from 'recharts';
import { Book, Users, AlertCircle, BookOpen, TrendingUp, CircleDollarSign } from 'lucide-react';
import libraryData from '../../lib-data.json';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B', '#4ECDC4'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORAGE_KEY = 'libraryData';

// Custom hook for persistent state
const usePersistentState = (key, initialData) => {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialData;
    } catch {
      return initialData;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
};

const Dashboard = () => {
  const [timeframe, setTimeframe] = useState('monthly');
  const [books] = usePersistentState(`${STORAGE_KEY}_books`, libraryData.books);
  const [users] = usePersistentState(`${STORAGE_KEY}_users`, libraryData.users);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate all stats using useMemo for performance
  const stats = useMemo(() => {
    try {
      // If we don't have books or users data yet, return null
      if (!books || !users) {
        return null;
      }

      // Basic stats
      const totalBooks = books.length;
      const availableBooks = books.reduce((acc, book) => acc + (book.count || 0), 0);
      const totalCopies = books.reduce((acc, book) => acc + (book.totalCopies || 0), 0);
      const borrowedBooks = totalCopies - availableBooks;
      const overdueBooks = Math.floor(borrowedBooks * 0.1); // Mock data

      // Genre distribution
      const genreDistribution = books.reduce((acc, book) => {
        if (book.genre) {
          acc[book.genre] = (acc[book.genre] || 0) + 1;
        }
        return acc;
      }, {});

      const popularGenres = Object.entries(genreDistribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      // Calculate unique authors
      const authors = new Set(books.filter(book => book.author).map(book => book.author));

      // Generate borrowing trends based on timeframe
      const currentMonth = new Date().getMonth();
      const borrowingTrend = MONTHS.map((month, index) => ({
        month,
        borrowings: Math.floor(Math.random() * 50) + 20,
        returns: Math.floor(Math.random() * 40) + 15,
        active: index <= currentMonth
      })).filter(data => data.active);

      // User activity
      const userActivity = [
        { name: 'New Members', value: users.length },
        { name: 'Active Borrowers', value: Math.floor(users.length * 0.7) },
        { name: 'Inactive Members', value: Math.floor(users.length * 0.3) }
      ];

      // Books by year
      const booksByYear = books.reduce((acc, book) => {
        if (book.year) {
          acc[book.year] = (acc[book.year] || 0) + 1;
        }
        return acc;
      }, {});

      const yearlyTrends = Object.entries(booksByYear)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year)
        .slice(-10);

      return {
        totalBooks,
        availableBooks,
        borrowedBooks,
        overdueBooks,
        totalAuthors: authors.size,
        totalGenres: Object.keys(genreDistribution).length,
        popularGenres,
        borrowingTrend,
        userActivity,
        yearlyTrends,
        totalMembers: users.length
      };
    } catch (err) {
      setError('Error calculating statistics');
      return null;
    }
  }, [books, users, timeframe]);

  // Update loading state when data is ready
  useEffect(() => {
    // Set a small timeout to ensure the UI has time to render
    const timer = setTimeout(() => {
      if (books && users && stats) {
        setIsLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [books, users, stats]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Library Dashboard</h2>
        <select
          className="border rounded-lg px-4 py-2"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Book className="h-8 w-8 text-blue-500 mr-3" />}
          title="Total Books"
          value={stats.totalBooks}
        />
        <StatCard
          icon={<BookOpen className="h-8 w-8 text-green-500 mr-3" />}
          title="Available Books"
          value={stats.availableBooks}
        />
        <StatCard
          icon={<Users className="h-8 w-8 text-purple-500 mr-3" />}
          title="Borrowed Books"
          value={stats.borrowedBooks}
        />
        <StatCard
          icon={<AlertCircle className="h-8 w-8 text-red-500 mr-3" />}
          title="Overdue Books"
          value={stats.overdueBooks}
          alert
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Genre Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.popularGenres}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {stats.popularGenres.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Borrowing Trends">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.borrowingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="borrowings" stroke="#8884d8" name="Borrowings" />
              <Line type="monotone" dataKey="returns" stroke="#82ca9d" name="Returns" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Member Status Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {stats.userActivity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Books by Publication Year">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.yearlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" name="Books" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="h-8 w-8 text-blue-500" />}
          title="Total Authors"
          value={stats.totalAuthors}
          minimal
        />
        <StatCard
          icon={<Book className="h-8 w-8 text-green-500" />}
          title="Total Genres"
          value={stats.totalGenres}
          minimal
        />
        <StatCard
          icon={<Users className="h-8 w-8 text-yellow-500" />}
          title="Total Members"
          value={stats.totalMembers}
          minimal
        />
      </div>
    </div>
  );
};

// Reusable components
const StatCard = ({ icon, title, value, alert, minimal }) => (
  <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
    <div className={`flex items-center ${minimal ? 'justify-between' : ''}`}>
      {icon}
      <div>
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <p className={`text-2xl font-bold ${alert ? 'text-red-500' : ''}`}>{value}</p>
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-lg font-medium mb-4">{title}</h3>
    {children}
  </div>
);

export default Dashboard;