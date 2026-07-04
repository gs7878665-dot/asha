const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  console.log('Starting MySQL database initialization...');
  console.log(`Connecting to Host: ${process.env.DB_HOST}:${process.env.DB_PORT} as User: ${process.env.DB_USER}`);

  let connection;
  try {
    // 1. Connect without database name first to create it if it doesn't exist
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
    });

    const dbName = process.env.DB_NAME || 'asha_referrals';
    console.log(`Creating database "${dbName}" if it does not exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database "${dbName}" checked/created successfully.`);

    // 2. Switch to the newly created/existing database
    await connection.query(`USE \`${dbName}\`;`);

    // 3. Create the patients table
    console.log('Creating table "patients" if it does not exist...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INT NOT NULL,
        gender VARCHAR(15) NOT NULL,
        asha_name VARCHAR(100) NOT NULL,
        date_referred DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await connection.query(createTableQuery);
    console.log('Table "patients" checked/created successfully.');

    // 4. Optionally insert some seed data if empty
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM patients');
    if (rows[0].count === 0) {
      console.log('Database is empty. Seeding some initial demo data...');
      const seedQuery = `
        INSERT INTO patients (name, age, gender, asha_name, date_referred) VALUES
        ('Ramesh Kumar', 45, 'Male', 'Sunita Devi', '2026-07-01'),
        ('Anita Sharma', 32, 'Female', 'Sunita Devi', '2026-07-02'),
        ('Sita Patel', 28, 'Female', 'Kiran Verma', '2026-07-01'),
        ('Vijay Singh', 50, 'Male', 'Kiran Verma', '2026-07-03'),
        ('Amit Verma', 12, 'Male', 'Meena Kumari', '2026-07-04')
      `;
      await connection.query(seedQuery);
      console.log('Demo data seeded successfully!');
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('\n❌ Database Initialization Failed!');
    console.error('Error Details:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n👉 SUGGESTION: Access was denied. Please open "backend/.env" and set the correct "DB_PASSWORD" for your local MySQL root user.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n👉 SUGGESTION: Connection was refused. Ensure your MySQL server service (MySQL80) is running.');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
