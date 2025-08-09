import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Filter, TrendingUp, Users, Zap, Shield, Heart, Sword, Book, Loader2 } from 'lucide-react';
import './App.css';

// ESO Logs API Configuration
const ESO_API_CONFIG = {
  baseURL: 'https://www.esologs.com/api/v2/client',
  // !!! PLACE YOUR CREDENTIALS HERE FOR TESTING !!!
  // These will be PUBLICLY VISIBLE in the browser's source code.
  clientId: 'YOUR_CLIENT_ID_HERE',
  clientSecret: 'YOUR_CLIENT_SECRET_HERE'
};

// API Service Functions
class ESOLogsAPI {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      // Use btoa to create a Base64 encoded string for Basic Auth
      const authString = btoa(`${ESO_API_CONFIG.clientId}:${ESO_API_CONFIG.clientSecret}`);

      // This is the correct authentication method for the ESO Logs API
      const response = await fetch('https://www.esologs.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`,
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('ESO Logs API Authentication Error:', error);
      throw error;
    }
  }

  async makeGraphQLRequest(query, variables = {}) {
    const token = await this.authenticate();
    
    try {
      const response = await fetch(ESO_API_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error('ESO Logs API Request Error:', error);
      throw error;
    }
  }

  async getClassStatistics(startTime, endTime, encounterIDs = []) {
    const query = `
      query ClassStatistics($startTime: Float!, $endTime: Float!, $encounterIDs: [Int]) {
        reportData {
          reports(
            startTime: $startTime
            endTime: $endTime
            encounterIDs: $encounterIDs
            gameID: 2
          ) {
            data {
              fights {
                encounterID
                difficulty
                kill
                classComposition {
                  id
                  name
                  type
                  specs {
                    spec
                    count
                  }
                }
              }
              players {
                id
                name
                type
                classID
                specs {
                  spec
                  role
                }
              }
            }
          }
        }
      }
    `;

    return this.makeGraphQLRequest(query, {
      startTime,
      endTime,
      encounterIDs
    });
  }

  async getRankings(encounterID, difficulty, startTime, endTime) {
    const query = `
      query Rankings($encounterID: Int!, $difficulty: Int, $startTime: Float!, $endTime: Float!) {
        worldData {
          encounter(id: $encounterID) {
            characterRankings(
              difficulty: $difficulty
              startTime: $startTime
              endTime: $endTime
              gameID: 2
            )
          }
        }
      }
    `;

    return this.makeGraphQLRequest(query, {
      encounterID,
      difficulty,
      startTime,
      endTime
    });
  }
}

// Initialize API instance
const esoAPI = new ESOLogsAPI();

// ESO Class Colors
const CLASS_COLORS = {
  'Arcanist': '#00cc99',
  'Dragonknight': '#cc6600', 
  'Necromancer': '#9966cc',
  'Sorcerer': '#3399cc',
  'Warden': '#66cc00',
  'Templar': '#cccc00',
  'Nightblade': '#cc3366'
};

// Role Colors matching your image
const ROLE_COLORS = {
  tank: '#cc6666',
  healer: '#cccc66',
  stamina: '#66cc66',
  magicka: '#6699cc'
};

// Mock data structured like your image
const mockClassData = {
  classPlayrates: [
    { 
      class: 'Arcanist', 
      total: 42.36,
      tank: 1.36, 
      healer: 1.99, 
      stamina: 40.90, 
      magicka: 0 
    },
    { 
      class: 'Dragonknight', 
      total: 16.37,
      tank: 4.78, 
      healer: 0, 
      stamina: 3.62, 
      magicka: 8.37 
    },
    { 
      class: 'Necromancer', 
      total: 12.12,
      tank: 4.71, 
      healer: 1.99, 
      stamina: 5.74, 
      magicka: 0.28 
    },
    { 
      class: 'Warden', 
      total: 7.78,
      tank: 0, 
      healer: 7.78, 
      stamina: 0, 
      magicka: 0 
    },
    { 
      class: 'Sorcerer', 
      total: 7.94,
      tank: 3.23, 
      healer: 0.87, 
      stamina: 3.84, 
      magicka: 0 
    },
    { 
      class: 'Templar', 
      total: 7.13,
      tank: 1.28, 
      healer: 2.86, 
      stamina: 0, 
      magicka: 1.29 
    },
    { 
      class: 'Nightblade', 
      total: 2.86,
      tank: 0, 
      healer: 2.86, 
      stamina: 0, 
      magicka: 0 
    }
  ],
  tankBreakdown: [
    { class: 'Dragonknight', percentage: 33.01 },
    { class: 'Necromancer', percentage: 32.52 },
    { class: 'Sorcerer', percentage: 22.33 },
    { class: 'Arcanist', percentage: 9.39 },
    { class: 'Nightblade', percentage: 1.13 },
    { class: 'Warden', percentage: 0.97 },
    { class: 'Templar', percentage: 0.65 }
  ],
  healerBreakdown: [
    { class: 'Warden', percentage: 45.23 },
    { class: 'Nightblade', percentage: 16.62 },
    { class: 'Arcanist', percentage: 11.58 },
    { class: 'Necromancer', percentage: 11.58 },
    { class: 'Templar', percentage: 9.26 },
    { class: 'Sorcerer', percentage: 5.04 },
    { class: 'Dragonknight', percentage: 0.68 }
  ],
  dpsBreakdown: [
    { class: 'Arcanist', percentage: 60.07 },
    { class: 'Dragonknight', percentage: 17.84 },
    { class: 'Necromancer', percentage: 8.92 },
    { class: 'Templar', percentage: 6.07 },
    { class: 'Sorcerer', percentage: 5.00 },
    { class: 'Warden', percentage: 1.82 },
    { class: 'Nightblade', percentage: 0.38 }
  ]
};

// Helper function to process API data
const processClassData = (apiData) => {
  // This function would convert ESO Logs API response to your chart format
  // For now, return mock data until you implement the API processing
  return mockClassData;
};

// Custom hook for ESO data
const useESOData = (selectedUpdate) => {
  const [data, setData] = useState(mockClassData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date ranges for each update (adjust these based on actual ESO update dates)
  const UPDATE_DATE_RANGES = {
    'U42': { start: 1677628800000, end: 1685491200000 }, // Mar 2023 - May 2023
    'U43': { start: 1685491200000, end: 1693353600000 }, // Jun 2023 - Aug 2023
    'U44': { start: 1693353600000, end: 1701216000000 }, // Sep 2023 - Nov 2023
    'U45': { start: 1701216000000, end: 1709078400000 }, // Dec 2023 - Feb 2024
    'U46': { start: 1709078400000, end: Date.now() }      // Mar 2024 - Present
  };

  useEffect(() => {
    const fetchData = async () => {
      // Only try API if credentials are set
      if (ESO_API_CONFIG.clientId === 'YOUR_CLIENT_ID_HERE') {
        setData(mockClassData);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const dateRange = UPDATE_DATE_RANGES[selectedUpdate];
        const encounterIDs = [/* Add your encounter IDs here */];
        
        const apiData = await esoAPI.getClassStatistics(
          dateRange.start,
          dateRange.end,
          encounterIDs
        );

        // Process API data into chart format
        const processedData = processClassData(apiData);
        setData(processedData);
      } catch (err) {
        setError(err.message);
        setData(mockClassData); // Fallback to mock data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedUpdate]);

  return { data, loading, error };
};

const XenoNoxLogo = () => (
  <div className="fixed bottom-4 right-4 opacity-30 hover:opacity-60 transition-opacity">
    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg">
      <div className="w-8 h-8 relative">
        <div className="absolute inset-0 rounded bg-blue-500" 
             style={{
               clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
             }}>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-2 h-1 bg-white transform -skew-x-12"></div>
          <div className="w-2 h-1 bg-white transform -skew-x-12 ml-1 mt-0.5"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const [selectedUpdate, setSelectedUpdate] = useState('U43');
  const [activeTab, setActiveTab] = useState('classes');
  
  // Use the custom hook to fetch data
  const { data, loading, error } = useESOData(selectedUpdate);

  const updates = ['U42', 'U43', 'U44', 'U45', 'U46'];

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#1b1c1d' }}>
      {/* Header */}
      <header className="border-b px-6 py-6" style={{ backgroundColor: '#282a2c', borderColor: '#404040' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
              <div className="w-7 h-7 relative">
                <div className="absolute inset-0 rounded bg-blue-500" 
                     style={{
                       clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
                     }}>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-1.5 h-0.5 bg-white transform -skew-x-12"></div>
                  <div className="w-1.5 h-0.5 bg-white transform -skew-x-12 ml-0.5 mt-0.5"></div>
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">The Trial Tome</h1>
              <p className="text-sm text-gray-400">by XenoNox</p>
            </div>
          </div>
          
          <nav className="flex space-x-6">
            <button 
              className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                activeTab === 'classes' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white'
              }`}
              style={{ 
                backgroundColor: activeTab === 'classes' ? '#3b82f6' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'classes') {
                  e.target.style.backgroundColor = '#404040';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'classes') {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => setActiveTab('classes')}
            >
              Class Analysis
            </button>
            <button 
              className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                activeTab === 'trials' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white'
              }`}
              style={{ 
                backgroundColor: activeTab === 'trials' ? '#3b82f6' : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'trials') {
                  e.target.style.backgroundColor = '#404040';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'trials') {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
              onClick={() => setActiveTab('trials')}
            >
              Trial Statistics
            </button>
          </nav>

          {/* Update Filter */}
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <select 
              value={selectedUpdate}
              onChange={(e) => setSelectedUpdate(e.target.value)}
              className="rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              style={{ 
                backgroundColor: '#1b1c1d', 
                border: '1px solid #404040'
              }}
            >
              {updates.map(update => (
                <option key={update} value={update}>{update}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'classes' && (
          <>
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mr-3" />
                <span className="text-gray-300">Loading ESO data for {selectedUpdate}...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="rounded-lg border p-4 mb-6" style={{ backgroundColor: '#ff4444', borderColor: '#cc0000' }}>
                <p className="text-white font-medium">API Error: {error}</p>
                <p className="text-red-100 text-sm mt-1">Displaying mock data instead</p>
              </div>
            )}

            {/* Main Class Playrate Chart */}
            <div className="rounded-lg border p-6 mb-8" style={{ backgroundColor: '#282a2c', borderColor: '#404040' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  [{selectedUpdate}] ESO Class Playrate in Raids (vRG HM, vDSR HM, vSE HM, vLC HM)
                  {!loading && ESO_API_CONFIG.clientId === 'YOUR_CLIENT_ID' && (
                    <span className="text-sm text-yellow-400 ml-2">(Mock Data)</span>
                  )}
                </h2>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: ROLE_COLORS.tank }}></div>
                    <span>Tank</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: ROLE_COLORS.healer }}></div>
                    <span>Healer</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: ROLE_COLORS.stamina }}></div>
                    <span>Stamina DPS</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: ROLE_COLORS.magicka }}></div>
                    <span>Magicka DPS</span>
                  </div>
                </div>
              </div>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <BarChart
                    data={data.classPlayrates}
                    layout="horizontal"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                    <XAxis type="number" stroke="#a0aec0" />
                    <YAxis 
                      type="category" 
                      dataKey="class" 
                      stroke="#a0aec0"
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#282a2c', 
                        border: '1px solid #404040',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                    />
                    <Bar dataKey="tank" stackId="a" fill={ROLE_COLORS.tank} name="Tank" />
                    <Bar dataKey="healer" stackId="a" fill={ROLE_COLORS.healer} name="Healer" />
                    <Bar dataKey="stamina" stackId="a" fill={ROLE_COLORS.stamina} name="Stamina DPS" />
                    <Bar dataKey="magicka" stackId="a" fill={ROLE_COLORS.magicka} name="Magicka DPS" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role Breakdown Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <div className="rounded-lg p-4" style={{ backgroundColor: '#282a2c' }}>
                <h3 className="text-lg font-semibold mb-3 text-gray-100">Tanks</h3>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.tankBreakdown}
                      layout="horizontal"
                      margin={{ top: 5, right: 15, left: 60, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#a0aec0" />
                      <YAxis 
                        type="category" 
                        dataKey="class" 
                        stroke="#a0aec0"
                        width={50}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#282a2c', 
                          border: '1px solid #404040',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="percentage" fill={ROLE_COLORS.tank} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="rounded-lg p-4" style={{ backgroundColor: '#282a2c' }}>
                <h3 className="text-lg font-semibold mb-3 text-gray-100">Healers</h3>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.healerBreakdown}
                      layout="horizontal"
                      margin={{ top: 5, right: 15, left: 60, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#a0aec0" />
                      <YAxis 
                        type="category" 
                        dataKey="class" 
                        stroke="#a0aec0"
                        width={50}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#282a2c', 
                          border: '1px solid #404040',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="percentage" fill={ROLE_COLORS.healer} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="rounded-lg p-4" style={{ backgroundColor: '#282a2c' }}>
                <h3 className="text-lg font-semibold mb-3 text-gray-100">Damage Dealers</h3>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={data.dpsBreakdown}
                      layout="horizontal"
                      margin={{ top: 5, right: 15, left: 60, bottom: 5 }}
                    >
                      <XAxis type="number" stroke="#a0aec0" />
                      <YAxis 
                        type="category" 
                        dataKey="class" 
                        stroke="#a0aec0"
                        width={50}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#282a2c', 
                          border: '1px solid #404040',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="percentage" fill={ROLE_COLORS.stamina} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1b1c1d' }}>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Most Played Class</h3>
                <p className="text-2xl font-bold text-blue-400">{data.classPlayrates[0]?.class || 'Arcanist'}</p>
                <p className="text-sm text-gray-400">{data.classPlayrates[0]?.total || '42.36'}% playrate</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1b1c1d' }}>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Top Tank Class</h3>
                <p className="text-2xl font-bold" style={{ color: CLASS_COLORS.Dragonknight }}>
                  {data.tankBreakdown[0]?.class || 'Dragonknight'}
                </p>
                <p className="text-sm text-gray-400">{data.tankBreakdown[0]?.percentage || '33.01'}% of tanks</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1b1c1d' }}>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Top Healer Class</h3>
                <p className="text-2xl font-bold" style={{ color: CLASS_COLORS.Warden }}>
                  {data.healerBreakdown[0]?.class || 'Warden'}
                </p>
                <p className="text-sm text-gray-400">{data.healerBreakdown[0]?.percentage || '45.23'}% of healers</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: '#1b1c1d' }}>
                <h3 className="text-sm font-medium text-gray-300 mb-2">DPS Dominance</h3>
                <p className="text-2xl font-bold" style={{ color: CLASS_COLORS.Arcanist }}>
                  {data.dpsBreakdown[0]?.class || 'Arcanist'}
                </p>
                <p className="text-sm text-gray-400">{data.dpsBreakdown[0]?.percentage || '60.07'}% of DPS</p>
              </div>
            </div>
          </>
        )}

        {activeTab === 'trials' && (
          <div className="rounded-lg border p-8 text-center" style={{ backgroundColor: '#282a2c', borderColor: '#404040' }}>
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg mx-auto mb-4">
              <div className="w-12 h-12 relative">
                <div className="absolute inset-0 rounded bg-blue-500" 
                     style={{
                       clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
                     }}>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-3 h-1 bg-white transform -skew-x-12"></div>
                  <div className="w-3 h-1 bg-white transform -skew-x-12 ml-1 mt-1"></div>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white">Trial Statistics</h2>
            <p className="text-gray-400 text-lg mb-2">Coming Soon...</p>
            <p className="text-sm text-gray-500">
              This section will include trial clear rates, boss-specific statistics, 
              meta set analysis, and progression insights.
            </p>
          </div>
        )}
      </main>

      <XenoNoxLogo />
    </div>
  );
}