require('dotenv').config();
const mysql = require('mysql2');

// Create a connection to the database
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'kashinovi.M03',
  database: process.env.DB_NAME || 'Restaurant_system'
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  
  console.log('Connected to the database');
  
  // Create tables in the correct order (suppliers, ingredients, then purchases)
  createSuppliersTable()
    .then(() => createIngredientsTable())
    .then(() => createPurchasesTable())
    .then(() => {
      console.log('All inventory tables created successfully!');
      db.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error setting up inventory tables:', error);
      db.end();
      process.exit(1);
    });
});

// Function to create suppliers table
function createSuppliersTable() {
  return new Promise((resolve, reject) => {
    // Check if suppliers table exists
    db.query("SHOW TABLES LIKE 'suppliers'", (err, results) => {
      if (err) {
        return reject(err);
      }
      
      if (results.length === 0) {
        console.log('Creating suppliers table...');
        
        const sql = `
          CREATE TABLE suppliers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            contact_phone VARCHAR(20),
            email VARCHAR(100) UNIQUE,
            address VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT
          )
        `;
        
        db.query(sql, (err) => {
          if (err) {
            return reject(err);
          }
          console.log('Suppliers table created successfully');
          resolve();
        });
      } else {
        console.log('Suppliers table already exists');
        resolve();
      }
    });
  });
}

// Function to create ingredients table
function createIngredientsTable() {
  return new Promise((resolve, reject) => {
    // Check if ingredients table exists
    db.query("SHOW TABLES LIKE 'ingredients'", (err, results) => {
      if (err) {
        return reject(err);
      }
      
      if (results.length === 0) {
        console.log('Creating ingredients table...');
        
        const sql = `
          CREATE TABLE ingredients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            variant VARCHAR(50),
            category VARCHAR(50) NOT NULL,
            unit VARCHAR(20) NOT NULL,
            current_stock DECIMAL(10,2) DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;
        
        db.query(sql, (err) => {
          if (err) {
            return reject(err);
          }
          console.log('Ingredients table created successfully');
          resolve();
        });
      } else {
        console.log('Ingredients table already exists');
        resolve();
      }
    });
  });
}

// Function to create purchases table
function createPurchasesTable() {
  return new Promise((resolve, reject) => {
    // Check if purchases table exists
    db.query("SHOW TABLES LIKE 'purchases'", (err, results) => {
      if (err) {
        return reject(err);
      }
      
      if (results.length === 0) {
        console.log('Creating purchases table...');
        
        const sql = `
          CREATE TABLE purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ingredient_id INT NOT NULL,
            supplier_id INT NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            purchase_date DATE NOT NULL,
            notes TEXT,
            FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
          )
        `;
        
        db.query(sql, (err) => {
          if (err) {
            return reject(err);
          }
          console.log('Purchases table created successfully');
          resolve();
        });
      } else {
        console.log('Purchases table already exists');
        resolve();
      }
    });
  });
}
