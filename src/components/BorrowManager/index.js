import React, { useState, useEffect } from 'react';
import { Plus, Search, BookCheck, AlertCircle, History, User, Calendar, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import libraryData from '../../lib-data.json';

const STORAGE_KEY = 'libraryData';
const ROWS_PER_PAGE = 10;

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

const BorrowManager = () => {
  const [books, setBooks] = usePersistentState(`${STORAGE_KEY}_books`, libraryData.books);
  const [users, setUsers] = usePersistentState(`${STORAGE_KEY}_users`, libraryData.users);
  const [borrows, setBorrows] = usePersistentState(`${STORAGE_KEY}_borrows`, libraryData.borrows);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [showBorrowForm, setShowBorrowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [borrowDuration, setBorrowDuration] = useState(14);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  // Initialize data
  useEffect(() => {
    try {
      setIsLoading(false);
    } catch (err) {
      setError(`Failed to initialize library data: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Borrow form handling
  const handleBorrow = (e) => {
    e.preventDefault();
    try {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + borrowDuration);

      const newBorrow = {
        id: Date.now(),
        bookId: parseInt(selectedBook),
        userId: selectedUser,
        userName: users.find(u => u.id === selectedUser)?.name,
        borrowDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        returnDate: null,
        status: 'active'
      };

      setBorrows(prev => [newBorrow,...prev]);
      
      setBooks(prev => prev.map(book => 
        book.id === parseInt(selectedBook) 
          ? { ...book, count: book.count - 1 }
          : book
      ));

      setShowBorrowForm(false);
      setSelectedBook('');
      setSelectedUser('');
      setBorrowDuration(14);
    } catch (err) {
      setError(`Failed to process borrow: ${err.message}`);
    }
  };

  // Return book handling
  const handleReturn = (borrowId) => {
    try {
      const borrow = borrows.find(b => b.id === borrowId);
      if (!borrow) throw new Error('Borrow record not found');

      const today = new Date().toISOString().split('T')[0];

      setBorrows(prev => prev.map(b => 
        b.id === borrowId 
          ? { ...b, returnDate: today, status: 'returned' }
          : b
      ));

      setBooks(prev => prev.map(book => 
        book.id === borrow.bookId 
          ? { ...book, count: book.count + 1 }
          : book
      ));
    } catch (err) {
      setError(`Failed to process return: ${err.message}`);
    }
  };

  // Filter borrows based on search and status
  const filteredBorrows = borrows.filter(borrow => {
    const matchesSearch = 
      borrow.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      books.find(b => b.id === borrow.bookId)?.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'active') return matchesSearch && borrow.status === 'active';
    if (filter === 'overdue') return matchesSearch && borrow.status === 'active' && new Date(borrow.dueDate) < new Date();
    if (filter === 'returned') return matchesSearch && borrow.status === 'returned';
    return matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBorrows.length / ROWS_PER_PAGE);
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentBorrows = filteredBorrows.slice(startIndex, endIndex);

  // Pagination controls
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Check for overdue books
  const overdueCount = borrows.filter(
    borrow => borrow.status === 'active' && new Date(borrow.dueDate) < new Date()
  ).length;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Borrow Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBorrowForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
            disabled={!books.some(book => book.count > 0)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Borrow
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">
              There are {overdueCount} overdue books that need attention.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search borrowers or books..."
            className="pl-10 pr-4 py-2 border rounded-lg w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-4 py-2"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Borrows</option>
          <option value="active">Active</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Borrow Form Modal */}
      {showBorrowForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">New Borrow</h3>
              <button
                onClick={() => setShowBorrowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleBorrow}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <select
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Book</label>
                  <select
                    required
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                    value={selectedBook}
                    onChange={(e) => setSelectedBook(e.target.value)}
                  >
                    <option value="">Select Book</option>
                    {books.filter(book => book.count > 0).map(book => (
                      <option key={book.id} value={book.id}>
                        {book.title} ({book.count} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Borrow Duration (days)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="30"
                    className="mt-1 block w-full border rounded-md px-3 py-2"
                    value={borrowDuration}
                    onChange={(e) => setBorrowDuration(parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Borrow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Borrows Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrow Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentBorrows.map(borrow => {
              const book = books.find(b => b.id === borrow.bookId);
              const isOverdue = borrow.status === 'active' && new Date(borrow.dueDate) < new Date();
              return (
                <tr key={borrow.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {borrow.userName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BookCheck className="h-4 w-4 mr-2 text-gray-400" />
                      {book?.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {borrow.borrowDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {borrow.dueDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        borrow.status === 'returned'
                          ? 'bg-green-100 text-green-800'
                          : isOverdue
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {borrow.status === 'returned'
                        ? 'Returned'
                        : isOverdue
                        ? 'Overdue'
                        : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {borrow.status === 'active' && (
                      <button
                        onClick={() => handleReturn(borrow.id)}
                        className="text-green-600 hover:text-green-900 font-medium text-sm"
                      >
                        Return Book
                      </button>
                    )}
                    {borrow.status === 'returned' && (
                      <span className="text-gray-400 text-sm">
                        Returned on {borrow.returnDate}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Empty State */}
        {filteredBorrows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No borrow records found.</p>
            {searchQuery && (
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your search or filter criteria.
              </p>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredBorrows.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-center border-t border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 text-gray-700 ${
                  currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'hover:text-gray-900'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 text-gray-700 ${
                  currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'hover:text-gray-900'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BorrowManager;