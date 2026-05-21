import React from 'react';
import { useToast } from './Toast';
import './App.css';

function App() {
  const toast = useToast();
  const { ToastContainer } = toast;

  return (
    <div className="app">
      <h1>Simple Toast Notification</h1>
      
      <div className="buttons">
        <button onClick={() => toast.success('Success! Operation completed.')}>
          Success
        </button>
        <button onClick={() => toast.error('Error! Something went wrong.')}>
          Error
        </button>
        <button onClick={() => toast.warning('Warning! Please check this.')}>
          Warning
        </button>
        <button onClick={() => toast.info('Info! Here is some information.')}>
          Info
        </button>
      </div>

      <ToastContainer />
    </div>
  );
}

export default App;
