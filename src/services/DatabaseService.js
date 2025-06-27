import SQLite from 'react-native-sqlite-storage';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  authenticateUser = (phone, password) => {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));

      this.db.executeSql(
        'SELECT * FROM personal_details WHERE phone = ? AND password = ?;',
        [phone, password]
      )
        .then((results) => {
          if (results[0].rows.length > 0) {
            const user = results[0].rows.item(0);
            resolve({
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              age: user.age,
              permanentAddress: user.permanent_address,
            });
          } else {
            resolve(null); // No user found
          }
        })
        .catch((error) => {
          console.log('Authentication error:', error);
          reject(error);
        });
    });
  };

  // Initialize SQLite DB
  initDatabase = () => {
    SQLite.enablePromise(true);
    SQLite.openDatabase({ name: 'PersonalDetailsDB.db', location: 'default' })
      .then((database) => {
        this.db = database;
        console.log('✅ Database opened');
        return this.db.executeSql('PRAGMA foreign_keys = ON;');
      })
      .then(() => {
        console.log('🔗 Foreign key support enabled');
        // Drop existing tables and recreate to fix schema issues
        return this.dropAndCreateTables();
      })
      .catch((error) => {
        console.log('❌ Error opening DB or enabling foreign keys:', error);
      });
  };

  // Drop existing tables and create new ones with correct schema
  dropAndCreateTables = () => {
    if (!this.db) return console.log('❌ DB not initialized');

    return this.db.transaction((tx) => {
      // Drop existing tables
      tx.executeSql('DROP TABLE IF EXISTS communication_addresses;');
      tx.executeSql('DROP TABLE IF EXISTS personal_details;');
      
      // Create personal_details table with password column
      const personalDetailsTable = `
        CREATE TABLE personal_details (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          age INTEGER NOT NULL,
          permanent_address TEXT NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`;

      // Create communication_addresses table
      const communicationTable = `
        CREATE TABLE communication_addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER NOT NULL,
          communication_address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_id) REFERENCES personal_details(id) ON DELETE CASCADE
        );`;

      tx.executeSql(personalDetailsTable);
      tx.executeSql(communicationTable);
      
    }).then(() => {
      console.log('✅ Tables recreated successfully with correct schema');
    }).catch((error) => {
      console.log('❌ Error recreating tables:', error);
    });
  };

  // Enhanced insert method with better error handling
  insertPersonalDetailWithAddresses = (details, addresses) => {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.log('❌ Database not initialized');
        return reject(new Error('Database not initialized'));
      }

      const { name, email, phone, age, permanentAddress, password } = details;
      const { communicationAddress } = addresses;

      // Validate required fields
      if (!name?.trim() || !email?.trim() || !phone?.trim() || !age || !permanentAddress?.trim() || !password?.trim() || !communicationAddress?.trim()) {
        console.log('❌ Missing required fields');
        return reject(new Error('All fields are required and cannot be empty'));
      }

      // Additional validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return reject(new Error('Please enter a valid email address'));
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        return reject(new Error('Phone number must be exactly 10 digits'));
      }

      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        return reject(new Error('Please enter a valid age between 1 and 150'));
      }

      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
      if (!passwordRegex.test(password) || password.length < 6) {
        return reject(new Error('Password must contain letters, numbers, special characters and be at least 6 characters long'));
      }

      console.log('🔍 insertPersonalDetailWithAddresses input validated');

      this.db.transaction(
        (tx) => {
          // Insert into personal_details
          tx.executeSql(
            'INSERT INTO personal_details (name, email, phone, age, permanent_address, password) VALUES (?, ?, ?, ?, ?, ?);',
            [name.trim(), email.trim(), phone.trim(), ageNum, permanentAddress.trim(), password.trim()],
            (tx, result) => {
              const personId = result.insertId;
              console.log('✅ personal_details inserted, ID:', personId);

              // Insert into communication_addresses
              tx.executeSql(
                'INSERT INTO communication_addresses (person_id, communication_address) VALUES (?, ?);',
                [personId, communicationAddress.trim()],
                (tx, result) => {
                  console.log('✅ communication_addresses inserted for person_id:', personId);
                  resolve(personId);
                },
                (tx, error) => {
                  console.log('❌ Error inserting communication address:', error);
                  reject(new Error(`Failed to insert communication address: ${error.message}`));
                }
              );
            },
            (tx, error) => {
              console.log('❌ Error inserting personal detail:', error);
              reject(new Error(`Failed to insert personal details: ${error.message}`));
            }
          );
        },
        (error) => {
          // Transaction error callback
          console.log('❌ Transaction error:', error);
          reject(new Error(`Transaction failed: ${error.message}`));
        },
        () => {
          // Transaction success callback
          console.log('✅ Transaction completed successfully');
        }
      );
    });
  };

  // Get all personal details with addresses
  getAllPersonalDetails = () => {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.log('❌ Database not initialized');
        return reject(new Error('Database not initialized'));
      }

      const query = `
        SELECT pd.*, ca.communication_address
        FROM personal_details pd
        LEFT JOIN communication_addresses ca ON pd.id = ca.person_id
        ORDER BY pd.created_at DESC;`;

      this.db.executeSql(query)
        .then((results) => {
          const rows = results[0].rows;
          const data = [];

          for (let i = 0; i < rows.length; i++) {
            const item = rows.item(i);
            data.push({
              ...item,
              permanentAddress: item.permanent_address,
              communicationAddress: item.communication_address,
            });
          }

          console.log('✅ Retrieved', data.length, 'records');
          resolve(data);
        })
        .catch((error) => {
          console.log('❌ Error fetching data:', error);
          reject(new Error(`Failed to fetch data: ${error.message}`));
        });
    });
  };

  // Update personal detail + communication address
  updatePersonalDetailWithAddresses = (id, details, addresses) => {
    const { name, email, phone, age, permanentAddress, password } = details;
    const { communicationAddress } = addresses;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.log('❌ Database not initialized');
        return reject(new Error('Database not initialized'));
      }

      // Validate required fields
      if (!name?.trim() || !email?.trim() || !phone?.trim() || !age || !permanentAddress?.trim() || !password?.trim() || !communicationAddress?.trim()) {
        console.log('❌ Missing required fields for update');
        return reject(new Error('All fields are required and cannot be empty'));
      }

      // Additional validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return reject(new Error('Please enter a valid email address'));
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone.trim())) {
        return reject(new Error('Phone number must be exactly 10 digits'));
      }

      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
        return reject(new Error('Please enter a valid age between 1 and 150'));
      }

      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
      if (!passwordRegex.test(password) || password.length < 6) {
        return reject(new Error('Password must contain letters, numbers, special characters and be at least 6 characters long'));
      }

      console.log('🔍 Updating record ID:', id);

      this.db.transaction(
        (tx) => {
          // Update personal_details
          tx.executeSql(
            'UPDATE personal_details SET name = ?, email = ?, phone = ?, age = ?, permanent_address = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
            [name.trim(), email.trim(), phone.trim(), ageNum, permanentAddress.trim(), password.trim(), id],
            (tx, result) => {
              console.log('✅ personal_details updated, rows affected:', result.rowsAffected);
              
              if (result.rowsAffected === 0) {
                reject(new Error('No record found with the given ID'));
                return;
              }

              // Check if communication address exists
              tx.executeSql(
                'SELECT id FROM communication_addresses WHERE person_id = ?;',
                [id],
                (tx, results) => {
                  const hasAddress = results.rows.length > 0;
                  
                  const sql = hasAddress
                    ? 'UPDATE communication_addresses SET communication_address = ?, updated_at = CURRENT_TIMESTAMP WHERE person_id = ?;'
                    : 'INSERT INTO communication_addresses (person_id, communication_address) VALUES (?, ?);';

                  const params = hasAddress
                    ? [communicationAddress.trim(), id]
                    : [id, communicationAddress.trim()];

                  tx.executeSql(
                    sql,
                    params,
                    (tx, result) => {
                      console.log('✅ communication_addresses updated/inserted');
                      resolve(result.rowsAffected);
                    },
                    (tx, error) => {
                      console.log('❌ Error updating communication address:', error);
                      reject(new Error(`Failed to update communication address: ${error.message}`));
                    }
                  );
                },
                (tx, error) => {
                  console.log('❌ Error checking communication address:', error);
                  reject(new Error(`Failed to check communication address: ${error.message}`));
                }
              );
            },
            (tx, error) => {
              console.log('❌ Error updating personal detail:', error);
              reject(new Error(`Failed to update personal details: ${error.message}`));
            }
          );
        },
        (error) => {
          // Transaction error callback
          console.log('❌ Update transaction error:', error);
          reject(new Error(`Update transaction failed: ${error.message}`));
        },
        () => {
          // Transaction success callback
          console.log('✅ Update transaction completed successfully');
        }
      );
    });
  };

  // Delete method
  deletePersonalDetail = (id) => {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.log('❌ Database not initialized');
        return reject(new Error('Database not initialized'));
      }

      this.db.executeSql(
        'DELETE FROM personal_details WHERE id = ?;',
        [id]
      )
        .then((result) => {
          const affected = result[0].rowsAffected;
          if (affected > 0) {
            console.log('✅ Record deleted, rows affected:', affected);
            resolve(affected);
          } else {
            console.log('❌ No record found with ID:', id);
            reject(new Error('Delete failed: ID not found'));
          }
        })
        .catch((error) => {
          console.log('❌ Delete error:', error);
          reject(new Error(`Delete failed: ${error.message}`));
        });
    });
  };

  // Test database connection
  testConnection = () => {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.executeSql('SELECT 1 as test;')
        .then((result) => {
          console.log('✅ Database connection test passed');
          resolve(true);
        })
        .catch((error) => {
          console.log('❌ Database connection test failed:', error);
          reject(error);
        });
    });
  };

  // Clear all data (for testing purposes)
  clearAllData = () => {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      this.db.transaction((tx) => {
        tx.executeSql('DELETE FROM communication_addresses;');
        tx.executeSql('DELETE FROM personal_details;');
      }).then(() => {
        console.log('✅ All data cleared');
        resolve(true);
      }).catch((error) => {
        console.log('❌ Error clearing data:', error);
        reject(error);
      });
    });
  };
}

export default new DatabaseService();