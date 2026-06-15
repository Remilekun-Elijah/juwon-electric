/* eslint-disable react/prop-types */
import { useState } from "react";
import { adminRequest } from "../../../utils/api";
import { formatCurrency, getOrderRevenue, parseMoney } from "../utils/adminFormatters";
import { SelectField } from "./FormControls";

const orderStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const leadStatusOptions = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "completed", label: "Completed" },
];

const getStatusOptions = (type) =>
  type === "orders" ? orderStatusOptions : leadStatusOptions;

const getDefaultStatus = (type) => (type === "orders" ? "pending" : "new");

const OrderDetails = ({ order, onClose }) => {
  if (!order) {
    return (
      <aside className="admin-order-detail admin-order-detail-empty">
        <div className="admin-panel-title">
          <div>
            <span>Order details</span>
            <h2>Select an order</h2>
          </div>
        </div>
        <p className="admin-empty">Click an order row to view customer details, delivery address, items, and totals.</p>
      </aside>
    );
  }

  const items = order.order || [];

  return (
    <aside className="admin-order-detail">
      <div className="admin-panel-title">
        <div>
          <span>Order details</span>
          <h2>{order.name}</h2>
        </div>
        <button className="admin-ghost" onClick={onClose}>Close</button>
      </div>

      <div className="admin-detail-grid">
        <div><span>Phone</span><strong>{order.phoneNumber || "Not provided"}</strong></div>
        <div><span>Email</span><strong>{order.emailAddress || "Not provided"}</strong></div>
        <div><span>Status</span><strong>{order.status || "pending"}</strong></div>
        <div><span>Total</span><strong>{formatCurrency(getOrderRevenue(order))}</strong></div>
      </div>

      <div className="admin-detail-block">
        <span>Delivery address</span>
        <p>{order.deliveryAddress || "Not provided"}</p>
      </div>

      <div className="admin-order-items">
        <span>Items</span>
        {items.map((item, index) => {
          const quantity = Number(item.quantity || 1);
          const unitPrice = parseMoney(item.price);
          return (
            <article key={`${item.package}-${index}`}>
              <div>
                <strong>{item.package}</strong>
                <small>{item.type || item.kva}</small>
              </div>
              <div>
                <strong>{formatCurrency(unitPrice * quantity)}</strong>
                <small>{item.price} x {quantity}</small>
              </div>
            </article>
          );
        })}
        {!items.length && <p className="admin-empty">No order items available.</p>}
      </div>
    </aside>
  );
};

const ContactDetails = ({ contact, onClose, onSent }) => {
  const [subject, setSubject] = useState("Re: Your message to Juwon Electric");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!contact) {
    return (
      <aside className="admin-order-detail admin-order-detail-empty">
        <div className="admin-panel-title">
          <div>
            <span>Contact reply</span>
            <h2>Select a message</h2>
          </div>
        </div>
        <p className="admin-empty">Click a contact message to read it and reply directly to the customer’s email.</p>
      </aside>
    );
  }

  const thread = [
    ...(contact.replies || []).map((reply) => ({
      ...reply,
      direction: "Admin reply",
      at: reply.sentAt,
    })),
    ...(contact.inboundReplies || []).map((reply) => ({
      ...reply,
      direction: "Client reply",
      at: reply.receivedAt,
    })),
  ].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  const sendReply = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await adminRequest(`/contacts/${contact.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      setMessage("");
      await onSent();
    } catch (event) {
      setError(event.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="admin-order-detail">
      <div className="admin-panel-title">
        <div>
          <span>Contact reply</span>
          <h2>{contact.name}</h2>
        </div>
        <button className="admin-ghost" onClick={onClose}>Close</button>
      </div>

      <div className="admin-detail-grid">
        <div><span>Email</span><strong>{contact.emailAddress || "Not provided"}</strong></div>
        <div><span>Phone</span><strong>{contact.phoneNumber || "Not provided"}</strong></div>
        <div><span>Status</span><strong>{contact.status || "new"}</strong></div>
        <div><span>Replies</span><strong>{contact.replies?.length || 0}</strong></div>
      </div>

      <div className="admin-detail-block">
        <span>Customer message</span>
        <p>{contact.message}</p>
      </div>

      {thread.length > 0 && (
        <div className="admin-order-items">
          <span>Conversation history</span>
          {thread.map((reply, index) => (
            <article key={`${reply.at}-${index}`}>
              <div>
                <strong>{reply.direction}: {reply.subject || "No subject"}</strong>
                <small>{reply.message}</small>
              </div>
              <div>
                <small>{reply.at ? new Date(reply.at).toLocaleString() : ""}</small>
              </div>
            </article>
          ))}
        </div>
      )}

      <form className="admin-reply-form" onSubmit={sendReply}>
        {error && <p className="admin-error">{error}</p>}
        <label className="admin-field">
          <span>Subject</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
        </label>
        <label className="admin-field">
          <span>Reply message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            minLength={3}
          />
        </label>
        <button className="admin-primary" disabled={sending || !contact.emailAddress}>
          {sending ? "Sending" : "Send Reply"}
        </button>
      </form>
    </aside>
  );
};

const Operations = ({ type, data, reload, invalidate }) => {
  const items = data[type] || [];
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const updateStatus = async (id, status) => {
    await adminRequest(`/${type}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    if (type === "orders") invalidate("dashboard");
    await reload();
  };

  const openOrder = async (item) => {
    if (type !== "orders") return;
    setLoadingOrder(true);
    try {
      const response = await adminRequest(`/orders/${item.id}`);
      setSelectedOrder(response.data || item);
    } finally {
      setLoadingOrder(false);
    }
  };

  const openContact = (item) => {
    if (type !== "contacts") return;
    setSelectedContact(item);
  };

  const layoutClass =
    type === "orders" || type === "contacts"
      ? "admin-orders-layout"
      : "admin-operations-single";

  return (
    <section className={layoutClass}>
      <div className="admin-panel admin-orders-list">
        <div className="admin-panel-title">
          <div>
            <span>{items.length} records</span>
            <h2>{type}</h2>
          </div>
        </div>
        {loadingOrder && <p className="admin-loading">Loading order details...</p>}
        <div className="admin-table">
          {items.map((item) => (
            <article
              key={item.id}
              className={`admin-record ${["orders", "contacts"].includes(type) ? "admin-record-clickable" : ""}`}
              onClick={() => (type === "orders" ? openOrder(item) : openContact(item))}
            >
              <div>
                <strong>{item.name || item.emailAddress || item.sessionId || item.id}</strong>
                <span>{item.phoneNumber || item.deliveryAddress || item.total || item.status}</span>
                {item.message && <p>{item.message}</p>}
              </div>
              {type === "orders" && <strong>{formatCurrency(getOrderRevenue(item))}</strong>}
              <span className={`admin-chip admin-chip-${item.status || getDefaultStatus(type)}`}>
                {item.status || getDefaultStatus(type)}
              </span>
              {type !== "newsletter" && (
                <SelectField
                  compact
                  value={item.status || getDefaultStatus(type)}
                  options={getStatusOptions(type)}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(value) => updateStatus(item.id, value)}
                />
              )}
            </article>
          ))}
          {!items.length && <p className="admin-empty">No records yet.</p>}
        </div>
      </div>
      {type === "orders" && (
        <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
      {type === "contacts" && (
        <ContactDetails
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSent={async () => {
            await reload();
            setSelectedContact(null);
          }}
        />
      )}
    </section>
  );
};

export default Operations;
