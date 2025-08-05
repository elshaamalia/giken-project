import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import AllData from './components/AllData';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const navigateToAllData = () => {
    setCurrentView('allData');
  };

  const navigateBack = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="App">
      {currentView === 'dashboard' ? (
        <Dashboard onNavigateToAllData={navigateToAllData} />
      ) : (
        <AllData onNavigateBack={navigateBack} />
      )}
    </div>
  );
}

export default App;