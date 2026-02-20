🔹 CONTROLLED VS. UNCONTROLLED COMPONENTS

Understanding the difference between controlled and uncontrolled components is
crucial for React development. Each approach has its use cases and trade-offs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ CONTROLLED COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A controlled component's value is controlled by React state. The component
receives its current value via props and notifies changes through callbacks.

Characteristics:
• Value stored in React state
• onChange handler updates state
• React controls the component's value
• Single source of truth

Example:
```javascript
function ControlledInput() {
  const [value, setValue] = useState('');
  
  return (
    <input
      value={value}              // Controlled by state
      onChange={(e) => setValue(e.target.value)}  // Updates state
    />
  );
}
```

How It Works:
```javascript
// User types "a"
// 1. onChange fires → setValue('a')
// 2. Component re-renders with value='a'
// 3. Input displays 'a'

// User types "b"
// 1. onChange fires → setValue('ab')
// 2. Component re-renders with value='ab'
// 3. Input displays 'ab'
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ UNCONTROLLED COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

An uncontrolled component stores its own state internally (in the DOM). React
doesn't control the value; you access it via refs.

Characteristics:
• Value stored in DOM
• No value prop (or defaultValue)
• Access value via ref
• DOM is source of truth

Example:
```javascript
function UncontrolledInput() {
  const inputRef = useRef(null);
  
  function handleSubmit() {
    console.log(inputRef.current.value);  // Read from DOM
  }
  
  return (
    <input
      ref={inputRef}           // Access via ref
      defaultValue="initial"    // Initial value only
    />
  );
}
```

How It Works:
```javascript
// User types "a"
// 1. DOM updates directly (React doesn't control it)
// 2. Value stored in DOM node

// User types "b"
// 1. DOM updates directly
// 2. Value is 'ab' in DOM

// To read value: inputRef.current.value
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ KEY DIFFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Aspect | Controlled | Uncontrolled |
|--------|-----------|--------------|
| Value source | React state | DOM |
| Value prop | `value={state}` | `defaultValue="..."` or none |
| Updates | onChange → setState | Direct DOM updates |
| Access value | From state | From ref |
| Validation | Before state update | After user input |
| React re-renders | On every change | Only when needed |
| Form libraries | Works well | May need refs |

Visual Comparison:
```javascript
// CONTROLLED
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />
// React state → Input value
// User input → onChange → setState → Re-render → Input value

// UNCONTROLLED
const ref = useRef();
<input ref={ref} defaultValue="initial" />
// DOM stores value directly
// User input → DOM updates directly
// Read: ref.current.value
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ WHEN TO USE CONTROLLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Controlled When:
• You need real-time validation
• You need to transform/format input
• You need to disable/enable based on value
• You're using form libraries (Formik, React Hook Form)
• You need to reset the form programmatically
• You need to share state between components

Example: Real-time Validation
```javascript
function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  
  function handleChange(e) {
    const value = e.target.value;
    setEmail(value);
    
    // Real-time validation
    if (value && !value.includes('@')) {
      setError('Invalid email');
    } else {
      setError('');
    }
  }
  
  return (
    <div>
      <input
        value={email}
        onChange={handleChange}
        style={{ borderColor: error ? 'red' : 'black' }}
      />
      {error && <div>{error}</div>}
    </div>
  );
}
```

Example: Formatting Input
```javascript
function PhoneInput() {
  const [phone, setPhone] = useState('');
  
  function handleChange(e) {
    let value = e.target.value.replace(/\D/g, '');  // Remove non-digits
    if (value.length > 10) value = value.slice(0, 10);
    
    // Format: (123) 456-7890
    if (value.length > 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    }
    
    setPhone(value);
  }
  
  return <input value={phone} onChange={handleChange} />;
}
```

Example: Conditional Disable
```javascript
function Form() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const isValid = email.includes('@') && password.length >= 8;
  
  return (
    <form>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button disabled={!isValid}>Submit</button>
    </form>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ WHEN TO USE UNCONTROLLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Uncontrolled When:
• Simple forms with minimal validation
• Performance is critical (fewer re-renders)
• Integrating with non-React code
• File inputs (always uncontrolled)
• You only need value on submit
• Third-party components that manage their own state

Example: Simple Form
```javascript
function SimpleForm() {
  const nameRef = useRef();
  const emailRef = useRef();
  
  function handleSubmit(e) {
    e.preventDefault();
    
    // Read values only on submit
    const data = {
      name: nameRef.current.value,
      email: emailRef.current.value,
    };
    
    console.log(data);
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="" />
      <input ref={emailRef} defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Example: File Input (Always Uncontrolled)
```javascript
function FileUpload() {
  const fileRef = useRef();
  
  function handleSubmit() {
    const file = fileRef.current.files[0];
    // Process file
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        ref={fileRef}  // File inputs are always uncontrolled
      />
      <button type="submit">Upload</button>
    </form>
  );
}
```

Example: Performance-Critical
```javascript
function LargeForm() {
  const formRef = useRef();
  
  // Uncontrolled: No re-renders on every keystroke
  // Better performance for large forms
  
  function handleSubmit() {
    const formData = new FormData(formRef.current);
    // Process form data
  }
  
  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      {/* Many inputs */}
    </form>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ CONVERTING BETWEEN APPROACHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Controlled → Uncontrolled:
```javascript
// Controlled
function Component() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled
function Component() {
  const ref = useRef();
  return <input ref={ref} defaultValue="" />;
}
```

Uncontrolled → Controlled:
```javascript
// Uncontrolled
function Component() {
  const ref = useRef();
  return <input ref={ref} defaultValue="" />;
}

// Controlled
function Component() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

Hybrid Approach (Controlled with Ref):
```javascript
function Component() {
  const [value, setValue] = useState('');
  const ref = useRef();
  
  // Controlled for React
  // But also have ref for imperative access
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ FORM LIBRARIES AND APPROACHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React Hook Form (Uncontrolled by Default):
```javascript
import { useForm } from 'react-hook-form';

function Form() {
  const { register, handleSubmit } = useForm();
  
  // Uses uncontrolled approach (refs)
  // Better performance, less re-renders
  
  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('name')} />
      <input {...register('email')} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Formik (Controlled):
```javascript
import { useFormik } from 'formik';

function Form() {
  const formik = useFormik({
    initialValues: { name: '', email: '' },
    onSubmit: values => console.log(values),
  });
  
  // Uses controlled approach
  return (
    <form onSubmit={formik.handleSubmit}>
      <input
        name="name"
        value={formik.values.name}
        onChange={formik.handleChange}
      />
      <input
        name="email"
        value={formik.values.email}
        onChange={formik.handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ COMMON PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern 1: Controlled with Validation
```javascript
function ValidatedInput() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  
  function handleChange(e) {
    const newValue = e.target.value;
    setValue(newValue);
    
    // Validate
    if (newValue.length < 3) {
      setError('Too short');
    } else {
      setError('');
    }
  }
  
  return (
    <div>
      <input value={value} onChange={handleChange} />
      {error && <span>{error}</span>}
    </div>
  );
}
```

Pattern 2: Uncontrolled with Ref
```javascript
function UncontrolledForm() {
  const nameRef = useRef();
  const emailRef = useRef();
  
  function handleSubmit() {
    const data = {
      name: nameRef.current.value,
      email: emailRef.current.value,
    };
    // Submit data
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} />
      <input ref={emailRef} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Pattern 3: Reset Form
```javascript
// Controlled: Easy to reset
function ControlledForm() {
  const [value, setValue] = useState('');
  
  function reset() {
    setValue('');  // Easy reset
  }
  
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled: Need to reset DOM
function UncontrolledForm() {
  const ref = useRef();
  
  function reset() {
    ref.current.value = '';  // Reset DOM directly
  }
  
  return <input ref={ref} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ PERFORMANCE CONSIDERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Controlled Components:
• Re-render on every keystroke
• More React overhead
• Better for validation/transformation
• More predictable

Uncontrolled Components:
• No re-renders on input
• Less React overhead
• Better performance for large forms
• Less predictable (DOM is source of truth)

Example: Performance Impact
```javascript
// Controlled: Re-renders 1000 times for 1000 keystrokes
function ControlledInput() {
  const [value, setValue] = useState('');
  console.log('Rendered');  // Logs on every keystroke
  
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled: Re-renders only when component re-renders
function UncontrolledInput() {
  const ref = useRef();
  console.log('Rendered');  // Logs only when parent re-renders
  
  return <input ref={ref} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Controlled: React state controls value, onChange updates state
2. Uncontrolled: DOM stores value, access via ref
3. Controlled: Better for validation, transformation, real-time updates
4. Uncontrolled: Better for performance, simple forms, file inputs
5. Controlled uses `value` prop; uncontrolled uses `defaultValue` or none
6. File inputs are always uncontrolled
7. Form libraries prefer different approaches (React Hook Form: uncontrolled)
8. Controlled components re-render on every change
9. Uncontrolled components don't re-render on input
10. Choose based on your needs: validation vs performance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I can use both value and defaultValue"
✅ Use either value (controlled) or defaultValue (uncontrolled), not both

❌ "Uncontrolled is always better for performance"
✅ Controlled is better when you need validation/transformation

❌ "File inputs can be controlled"
✅ File inputs are always uncontrolled (browser security)

❌ "I can make a controlled component uncontrolled by removing value"
✅ Removing value makes it uncontrolled, but use defaultValue for initial value

❌ "Controlled components are always better"
✅ Choose based on use case: validation needs vs performance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is the difference between controlled and uncontrolled?":

✅ DO Explain:
• "Controlled: React state controls value, onChange updates state"
• "Uncontrolled: DOM stores value, access via ref"
• "Controlled uses value prop; uncontrolled uses defaultValue"
• "Controlled re-renders on change; uncontrolled doesn't"
• "Choose based on needs: validation vs performance"

When asked "When would you use each?":

✅ DO Explain:
• "Controlled: validation, transformation, real-time updates"
• "Uncontrolled: simple forms, performance-critical, file inputs"
• "Controlled: better for form libraries integration"
• "Uncontrolled: fewer re-renders, better performance"

Advanced Answer:
"Controlled components have their value controlled by React state via the value prop
and onChange handler. This enables real-time validation, transformation, and makes
the component predictable. Uncontrolled components store their value in the DOM and
are accessed via refs. They have better performance since they don't trigger re-renders
on every keystroke, but are less flexible for validation. File inputs are always
uncontrolled due to browser security. The choice depends on whether you need validation
and transformation (controlled) or performance (uncontrolled)."
