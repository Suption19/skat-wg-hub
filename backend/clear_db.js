const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'data/wg-hub.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening db:", err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    // Disable foreign key constraints temporarily
    db.run("PRAGMA foreign_keys = OFF;");

    // Fetch all tables
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';", (err, tables) => {
        if (err) {
            console.error(err);
            return;
        }

        tables.forEach(table => {
            db.run(`DELETE FROM ${table.name};`, (err) => {
                if (err) {
                    console.error(`Error deleting from ${table.name}:`, err.message);
                } else {
                    console.log(`Cleared table: ${table.name}`);
                }
            });
        });

        // Reset auto increment counters
        db.run("DELETE FROM sqlite_sequence;", (err) => {
             if (err) console.error("Error deleting sqlite_sequence:", err.message);
             else console.log("Reset auto-increment sequences");
        });

        // Re-enable foreign key constraints and close
        db.run("PRAGMA foreign_keys = ON;", () => {
            db.close((err) => {
                if (err) console.error("Error closing db:", err.message);
                else console.log("Database successfully swept clean!");
            });
        });
    });
});
