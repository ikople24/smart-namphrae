import { useState, useEffect } from 'react';

const TERMS_STORAGE_KEY = 'termsAccepted';
const TERMS_DATE_KEY = 'termsAcceptedDate';

export const useTermsAgreement = () => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if terms have been accepted on this device
    const checkTermsAcceptance = () => {
      try {
        const accepted = localStorage.getItem(TERMS_STORAGE_KEY);
        const acceptedDate = localStorage.getItem(TERMS_DATE_KEY);
        
        if (accepted === 'true' && acceptedDate) {
          setHasAcceptedTerms(true);
        } else {
          setHasAcceptedTerms(false);
        }
      } catch (error) {
        console.error('Error checking terms acceptance:', error);
        setHasAcceptedTerms(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTermsAcceptance();
  }, []);

  const acceptTerms = () => {
    try {
      localStorage.setItem(TERMS_STORAGE_KEY, 'true');
      localStorage.setItem(TERMS_DATE_KEY, new Date().toISOString());
      setHasAcceptedTerms(true);
    } catch (error) {
      console.error('Error accepting terms:', error);
    }
  };

  const resetTermsAcceptance = () => {
    try {
      localStorage.removeItem(TERMS_STORAGE_KEY);
      localStorage.removeItem(TERMS_DATE_KEY);
      setHasAcceptedTerms(false);
    } catch (error) {
      console.error('Error resetting terms acceptance:', error);
    }
  };

  return {
    hasAcceptedTerms,
    isLoading,
    acceptTerms,
    resetTermsAcceptance
  };
};
