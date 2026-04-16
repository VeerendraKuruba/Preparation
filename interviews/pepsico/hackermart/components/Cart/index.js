import React from "react";

function Cart({ cart, removeFromCart }) {
  const parseCost = (cost) => parseFloat(String(cost).replace(/[^0-9.]/g, ""));
  const total = cart.reduce((sum, item) => sum + parseCost(item.cost), 0);

  return (
    <div className="cart-container" data-testid="shopping-cart">
      <div className="cart-header">
        <h1 data-testid="cart-heading" className="cart-heading">Cart</h1>
        <p className="cart-subtitle">Review your selected items</p>
      </div>

      <div className="cart" data-testid="cart">
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody data-testid="products">
                {cart.map((item) => (
                  <tr key={`row-${item.id}`} className="cart-item-row">
                    <td className="product-name-cell">
                      <div className="product-info">
                        <span className="product-icon">🛒</span>
                        <span data-testid={`product-name-${item.id}`}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td
                      data-testid={`product-description-${item.id}`}
                      className="product-description"
                    >
                      {item.description}
                    </td>
                    <td className="product-price">
                      <span
                        data-testid={`product-cost-${item.id}`}
                        className="price-value"
                      >
                        ${parseCost(item.cost).toFixed(2)}
                      </span>
                    </td>
                    <td className="product-action">
                      <button
                        className="remove-from-cart-btn"
                        data-testid={`remove-from-cart-button-${item.id}`}
                        onClick={() => removeFromCart(item)}
                      >
                        <span className="btn-text">Remove from cart</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="cart-total-section">
          <div className="total-card">
            <div className="total-header">
              <h3>Order Summary</h3>
            </div>
            <div className="total-details">
              <div className="total-line total-final">
                <span className="total-label">Total</span>
                <label className="cart-total" data-testid="cart-total">
                  Total: {total.toFixed(2)}
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Cart;
