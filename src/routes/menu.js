const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// GET /api/categories - List all active categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
                _count: { select: { menuItems: true } }
            }
        });
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET /api/menu - List menu items with optional category and search filters
router.get('/menu', async (req, res) => {
    try {
        const { category, search } = req.query;
        const where = { isAvailable: true };

        if (category) {
            where.categoryId = parseInt(category);
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const menuItems = await prisma.menuItem.findMany({
            where,
            include: { category: true },
            orderBy: { name: 'asc' }
        });
        res.json(menuItems);
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// GET /api/menu/:id - Get a single menu item
router.get('/menu/:id', async (req, res) => {
    try {
        const item = await prisma.menuItem.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { category: true }
        });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        console.error('Error fetching item:', err);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

module.exports = router;
