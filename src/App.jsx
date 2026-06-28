import React, { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/index.jsx';
import { Provider } from 'react-redux';
import store from './store/index.js';
import SplashLoader from './components/SplashLoader.jsx';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setFading(true), 900);
    const hide = setTimeout(() => setShowSplash(false), 1300);

    return () => {
      clearTimeout(hold);
      clearTimeout(hide);
    };
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
