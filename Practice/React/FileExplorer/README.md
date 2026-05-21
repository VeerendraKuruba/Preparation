# File Explorer - Recursive Nested Folders

A React application that displays a file/folder structure with recursive nesting, similar to VS Code's file explorer.

## Features

- 📁 **Recursive Folder Structure**: Uses recursion to handle deeply nested folders
- ➕ **Add Files/Folders**: Create new files and folders at any level
- ✏️ **Rename**: Rename any file or folder inline
- 🗑️ **Delete**: Remove files and folders (with confirmation)
- 📂 **Expand/Collapse**: Click folders to expand/collapse their contents
- 🎨 **Modern UI**: Clean, gradient design with smooth animations
- 🖼️ **File Icons**: Different icons for different file types

## Key Concepts

### Recursion
The `FileNode` component renders itself recursively to handle nested folder structures:
```jsx
{node.type === 'folder' && isOpen && node.children && (
  <div className="node-children">
    {node.children.map((child) => (
      <FileNode
        key={child.id}
        node={child}
        onAdd={onAdd}
        onDelete={onDelete}
        onRename={onRename}
      />
    ))}
  </div>
)}
```

### Data Structure
```javascript
{
  id: 'unique-id',
  name: 'folder-name',
  type: 'folder' | 'file',
  children: [] // only for folders
}
```

### Recursive Operations
All CRUD operations (add, delete, rename) are implemented recursively:
- **Add**: Recursively finds parent folder and adds new node
- **Delete**: Recursively filters out deleted node from tree
- **Rename**: Recursively finds and updates node name

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

- **Expand/Collapse Folders**: Click on any folder name
- **Add File**: Hover over a folder and click the 📄+ button
- **Add Folder**: Hover over a folder and click the 📁+ button
- **Rename**: Click the ✏️ button, edit name, press Enter
- **Delete**: Click the 🗑️ button and confirm

## Project Structure

```
FileExplorer/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── App.css
│   ├── FileExplorer.jsx      # Main component with recursion
│   ├── FileExplorer.css      # Styles
│   └── index.js
├── package.json
└── README.md
```

## Technologies Used

- React 18
- React Hooks (useState)
- CSS3 (Gradients, Animations, Flexbox)
- Recursion for nested structures

## Customization

You can modify the initial file structure in the `FileExplorer` component by updating the `fileSystem` state initialization.

## License

MIT

