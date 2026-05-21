import React from 'react';
import { useCart } from './CartContext';

const PRODUCTS = [
  { id: 'coffee', name: 'Coffee', price: 4.5 },
  { id: 'tea', name: 'Tea', price: 3.25 },
  { id: 'cookie', name: 'Cookie', price: 2.1 },
];

export function Cart() {
  const { state, dispatch, total } = useCart();

  return (
    <div className="content">
      <section className="panel">
        <h2 className="panelTitle">Products</h2>
        <div className="products">
          {PRODUCTS.map((p) => (
            <div key={p.id} className="row">
              <div className="rowLeft">
                <div className="name">{p.name}</div>
                <div className="sub">{p.price}</div>
              </div>
              <button
                className="btn btnPrimary"
                onClick={() =>
                  dispatch({
                    type: 'ADD_ITEM',
                    payload: { id: p.id, name: p.name, price: p.price },
                  })
                }
              >
                Add
              </button>
            </div>
          ))}
        </div>
        <div className="muted">
          Interview talking point: cart state lives in Context; updates go through a
          reducer via actions.
        </div>
      </section>

      <section className="panel">
        <h2 className="panelTitle">Cart</h2>
        <div className="cartList">
          {state.items.length === 0 ? (
            <div className="muted">Cart is empty.</div>
          ) : (
            state.items.map((i) => (
              <div key={i.id} className="row">
                <div className="rowLeft">
                  <div className="name">{i.name}</div>
                  <div className="sub">
                    {i.price} each · line: {i.price * i.qty}
                  </div>
                </div>

                <div className="qtyControls">
                  <button
                    className="btn"
                    onClick={() => dispatch({ type: 'DECREMENT', payload: i.id })}
                    aria-label={`decrease ${i.name}`}
                  >
                    −
                  </button>
                  <div className="pill">{i.qty}</div>
                  <button
                    className="btn"
                    onClick={() => dispatch({ type: 'INCREMENT', payload: i.id })}
                    aria-label={`increase ${i.name}`}
                  >
                    +
                  </button>
                  <button
                    className="btn btnDanger"
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: i.id })}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="totalBar">
          <span>Total</span>
          <span>{total}</span>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => dispatch({ type: 'CLEAR' })}>
            Clear cart
          </button>
        </div>
      </section>
    </div>
  );
}

