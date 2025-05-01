import React, { useEffect, useState, useRef } from 'react';
import './SplashScreen.css'; // We'll create this next

const SplashScreen = ({ onFinishLoading }) => {
  const [currentCurrency, setCurrentCurrency] = useState('₹');
  const [fadeOut, setFadeOut] = useState(false);
  const currencyInterval = useRef(null);
  
  // List of currencies to cycle through
  const currencies = ['₹', '$', '€', '£', '¥', '₩', '₽', '฿'];
  
  useEffect(() => {
    // Rotate through currencies
    let index = 0;
    currencyInterval.current = setInterval(() => {
      index = (index + 1) % currencies.length;
      setCurrentCurrency(currencies[index]);
    }, 1000);
    
    // Hide splash screen after 4 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        if (onFinishLoading) onFinishLoading();
      }, 500); // Allow for fade out animation
    }, 4000);
    
    return () => {
      clearInterval(currencyInterval.current);
      clearTimeout(timer);
    };
  }, [onFinishLoading]);
  
  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      {/* Background */}
      <div className="splash-background"></div>
      
      {/* Decorative elements */}
      <div className="decorative-element decoration-1"></div>
      <div className="decorative-element decoration-2"></div>
      <div className="decorative-element decoration-3"></div>
      <div className="decorative-element decoration-4"></div>
      
      {/* Corner icons */}
      <div className="icon-container top-left">
        <svg className="icon" viewBox="0 0 100 100">
          <circle cx="35" cy="35" r="15"></circle>
          <circle cx="65" cy="35" r="15"></circle>
          <path d="M15,50 C15,80 85,80 85,50 L85,80 L15,80 Z"></path>
        </svg>
      </div>
      
      <div className="icon-container top-right">
        <svg className="icon" viewBox="0 0 100 100">
          <rect x="15" y="15" width="70" height="70" rx="10"></rect>
          <line x1="15" y1="35" x2="85" y2="35"></line>
          <line x1="35" y1="15" x2="35" y2="35"></line>
          <line x1="65" y1="15" x2="65" y2="35"></line>
          <path d="M25,55 L45,75 L65,55 L75,65 L75,75 L25,75 Z"></path>
          <circle cx="60" cy="50" r="8"></circle>
        </svg>
      </div>
      
      <div className="icon-container bottom-left">
        <svg className="icon" viewBox="0 0 100 100">
          <path d="M20,20 L80,80 A60,60 0 0,0 20,20 Z"></path>
          <path d="M80,20 L20,80 A60,60 0 0,1 80,20 Z"></path>
          <circle cx="50" cy="35" r="5"></circle>
          <circle cx="65" cy="50" r="5"></circle>
          <circle cx="35" cy="50" r="5"></circle>
          <circle cx="50" cy="65" r="5"></circle>
        </svg>
      </div>
      
      <div className="icon-container bottom-right">
        <svg className="icon" viewBox="0 0 100 100">
          <path d="M15,50 Q15,40 25,40 L75,40 Q85,40 85,50 L85,60 L15,60 Z"></path>
          <rect x="25" y="25" width="50" height="25" rx="12"></rect>
          <circle cx="30" cy="60" r="10"></circle>
          <circle cx="70" cy="60" r="10"></circle>
        </svg>
      </div>
      
      {/* Currency Wheel */}
      <div className="currency-wheel-container">
        <div className="wheel-background"></div>
        
        <div className="currency-wheel">
          {currencies.map((currency, index) => (
            <div 
              key={index}
              className="currency-marker"
              style={{
                transform: `rotate(${index * 45}deg) translate(0, -100px) rotate(-${index * 45}deg)`
              }}
            >
              <div className="currency-symbol">{currency}</div>
            </div>
          ))}
        </div>
        
        <div className="center-currency">
          <div className="center-symbol">{currentCurrency}</div>
        </div>
      </div>
      
      {/* App Title */}
      <div className="app-title">BuddyPay</div>
      <div className="app-tagline">Split expenses with friends</div>
      
      {/* Loading Dots */}
      <div className="loading-dots">
        <div className="loading-dot dot-1"></div>
        <div className="loading-dot dot-2"></div>
        <div className="loading-dot dot-3"></div>
      </div>
    </div>
  );
};

export default SplashScreen;