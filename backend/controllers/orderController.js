const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { recordOrderPlaced } = require('../services/statistics/statsService');

const createOrder = async (req, res) => {
  try {
    const cartItems = await Cart.getByUserId(req.user.id);
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    const order = await Order.createFromCart(req.user.id, cartItems);

    recordOrderPlaced(order);

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    if (error.message.includes('Not enough stock') || error.message.includes('no longer available')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findByUserId(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

// Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'shipped', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.updateStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus };