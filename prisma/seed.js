const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.upsert({
        where: { username: 'admin' },
        update: {},
        create: { username: 'admin', password: hashedPassword }
    });
    console.log('✅ Admin user created (admin / admin123)');

    // Create categories
    const categories = [
        { name: 'Burgers', sortOrder: 1 },
        { name: 'Pizza', sortOrder: 2 },
        { name: 'Starters', sortOrder: 3 },
        { name: 'Rice & Biryani', sortOrder: 4 },
        { name: 'Drinks', sortOrder: 5 },
        { name: 'Desserts', sortOrder: 6 }
    ];

    const createdCategories = {};
    for (const cat of categories) {
        const created = await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat
        });
        createdCategories[cat.name] = created.id;
    }
    console.log('✅ Categories created');

    // Create menu items
    const menuItems = [
        // Burgers
        { name: 'Classic Chicken Burger', description: 'Crispy chicken patty with lettuce, tomato & mayo', price: 149, categoryId: createdCategories['Burgers'], isVeg: false },
        { name: 'Paneer Tikka Burger', description: 'Spicy paneer patty with mint chutney', price: 129, categoryId: createdCategories['Burgers'], isVeg: true },
        { name: 'Double Cheese Burger', description: 'Double patty with cheddar cheese & special sauce', price: 199, categoryId: createdCategories['Burgers'], isVeg: false },

        // Pizza
        { name: 'Margherita Pizza', description: 'Classic tomato sauce, mozzarella & fresh basil', price: 199, categoryId: createdCategories['Pizza'], isVeg: true },
        { name: 'Chicken Tikka Pizza', description: 'Tandoori chicken, onions, peppers & mozzarella', price: 299, categoryId: createdCategories['Pizza'], isVeg: false },
        { name: 'Veggie Supreme Pizza', description: 'Mushrooms, olives, peppers, onions & corn', price: 249, categoryId: createdCategories['Pizza'], isVeg: true },

        // Starters
        { name: 'Paneer 65', description: 'Crispy fried paneer cubes tossed in spicy masala', price: 179, categoryId: createdCategories['Starters'], isVeg: true },
        { name: 'Chicken Wings', description: 'Crispy wings tossed in hot sauce', price: 219, categoryId: createdCategories['Starters'], isVeg: false },
        { name: 'Spring Rolls', description: 'Crispy rolls stuffed with veggies', price: 129, categoryId: createdCategories['Starters'], isVeg: true },

        // Rice & Biryani
        { name: 'Chicken Biryani', description: 'Fragrant basmati rice with tender chicken pieces', price: 249, categoryId: createdCategories['Rice & Biryani'], isVeg: false },
        { name: 'Veg Biryani', description: 'Mixed vegetables cooked with aromatic spices', price: 199, categoryId: createdCategories['Rice & Biryani'], isVeg: true },
        { name: 'Egg Fried Rice', description: 'Wok-tossed rice with egg and vegetables', price: 149, categoryId: createdCategories['Rice & Biryani'], isVeg: false },

        // Drinks
        { name: 'Mango Lassi', description: 'Creamy yogurt blended with fresh mango', price: 99, categoryId: createdCategories['Drinks'], isVeg: true },
        { name: 'Cold Coffee', description: 'Chilled coffee with ice cream', price: 129, categoryId: createdCategories['Drinks'], isVeg: true },
        { name: 'Fresh Lime Soda', description: 'Refreshing lime with soda water', price: 79, categoryId: createdCategories['Drinks'], isVeg: true },

        // Desserts
        { name: 'Gulab Jamun', description: 'Soft milk dumplings soaked in sugar syrup', price: 99, categoryId: createdCategories['Desserts'], isVeg: true },
        { name: 'Chocolate Brownie', description: 'Warm brownie with vanilla ice cream', price: 149, categoryId: createdCategories['Desserts'], isVeg: true },
        { name: 'Rasmalai', description: 'Soft cottage cheese discs in saffron milk', price: 119, categoryId: createdCategories['Desserts'], isVeg: true }
    ];

    for (const item of menuItems) {
        const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
        if (!existing) {
            await prisma.menuItem.create({ data: item });
        }
    }
    console.log('✅ Menu items created');

    // Initialize order counter for current month
    const now = new Date();
    await prisma.orderCounter.upsert({
        where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
        update: {},
        create: { year: now.getFullYear(), month: now.getMonth() + 1, lastSerial: 0 }
    });
    console.log('✅ Order counter initialized');

    console.log('\n🎉 Seeding complete!');
}

main()
    .catch(e => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
