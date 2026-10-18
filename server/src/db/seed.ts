import { db } from './database';

export function seedDatabase() {
  console.log('🌱 Seeding MenuMate AI database with Saffron Garden demo data...');

  const insertRestaurant = db.prepare(`
    INSERT OR REPLACE INTO restaurants (id, name, description, logo_url, cover_url, phone, email, address, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMenu = db.prepare(`
    INSERT OR REPLACE INTO menus (id, restaurant_id, title, description, slug, theme, source_language, supported_languages, is_published, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCategory = db.prepare(`
    INSERT OR REPLACE INTO categories (id, menu_id, name, description, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertDish = db.prepare(`
    INSERT OR REPLACE INTO dishes (id, category_id, name, description, price, image_url, dietary_tags, is_available, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTranslation = db.prepare(`
    INSERT OR REPLACE INTO translations (id, entity_type, entity_id, language_code, field_name, translation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');

  try {
    // 1. Restaurant
    insertRestaurant.run(
      'rest-saffron-garden',
      'Saffron Garden (Demo)',
      'Authentic Pakistani & Desi Fusion Cuisine featuring slow-simmered handi, fragrant dum biryanis, and traditional clay-oven breads.',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      '+92 300 1234567',
      'contact@saffrongarden.demo',
      'Shop 14, Food Street, MM Alam Road, Gulberg III, Lahore, Pakistan',
      'PKR'
    );

    // 2. Menu
    insertMenu.run(
      'menu-saffron-main',
      'rest-saffron-garden',
      'Saffron Garden Grand Menu',
      'A celebration of rich culinary heritage with stone-ground spices, tender cuts, and aromatic basmati rice.',
      'saffron-garden',
      'classic',
      'en',
      JSON.stringify(['en', 'ur']),
      1,
      new Date().toISOString()
    );

    // Menu Translation
    insertTranslation.run(
      'tr-menu-title-ur',
      'menu',
      'menu-saffron-main',
      'ur',
      'title',
      'زعفران گارڈن گرینڈ مینو',
      'approved'
    );
    insertTranslation.run(
      'tr-menu-desc-ur',
      'menu',
      'menu-saffron-main',
      'ur',
      'description',
      'روایتی دیسی کھانوں اور لاجواب مسالہ جات سے تیار کردہ زعفران گارڈن کا خصوصی مینو۔',
      'approved'
    );

    // 3. Categories and Dishes
    const categoriesData = [
      {
        id: 'cat-starters',
        name: 'Starters & Appetizers',
        urName: 'شروعات اور اشتہا انگیز',
        desc: 'Crispy, savory delights to begin your culinary journey',
        urDesc: 'تازہ اور لذیذ اشتہا انگیز ہلکے پھلکے کھانے',
        order: 1,
        dishes: [
          {
            id: 'dish-lahori-fish',
            name: 'Lahori Fish Fry',
            urName: 'لاہوری فش فرائی',
            desc: 'Succulent river fish coated in spiced gram flour batter and carom seeds, fried to golden perfection.',
            urDesc: 'اجوائن اور روایتی لاہوری مسالوں میں تلی ہوئی خستہ اور لذیذ مچھلی۔',
            price: 850,
            imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
            tags: ['chef-special', 'spicy'],
            order: 1,
          },
          {
            id: 'dish-crispy-samosas',
            name: 'Crispy Vegetable Samosas (3 pcs)',
            urName: 'خستہ سبزی سموسے (3 عدد)',
            desc: 'Golden handmade pastry stuffed with spiced potatoes, sweet peas, and fresh coriander, served with mint chutney.',
            urDesc: 'آلو، مٹر اور تازہ دھنیے کے مسالے سے بھرے خستہ سموسے مع پودینے کی چٹنی۔',
            price: 250,
            imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
            tags: ['vegetarian'],
            order: 2,
          },
        ],
      },
      {
        id: 'cat-mains',
        name: 'Main Course — Karahi & Curries',
        urName: 'خاص پکوان — کڑاہی اور ہانڈی',
        desc: 'Signature slow-cooked gravies prepared in iron woks over high flame',
        urDesc: 'روایتی لوہے کی کڑاہی میں تازہ تیار کردہ شاندار دیسی سالن',
        order: 2,
        dishes: [
          {
            id: 'dish-chicken-karahi',
            name: 'Chicken Karahi',
            urName: 'چکن کڑاہی',
            desc: 'Tender bone-in chicken simmered in rich tomato gravy, fresh ginger, green chillies, and freshly cracked black pepper.',
            urDesc: 'ٹماٹر، باریک کٹی ادرک، ہری مرچ اور تازہ کالی مرچ میں بھنی ہوئی لاجواب روایتی چکن کڑاہی۔',
            price: 1250,
            imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
            tags: ['chef-special', 'spicy', 'halal'],
            order: 1,
          },
          {
            id: 'dish-chicken-biryani',
            name: 'Chicken Biryani',
            urName: 'چکن بریانی',
            desc: 'Fragrant long-grain aged basmati layered with marinated chicken, saffron milk, caramelized onions, and whole spices.',
            urDesc: 'زعفران، تلی ہوئی پیاز اور خوشبودار مسالوں میں دم دی گئی شاہی چکن بریانی۔',
            price: 450,
            imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
            tags: ['halal', 'popular'],
            order: 2,
          },
          {
            id: 'dish-daal-makhani',
            name: 'Daal Makhani',
            urName: 'دال مکھنی',
            desc: 'Whole black lentils and kidney beans slow-cooked overnight with creamy cultured butter, mild spices, and a touch of cream.',
            urDesc: 'مکھن، بالائی اور دھیمی آنچ پر رات بھر پکی ہوئی ریشمی اور ذائقے دار کالی دال۔',
            price: 550,
            imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
            tags: ['vegetarian', 'mild'],
            order: 3,
          },
        ],
      },
      {
        id: 'cat-drinks',
        name: 'Cold Drinks & Beverages',
        urName: 'ٹھنڈے مشروبات',
        desc: 'Refreshing drinks and traditional quenchers',
        urDesc: 'تازہ دم کر دینے والے روایتی اور جدید مشروبات',
        order: 3,
        dishes: [
          {
            id: 'dish-fresh-lime',
            name: 'Fresh Lime Soda',
            urName: 'فریش لائم سوڈا',
            desc: 'Freshly squeezed key limes served with chilled soda water, mint sprigs, and a dash of Himalayan black salt.',
            urDesc: 'تازہ لیموں، ٹھنڈا سوڈا اور کالا نمک کے ساتھ فرحت بخش مشروب۔',
            price: 200,
            imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
            tags: ['refreshing', 'vegetarian'],
            order: 1,
          },
          {
            id: 'dish-sweet-lassi',
            name: 'Traditional Sweet Lassi',
            urName: 'روایتی میٹھی لسی',
            desc: 'Rich churned country yogurt drink infused with cardamom and topped with clotted cream.',
            urDesc: 'خالص دہی، الائچی اور بالائی کے ساتھ تیار کردہ روایتی ٹھنڈی میٹھی لسی۔',
            price: 250,
            imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
            tags: ['vegetarian'],
            order: 2,
          },
        ],
      },
      {
        id: 'cat-desserts',
        name: 'Desserts & Sweets',
        urName: 'میٹھے اور مٹھائیاں',
        desc: 'Traditional sweet finishes prepared with pure dairy',
        urDesc: 'خالص کھوئے اور دودھ سے تیار کردہ روایتی میٹھے',
        order: 4,
        dishes: [
          {
            id: 'dish-gulab-jamun',
            name: 'Gulab Jamun (2 pcs)',
            urName: 'گلاب جامن (2 عدد)',
            desc: 'Warm milk-solid dumplings soaked in rose and green cardamom scented sugar syrup, garnished with slivered pistachios.',
            urDesc: 'گلاب کے عرق اور الائچی کے شیرے میں ڈوبے ہوئے نرم اور گرم گلاب جامن مع پستہ۔',
            price: 180,
            imageUrl: 'https://images.unsplash.com/photo-1593701461250-d7b22dfd3a77?auto=format&fit=crop&w=600&q=80',
            tags: ['vegetarian', 'popular'],
            order: 1,
          },
        ],
      },
    ];

    for (const cat of categoriesData) {
      insertCategory.run(cat.id, 'menu-saffron-main', cat.name, cat.desc, cat.order);

      // Category translations
      insertTranslation.run(`tr-${cat.id}-name-ur`, 'category', cat.id, 'ur', 'name', cat.urName, 'approved');
      insertTranslation.run(`tr-${cat.id}-desc-ur`, 'category', cat.id, 'ur', 'description', cat.urDesc, 'approved');

      for (const dish of cat.dishes) {
        insertDish.run(
          dish.id,
          cat.id,
          dish.name,
          dish.desc,
          dish.price,
          dish.imageUrl,
          JSON.stringify(dish.tags),
          1,
          dish.order
        );

        // Dish translations
        insertTranslation.run(`tr-${dish.id}-name-ur`, 'dish', dish.id, 'ur', 'name', dish.urName, 'approved');
        insertTranslation.run(`tr-${dish.id}-desc-ur`, 'dish', dish.id, 'ur', 'description', dish.urDesc, 'approved');
      }
    }

    db.exec('COMMIT;');
    console.log('✅ Saffron Garden demo data successfully seeded!');
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('❌ Failed to seed database:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase();
}
