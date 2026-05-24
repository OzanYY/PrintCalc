// routes/admin-routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, requireAuth } = require('../middleware/auth-middleware');
const { requireAdmin } = require('../middleware/admin-middleware');
const AdminController = require('../controllers/AdminController');

router.use(authMiddleware);
router.use(requireAuth);
router.use(requireAdmin);

// ─── Пользователи ────────────────────────────────────────────────────────────
router.get('/users', AdminController.getUsers);
router.put('/users/:id', AdminController.updateUser);
router.put('/users/:id/password', AdminController.updateUserPassword);
router.delete('/users/:id', AdminController.deleteUser);

// ─── Команды ─────────────────────────────────────────────────────────────────
router.get('/teams', AdminController.getAdminTeams);
router.patch('/teams/:id', AdminController.updateAdminTeam);
router.delete('/teams/:id', AdminController.deleteAdminTeam);
router.get('/teams/:id/members', AdminController.getAdminTeamMembers);
router.post('/teams/:id/members', AdminController.addAdminTeamMember);
router.patch('/teams/:id/members/:userId', AdminController.updateAdminTeamMember);
router.delete('/teams/:id/members/:userId', AdminController.removeAdminTeamMember);

// ─── Таблицы ─────────────────────────────────────────────────────────────────
router.get('/tables', AdminController.getTables);
router.get('/tables/:table/columns', AdminController.getTableColumns);
router.get('/tables/:table/rows', AdminController.getTableRows);
router.post('/tables/:table/rows', AdminController.createTableRow);
router.put('/tables/:table/rows/:id', AdminController.updateTableRow);
router.delete('/tables/:table/rows/:id', AdminController.deleteTableRow);

module.exports = router;