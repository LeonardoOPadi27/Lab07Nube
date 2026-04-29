const bcrypt = require("bcrypt");
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Cuadernillo123+",
  database: process.env.DB_NAME || "lab07",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0
  )`,
];

const seedUser = {
  name: process.env.SEED_USER_NAME || "Leonardo Olortegui",
  email: process.env.SEED_USER_EMAIL || "leonardo.olortegui@tecsup.edu.pe",
  password: process.env.SEED_USER_PASSWORD || "Cuadernillo123+",
};

const ready = new Promise((resolve, reject) => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Error DB:", err);
      reject(err);
      return;
    }

    connection.release();

    Promise.all(
      schemaStatements.map((sql) =>
        new Promise((tableResolve, tableReject) => {
          db.query(sql, (queryErr) => {
            if (queryErr) {
              tableReject(queryErr);
              return;
            }

            tableResolve();
          });
        })
      )
    )
      .then(
        () =>
          new Promise((seedResolve, seedReject) => {
            const hash = bcrypt.hashSync(seedUser.password, 10);
            db.query(
              "INSERT IGNORE INTO users (name, email, password) VALUES (?, ?, ?)",
              [seedUser.name, seedUser.email, hash],
              (seedErr) => {
                if (seedErr) {
                  seedReject(seedErr);
                  return;
                }

                seedResolve();
              }
            );
          })
      )
      .then(() => {
        console.log("MySQL conectado");
        resolve();
      })
      .catch((schemaErr) => {
        console.error("Error creando esquema:", schemaErr);
        reject(schemaErr);
      });
  });
});

module.exports = db;
module.exports.ready = ready;