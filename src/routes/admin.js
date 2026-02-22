const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyAdmin } = require('../middleware/auth');

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ==================== AUTH ====================

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await prisma.adminUser.findUnique({ where: { username } });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, admin.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: admin.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ==================== CATEGORIES ====================

router.get('/categories', verifyAdmin, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { _count: { select: { menuItems: true } } }
        });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/categories', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, sortOrder } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const category = await prisma.category.create({
            data: { name, sortOrder: parseInt(sortOrder) || 0, image }
        });
        res.status(201).json(category);
    } catch (err) {
        console.error('Create category error:', err);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/categories/:id', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, sortOrder, isActive } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
        if (isActive !== undefined) data.isActive = isActive === 'true' || isActive === true;
        if (req.file) data.image = `/uploads/${req.file.filename}`;

        const category = await prisma.category.update({
            where: { id: parseInt(req.params.id) },
            data
        });
        res.json(category);
    } catch (err) {
        console.error('Update category error:', err);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/categories/:id', verifyAdmin, async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Category deleted' });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// ==================== MENU ITEMS ====================

router.get('/menu-items', verifyAdmin, async (req, res) => {
    try {
        const items = await prisma.menuItem.findMany({
            orderBy: { name: 'asc' },
            include: { category: true }
        });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

router.post('/menu-items', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, categoryId, isVeg, isAvailable } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const item = await prisma.menuItem.create({
            data: {
                name,
                description: description || '',
                price: parseFloat(price),
                categoryId: parseInt(categoryId),
                isVeg: isVeg === 'true' || isVeg === true,
                isAvailable: isAvailable !== 'false' && isAvailable !== false,
                image
            },
            include: { category: true }
        });
        res.status(201).json(item);
    } catch (err) {
        console.error('Create menu item error:', err);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

router.put('/menu-items/:id', verifyAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, categoryId, isVeg, isAvailable } = req.body;
        const data = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (price !== undefined) data.price = parseFloat(price);
        if (categoryId !== undefined) data.categoryId = parseInt(categoryId);
        if (isVeg !== undefined) data.isVeg = isVeg === 'true' || isVeg === true;
        if (isAvailable !== undefined) data.isAvailable = isAvailable === 'true' || isAvailable === true;
        if (req.file) data.image = `/uploads/${req.file.filename}`;

        const item = await prisma.menuItem.update({
            where: { id: parseInt(req.params.id) },
            data,
            include: { category: true }
        });
        res.json(item);
    } catch (err) {
        console.error('Update menu item error:', err);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

router.delete('/menu-items/:id', verifyAdmin, async (req, res) => {
    try {
        await prisma.menuItem.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        console.error('Delete menu item error:', err);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

// ==================== ORDERS ====================

router.get('/orders', verifyAdmin, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: { include: { menuItem: true } }
            }
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

router.put('/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await prisma.order.update({
            where: { id: parseInt(req.params.id) },
            data: { status }
        });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router;
