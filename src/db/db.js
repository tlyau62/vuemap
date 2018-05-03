import {Pool} from 'pg'
import {remote} from 'electron'

const _global = global;

export default {

    // shared
    query(text, params, callback) {
        const pool = _global.pool || remote.getGlobal('pool');
        return pool.query(text, params, callback)
    },

    // main
    async connect(db_name) {

        // main
        if (_global.pool) {
            await _global.pool.end();
        }

        // set pool for main proc
        _global.pool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: db_name || 'postgres',
            password: 'admin'
        });

    },

    // main
    async dropCurrentDb() {
        let oldDb = _global.pool.options.database;
        await this.connect();
        return _global.pool.query(`drop database ${oldDb}`);
    },

    endPool() {
        if (_global.pool) {
            _global.pool.end();
        }
    }

};
