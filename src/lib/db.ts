import sql from 'mssql';

const dbName = process.env.DB_NAME || 'EventTicketing';
const dbUser = process.env.DB_USER || 'user';
const dbPassword = process.env.DB_PASSWORD || '123';
const dbHost = process.env.DB_HOST || 'localhost';

const config: sql.config = {
    user: dbUser,
    password: dbPassword,
    server: dbHost,
    database: dbName,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

let pool: sql.ConnectionPool | null = null;

export const getConnection = async (): Promise<sql.ConnectionPool> => {
    if (pool) {
        if (pool.connected) {
            return pool;
        }
        // If pool exists but not connected, close and reset
        try {
            await pool.close();
        } catch (e) {
            // Ignore close error
        }
        pool = null;
    }

    try {
        pool = await sql.connect(config);
        console.log(`Connected to database: ${dbName} on ${dbHost}`);
        return pool;
    } catch (err) {
        console.error('Database Connection Error:', err);
        pool = null;
        throw err;
    }
};

export { sql };
