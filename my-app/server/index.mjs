import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

const { MONGODB_URI, MONGODB_DB = 'crud_mtpf', ADMIN_EMAIL, ADMIN_PASSWORD,
  API_PORT = '3001', WEB_ORIGIN = 'http://localhost:8081' } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  throw new Error('Cấu hình MONGODB_URI, ADMIN_EMAIL và ADMIN_PASSWORD (ít nhất 12 ký tự).');
}
const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
await client.connect();
const products = client.db(MONGODB_DB).collection('products');
const sessions = new Map();
const hash = value => createHash('sha256').update(value).digest();

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 710000) throw Object.assign(new Error('Dữ liệu quá lớn.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('JSON không hợp lệ.'), { status: 400 }); }
}

function productInput(value) {
  const { name, price, soluong, image } = value ?? {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
      !Number.isFinite(price) || price < 0 || price > Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(soluong) || soluong < 0 ||
      typeof image !== 'string' || image.length > 700000 ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  return { name: name.trim(), price, soluong, image };
}

function serialize({ _id, ...data }) {
  return { ...data, id: _id.toHexString() };
}

createServer(async (req, res) => {
  const send = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(code === 204 ? undefined : JSON.stringify(data));
  };
  if (req.headers.origin) {
    if (req.headers.origin !== WEB_ORIGIN) return send(403, { error: 'Origin không được phép.' });
    res.setHeader('Access-Control-Allow-Origin', WEB_ORIGIN);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return send(204);
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (path === '/login' && req.method === 'POST') {
      const { email, password } = (await body(req)) ?? {};
      if (email !== ADMIN_EMAIL || typeof password !== 'string' ||
          !timingSafeEqual(hash(password), hash(ADMIN_PASSWORD))) {
        return send(401, { error: 'Email hoặc mật khẩu không đúng.' });
      }
      for (const [key, expiry] of sessions) if (expiry <= Date.now()) sessions.delete(key);
      const token = randomBytes(32).toString('hex');
      sessions.set(token, Date.now() + 8 * 3600_000);
      return send(200, { token });
    }
    const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token || !(sessions.get(token) > Date.now())) return send(401, { error: 'Phiên đăng nhập không hợp lệ.' });
    if (path === '/logout' && req.method === 'POST') {
      sessions.delete(token);
      return send(204);
    }
    if (path === '/products' && req.method === 'GET') {
      return send(200, (await products.find().sort({ name: 1 }).toArray()).map(serialize));
    }
    if (path === '/products' && req.method === 'POST') {
      const data = productInput(await body(req));
      if (!data) return send(400, { error: 'Sản phẩm không hợp lệ.' });
      const { insertedId } = await products.insertOne(data);
      return send(201, serialize({ ...data, _id: insertedId }));
    }
    if (path === '/products/bulk-delete' && req.method === 'POST') {
      const { ids } = (await body(req)) ?? {};
      if (!Array.isArray(ids) || ids.length === 0 ||
          !ids.every(id => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id))) {
        return send(400, { error: 'Danh sách sản phẩm không hợp lệ.' });
      }
      const objectIds = [...new Set(ids)].map(id => new ObjectId(id));
      await products.deleteMany({ _id: { $in: objectIds } });
      return send(204);
    }
    const id = path.match(/^\/products\/([a-f0-9]{24})$/)?.[1];
    if (id && req.method === 'PUT') {
      const data = productInput(await body(req));
      if (!data) return send(400, { error: 'Sản phẩm không hợp lệ.' });
      const row = await products.findOneAndReplace({ _id: new ObjectId(id) }, data, { returnDocument: 'after' });
      return row ? send(200, serialize(row)) : send(404, { error: 'Không tìm thấy sản phẩm.' });
    }
    if (id && req.method === 'DELETE') {
      const result = await products.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount ? send(204) : send(404, { error: 'Không tìm thấy sản phẩm.' });
    }
    return send(404, { error: 'Không tìm thấy đường dẫn.' });
  } catch (error) {
    if (!error.status) console.error(error.name);
    return send(error.status ?? 500, { error: error.status ? error.message : 'Không thể xử lý yêu cầu.' });
  }
}).listen(Number(API_PORT), process.env.API_HOST ?? '127.0.0.1', () => console.log('API MongoDB sẵn sàng.'));
