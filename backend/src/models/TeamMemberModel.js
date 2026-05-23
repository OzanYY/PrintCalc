const pool = require('../config/database');

class TeamMemberModel {
    static async createTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_members (
                team_id    BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role       VARCHAR(20) NOT NULL DEFAULT 'member'
                               CHECK (role IN ('owner', 'admin', 'member')),
                merge_stats_with_personal BOOLEAN NOT NULL DEFAULT FALSE,
                joined_at  TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (team_id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
        `);
    }

    static async add(teamId, userId, role = 'member') {
        const result = await pool.query(
            `INSERT INTO team_members (team_id, user_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (team_id, user_id) DO NOTHING
             RETURNING *`,
            [teamId, userId, role]
        );
        return result.rows[0] ?? null;
    }

    static async remove(teamId, userId) {
        const result = await pool.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 RETURNING *',
            [teamId, userId]
        );
        return result.rows[0] ?? null;
    }

    static async getMembers(teamId) {
        const result = await pool.query(
            `SELECT tm.team_id, tm.user_id, tm.role, tm.merge_stats_with_personal, tm.joined_at,
                    u.username, u.email, u.avatar
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             WHERE tm.team_id = $1
             ORDER BY
                 CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
                 tm.joined_at`,
            [teamId]
        );
        return result.rows;
    }

    static async isMember(teamId, userId) {
        const result = await pool.query(
            'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        return result.rows.length > 0;
    }

    static async getRole(teamId, userId) {
        const result = await pool.query(
            'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        return result.rows[0]?.role ?? null;
    }

    static async updateRole(teamId, userId, role) {
        const result = await pool.query(
            `UPDATE team_members SET role = $1
             WHERE team_id = $2 AND user_id = $3 RETURNING *`,
            [role, teamId, userId]
        );
        return result.rows[0] ?? null;
    }

    static async updateSettings(teamId, userId, { merge_stats_with_personal }) {
        const result = await pool.query(
            `UPDATE team_members SET merge_stats_with_personal = $1
             WHERE team_id = $2 AND user_id = $3 RETURNING *`,
            [merge_stats_with_personal, teamId, userId]
        );
        return result.rows[0] ?? null;
    }
}

module.exports = TeamMemberModel;
