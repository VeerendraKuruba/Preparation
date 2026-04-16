import React from "react";

function Home({ products, addToCart }) {
  return (
    <div className="home-container" data-testid="home">
      <div className="home-header">
        <h1 data-testid="home-heading">Home</h1>
        <p className="home-subtitle">Discover amazing products at unbeatable prices</p>
      </div>

      <div className="products" data-testid="featured-products">
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
                {products.map((product) => (
                  <tr key={`row-${product.id}`} className="product-row">
                    <td className="product-name-cell">
                      <div className="product-info">
                        <span className="product-icon">🛒</span>
                        <span data-testid={`product-name-${product.id}`}>
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td
                      data-testid={`product-description-${product.id}`}
                      className="product-description"
                    >
                      {product.description}
                    </td>
                    
                    <td className="product-price">
                      <span
                        data-testid={`product-cost-${product.id}`}
                        className="price-value"
                      >
                        ${parseFloat(String(product.cost).replace(/[^0-9.]/g, '')).toFixed(2)}
                      </span>
                    </td>
                    <td className="product-action">
                      <button
                        className="add-to-cart-btn"
                        data-testid={`add-to-cart-button-${product.id}`}
                        onClick={() => addToCart(product)}
                      >
                        <span className="btn-text">Add to cart</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
