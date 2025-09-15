// Utility functions for managing terms agreement

export const clearTermsAcceptance = () => {
  try {
    localStorage.removeItem('termsAccepted');
    localStorage.removeItem('termsAcceptedDate');
    console.log('Terms acceptance cleared. Refresh the page to see the terms modal again.');
  } catch (error) {
    console.error('Error clearing terms acceptance:', error);
  }
};

export const checkTermsAcceptance = () => {
  try {
    const accepted = localStorage.getItem('termsAccepted');
    const acceptedDate = localStorage.getItem('termsAcceptedDate');
    
    return {
      accepted: accepted === 'true',
      date: acceptedDate ? new Date(acceptedDate) : null
    };
  } catch (error) {
    console.error('Error checking terms acceptance:', error);
    return { accepted: false, date: null };
  }
};

// For development/testing purposes
if (typeof window !== 'undefined') {
  window.clearTermsAcceptance = clearTermsAcceptance;
  window.checkTermsAcceptance = checkTermsAcceptance;
}
