import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialState = {
  toast: null,
  keyboardHelpVisible: false,
  firstVisit: !localStorage.getItem('ielts_first_visit'),
};

function reducer(state, action) {
  switch (action.type) {
    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'HIDE_TOAST':
      return { ...state, toast: null };
    case 'TOGGLE_KEYBOARD_HELP':
      return { ...state, keyboardHelpVisible: !state.keyboardHelpVisible };
    case 'HIDE_KEYBOARD_HELP':
      return { ...state, keyboardHelpVisible: false };
    case 'MARK_FIRST_VISIT':
      localStorage.setItem('ielts_first_visit', 'true');
      return { ...state, firstVisit: false };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.toast]);

  const showToast = (message, type = 'info') => {
    dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, showToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
