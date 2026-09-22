import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const requireAdmin = useCallback((callback) => {
    callback();
  }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast('Omborda yetarli mahsulot yo\'q!', 'error');
          return prev;
        }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock <= 0) {
        showToast('Mahsulot tugagan!', 'error');
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, [showToast]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateCartQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i.id !== id));
    } else {
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const processSale = useCallback(async (paymentType, nasiyaId = null, paidAmount = null) => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const saleData = {
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total: cartTotal,
        paid: paidAmount !== null ? paidAmount : cartTotal,
        payment_type: paymentType,
        nasiya_id: nasiyaId
      };
      await api.createSale(saleData);
      clearCart();
      showToast('Sotish muvaffaqiyatli amalga oshirildi!');
      return true;
    } catch (err) {
      showToast(err.message || 'Serverga ulanib bo\'lmadi', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [cart, cartTotal, clearCart, showToast]);

  return (
    <AppContext.Provider value={{
      cart, addToCart, removeFromCart, updateCartQuantity, clearCart,
      cartTotal, cartCount, processSale,
      requireAdmin,
      loading, setLoading,
      toast, showToast
    }}>
      {children}
    </AppContext.Provider>
  );
};
