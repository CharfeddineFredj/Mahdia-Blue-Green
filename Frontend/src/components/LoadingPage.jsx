import { useEffect, useState } from 'react';
import loadingLogo from '../assets/images/loading page logo.png';
import '../styles/LoadingPage.css';

const LoadingPage = ({ onLoadingComplete }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement minimum de 2.5 secondes
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        onLoadingComplete();
      }, 500); // Délai pour l'animation de sortie
    }, 2500);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!isLoading) {
    return (
      <div className="loading-page fade-out">
        <div className="loading-circle">
          <img height={20} src={loadingLogo} alt="Loading" className="loading-logo" />
        </div>
      </div>
    );
  }

  return (
    <div className="loading-page">
      <div className="loading-circle">
        <img src={loadingLogo} alt="Loading" className="loading-logo" />
      </div>
    </div>
  );
};

export default LoadingPage;


