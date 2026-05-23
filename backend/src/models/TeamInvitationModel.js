const pool = require('../config/database');

class TeamInvitationModel {
    static async createTable() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS team_invitations (
                id            BIGSERIAL PRIMARY KEY,
                team_id       BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                inviter_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                invitee_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
                invitee_email VARCHAR(255),
                message       TEXT,
                status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','accepted','declined','cancelled')),
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
            );
            CREATE INDEX IF NOT EXISTS idx_invitations_invitee
                ON team_invitations(invitee_id) WHERE status = 'pending';
            CREATE INDEX IF NOT EXISTS idx_invitations_team
                ON team_invitations(team_id);
        `);
    }

    static async create({ teamId, inviterId, inviteeId, inviteeEmail, message }) {
        const result = await pool.query(
            `INSERT INTO team_invitations (team_id, inviter_id, invitee_id, invitee_email, message)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [teamId, inviterId, inviteeId ?? null, inviteeEmail ?? null, message ?? null]
        );
        return result.rows[0];
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT ti.*,
                    t.name        AS team_name,
                    t.avatar      AS team_avatar,
                    inviter.username AS inviter_name,
                    inviter.avatar   AS inviter_avatar,
                    invitee.username AS invitee_name,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
             FROM team_invitations ti
             JOIN teams t        ON t.id        = ti.team_id
             JOIN users inviter  ON inviter.id  = ti.inviter_id
             LEFT JOIN users invitee ON invitee.id = ti.invitee_id
             WHERE ti.id = $1`,
            [id]
        );
        return result.rows[0] ?? null;
    }

    static async findPendingForUser(userId) {
        const result = await pool.query(
            `SELECT ti.*,
                    t.name        AS team_name,
                    t.avatar      AS team_avatar,
                    inviter.username AS inviter_name,
                    inviter.avatar   AS inviter_avatar,
                    (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) AS member_count
             FROM team_invitations ti
             JOIN teams t       ON t.id       = ti.team_id
             JOIN users inviter ON inviter.id = ti.inviter_id
             WHERE ti.invitee_id = $1
               AND ti.status    = 'pending'
               AND ti.expires_at > NOW()
             ORDER BY ti.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    static async findByTeam(teamId) {
        const result = await pool.query(
            `SELECT ti.*,
                    invitee.username AS invitee_name,
                    invitee.email    AS invitee_real_email,
                    inviter.username AS inviter_name
             FROM team_invitations ti
             JOIN users inviter ON inviter.id = ti.inviter_id
             LEFT JOIN users invitee ON invitee.id = ti.invitee_id
             WHERE ti.team_id = $1
             ORDER BY ti.created_at DESC`,
            [teamId]
        );
        return result.rows;
    }

    static async updateStatus(id, status) {
        const result = await pool.query(
            'UPDATE team_invitations SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        return result.rows[0] ?? null;
    }

    static async findActiveDuplicate(teamId, inviteeId) {
        const result = await pool.query(
            `SELECT 1 FROM team_invitations
             WHERE team_id = $1 AND invitee_id = $2
               AND status = 'pending' AND expires_at > NOW()`,
            [teamId, inviteeId]
        );
        return result.rows.length > 0;
    }
}

module.exports = TeamInvitationModel;
