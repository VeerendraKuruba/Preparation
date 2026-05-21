# Simple Toast Notification System

A simple and clean toast notification system for React with 4 types.

## Features

- ✅ **Four Toast Types**: Success, Error, Warning, and Info
- ✅ **Auto-dismiss**: Default 3 seconds (customizable)
- ✅ **Manual Close**: Click × to dismiss
- ✅ **Simple API**: Just use the hook and call methods
- ✅ **No Context Needed**: Works with simple useState

## Installation

```bash
cd ToastNotification
npm install
npm start
```

## Usage

### Basic Example

```jsx
import React from 'react';
import { useToast } from './Toast';

function App() {
  const toast = useToast();
  const { ToastContainer } = toast;

  return (
    <div>
      <button onClick={() => toast.success('Success!')}>
        Success
      </button>
      <button onClick={() => toast.error('Error!')}>
        Error
      </button>
      <button onClick={() => toast.warning('Warning!')}>
        Warning
      </button>
      <button onClick={() => toast.info('Info!')}>
        Info
      </button>
      
      <ToastContainer />
    </div>
  );
}
```

### Toast Methods

```jsx
const toast = useToast();

// Success toast (default 3 seconds)
toast.success('Operation completed!');

// Error toast
toast.error('Something went wrong!');

// Warning toast
toast.warning('Please check this!');

// Info toast
toast.info('Here is some information!');

// Custom duration (in milliseconds)
toast.success('This stays for 5 seconds', 5000);
```

### Complete Example

```jsx
import React from 'react';
import { useToast } from './Toast';

function MyComponent() {
  const toast = useToast();
  const { ToastContainer } = toast;

  const handleSave = () => {
    toast.success('Saved successfully!');
  };

  const handleError = () => {
    toast.error('Failed to save!');
  };

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleError}>Error</button>
      <ToastContainer />
    </div>
  );
}
```

## API

### `useToast()`

Returns an object with:
- `success(message, duration?)` - Show success toast
- `error(message, duration?)` - Show error toast
- `warning(message, duration?)` - Show warning toast
- `info(message, duration?)` - Show info toast
- `ToastContainer` - Component to render toasts

### Parameters

- `message` (string): The message to display
- `duration` (number, optional): Duration in milliseconds (default: 3000)

## Customization

Edit `Toast.css` to customize colors, sizes, and animations.

## License

MIT
