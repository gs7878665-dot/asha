import React, { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, 
  PlusCircle, 
  Search, 
  Users, 
  Calendar, 
  User, 
  Activity, 
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

function App() {
  // Form State
  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formAsha, setFormAsha] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Suggestions for ASHA input in Form
  const [ashaSuggestions, setAshaSuggestions] = useState([]);
  const [showFormSuggestions, setShowFormSuggestions] = useState(false);

  // Search State
  const [searchAsha, setSearchAsha] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeSearchAsha, setActiveSearchAsha] = useState('');

  // Loaded ASHA list (cached from API)
  const [allAshas, setAllAshas] = useState([]);

  // Result & Metrics State
  const [searchResult, setSearchResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Refs for closing suggestion dropdowns on click outside
  const formSuggestionRef = useRef(null);
  const searchSuggestionRef = useRef(null);

  // Fetch unique ASHAs list on mount
  useEffect(() => {
    fetchAshasList();
  }, []);

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (formSuggestionRef.current && !formSuggestionRef.current.contains(event.target)) {
        setShowFormSuggestions(false);
      }
      if (searchSuggestionRef.current && !searchSuggestionRef.current.contains(event.target)) {
        setShowSearchSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchAshasList = async () => {
    try {
      const response = await fetch('/api/ashas');
      if (response.ok) {
        const data = await response.json();
        setAllAshas(data);
      }
    } catch (err) {
      console.error('Error fetching ASHA list:', err);
    }
  };

  const fetchReferralsForAsha = async (ashaName) => {
    if (!ashaName || ashaName.trim() === '') return;
    setIsLoading(true);
    setApiError('');
    try {
      const response = await fetch(`/api/patients/by-asha?asha_name=${encodeURIComponent(ashaName.trim())}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResult(data);
        setActiveSearchAsha(ashaName.trim());
      } else {
        setApiError(data.error || 'Failed to fetch referral records.');
      }
    } catch (err) {
      setApiError('Network connection failed. Make sure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formName.trim()) {
      addToast('Patient name is required.', 'error');
      return;
    }
    if (!formAge || isNaN(formAge) || parseInt(formAge) <= 0 || parseInt(formAge) > 120) {
      addToast('Please enter a valid age (1-120).', 'error');
      return;
    }
    if (!formAsha.trim()) {
      addToast('ASHA name is required.', 'error');
      return;
    }
    if (!formDate) {
      addToast('Please select a valid date.', 'error');
      return;
    }

    const payload = {
      name: formName,
      age: parseInt(formAge),
      gender: formGender,
      asha_name: formAsha,
      date_referred: formDate
    };

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok) {
        addToast('Patient referral recorded successfully!');
        
        // Reset form except ASHA name (for convenience if entering multiple patients for same ASHA)
        setFormName('');
        setFormAge('');
        
        // Refresh local cache of ASHA list
        fetchAshasList();

        // If the added patient is for the currently viewed ASHA in search, refresh search data
        if (activeSearchAsha.toLowerCase() === formAsha.trim().toLowerCase()) {
          fetchReferralsForAsha(activeSearchAsha);
        }
      } else {
        addToast(data.error || 'Failed to save referral.', 'error');
      }
    } catch (err) {
      addToast('Failed to connect to backend server.', 'error');
    }
  };

  // Filter ASHA suggestions based on input
  const getFilteredSuggestions = (input) => {
    if (!input) return [];
    return allAshas.filter(asha => 
      asha.toLowerCase().includes(input.toLowerCase())
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchAsha.trim()) {
      addToast('Please enter or select an ASHA name.', 'error');
      return;
    }
    fetchReferralsForAsha(searchAsha);
    setShowSearchSuggestions(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <Stethoscope className="brand-icon" size={32} />
          <h1>ASHA Patient Referral Portal</h1>
        </div>
        <div className="header-meta">
          <div className="status-indicator">
            <span className="status-dot"></span>
            Database Connected
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-grid">
        
        {/* Left Column: Form Card */}
        <section className="glass-card">
          <h2 className="card-title">
            <PlusCircle size={22} />
            New Referral Form
          </h2>

          <form onSubmit={handleFormSubmit} noValidate>
            
            {/* Patient Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="patient-name">Patient Name</label>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  id="patient-name"
                  className="form-input" 
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <User className="input-icon" size={18} />
              </div>
            </div>

            {/* Age */}
            <div className="form-group">
              <label className="form-label" htmlFor="patient-age">Age (in years)</label>
              <div className="input-wrapper">
                <input 
                  type="number" 
                  id="patient-age"
                  className="form-input" 
                  placeholder="e.g. 45"
                  value={formAge}
                  onChange={(e) => setFormAge(e.target.value)}
                  min="1"
                  max="120"
                  required
                />
                <Activity className="input-icon" size={18} />
              </div>
            </div>

            {/* Gender Select (Radio) */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <div className="gender-selector">
                {['Male', 'Female', 'Other'].map(option => (
                  <div key={option} className="gender-option">
                    <input 
                      type="radio" 
                      id={`gender-${option.toLowerCase()}`}
                      name="gender" 
                      value={option}
                      checked={formGender === option}
                      onChange={() => setFormGender(option)}
                    />
                    <label className="gender-label" htmlFor={`gender-${option.toLowerCase()}`}>
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Referring ASHA Name */}
            <div className="form-group" ref={formSuggestionRef}>
              <label className="form-label" htmlFor="asha-name">Referring ASHA Name</label>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  id="asha-name"
                  className="form-input" 
                  placeholder="e.g. Sunita Devi"
                  value={formAsha}
                  onChange={(e) => {
                    setFormAsha(e.target.value);
                    setShowFormSuggestions(true);
                  }}
                  onFocus={() => setShowFormSuggestions(true)}
                  required
                  autoComplete="off"
                />
                <UserCheck className="input-icon" size={18} />
              </div>

              {/* Suggestions Dropdown */}
              {showFormSuggestions && getFilteredSuggestions(formAsha).length > 0 && (
                <div className="suggestions-list">
                  {getFilteredSuggestions(formAsha).map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className="suggestion-item"
                      onClick={() => {
                        setFormAsha(suggestion);
                        setShowFormSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="referral-date">Date of Reference</label>
              <div className="input-wrapper">
                <input 
                  type="date" 
                  id="referral-date"
                  className="form-input" 
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
                <Calendar className="input-icon" size={18} />
              </div>
            </div>

            <button type="submit" className="btn-primary" id="btn-submit-referral">
              <PlusCircle size={18} />
              Record Referral
            </button>

          </form>
        </section>

        {/* Right Column: Search Directory & Results */}
        <section className="glass-card">
          <h2 className="card-title">
            <Search size={22} />
            ASHA Referral Directory & Analytics
          </h2>

          {/* Search Header */}
          <form onSubmit={handleSearchSubmit} className="lookup-header" noValidate>
            <div className="form-group" ref={searchSuggestionRef}>
              <label className="form-label" htmlFor="search-asha-input">Search by ASHA Name</label>
              <div className="input-wrapper">
                <input 
                  type="text" 
                  id="search-asha-input"
                  className="form-input" 
                  placeholder="Type or select ASHA name..."
                  value={searchAsha}
                  onChange={(e) => {
                    setSearchAsha(e.target.value);
                    setShowSearchSuggestions(true);
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  autoComplete="off"
                />
                <Search className="input-icon" size={18} />
              </div>

              {/* Suggestions Dropdown */}
              {showSearchSuggestions && getFilteredSuggestions(searchAsha).length > 0 && (
                <div className="suggestions-list">
                  {getFilteredSuggestions(searchAsha).map((suggestion, idx) => (
                    <div 
                      key={idx}
                      className="suggestion-item"
                      onClick={() => {
                        setSearchAsha(suggestion);
                        setShowSearchSuggestions(false);
                        fetchReferralsForAsha(suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" className="search-btn" id="btn-search-asha">
              <Search size={18} />
              Find Records
            </button>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="shimmer-container">
              <div className="shimmer-line" style={{ width: '40%', height: '30px', marginBottom: '1.5rem' }}></div>
              <div className="shimmer-line" style={{ height: '80px', marginBottom: '1.5rem' }}></div>
              <div className="shimmer-line" style={{ height: '200px' }}></div>
            </div>
          )}

          {/* Error State */}
          {apiError && !isLoading && (
            <div className="alert-banner alert-error">
              <AlertTriangle size={20} />
              <span>{apiError}</span>
            </div>
          )}

          {/* Results Display */}
          {!isLoading && !apiError && searchResult && (
            <div className="search-results-section" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={20} style={{ color: 'var(--secondary)' }} />
                  Referrals by ASHA: <span style={{ color: 'var(--primary)' }}>{searchResult.asha_name}</span>
                </h3>
              </div>

              {/* Metrics */}
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">Total Referrals</div>
                  <div className="metric-value highlight">{searchResult.totalReferrals}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Avg. Patient Age</div>
                  <div className="metric-value">{searchResult.averageAge} yrs</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Gender Split</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>Male: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{searchResult.genderStats.Male}</span></div>
                    <div>Female: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{searchResult.genderStats.Female}</span></div>
                    {searchResult.genderStats.Other > 0 && (
                      <div>Other: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{searchResult.genderStats.Other}</span></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient Table */}
              {searchResult.patients.length > 0 ? (
                <div className="table-container">
                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>Patient Name</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Date of Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.patients.map((patient) => (
                        <tr key={patient.id}>
                          <td style={{ fontWeight: 500 }}>{patient.name}</td>
                          <td>{patient.age}</td>
                          <td>
                            <span className={`badge badge-${patient.gender.toLowerCase()}`}>
                              {patient.gender}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Calendar size={14} />
                              {patient.date_formatted}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <Users className="empty-state-icon" size={48} />
                  <p>No patients recorded for this ASHA activist yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Initial/Empty Search Placeholder */}
          {!isLoading && !apiError && !searchResult && (
            <div className="empty-state">
              <Users className="empty-state-icon" size={48} />
              <h3 style={{ color: 'var(--text-main)', fontWeight: 500 }}>No ASHA Selected</h3>
              <p>Type or select an ASHA's name above to see their total referral count and patient registry.</p>
              
              {/* Show list of available ASHAs if any exist */}
              {allAshas.length > 0 && (
                <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '300px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'left' }}>
                    Quick-Select Registered ASHAs
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    {allAshas.slice(0, 5).map((asha, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchAsha(asha);
                          fetchReferralsForAsha(asha);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--primary)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'var(--transition-smooth)'
                        }}
                        className="quick-select-btn"
                      >
                        {asha}
                        <ChevronRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast toast-${toast.type}`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
            )}
            <div className="toast-content">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
