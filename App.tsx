
import React, { useState } from 'react';
import HomePage from './components/HomePage';
import GeneratorPage from './components/GeneratorPage';
import { Page } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigateToGenerator = () => {
    setCurrentPage('generator');
  };

  return (
    <div className="App">
      {currentPage === 'home' && <HomePage onStart={navigateToGenerator} />}
      {currentPage === 'generator' && <GeneratorPage />}
    </div>
  );
};

export default App;
