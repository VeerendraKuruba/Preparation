import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "../Navbar";
import Home from "../Home";
import Cart from "../Cart";
import products from "../../data/products";

function HackerMart() {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) return prev;
      return [...prev, product];
    });
  };

  const removeFromCart = (product) => {
    setCart((prev) => prev.filter((item) => item.id !== product.id));
  };

  return (
    <div className="hacker-mart">
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={<Home products={products} addToCart={addToCart} />}
          />
          <Route
            path="/cart"
            element={<Cart cart={cart} removeFromCart={removeFromCart} />}
          />
        </Routes>
      </div>
    </div>
  );
}

export default HackerMart;
