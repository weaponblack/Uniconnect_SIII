import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { StyleSheet, Text, Animated, View, Platform, Pressable } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalToast: ((message: string, type?: ToastType) => void) | null = null;

export const showToast = (message: string, type: ToastType = 'info') => {
  if (globalToast) {
    globalToast(message, type);
  } else {
    console.warn('ToastProvider not initialized');
  }
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const _showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    globalToast = _showToast;
    return () => {
      globalToast = null;
    };
  }, [_showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: _showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [opacity] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-20));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      hide();
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove();
    });
  };

  const backgroundColor = 
    toast.type === 'success' ? '#10b981' : 
    toast.type === 'error' ? '#ef4444' : 
    '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable onPress={hide}>
        <Text style={styles.text}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }
    }),
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
