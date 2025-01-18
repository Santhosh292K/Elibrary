import React, { useState, useEffect } from 'react';
import { Plus, Search, BookCheck, AlertCircle, History, User, Calendar, X, Save, Users, Edit, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import libraryData from '../../lib-data.json';

const STORAGE_KEY = 'libraryData';
const ROWS_PER_PAGE = 10;

// Predefined genres for consistency
const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Mystery',
  'Romance',
  'Fantasy',
  'Biography',
  'History',
  'Children',
  'Self-Help',
  'Other'
];

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
    <div className="flex items-center">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 rounded-md mr-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 rounded-md ml-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  </div>
);

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

const BookManager = () => {
  const [books, setBooks] = usePersistentState(`${STORAGE_KEY}_books`, libraryData.books);
  const [users, setUsers] = usePersistentState(`${STORAGE_KEY}_users`, libraryData.users);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBookPage, setCurrentBookPage] = useState(1);
  const [currentUserPage, setCurrentUserPage] = useState(1);

  // Initialize data on mount
  useEffect(() => {
    try {
      setIsLoading(false);
    } catch (err) {
      setError('Failed to initialize library data');
      setIsLoading(false);
    }
  }, []);

  // User form state
  const initialUserFormState = {
    name: '',
    email: '',
    phone: '',
    memberSince: new Date().toISOString().split('T')[0]
  };

  // Book form state
  const initialFormState = {
    title: '',
    author: '',
    genre: GENRES[0],
    isbn: '',
    year: new Date().getFullYear(),
    count: 1,
  };

  const [userFormData, setUserFormData] = useState(initialUserFormState);
  const [formData, setFormData] = useState(initialFormState);

  // Filter and search books
  const filteredBooks = React.useMemo(() => {
    return books
      .filter(book => {
        const matchesSearch = 
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.isbn.toLowerCase().includes(searchQuery.toLowerCase());

        switch (filter) {
          case 'available':
            return matchesSearch && book.count > 0;
          case 'borrowed':
            return matchesSearch && book.count < book.totalCopies;
          default:
            return matchesSearch;
        }
      });
  }, [books, searchQuery, filter]);

  // Filter and search users
  const filteredUsers = React.useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.phone.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  // Pagination calculations
  const totalBookPages = Math.ceil(filteredBooks.length / ROWS_PER_PAGE);
  const totalUserPages = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);

  const paginatedBooks = filteredBooks.slice(
    (currentBookPage - 1) * ROWS_PER_PAGE,
    currentBookPage * ROWS_PER_PAGE
  );

  const paginatedUsers = filteredUsers.slice(
    (currentUserPage - 1) * ROWS_PER_PAGE,
    currentUserPage * ROWS_PER_PAGE
  );

  // Reset pagination when search/filter changes
  useEffect(() => {
    setCurrentBookPage(1);
  }, [searchQuery, filter]);

  useEffect(() => {
    setCurrentUserPage(1);
  }, [userSearchQuery]);

  // Book handlers
  const handleAddBook = (e) => {
    e.preventDefault();
    try {
      const newBook = {
        id: Date.now(),
        ...formData,
        totalCopies: formData.count
      };
      setBooks(prevBooks => [...prevBooks, newBook]);
      setFormData(initialFormState);
      setShowAddForm(false);
    } catch (err) {
      setError(`Failed to add book: ${err.message}`);
    }
  };

  const handleUpdateBook = (e) => {
    e.preventDefault();
    try {
      setBooks(prevBooks =>
        prevBooks.map(book =>
          book.id === editingBook.id
            ? { ...book, ...formData, totalCopies: Math.max(formData.count, book.totalCopies) }
            : book
        )
      );
      setEditingBook(null);
      setFormData(initialFormState);
      setShowAddForm(false);
    } catch (err) {
      setError(`Failed to update book: ${err.message}`);
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      year: book.year,
      count: book.count
    });
    setShowAddForm(true);
  };

  const handleDeleteBook = (bookId) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      } catch (err) {
        setError(`Failed to delete book: ${err.message}`);
      }
    }
  };

  // User handlers
  const handleAddUser = (e) => {
    e.preventDefault();
    try {
      const newUser = {
        id: Date.now(),
        ...userFormData,
        borrowedBooks: []
      };
      setUsers(prevUsers => [...prevUsers, newUser]);
      setUserFormData(initialUserFormState);
      setShowAddUserForm(false);
    } catch (err) {
      setError(`Failed to add user: ${err.message}`);
    }
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    try {
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === editingUser.id
            ? { ...user, ...userFormData }
            : user
        )
      );
      setEditingUser(null);
      setUserFormData(initialUserFormState);
      setShowAddUserForm(false);
    } catch (err) {
      setError(`Failed to update user: ${err.message}`);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      memberSince: user.memberSince
    });
    setShowAddUserForm(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      } catch (err) {
        setError(`Failed to delete user: ${err.message}`);
      }
    }
  };

  const UsersModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Library Members</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditingUser(null);
                setUserFormData(initialUserFormState);
                setShowAddUserForm(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Member
            </button>
            <button
              onClick={() => setShowUsersModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member Since</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.memberSince}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No members found.</p>
              {userSearchQuery && (
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your search criteria.
                </p>
              )}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentUserPage}
              totalPages={totalUserPages}
              onPageChange={setCurrentUserPage}
            />
          )}
        </div>
      </div>
    </div>
  );

  const AddUserForm = () => {
    // Initial state within the component
    const [localFormData, setLocalFormData] = useState(
      editingUser ? {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        memberSince: editingUser.memberSince
      } : {
        name: '',
        email: '',
        phone: '',
        memberSince: new Date().toISOString().split('T')[0]
      }
    );
  
    // Form submission handler
    const handleSubmit = (e) => {
      e.preventDefault();
      if (editingUser) {
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === editingUser.id
              ? { ...user, ...localFormData }
              : user
          )
        );
        setEditingUser(null);
      } else {
        const newUser = {
          id: Date.now(),
          ...localFormData,
          borrowedBooks: []
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
      }
      setShowAddUserForm(false);
    };
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {editingUser ? 'Edit Member' : 'Add New Member'}
            </h3>
            <button
              onClick={() => {
                setShowAddUserForm(false);
                setEditingUser(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={localFormData.name}
                  onChange={(e) => setLocalFormData(prev => ({...prev, name: e.target.value}))}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={localFormData.email}
                  onChange={(e) => setLocalFormData(prev => ({...prev, email: e.target.value}))}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={localFormData.phone}
                  onChange={(e) => setLocalFormData(prev => ({...prev, phone: e.target.value}))}
                />
              </div>
              <div>
                <label htmlFor="memberSince" className="block text-sm font-medium text-gray-700">Member Since</label>
                <input
                  id="memberSince"
                  type="date"
                  required
                  className="mt-1 block w-full border rounded-md px-3 py-2"
                  value={localFormData.memberSince}
                  onChange={(e) => setLocalFormData(prev => ({...prev, memberSince: e.target.value}))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingUser ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
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
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Book Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUsersModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              View Members
            </button>
            <button
              onClick={() => {
                setEditingBook(null);
                setFormData(initialFormState);
                setShowAddForm(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Book
            </button>
          </div>
        </div>
  
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search books..."
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
            <option value="all">All Books</option>
            <option value="available">Available</option>
            <option value="borrowed">Borrowed</option>
          </select>
        </div>
  
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingBook(null);
                    setFormData(initialFormState);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={editingBook ? handleUpdateBook : handleAddBook}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      id="title"
                      type="text"
                      required
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
                    <input
                      id="author"
                      type="text"
                      required
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.author}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="genre" className="block text-sm font-medium text-gray-700">Genre</label>
                    <select
                      id="genre"
                      required
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.genre}
                      onChange={(e) => setFormData({...formData, genre: e.target.value})}
                    >
                      {GENRES.map(genre => (
                        <option key={genre} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">ISBN</label>
                    <input
                      id="isbn"
                      type="text"
                      required
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.isbn}
                      onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                    <input
                      id="year"
                      type="number"
                      required
                      min="1000"
                      max={new Date().getFullYear()}
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label htmlFor="count" className="block text-sm font-medium text-gray-700">Number of Copies</label>
                    <input
                      id="count"
                      type="number"
                      required
                      min="1"
                      className="mt-1 block w-full border rounded-md px-3 py-2"
                      value={formData.count}
                      onChange={(e) => setFormData({...formData, count: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingBook ? 'Update Book' : 'Add Book'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
  
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBooks.map(book => (
                <tr key={book.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{book.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{book.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{book.genre}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{book.isbn}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{book.count}/{book.totalCopies}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditBook(book)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No books found.</p>
              {searchQuery && (
                <p className="text-gray-400 text-sm mt-1">
                  Try adjusting your search or filter criteria.
                </p>
              )}
            </div>
          )}
  
          {filteredBooks.length > 0 && (
            <Pagination
              currentPage={currentBookPage}
              totalPages={totalBookPages}
              onPageChange={setCurrentBookPage}
            />
          )}
        </div>
  
        {showUsersModal && <UsersModal />}
        {showAddUserForm && <AddUserForm />}
      </div>
    );
  };
  
  export default BookManager;