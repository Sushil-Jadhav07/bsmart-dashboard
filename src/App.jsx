import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.jsx';
import { Provider } from 'react-redux';
import store from './store/index.js';
import SplashLoader from './components/SplashLoader.jsx';
import { onFCMMessage } from './lib/firebase.js';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setFading(true), 900);
    const hide = setTimeout(() => setShowSplash(false), 1300);
    return () => { clearTimeout(hold); clearTimeout(hide); };
  }, []);

  // Foreground FCM notifications → navigate to the query link
  useEffect(() => {
    const unsub = onFCMMessage((data) => {
      const link = data?.link;
      if (link && (data?.type === 'support_query' || data?.type === 'support_reply' || data?.type === 'support_assign')) {
        router.navigate(link.replace(/^\/admin/, ''));
      }
    });
    return unsub;
  }, []);

  // Service-worker background notification click → navigate
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'FCM_NAVIGATE' && event.data?.link) {
        router.navigate(event.data.link.replace(/^\/admin/, ''));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  return (
    <>
      {showSplash && <SplashLoader fading={fading} />}
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </>
  );
}

export default App;
