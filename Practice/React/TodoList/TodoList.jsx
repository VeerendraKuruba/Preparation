import React, { useState, useRef, useEffect } from 'react';
import './TodoList.css';

const TodoList = () => {
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle adding a new task
  const handleSubmit = () => {
    const taskText = inputValue.trim();

    // Validate input
    if (taskText === '') {
      alert('Please enter a task!');
      return;
    }

    // Add task to the list
    setTasks([...tasks, taskText]);

    // Clear input field
    setInputValue('');

    // Focus back on input for better UX
    inputRef.current?.focus();
  };

  // Handle deleting a task
  const handleDelete = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="todo-container">
      <h1>Todo List</h1>

      <div className="input-section">
        <input
          ref={inputRef}
          type="text"
          id="taskInput"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter a new task..."
          aria-label="Task input"
        />
        <button id="submitBtn" onClick={handleSubmit}>
          Submit
        </button>
      </div>

      <ul id="todoList">
        {tasks.length === 0 ? (
          <li className="empty-message">No tasks yet. Add one above!</li>
        ) : (
          tasks.map((task, index) => (
            <li key={index} className="todo-item" data-index={index}>
              <span className="todo-text">{task}</span>
              <button
                className="delete-btn"
                onClick={() => handleDelete(index)}
                data-index={index}
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default TodoList;

