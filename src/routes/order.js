const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// POST /api/orders - Create a new order with monthly serial number
router.post('/', async (req, res) => {
    try {
        const { customerName, customerPhone, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain at least one item' });
        }

        // Validate all items exist and get prices
        const menuItemIds = items.map(i => i.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } }
        });

        if (menuItems.length !== menuItemIds.length) {
            return res.status(400).json({ error: 'One or more menu items not found' });
        }

        const menuItemMap = {};
        menuItems.forEach(mi => { menuItemMap[mi.id] = mi; });

        // Calculate total
        let totalAmount = 0;
        const orderItems = items.map(i => {
            const menuItem = menuItemMap[i.menuItemId];
            const itemTotal = menuItem.price * i.quantity;
            totalAmount += itemTotal;
            return {
                menuItemId: i.menuItemId,
                quantity: i.quantity,
                price: menuItem.price
            };
        });

        // Generate monthly serial number
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

        // Atomically increment serial
        const counter = await prisma.orderCounter.upsert({
            where: { year_month: { year, month } },
            update: { lastSerial: { increment: 1 } },
            create: { year, month, lastSerial: 1 }
        });

        const serialNumber = `${monthNames[month - 1]}${year}-${String(counter.lastSerial).padStart(4, '0')}`;

        // Create the order
        const order = await prisma.order.create({
            data: {
                serialNumber,
                customerName: customerName || 'Guest',
                customerPhone: customerPhone || '',
                totalAmount,
                items: {
                    create: orderItems
                }
            },
            include: {
                items: {
                    include: { menuItem: true }
                }
            }
        });

        res.status(201).json(order);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// GET /api/orders - List orders (admin use)
router.get('/', async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: { menuItem: true }
                }
            }
        });
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

module.exports = router;
