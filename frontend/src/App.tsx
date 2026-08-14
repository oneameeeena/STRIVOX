import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewInvestigation from './pages/NewInvestigation';
import InvestigationResult from './pages/InvestigationResult';
import LiveMonitoring from './pages/LiveMonitoring';
import Alerts from './pages/Alerts';
import ThreatIntelPage from './pages/ThreatIntelPage';
import CollaborationPage from './pages/CollaborationPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LandingPage from './pages/LandingPage';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/monitoring" 
          element={isAuthenticated ? <LiveMonitoring /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/alerts" 
          element={isAuthenticated ? <Alerts /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/threat-intel" 
          element={isAuthenticated ? <ThreatIntelPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/collaboration" 
          element={isAuthenticated ? <CollaborationPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/integrations" 
          element={isAuthenticated ? <IntegrationsPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/investigations/new" 
          element={isAuthenticated ? <NewInvestigation /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/investigations/:id" 
          element={isAuthenticated ? <InvestigationResult /> : <Navigate to="/login" />} 
        />
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
