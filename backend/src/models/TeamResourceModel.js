const pool = require('../config/database');

class TeamResourceModel {
    static async createTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_resources (
                team_id        BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                resource_type  VARCHAR(20) NOT NULL CHECK (resource_type IN ('printer', 'material')),
                resource_id    BIGINT NOT NULL,
                shared_at      TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (team_id, resource_type, resource_id)
            );
            CREATE INDEX IF NOT EXISTS idx_team_resources_team
                ON team_resources(team_id, resource_type);
        `);
    }

    static async share(teamId, userId, resourceType, resourceId) {
        const result = await pool.query(
            `INSERT INTO team_resources (team_id, user_id, resource_type, resource_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING RETURNING *`,
            [teamId, userId, resourceType, resourceId]
        );
        return result.rows[0] ?? null;
    }

    static async getSharedResource(teamId, resourceType, resourceId) {
        const result = await pool.query(
            `SELECT * FROM team_resources
             WHERE team_id = $1 AND resource_type = $2 AND resource_id = $3`,
            [teamId, resourceType, resourceId]
        );
        return result.rows[0] ?? null;
    }

    static async unshare(teamId, resourceType, resourceId) {
        const result = await pool.query(
            `DELETE FROM team_resources
             WHERE team_id = $1 AND resource_type = $2 AND resource_id = $3
             RETURNING *`,
            [teamId, resourceType, resourceId]
        );
        return result.rows[0] ?? null;
    }

    static async getTeamPrinters(teamId) {
        const result = await pool.query(
            `SELECT p.*,
                    tr.user_id         AS shared_by_user_id,
                    u.username         AS shared_by_username,
                    u.avatar           AS shared_by_avatar
             FROM team_resources tr
             JOIN printers p ON p.id = tr.resource_id
             JOIN users    u ON u.id = tr.user_id
             WHERE tr.team_id = $1 AND tr.resource_type = 'printer'
             ORDER BY u.username, p.name`,
            [teamId]
        );
        return result.rows;
    }

    static async getTeamMaterials(teamId) {
        const result = await pool.query(
            `SELECT m.*,
                    tr.user_id         AS shared_by_user_id,
                    u.username         AS shared_by_username,
                    u.avatar           AS shared_by_avatar
             FROM team_resources tr
             JOIN materials m ON m.id = tr.resource_id
             JOIN users     u ON u.id = tr.user_id
             WHERE tr.team_id = $1 AND tr.resource_type = 'material'
             ORDER BY u.username, m.name`,
            [teamId]
        );
        return result.rows;
    }

    // Что конкретный пользователь шарит в конкретной команде
    static async getUserSharedInTeam(teamId, userId) {
        const result = await pool.query(
            `SELECT resource_type, resource_id FROM team_resources
             WHERE team_id = $1 AND user_id = $2`,
            [teamId, userId]
        );
        return result.rows;
    }

    // Убрать все ресурсы пользователя из команды (при выходе)
    static async removeUserFromTeam(teamId, userId) {
        await pool.query(
            'DELETE FROM team_resources WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
    }
}

module.exports = TeamResourceModel;
