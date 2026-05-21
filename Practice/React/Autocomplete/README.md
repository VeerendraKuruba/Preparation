# 🔍 Autocomplete Component

A powerful, flexible, and beautiful autocomplete/search component for React with support for both simple text-based results (like Google) and rich results with custom rendering (like Facebook).

## ✨ Features

- **🎯 Smart Search**: Debounced search with configurable delay for optimal performance
- **⌨️ Keyboard Navigation**: Full keyboard support (Arrow keys, Enter, Escape)
- **🎨 Flexible Rendering**: Support for both simple text and rich custom result cards
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🔄 Loading States**: Built-in loading indicators for better UX
- **♿ Accessible**: Built with accessibility best practices
- **🎭 Highly Customizable**: Easy to customize appearance and behavior
- **⚡ Performance Optimized**: Efficient rendering and search debouncing

## 🚀 Getting Started

### Installation

1. Navigate to the component directory:
```bash
cd React/Autocomplete
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

## 📚 Usage

### Basic Example (Simple Text Search)

```javascript
import Autocomplete from './Autocomplete';

function MyComponent() {
  const fetchResults = async (query) => {
    const response = await fetch(`/api/search?q=${query}`);
    return response.json();
  };

  return (
    <Autocomplete
      fetchResults={fetchResults}
      onSelect={(result) => console.log('Selected:', result)}
      getResultValue={(result) => result}
      placeholder="Search..."
    />
  );
}
```

### Advanced Example (Rich Results)

```javascript
import Autocomplete from './Autocomplete';

function SocialSearch() {
  const fetchUsers = async (query) => {
    const response = await fetch(`/api/users?q=${query}`);
    return response.json();
  };

  const renderUser = (user) => (
    <div className="autocomplete-rich-result">
      <img src={user.avatar} alt={user.name} className="autocomplete-rich-result-avatar" />
      <div className="autocomplete-rich-result-content">
        <p className="autocomplete-rich-result-title">{user.name}</p>
        <p className="autocomplete-rich-result-subtitle">{user.email}</p>
      </div>
      <span className={`autocomplete-rich-result-badge ${user.type}`}>
        {user.type}
      </span>
    </div>
  );

  return (
    <Autocomplete
      fetchResults={fetchUsers}
      onSelect={(user) => console.log('Selected user:', user)}
      getResultValue={(user) => user.name}
      renderResult={renderUser}
      placeholder="Search for users..."
      debounceMs={300}
      minChars={2}
    />
  );
}
```

## 🎛️ API Reference

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `fetchResults` | `(query: string) => Promise<Array>` | Yes | - | Async function to fetch search results based on the query |
| `onSelect` | `(result: any) => void` | No | - | Callback function when a result is selected |
| `getResultValue` | `(result: any) => string` | No | `result => result` | Function to extract display value from a result |
| `renderResult` | `(result: any, index: number) => ReactNode` | No | Default text renderer | Custom renderer for each result item |
| `placeholder` | `string` | No | `"Search..."` | Placeholder text for the input field |
| `debounceMs` | `number` | No | `300` | Debounce delay in milliseconds |
| `minChars` | `number` | No | `1` | Minimum characters required before searching |

## ⌨️ Keyboard Shortcuts

- **Arrow Down**: Move to the next result
- **Arrow Up**: Move to the previous result
- **Enter**: Select the highlighted result
- **Escape**: Close the dropdown

## 🎨 Styling

The component comes with beautiful default styles, but you can easily customize them by:

1. **Overriding CSS classes**: All elements have specific class names
2. **Modifying `Autocomplete.css`**: Edit the styles directly
3. **Using CSS-in-JS**: Apply custom styles to the container

### Key CSS Classes

- `.autocomplete-container`: Main container
- `.autocomplete-input`: Input field
- `.autocomplete-dropdown`: Results dropdown
- `.autocomplete-result-item`: Individual result item
- `.autocomplete-result-item.highlighted`: Highlighted/hovered result
- `.autocomplete-loading-spinner`: Loading indicator
- `.autocomplete-no-results`: Empty state message

## 🏗️ Component Architecture

```
Autocomplete/
├── Autocomplete.jsx      # Main component logic
├── Autocomplete.css      # Component styles
├── App.js               # Demo application
├── App.css              # Demo styles
├── index.js             # Entry point
├── package.json         # Dependencies
└── README.md           # Documentation
```

## 🔍 Real-World Use Cases

### Google-Style Text Search
Perfect for:
- Search bars on documentation sites
- Blog search functionality
- Command palettes
- Quick navigation menus

### Facebook-Style Rich Results
Ideal for:
- User/people search
- Product catalogs
- Social media search
- Entity search (companies, locations, etc.)

## 🛠️ Customization Examples

### Change Debounce Timing
```javascript
<Autocomplete debounceMs={500} /> // Wait 500ms before searching
```

### Set Minimum Characters
```javascript
<Autocomplete minChars={3} /> // Only search after 3 characters
```

### Custom Empty State
Modify the "No results found" message in `Autocomplete.jsx`:
```javascript
<div className="autocomplete-no-results">
  Sorry, we couldn't find any matches!
</div>
```

## 🧪 Testing Tips

1. Test keyboard navigation thoroughly
2. Test with slow network conditions
3. Test with large result sets (scrolling behavior)
4. Test mobile responsiveness
5. Test with screen readers for accessibility

## 📝 Best Practices

1. **Debouncing**: Use appropriate debounce times (200-500ms) to balance UX and performance
2. **Minimum Characters**: Set `minChars={2}` or `minChars={3}` for better performance
3. **Result Limiting**: Limit API results to 10-15 items for better UX
4. **Error Handling**: Wrap `fetchResults` in try-catch blocks
5. **Loading States**: Always provide visual feedback during searches
6. **Accessibility**: Ensure keyboard navigation works smoothly

## 🚨 Common Issues

### Results not appearing?
- Check that `fetchResults` returns an array
- Verify the `minChars` threshold is met
- Check browser console for errors

### Styling issues?
- Ensure `Autocomplete.css` is imported
- Check for CSS conflicts with parent components
- Verify z-index for dropdown visibility

## 🤝 Contributing

Feel free to customize and extend this component for your needs!

## 📄 License

MIT

## 🌟 Acknowledgments

Inspired by autocomplete patterns from:
- Google Search
- Facebook Search
- GitHub Command Palette
- VS Code Quick Open

---

Built with ❤️ using React

