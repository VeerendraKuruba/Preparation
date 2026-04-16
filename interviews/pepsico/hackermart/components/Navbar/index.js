import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <header data-testid="header" className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1 className="brand-title">HackerMart</h1>
          <p className="brand-subtitle">Your Digital Marketplace</p>
        </div>
        <div className="nav-links" data-testid="navigation-tabs">
          <Link
            className="nav-link"
            id="home-link"
            data-testid="home-link"
            to="/"
          >
            Home
          </Link>
          <Link
            className="nav-link"
            id="cart-link"
            data-testid="cart-link"
            to="/cart"
          >
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
