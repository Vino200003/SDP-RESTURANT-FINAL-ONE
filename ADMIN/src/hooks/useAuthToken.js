import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { setAuthTokenGetter as setReservationAuthTokenGetter } from '../services/reservationService';
import { setAuthTokenGetter as setOrderAuthTokenGetter } from '../services/orderService';
import { setAuthTokenGetter as setInventoryAuthTokenGetter } from '../services/inventoryService';

/**
 * Hook to provide auth token to API services
 * This should be called in a high-level component that uses API services
 */
const useAuthToken = () => {
  const { getToken } = useAuth();
    useEffect(() => {
    // Set the token getter for each service
    setReservationAuthTokenGetter(getToken);
    
    // Now that we have implemented setAuthTokenGetter in these services
    setOrderAuthTokenGetter(getToken);
    setInventoryAuthTokenGetter(getToken);
    
    return () => {
      // Clean up (optional)
      setReservationAuthTokenGetter(null);
      setOrderAuthTokenGetter(null);
      setInventoryAuthTokenGetter(null);
    };
  }, [getToken]);
};

export default useAuthToken;
