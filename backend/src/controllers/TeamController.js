const TeamModel            = require('../models/TeamModel');
const TeamMemberModel      = require('../models/TeamMemberModel');
const TeamInvitationModel  = require('../models/TeamInvitationModel');
const TeamResourceModel    = require('../models/TeamResourceModel');
const NotificationModel    = require('../models/NotificationModel');
const UserModel            = require('../models/UserModel');
const SSEService           = require('../services/SSEService');

// ─── Вспомогательная функция ──────────────────────────────────────────────────

async function notifyAndPush(userId, type, data) {
    const notification = await NotificationModel.create(userId, type, data);
    SSEService.push(userId, notification);
    return notification;
}

async function getMemberUserIds(teamId) {
    const members = await TeamMemberModel.getMembers(teamId);
    return members.map(m => m.user_id);
}

// ─── Команды ─────────────────────────────────────────────────────────────────

class TeamController {

    // GET /api/teams — мои команды
    static async getMyTeams(req, res) {
        try {
            const teams = await TeamModel.findByUser(req.user.id);
            res.json({ data: teams });
        } catch (err) {
            console.error('getMyTeams error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /api/teams — создать команду
    static async createTeam(req, res) {
        try {
            const { name, description } = req.body;
            if (!name?.trim()) {
                return res.status(400).json({ error: 'Название команды обязательно' });
            }
            const team = await TeamModel.create(req.user.id, { name: name.trim(), description });
            // Создатель автоматически становится owner
            await TeamMemberModel.add(team.id, req.user.id, 'owner');
            const full = await TeamModel.findById(team.id);
            res.status(201).json({ data: full });
        } catch (err) {
            console.error('createTeam error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/teams/:id — детали команды
    static async getTeam(req, res) {
        try {
            const team = await TeamModel.findById(req.params.id);
            if (!team) return res.status(404).json({ error: 'Команда не найдена' });
            res.json({ data: team });
        } catch (err) {
            console.error('getTeam error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PATCH /api/teams/:id — обновить команду (admin+)
    static async updateTeam(req, res) {
        try {
            const { name, description } = req.body;
            const team = await TeamModel.update(req.params.id, { name, description });
            if (!team) return res.status(404).json({ error: 'Команда не найдена' });
            res.json({ data: team });
        } catch (err) {
            console.error('updateTeam error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE /api/teams/:id — удалить команду (owner)
    static async deleteTeam(req, res) {
        try {
            const deleted = await TeamModel.delete(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Команда не найдена' });
            res.json({ message: 'Команда удалена' });
        } catch (err) {
            console.error('deleteTeam error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─── Участники ───────────────────────────────────────────────────────────

    // GET /api/teams/:id/members
    static async getMembers(req, res) {
        try {
            const members = await TeamMemberModel.getMembers(req.params.id);
            res.json({ data: members });
        } catch (err) {
            console.error('getMembers error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PATCH /api/teams/:id/members/:userId — изменить роль (admin+)
    static async updateMemberRole(req, res) {
        try {
            const { role } = req.body;
            const { id: teamId, userId } = req.params;

            if (!['admin', 'member'].includes(role)) {
                return res.status(400).json({ error: 'Допустимые роли: admin, member' });
            }
            // Нельзя изменить роль owner
            const targetRole = await TeamMemberModel.getRole(teamId, userId);
            if (targetRole === 'owner') {
                return res.status(403).json({ error: 'Нельзя изменить роль владельца' });
            }

            const member = await TeamMemberModel.updateRole(teamId, userId, role);
            if (!member) return res.status(404).json({ error: 'Участник не найден' });

            await notifyAndPush(userId, 'role_changed', {
                team_id:   Number(teamId),
                team_name: (await TeamModel.findById(teamId))?.name,
                new_role:  role,
            });

            res.json({ data: member });
        } catch (err) {
            console.error('updateMemberRole error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE /api/teams/:id/members/:userId — выгнать или выйти самому
    static async removeMember(req, res) {
        try {
            const { id: teamId, userId } = req.params;
            const isSelf = String(req.user.id) === String(userId);

            // Owner не может покинуть команду, не передав права
            const targetRole = await TeamMemberModel.getRole(teamId, userId);
            if (targetRole === 'owner') {
                return res.status(403).json({ error: 'Владелец не может покинуть команду. Сначала передайте права.' });
            }

            const removed = await TeamMemberModel.remove(teamId, userId);
            if (!removed) return res.status(404).json({ error: 'Участник не найден' });

            // Убираем все расшаренные ресурсы участника
            await TeamResourceModel.removeUserFromTeam(teamId, userId);

            const team = await TeamModel.findById(teamId);

            if (isSelf) {
                // Уведомляем оставшихся admin/owner
                const members = await TeamMemberModel.getMembers(teamId);
                const adminIds = members
                    .filter(m => m.role === 'owner' || m.role === 'admin')
                    .map(m => m.user_id);
                const user = await UserModel.findById(req.user.id);
                SSEService.pushToMany(adminIds, await NotificationModel.create(
                    adminIds[0], 'member_left',
                    { team_id: Number(teamId), team_name: team?.name, user_name: user?.username }
                ));
            } else {
                // Уведомляем выгнанного
                await notifyAndPush(Number(userId), 'member_removed', {
                    team_id:   Number(teamId),
                    team_name: team?.name,
                });
            }

            res.json({ message: isSelf ? 'Вы вышли из команды' : 'Участник удалён из команды' });
        } catch (err) {
            console.error('removeMember error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // PATCH /api/teams/:id/settings/me — настройки участника
    static async updateMySettings(req, res) {
        try {
            const { merge_stats_with_personal } = req.body;
            const member = await TeamMemberModel.updateSettings(
                req.params.id, req.user.id, { merge_stats_with_personal }
            );
            if (!member) return res.status(404).json({ error: 'Участник не найден' });
            res.json({ data: member });
        } catch (err) {
            console.error('updateMySettings error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─── Приглашения ─────────────────────────────────────────────────────────

    // POST /api/teams/:id/invite
    static async invite(req, res) {
        try {
            const teamId = req.params.id;
            const { username, message } = req.body;

            if (!username?.trim()) {
                return res.status(400).json({ error: 'Укажите имя пользователя' });
            }

            const invitee = await UserModel.findByUsername(username.trim());
            if (!invitee) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            if (invitee.id === req.user.id) {
                return res.status(400).json({ error: 'Нельзя пригласить самого себя' });
            }

            const alreadyMember = await TeamMemberModel.isMember(teamId, invitee.id);
            if (alreadyMember) {
                return res.status(409).json({ error: 'Пользователь уже состоит в команде' });
            }

            const duplicate = await TeamInvitationModel.findActiveDuplicate(teamId, invitee.id);
            if (duplicate) {
                return res.status(409).json({ error: 'Приглашение уже отправлено и ожидает ответа' });
            }

            const team       = await TeamModel.findById(teamId);
            const inviter    = await UserModel.findById(req.user.id);
            const invitation = await TeamInvitationModel.create({
                teamId, inviterId: req.user.id, inviteeId: invitee.id, message,
            });

            await notifyAndPush(invitee.id, 'team_invitation', {
                invitation_id: invitation.id,
                team_id:       Number(teamId),
                team_name:     team?.name,
                team_avatar:   team?.avatar,
                inviter_name:  inviter?.username,
                inviter_avatar: inviter?.avatar,
                message:       message ?? null,
                member_count:  Number(team?.member_count ?? 0),
            });

            res.status(201).json({ data: invitation });
        } catch (err) {
            console.error('invite error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/teams/:id/invitations — исходящие (admin+)
    static async getTeamInvitations(req, res) {
        try {
            const invitations = await TeamInvitationModel.findByTeam(req.params.id);
            res.json({ data: invitations });
        } catch (err) {
            console.error('getTeamInvitations error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE /api/teams/:id/invitations/:invId — отменить (admin+)
    static async cancelInvitation(req, res) {
        try {
            const inv = await TeamInvitationModel.findById(req.params.invId);
            if (!inv || String(inv.team_id) !== String(req.params.id)) {
                return res.status(404).json({ error: 'Приглашение не найдено' });
            }
            if (inv.status !== 'pending') {
                return res.status(400).json({ error: 'Можно отменить только pending-приглашение' });
            }
            await TeamInvitationModel.updateStatus(inv.id, 'cancelled');
            res.json({ message: 'Приглашение отменено' });
        } catch (err) {
            console.error('cancelInvitation error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─── Ресурсы ─────────────────────────────────────────────────────────────

    // GET /api/teams/:id/resources/printers
    static async getTeamPrinters(req, res) {
        try {
            const printers = await TeamResourceModel.getTeamPrinters(req.params.id);
            res.json({ data: printers });
        } catch (err) {
            console.error('getTeamPrinters error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/teams/:id/resources/materials
    static async getTeamMaterials(req, res) {
        try {
            const materials = await TeamResourceModel.getTeamMaterials(req.params.id);
            res.json({ data: materials });
        } catch (err) {
            console.error('getTeamMaterials error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // POST /api/teams/:id/resources — шарить ресурс
    static async shareResource(req, res) {
        try {
            const { resource_type, resource_id } = req.body;
            if (!['printer', 'material'].includes(resource_type) || !resource_id) {
                return res.status(400).json({ error: 'Укажите resource_type (printer|material) и resource_id' });
            }
            const shared = await TeamResourceModel.share(
                req.params.id, req.user.id, resource_type, resource_id
            );
            res.status(201).json({ data: shared });
        } catch (err) {
            console.error('shareResource error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // DELETE /api/teams/:id/resources/:type/:resourceId — убрать из шаринга
    static async unshareResource(req, res) {
        try {
            const { id: teamId, type, resourceId } = req.params;
            const removed = await TeamResourceModel.unshare(teamId, type, resourceId);
            if (!removed) return res.status(404).json({ error: 'Ресурс не найден в команде' });
            res.json({ message: 'Ресурс убран из команды' });
        } catch (err) {
            console.error('unshareResource error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/teams/:id/resources/my — что я расшарил в этой команде
    static async getMyShared(req, res) {
        try {
            const shared = await TeamResourceModel.getUserSharedInTeam(req.params.id, req.user.id);
            res.json({ data: shared });
        } catch (err) {
            console.error('getMyShared error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ─── Статистика команды ───────────────────────────────────────────────────

    // GET /api/teams/:id/stats
    static async getTeamStats(req, res) {
        try {
            const teamId = req.params.id;
            const pool = require('../config/database');

            const [printersRes, materialsRes, ordersRes] = await Promise.all([
                pool.query(
                    `SELECT COUNT(DISTINCT p.id) AS total
                     FROM team_resources tr
                     JOIN printers p ON p.id = tr.resource_id
                     WHERE tr.team_id = $1 AND tr.resource_type = 'printer'`,
                    [teamId]
                ),
                pool.query(
                    `SELECT COUNT(DISTINCT m.id) AS total
                     FROM team_resources tr
                     JOIN materials m ON m.id = tr.resource_id
                     WHERE tr.team_id = $1 AND tr.resource_type = 'material'`,
                    [teamId]
                ),
                pool.query(
                    `SELECT
                         COUNT(*)                                                  AS total_orders,
                         COUNT(CASE WHEN status = 'completed' THEN 1 END)         AS completed_orders,
                         COALESCE(SUM(CASE WHEN status = 'completed'
                                          THEN (calc_result->>'finalPrice')::numeric
                                          ELSE 0 END), 0)                         AS total_profit
                     FROM orders
                     WHERE team_id = $1 AND order_mode = 'team'`,
                    [teamId]
                ),
            ]);

            res.json({
                data: {
                    printers:        Number(printersRes.rows[0].total),
                    materials:       Number(materialsRes.rows[0].total),
                    total_orders:    Number(ordersRes.rows[0].total_orders),
                    completed_orders: Number(ordersRes.rows[0].completed_orders),
                    total_profit:    Number(ordersRes.rows[0].total_profit),
                },
            });
        } catch (err) {
            console.error('getTeamStats error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GET /api/teams/:id/stats/members — статистика по участникам
    static async getMemberStats(req, res) {
        try {
            const pool = require('../config/database');
            const result = await pool.query(
                `SELECT
                     u.id, u.username, u.avatar,
                     tm.role,
                     COUNT(o.id)                                                     AS total_orders,
                     COUNT(CASE WHEN o.status = 'completed' THEN 1 END)             AS completed_orders,
                     COALESCE(SUM(CASE WHEN o.status = 'completed'
                                      THEN (o.calc_result->>'finalPrice')::numeric
                                      ELSE 0 END), 0)                               AS total_profit
                 FROM team_members tm
                 JOIN users u ON u.id = tm.user_id
                 LEFT JOIN orders o ON o.user_id = u.id
                     AND o.team_id = $1 AND o.order_mode = 'team'
                 WHERE tm.team_id = $1
                 GROUP BY u.id, u.username, u.avatar, tm.role, tm.joined_at
                 ORDER BY CASE tm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END`,
                [req.params.id]
            );
            res.json({ data: result.rows });
        } catch (err) {
            console.error('getMemberStats error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = TeamController;
