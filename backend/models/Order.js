const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

class Order {
  static async createFromCart(userId, cartItems) {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cannot create an order from an empty cart');
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );


    return prisma.$transaction(async (tx) => {
      
      for (const item of cartItems) {
        const product = await tx.product.findUnique({ where: { id: item.product_id } });
        if (!product) {
          throw new Error(`"${item.title}" is no longer available.`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for "${product.title}" — only ${product.stock} left.`);
        }
      }

      const order = await tx.order.create({
        data: {
          user_id: userId,
          total_amount: totalAmount,
          status: 'pending',
          items: {
            create: cartItems.map((item) => ({
              product_id: item.product_id,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cart: { user_id: userId } } });

      return order;
    });
  }

  static async findByUserId(userId) {
    return prisma.order.findMany({
      where: { user_id: userId },
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
  }

  static async findById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  static async updateStatus(id, status) {
    try {
      return await prisma.order.update({
        where: { id },
        data: { status },
      });
    } catch (error) {

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  static async findAll() {
    return prisma.order.findMany({ orderBy: { created_at: 'desc' } });
  }
}

module.exports = Order;