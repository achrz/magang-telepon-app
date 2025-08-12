import { Hono } from 'hono'
import mysql from 'mysql2/promise'
import { serve } from '@hono/node-server'
import { config } from 'dotenv'
import { createPool } from 'mysql2/promise'

config()

const app = new Hono()

// Buat pool global
const pool = createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // bisa kamu sesuaikan
})

// Ganti testDBConnection jadi pakai pool
async function testDBConnection() {
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    console.log('✅ DB connected successfully!')
    conn.release()
  } catch (err: any) {
    console.error('❌ Failed to connect to DB:', err.message)
    process.exit(1)
  }
}
testDBConnection()
// Endpoint untuk mendapatkan data dari tabel 'users'
app.get('/', (c) => c.text('Telepon APP API is running'))

app.get('/list', async (c) => {
  try {
    const [rows] = await pool.query('SELECT * FROM list')
    return c.json(rows)
  } catch (err: any) {
    console.error('❌ Query failed:', err.message)
    return c.json({ error: 'DB query error' }, 500)
  }
})

app.get('/app-settings', async (c) => {
  try {
    const [rows] = await pool.query('SELECT * FROM app_settings')
    return c.json(rows)
  } catch (err: any) {
    console.error('❌ Query failed:', err.message)
    return c.json({ error: 'DB query error' }, 500)
  }
})

app.post('/add-phone', async (c) => {
  try {
    const body = await c.req.json()
    const phone = body.phone
    const name = body.name

    if (!phone) {
      return c.json({ error: 'phone is required' }, 400)
    }

    const checkQuery = 'SELECT * FROM list WHERE phone = ?'
    const [check]: any = await pool.query(checkQuery, [phone])

    if (check.length > 0) {
      return c.json({
        message: `Nomor telepon sudah ditambahkan sebelumnya`
      }, 200)
    }

    const insertQuery = 'INSERT INTO list (phone, name) VALUES (?, ?)'
    const [insert]: any = await pool.query(insertQuery, [phone, name])

    return c.json({
      message: `Nomor telepon berhasil ditambahkan, salam kenal ya!`,
    }, 201)
  } catch (err: any) {
    console.error('❌ Query failed:', err)
    return c.json({ error: 'DB query error', details: err.message }, 500)
  }
})

app.post('/edit', async (c) => {
  try {
    const body = await c.req.json()
    const id = body.id
    const phone = body.phone
    const name = body.name

    if (!id) {
      return c.json({ error: 'id is required' }, 400)
    }

    const checkQuery = 'SELECT * FROM list WHERE id = ?'
    const [check]: any = await pool.query(checkQuery, [id])

    if (check.length === 0) {
      return c.json({
        message: `Nomor telepon dengan ID ${id} tidak ada`
      }, 200)
    }

    const updateQuery = 'UPDATE list SET phone = ?, name = ? WHERE id = ?'
    const [update]: any = await pool.query(updateQuery, [phone, name, id])

    return c.json({
      message: `Nomor telepon berhasil diperbarui`,
    }, 200)
  } catch (err: any) {
    console.error('❌ Query failed:', err)
    return c.json({ error: 'DB query error', details: err.message }, 500)
  }
})

app.post('/delete', async (c) => {
  try {
    const body = await c.req.json()
    const id = body.id

    if (!id) {
      return c.json({ error: 'id is required' }, 400)
    }

    const checkQuery = 'SELECT * FROM list WHERE id = ?'
    const [check]: any = await pool.query(checkQuery, [id])

    if (check.length === 0) {
      return c.json({
        message: `Nomor telepon dengan ID ${id} tidak ada`
      }, 200)
    }

    const deleteQuery = 'DELETE FROM list WHERE id = ?'
    const [deleteResult]: any = await pool.query(deleteQuery, [id])

    return c.json({
      message: `Nomor telepon berhasil dihapus`,
    }, 200)
  } catch (err: any) {
    console.error('❌ Query failed:', err)
    return c.json({ error: 'DB query error', details: err.message }, 500)
  }
})

// Start server
const port = process.env.PORT ? Number(process.env.PORT) : 3000
console.log(`🚀 Server running on port ${port}`)
serve({
  fetch: app.fetch,
  port
})
