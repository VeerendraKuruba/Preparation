import React from 'react';
import './App.css';
import { CartProvider } from './cart/CartContext';
import { Cart } from './cart/Cart';

export default function App() {
  return (
    <CartProvider>
      <div className="page">
        <div className="card">
          <header className="header">
            <h1>Shopping cart (Context + useReducer)</h1>
          </header>
          <Cart />
        </div>
      </div>
    </CartProvider>
  );
}

