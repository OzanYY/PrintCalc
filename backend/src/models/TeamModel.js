const pool = require('../config/database');

class TeamModel {
    static async createTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teams (
                id          BIGSERIAL PRIMARY KEY,
                name        VARCHAR(100) NOT NULL,
                description TEXT,
                owner_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                avatar      TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                updated_at  TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

            DO $$ BEGIN
                ALTER TABLE orders
                    ADD CONSTRAINT orders_team_id_fkey
                    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);
    }

    static async create(ownerId, { name, description = null }) {
        const result = await pool.query(
            `INSERT INTO teams (name, description, owner_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [name, description, ownerId]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT t.*,
                    u.username AS owner_name,
                    u.avatar   AS owner_avatar,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
             FROM teams t
             JOIN users u ON u.id = t.owner_id
             WHERE t.id = $1`,
            [id]
        );
        return result.rows[0] ?? null;
    }

    static async findByUser(userId) {
        const result = await pool.query(
            `SELECT t.*,
                    tm.role,
                    tm.joined_at,
                    tm.merge_stats_with_personal,
                    u.username AS owner_name,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
             FROM teams t
             JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
             JOIN users u ON u.id = t.owner_id
             ORDER BY tm.joined_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async update(id, { name, description }) {
        const result = await pool.query(
            `UPDATE teams
             SET name        = COALESCE($1, name),
                 description = COALESCE($2, description),
                 updated_at  = NOW()
             WHERE id = $3 RETURNING *`,
            [name ?? null, description ?? null, id]
        );
        return result.rows[0] ?? null;
    }

    static async updateAvatar(id, avatarUrl) {
        await pool.query(
            `UPDATE teams SET avatar = $1, updated_at = NOW() WHERE id = $2`,
            [avatarUrl, id]
        );
        return this.findById(id);
    }

    static async delete(id) {
        const result = await pool.query(
            'DELETE FROM teams WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] ?? null;
    }
}

module.exports = TeamModel;
