import { Hono, type Context } from 'hono';
import crypto from 'node:crypto';
import { pool } from '../../infrastructure/database/client.ts';
import { logger } from '../../infrastructure/observability/pino-logger.ts';

export const ticketsRoutes = new Hono();

interface AuthUser {
  id: string;
  role: string;
  phone_e164: string;
}

// Authentication Helper for Tickets
async function authenticateUser(c: Context): Promise<AuthUser | null> {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const rawToken = authHeader.slice(7).trim();

  // Support Superadmin static token
  if (process.env.SUPERADMIN_TOKEN && rawToken === process.env.SUPERADMIN_TOKEN) {
    return { id: '00000000-0000-0000-0000-000000000001', role: 'ADMIN', phone_e164: 'superadmin' };
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const res = await pool.query(`
    SELECT u.id, u.phone_e164, u.role
    FROM auth_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_blocked = false;
  `, [tokenHash]);

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

// Helper: Auto-close inactive tickets (> 3 days of inactivity)
async function sweepInactiveTickets(): Promise<void> {
  try {
    await pool.query(`
      UPDATE tickets
      SET status = 'CLOSED', updated_at = NOW()
      WHERE status != 'CLOSED' AND last_message_at < NOW() - INTERVAL '3 days';
    `);
  } catch (err) {
    logger.warn({ err }, 'Failed to sweep inactive tickets');
  }
}

// 1. List Tickets (Role-aware & Sorted by Open First + Creation Date DESC)
ticketsRoutes.get('/', async (c) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' }, 401);
  }

  await sweepInactiveTickets();

  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '15', 10)));
  const offset = (page - 1) * limit;
  const statusFilter = c.req.query('status'); // 'all', 'open', 'closed'
  const targetRoleFilter = c.req.query('target_role'); // 'OPERATOR', 'ADMIN'
  const q = c.req.query('q')?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  // Role visibility:
  if (user.role === 'ADMIN') {
    // Admin sees all tickets
    if (targetRoleFilter) {
      conditions.push(`t.target_role = $${pIdx++}`);
      params.push(targetRoleFilter);
    }
  } else if (user.role === 'OPERATOR') {
    // Operator sees tickets intended for operators OR tickets they personally opened to admin
    conditions.push(`(t.target_role = 'OPERATOR' OR t.user_id = $${pIdx++})`);
    params.push(user.id);
  } else {
    // Simple User only sees their own tickets
    conditions.push(`t.user_id = $${pIdx++}`);
    params.push(user.id);
  }

  if (statusFilter === 'open') {
    conditions.push(`t.status != 'CLOSED'`);
  } else if (statusFilter === 'closed') {
    conditions.push(`t.status = 'CLOSED'`);
  }

  if (q) {
    conditions.push(`(t.subject ILIKE $${pIdx} OR u.phone_e164 ILIKE $${pIdx})`);
    params.push(`%${q}%`);
    pIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query(`
    SELECT COUNT(*) as total
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ${whereClause};
  `, params);

  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  // Sorting strictly per requirement: Open first, then created_at DESC
  const query = `
    SELECT 
      t.id, t.subject, t.category, t.priority, t.status, t.target_role,
      t.last_message_at, t.created_at, t.updated_at,
      t.user_id,
      u.phone_e164 as creator_phone,
      u.role as creator_role,
      (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) as message_count,
      (SELECT tm.message FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) as latest_message
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ${whereClause}
    ORDER BY (CASE WHEN t.status != 'CLOSED' THEN 0 ELSE 1 END) ASC, t.created_at DESC
    LIMIT $${pIdx++} OFFSET $${pIdx++};
  `;

  const rows = await pool.query(query, [...params, limit, offset]);

  return c.json({
    tickets: rows.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1
  });
});

// 2. Create Ticket
ticketsRoutes.post('/', async (c) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED', message: 'لطفاً ابتدا وارد شوید.' }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const { subject, message, priority = 'MEDIUM', category = 'general', target_role } = body;

  if (!subject?.trim() || !message?.trim()) {
    return c.json({ error: 'INVALID_INPUT', message: 'عنوان و متن تیکت الزامی است.' }, 400);
  }

  // Determine target_role:
  // If user is OPERATOR and chooses 'ADMIN', allow operator-to-admin tickets.
  // Otherwise default to 'OPERATOR' (or 'ADMIN' if an admin created it)
  let assignedRole = 'OPERATOR';
  if (user.role === 'OPERATOR' && target_role === 'ADMIN') {
    assignedRole = 'ADMIN';
  } else if (user.role === 'ADMIN') {
    assignedRole = target_role || 'ADMIN';
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ticketRes = await client.query(`
      INSERT INTO tickets (user_id, subject, category, priority, status, target_role, last_message_at)
      VALUES ($1, $2, $3, $4, 'OPEN', $5, NOW())
      RETURNING *;
    `, [user.id, subject.trim(), category, priority, assignedRole]);

    const ticket = ticketRes.rows[0];

    await client.query(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message)
      VALUES ($1, $2, $3, $4);
    `, [ticket.id, user.id, user.role, message.trim()]);

    await client.query('COMMIT');

    return c.json({
      ticket,
      message: 'تیکت با موفقیت ثبت شد.'
    }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Failed to create ticket');
    return c.json({ error: 'DB_ERROR', message: 'ثبت تیکت با خطا مواجه شد.' }, 500);
  } finally {
    client.release();
  }
});

// 3. Get Ticket Details and All Messages
ticketsRoutes.get('/:id', async (c) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const id = c.req.param('id');
  const ticketRes = await pool.query(`
    SELECT t.*, u.phone_e164 as creator_phone, u.role as creator_role
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = $1;
  `, [id]);

  if (ticketRes.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'تیکت یافت نشد.' }, 404);
  }

  const ticket = ticketRes.rows[0];

  // Access validation:
  if (user.role === 'USER' && ticket.user_id !== user.id) {
    return c.json({ error: 'FORBIDDEN', message: 'شما دسترسی به این تیکت ندارید.' }, 403);
  }
  if (user.role === 'OPERATOR' && ticket.target_role === 'ADMIN' && ticket.user_id !== user.id) {
    return c.json({ error: 'FORBIDDEN', message: 'این تیکت فقط برای مدیران ارشد قابل مشاهده است.' }, 403);
  }

  const messagesRes = await pool.query(`
    SELECT tm.id, tm.ticket_id, tm.sender_id, tm.sender_role, tm.message, tm.created_at,
           u.phone_e164 as sender_phone
    FROM ticket_messages tm
    JOIN users u ON tm.sender_id = u.id
    WHERE tm.ticket_id = $1
    ORDER BY tm.created_at ASC;
  `, [id]);

  return c.json({
    ticket,
    messages: messagesRes.rows
  });
});

// 4. Send Message / Reply to Ticket
ticketsRoutes.post('/:id/messages', async (c) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { message } = body;

  if (!message?.trim()) {
    return c.json({ error: 'INVALID_INPUT', message: 'متن پاسخ نمی‌تواند خالی باشد.' }, 400);
  }

  const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  if (ticketRes.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'تیکت یافت نشد.' }, 404);
  }

  const ticket = ticketRes.rows[0];

  if (user.role === 'USER' && ticket.user_id !== user.id) {
    return c.json({ error: 'FORBIDDEN' }, 403);
  }
  if (user.role === 'OPERATOR' && ticket.target_role === 'ADMIN' && ticket.user_id !== user.id) {
    return c.json({ error: 'FORBIDDEN' }, 403);
  }

  // Determine new status:
  // If user replies -> status = 'OPEN'
  // If operator/admin replies -> status = 'ANSWERED'
  const newStatus = (user.role === 'ADMIN' || user.role === 'OPERATOR') ? 'ANSWERED' : 'OPEN';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const msgRes = await client.query(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [id, user.id, user.role, message.trim()]);

    await client.query(`
      UPDATE tickets
      SET status = $1, last_message_at = NOW(), updated_at = NOW()
      WHERE id = $2;
    `, [newStatus, id]);

    await client.query('COMMIT');

    return c.json({
      message: msgRes.rows[0],
      new_status: newStatus
    }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Failed to append ticket message');
    return c.json({ error: 'DB_ERROR', message: 'ارسال پیام با خطا مواجه شد.' }, 500);
  } finally {
    client.release();
  }
});

// 5. Update Ticket (Elevate to Admin, Close, Reopen)
ticketsRoutes.patch('/:id', async (c) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ error: 'UNAUTHORIZED' }, 401);
  }

  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { status, target_role, priority } = body;

  const ticketRes = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  if (ticketRes.rows.length === 0) {
    return c.json({ error: 'NOT_FOUND', message: 'تیکت یافت نشد.' }, 404);
  }

  const ticket = ticketRes.rows[0];

  // Permissions:
  // Normal users can only close their own tickets
  if (user.role === 'USER') {
    if (ticket.user_id !== user.id) return c.json({ error: 'FORBIDDEN' }, 403);
    if (status !== 'CLOSED') {
      return c.json({ error: 'FORBIDDEN', message: 'کاربران تنها مجاز به بستن تیکت خود هستند.' }, 403);
    }
  }

  // Operators can elevate tickets to Admin
  if (target_role === 'ADMIN' && user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها اپراتورها و مدیران می‌توانند تیکت را ارجاع دهند.' }, 403);
  }

  const updates: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [id];
  let pIdx = 2;

  if (status) {
    updates.push(`status = $${pIdx++}`);
    params.push(status);
  }
  if (target_role) {
    updates.push(`target_role = $${pIdx++}`);
    params.push(target_role);
  }
  if (priority && (user.role === 'ADMIN' || user.role === 'OPERATOR')) {
    updates.push(`priority = $${pIdx++}`);
    params.push(priority);
  }

  await pool.query(`
    UPDATE tickets
    SET ${updates.join(', ')}
    WHERE id = $1;
  `, params);

  return c.json({ ok: true, message: 'تیکت با موفقیت به‌روزرسانی شد.' });
});

// 6. Delete Ticket (Admin Only)
ticketsRoutes.delete('/:id', async (c) => {
  const user = await authenticateUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ error: 'FORBIDDEN', message: 'تنها مدیر سیستم مجاز به حذف تیکت است.' }, 403);
  }

  const id = c.req.param('id');
  await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
  return c.json({ ok: true, message: 'تیکت حذف شد.' });
});
