// controllers/AdminController.js
const pool = require('../config/database');
const UserModel = require('../models/UserModel');
const bcrypt = require('bcrypt');

class AdminController {

    // ─── Пользователи ─────────────────────────────────────────────────────────

    static async getUsers(req, res) {
        try {
            const users = await UserModel.findAll();
            res.json({ users });
        } catch (error) {
            console.error('Admin getUsers error:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { username, email, is_activated } = req.body;
            const updated = await UserModel.adminUpdate(id, { username, email, is_activated });
            if (!updated) return res.status(404).json({ error: 'User not found' });
            res.json({ user: updated });
        } catch (error) {
            console.error('Admin updateUser error:', error);
            if (error.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
            res.status(500).json({ error: 'Failed to update user' });
        }
    }

    static async updateUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { password } = req.body;
            if (!password || password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }
            const password_hash = await bcrypt.hash(password, 10);
            const updated = await UserModel.updatePasswordHash(id, password_hash);
            if (!updated) return res.status(404).json({ error: 'User not found' });
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            console.error('Admin updateUserPassword error:', error);
            res.status(500).json({ error: 'Failed to update password' });
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            if (String(id) === String(req.user.id)) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            const deleted = await UserModel.delete(id);
            if (!deleted) return res.status(404).json({ error: 'User not found' });
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Admin deleteUser error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }

    // ─── Универсальный доступ к таблицам ─────────────────────────────────────

    // Белый список таблиц
    static #ALLOWED_TABLES = [
        'users', 'tokens', 'token_denylist',
        'printers', 'materials', 'orders', 'material_transactions',
        'clients', 'tags', 'order_tags', 'order_comments',
        'notifications',
        'teams', 'team_members', 'team_invitations', 'team_resources',
    ];

    static #validateTable(table) {
        if (!AdminController.#ALLOWED_TABLES.includes(table)) {
            throw new Error(`Table "${table}" is not allowed`);
        }
    }

    static async getTables(req, res) {
        try {
            // Возвращаем список таблиц с количеством записей
            const result = await pool.query(`
                SELECT 
                    t.table_name,
                    (SELECT COUNT(*) FROM information_schema.columns c 
                     WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name
            `);

            const tables = await Promise.all(
                result.rows
                    .filter(r => AdminController.#ALLOWED_TABLES.includes(r.table_name))
                    .map(async (r) => {
                        const countRes = await pool.query(`SELECT COUNT(*) FROM "${r.table_name}"`);
                        return {
                            name: r.table_name,
                            column_count: parseInt(r.column_count),
                            row_count: parseInt(countRes.rows[0].count),
                        };
                    })
            );

            res.json({ tables });
        } catch (error) {
            console.error('Admin getTables error:', error);
            res.status(500).json({ error: 'Failed to fetch tables' });
        }
    }

    static async getTableColumns(req, res) {
        try {
            const { table } = req.params;
            AdminController.#validateTable(table);

            const result = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = $1 AND table_schema = 'public'
                ORDER BY ordinal_position
            `, [table]);

            res.json({ columns: result.rows });
        } catch (error) {
            if (error.message.includes('not allowed')) return res.status(400).json({ error: error.message });
            console.error('Admin getTableColumns error:', error);
            res.status(500).json({ error: 'Failed to fetch columns' });
        }
    }

    static async getTableRows(req, res) {
        try {
            const { table } = req.params;
            AdminController.#validateTable(table);

            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
            const offset = (page - 1) * limit;
            const search = req.query.search || '';
            const searchCol = req.query.searchCol || '';

            // Определяем колонку для сортировки — id если есть, иначе первая колонка
            const colsRes = await pool.query(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_name = $1 AND table_schema = 'public'
                 ORDER BY ordinal_position`,
                [table]
            );
            const colNames = colsRes.rows.map(r => r.column_name);
            const orderCol = colNames.includes('id') ? 'id' : colNames[0];

            let query = `SELECT * FROM "${table}"`;
            const params = [];

            if (search && searchCol) {
                // Проверяем что колонка реально существует
                if (colNames.includes(searchCol)) {
                    params.push(`%${search}%`);
                    query += ` WHERE CAST("${searchCol}" AS TEXT) ILIKE $1`;
                }
            }

            query += ` ORDER BY "${orderCol}" DESC LIMIT ${limit} OFFSET ${offset}`;

            const [rowsResult, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(
                    `SELECT COUNT(*) FROM "${table}"` +
                    (params.length ? ` WHERE CAST("${searchCol}" AS TEXT) ILIKE $1` : ''),
                    params
                )
            ]);

            // Скрываем чувствительные поля
            const rows = rowsResult.rows.map(row => {
                const safe = { ...row };
                if (safe.password_hash) safe.password_hash = '••••••••';
                if (safe.refresh_token) safe.refresh_token = safe.refresh_token.substring(0, 20) + '...';
                if (safe.activation_link) safe.activation_link = '••••••••';
                if (safe.reset_password_token) safe.reset_password_token = '••••••••';
                return safe;
            });

            res.json({
                rows,
                total: parseInt(countResult.rows[0].count),
                page,
                limit,
                pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
            });
        } catch (error) {
            if (error.message.includes('not allowed')) return res.status(400).json({ error: error.message });
            console.error('Admin getTableRows error:', error);
            res.status(500).json({ error: 'Failed to fetch rows' });
        }
    }

    static async updateTableRow(req, res) {
        try {
            const { table, id } = req.params;
            AdminController.#validateTable(table);

            const updates = { ...req.body };
            // Защита: нельзя менять role, password_hash, id через этот эндпоинт
            delete updates.id;
            delete updates.role;
            delete updates.password_hash;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            // Проверяем что все колонки существуют
            const colCheck = await pool.query(
                `SELECT column_name FROM information_schema.columns
                 WHERE table_name = $1 AND table_schema = 'public'`,
                [table]
            );
            const validCols = new Set(colCheck.rows.map(r => r.column_name));
            const invalidCols = Object.keys(updates).filter(k => !validCols.has(k));
            if (invalidCols.length > 0) {
                return res.status(400).json({ error: `Invalid columns: ${invalidCols.join(', ')}` });
            }

            const setClauses = Object.keys(updates).map((k, i) => `"${k}" = $${i + 1}`);
            const values = [...Object.values(updates), id];
            const query = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`;

            const result = await pool.query(query, values);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Row not found' });

            const row = { ...result.rows[0] };
            if (row.password_hash) row.password_hash = '••••••••';
            if (row.refresh_token) row.refresh_token = row.refresh_token.substring(0, 20) + '...';

            res.json({ row });
        } catch (error) {
            if (error.message.includes('not allowed')) return res.status(400).json({ error: error.message });
            console.error('Admin updateTableRow error:', error);
            res.status(500).json({ error: 'Failed to update row' });
        }
    }

    static async deleteTableRow(req, res) {
        try {
            const { table, id } = req.params;
            AdminController.#validateTable(table);

            // Нельзя удалить самого себя
            if (table === 'users' && String(id) === String(req.user.id)) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            const result = await pool.query(`DELETE FROM "${table}" WHERE id = $1 RETURNING id`, [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Row not found' });

            res.json({ message: 'Row deleted successfully', id });
        } catch (error) {
            if (error.message.includes('not allowed')) return res.status(400).json({ error: error.message });
            console.error('Admin deleteTableRow error:', error);
            res.status(500).json({ error: 'Failed to delete row' });
        }
    }

    // ─── Команды (специализированные эндпоинты) ──────────────────────────────

    static async getAdminTeams(req, res) {
        try {
            const page  = Math.max(1, parseInt(req.query.page)  || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            const params = [];
            let where = '';
            if (search) { params.push(`%${search}%`); where = 'WHERE t.name ILIKE $1'; }

            const [teamsRes, countRes] = await Promise.all([
                pool.query(`
                    SELECT t.*,
                           u.username  AS owner_name,
                           u.avatar    AS owner_avatar,
                           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS member_count
                    FROM teams t
                    LEFT JOIN users u ON u.id = t.owner_id
                    ${where}
                    ORDER BY t.created_at DESC
                    LIMIT ${limit} OFFSET ${offset}
                `, params),
                pool.query(`SELECT COUNT(*) FROM teams t ${where}`, params),
            ]);

            res.json({
                teams: teamsRes.rows,
                total: parseInt(countRes.rows[0].count),
                page, limit,
                pages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
            });
        } catch (error) {
            console.error('Admin getTeams error:', error);
            res.status(500).json({ error: 'Failed to fetch teams' });
        }
    }

    static async updateAdminTeam(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

            const result = await pool.query(
                `UPDATE teams SET name = $1, description = $2, updated_at = NOW()
                 WHERE id = $3 RETURNING *`,
                [name.trim(), description?.trim() || null, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
            res.json({ team: result.rows[0] });
        } catch (error) {
            if (error.code === '23505') return res.status(409).json({ error: 'Team name already taken' });
            console.error('Admin updateTeam error:', error);
            res.status(500).json({ error: 'Failed to update team' });
        }
    }

    static async deleteAdminTeam(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
            res.json({ message: 'Team deleted' });
        } catch (error) {
            console.error('Admin deleteTeam error:', error);
            res.status(500).json({ error: 'Failed to delete team' });
        }
    }

    static async getAdminTeamMembers(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(`
                SELECT tm.*, u.username, u.email, u.avatar, u.is_activated
                FROM team_members tm
                JOIN users u ON u.id = tm.user_id
                WHERE tm.team_id = $1
                ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.username
            `, [id]);
            res.json({ members: result.rows });
        } catch (error) {
            console.error('Admin getTeamMembers error:', error);
            res.status(500).json({ error: 'Failed to fetch members' });
        }
    }

    static async addAdminTeamMember(req, res) {
        try {
            const { id } = req.params;
            const { user_id, role = 'member' } = req.body;

            if (!user_id) return res.status(400).json({ error: 'user_id is required' });
            if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

            const [teamCheck, userCheck] = await Promise.all([
                pool.query('SELECT id FROM teams WHERE id = $1', [id]),
                pool.query('SELECT id FROM users WHERE id = $1', [user_id]),
            ]);
            if (teamCheck.rows.length === 0) return res.status(404).json({ error: 'Team not found' });
            if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found' });

            await pool.query(
                `INSERT INTO team_members (team_id, user_id, role)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
                [id, user_id, role]
            );

            const full = await pool.query(`
                SELECT tm.*, u.username, u.email, u.avatar, u.is_activated
                FROM team_members tm JOIN users u ON u.id = tm.user_id
                WHERE tm.team_id = $1 AND tm.user_id = $2
            `, [id, user_id]);

            res.status(201).json({ member: full.rows[0] });
        } catch (error) {
            console.error('Admin addTeamMember error:', error);
            res.status(500).json({ error: 'Failed to add member' });
        }
    }

    static async updateAdminTeamMember(req, res) {
        try {
            const { id, userId } = req.params;
            const { role } = req.body;

            if (!['owner', 'admin', 'member'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            const result = await pool.query(
                `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *`,
                [role, id, userId]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
            res.json({ member: result.rows[0] });
        } catch (error) {
            console.error('Admin updateTeamMember error:', error);
            res.status(500).json({ error: 'Failed to update member' });
        }
    }

    static async removeAdminTeamMember(req, res) {
        try {
            const { id, userId } = req.params;

            const check = await pool.query(
                'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2', [id, userId]
            );
            if (check.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
            if (check.rows[0].role === 'owner') {
                return res.status(400).json({ error: 'Cannot remove team owner' });
            }

            await pool.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [id, userId]);
            res.json({ message: 'Member removed' });
        } catch (error) {
            console.error('Admin removeTeamMember error:', error);
            res.status(500).json({ error: 'Failed to remove member' });
        }
    }

    static async createTableRow(req, res) {
        try {
            const { table } = req.params;
            AdminController.#validateTable(table);

            const data = { ...req.body };
            delete data.id;
            // Защита чувствительных полей
            if (table === 'users') {
                delete data.role;
                if (data.password) {
                    data.password_hash = await bcrypt.hash(data.password, 10);
                    delete data.password;
                }
            }

            if (Object.keys(data).length === 0) {
                return res.status(400).json({ error: 'No data provided' });
            }

            const cols = Object.keys(data).map(k => `"${k}"`).join(', ');
            const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(', ');
            const values = Object.values(data);

            const result = await pool.query(
                `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
                values
            );

            const row = { ...result.rows[0] };
            if (row.password_hash) row.password_hash = '••••••••';

            res.status(201).json({ row });
        } catch (error) {
            if (error.message.includes('not allowed')) return res.status(400).json({ error: error.message });
            console.error('Admin createTableRow error:', error);
            res.status(500).json({ error: error.message || 'Failed to create row' });
        }
    }
}

module.exports = AdminController;