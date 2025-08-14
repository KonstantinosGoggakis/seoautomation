import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [siteUrl, setSiteUrl] = useState('');
    const [pageId, setPageId] = useState('');
    const [rewrittenSentences, setRewrittenSentences] = useState({});
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [appPassword, setAppPassword] = useState('');
    const [availablePages, setAvailablePages] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // New loading state

    const fetchPageIds = async () => {
        try {
            const response = await axios.post('http://localhost:5000/api/pages', {
                siteUrl,
                username,
                appPassword
            });
            if (response.data.pageIds) {
                setAvailablePages(response.data.pageIds);
            } else {
                setError('Failed to fetch available page IDs.');
            }
        } catch (err) {
            setError("Error fetching available pages: " + err.message);
        }
    };

    const handleFetchSentences = async () => {
        if (!siteUrl || !pageId) {
            setError("Both Site URL and Page ID are required.");
            return;
        }

        setError('');
        setIsLoading(true); // Start loading
        try {
            const response = await axios.post('http://localhost:5000/api/fetch', {
                siteUrl,
                pageId,
                username,
                appPassword,
            });

            setRewrittenSentences(response.data.rewritten);
        } catch (err) {
            setError("Error fetching sentences: " + err.message);
        } finally {
            setIsLoading(false); // Stop loading
        }
    };

    return (
        <div>
            {!isLoggedIn ? (
                <div className="card">
                    <h2>🔐 Secure login required.</h2>

                    <label>
                        WordPress Site URL:
                        <input
                            type="text"
                            value={siteUrl}
                            onChange={(e) => setSiteUrl(e.target.value)}
                            placeholder="your-site.com"
                            style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem' }}
                        />
                    </label>

                    <label>
                        Username:
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your-username"
                            style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem' }}
                        />
                    </label>

                    <label>
                        Application Password:
                        <input
                            type="password"
                            value={appPassword}
                            onChange={(e) => setAppPassword(e.target.value)}
                            placeholder="••••••••••"
                            style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem' }}
                        />
                    </label>

                    <button
                        onClick={() => {
                            if (username && appPassword && siteUrl) {
                                setIsLoggedIn(true);
                                fetchPageIds();
                            } else {
                                alert("Please fill in all fields.");
                            }
                        }}
                        style={{ marginTop: '1.5rem' }}
                    >
                        Login
                    </button>
                </div>
            ) : (
                <div>
                    <h1>🚀 SEO Sentence Rewriter</h1>
                    <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                        Enhance your content with AI-optimized rewriting for better SERP rankings.
                    </p>

                    <div className="card">
                        <label style={{ display: 'block', fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Page ID:
                        </label>
                        <select
                            value={pageId}
                            onChange={(e) => setPageId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '1rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                backgroundColor: '#f9fafb',
                                color: '#4b5563',
                                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                                transition: 'border-color 0.3s ease',
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        >
                            <option value="">Select Page</option>
                            {availablePages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    Page ID: {page.id} - {page.title}
                                </option>
                            ))}
                        </select>

                        {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}

                        {isLoading ? (
                            <p style={{ marginTop: '1.5rem', color: '#3b82f6' }}>Loading, please wait...</p>
                        ) : (
                            <button onClick={handleFetchSentences} style={{ marginTop: '1.5rem' }}>
                                Fetch & Rewrite
                            </button>
                        )}
                    </div>

                    {Object.keys(rewrittenSentences).length > 0 && (
                        <div className="card">
                            <h2>✨ Rewritten Sentences</h2>
                            <ul>
                                {Object.entries(rewrittenSentences).map(([original, rewritten]) => (
                                    <li key={original}>
                                        <p><strong>Original:</strong> {original}</p>
                                        <p style={{ color: '#22c55e' }}><strong>Rewritten:</strong> {rewritten}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
