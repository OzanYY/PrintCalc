const express = require('express');
const router  = express.Router();
const TeamController = require('../controllers/TeamController');
const { authMiddleware, requireAuth, requireActivated } = require('../middleware/auth-middleware');
const { requireTeamMember, requireTeamAdmin, requireTeamOwner } = require('../middleware/team-middleware');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireActivated);

// ─── Коллекция ───────────────────────────────────────────────────────────────
router.get ('/', TeamController.getMyTeams);
router.post('/', TeamController.createTeam);

// ─── Единичный ресурс ────────────────────────────────────────────────────────
router.get   ('/:id', requireTeamMember, TeamController.getTeam);
router.patch ('/:id', requireTeamAdmin,  TeamController.updateTeam);
router.delete('/:id', requireTeamOwner,  TeamController.deleteTeam);

// ─── Участники ───────────────────────────────────────────────────────────────
router.get   ('/:id/members',          requireTeamMember, TeamController.getMembers);
router.patch ('/:id/members/:userId',  requireTeamAdmin,  TeamController.updateMemberRole);
router.delete('/:id/members/:userId',  requireTeamMember, TeamController.removeMember);
router.patch ('/:id/settings/me',      requireTeamMember, TeamController.updateMySettings);

// ─── Поиск пользователей ─────────────────────────────────────────────────────
router.get('/:id/users/search', requireTeamAdmin, TeamController.searchUsers);

// ─── Приглашения ─────────────────────────────────────────────────────────────
router.post  ('/:id/invite',                 requireTeamAdmin, TeamController.invite);
router.get   ('/:id/invitations',            requireTeamAdmin, TeamController.getTeamInvitations);
router.delete('/:id/invitations/:invId',     requireTeamAdmin, TeamController.cancelInvitation);

// ─── Ресурсы команды ─────────────────────────────────────────────────────────
router.get   ('/:id/resources/printers',        requireTeamMember, TeamController.getTeamPrinters);
router.get   ('/:id/resources/materials',       requireTeamMember, TeamController.getTeamMaterials);
router.get   ('/:id/resources/my',              requireTeamMember, TeamController.getMyShared);
router.post  ('/:id/resources',                 requireTeamMember, TeamController.shareResource);
router.delete('/:id/resources/:type/:resourceId', requireTeamMember, TeamController.unshareResource);

// ─── Заказы команды ──────────────────────────────────────────────────────────
router.get('/:id/orders', requireTeamMember, TeamController.getTeamOrders);

// ─── Статистика ──────────────────────────────────────────────────────────────
router.get('/:id/stats',         requireTeamMember, TeamController.getTeamStats);
router.get('/:id/stats/members', requireTeamMember, TeamController.getMemberStats);

module.exports = router;
