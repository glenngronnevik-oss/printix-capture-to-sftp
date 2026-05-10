import express from 'express';
import crypto from 'crypto';
import fetch from 'node-fetch';
import SftpClient from 'ssh2-sftp-client';
import { config } from './config.js';

const app = express();
app.use(express.json());

function verifySignature(req, profile) {
  const signature = req.headers['x-printix-signature'] ?? '';
  const timestamp = req.headers['x-printix-timestamp'] ?? '';
  const body = JSON.stringify(req.body);
  for (const key of profile.secretKeys ?? []) {
    try {
      const hmac = crypto.createHmac('sha256', key);
      const expected = hmac.update(timestamp + body).digest('base64');
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true;
    } catch {}
  }
  for (const token of profile.tokens ?? []) {
    try {
      const sigBuf = Buffer.from(signature);
      const tokBuf = Buffer.from(token);
      if (sigBuf.length === tokBuf.length && crypto.timingSafeEqual(sigBuf, tokBuf)) return true;
    } catch {}
  }
  return false;
}

function sanitiseFileName(name) {
  let s = name;
  for (const ch of config.invalidFileNameCharacters) s = s.split(ch).join('_');
  return s.replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function buildRemotePath(profile, profileId, fileName) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const folder = (profile.remoteDir ?? '/')
    .replace('{year}', year).replace('{month}', month)
    .replace('{day}', day).replace('{profileId}', profileId)
    .replace(/\/+$/, '');
  return { folder, filePath: `${folder}/${fileName}` };
}

app.post('/sftp/:profileId', async (req, res) => {
  const { profileId } = req.params;
  const profile = config.profiles[profileId];
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (!verifySignature(req, profile)) return res.status(401).json({ error: 'Unauthorised' });
  const event = req.body;
  if (event.eventType !== 'FileDeliveryJobReady') return res.status(200).json({ status: 'ignored' });
  res.status(200).json({ status: 'accepted' });
  setImmediate(async () => {
    try {
      const fileName = sanitiseFileName(event.fileName ?? `doc_${Date.now()}`);
      let metadata = null;
      if (event.metadataUrl) {
        const ts = new Date().toISOString();
        const h = { 'Content-Type': 'application/json' };
        if (profile.secretKeys?.[0]) {
          const hmac = crypto.createHmac('sha256', profile.secretKeys[0]);
          h['x-printix-signature'] = hmac.update(ts).digest('base64');
          h['x-printix-timestamp'] = ts;
        }
        const b = {};
        if (profile.indexFieldOption === 'allCustom' || profile.indexFieldOption === 'all') b.indexFieldOption = profile.indexFieldOption;
        else if (profile.indexFields?.length) b.indexFields = profile.indexFields;
        if (profile.metadataFormat) b.metadataFormat = profile.metadataFormat;
        const r = await fetch(event.metadataUrl, { method: 'POST', headers: h, body: JSON.stringify(b) });
        metadata = await r.json();
      }
      const fileBuffer = Buffer.from(await (await fetch(event.documentUrl)).arrayBuffer());
      const sftp = new SftpClient();
      const { folder, filePath } = buildRemotePath(profile, profileId, fileName);
      const opts = { host: profile.sftp.host, port: profile.sftp.port ?? 22, username: profile.sftp.username, readyTimeout: 10000, retries: 3 };
      if (profile.sftp.privateKey) { opts.privateKey = profile.sftp.privateKey; if (profile.sftp.passphrase) opts.passphrase = profile.sftp.passphrase; }
      else if (profile.sftp.password) opts.password = profile.sftp.password;
      if (profile.sftp.hostFingerprint) opts.hostVerifier = k => k === profile.sftp.hostFingerprint;
      try {
        await sftp.connect(opts);
        await sftp.mkdir(folder, true);
        await sftp.put(fileBuffer, filePath);
        if (profile.uploadMetadata && metadata) await sftp.put(Buffer.from(JSON.stringify(metadata, null, 2)), `${folder}/${fileName}.metadata.json`);
      } finally { await sftp.end(); }
      console.log(`[Connector] Job complete: ${fileName}`);
    } catch (err) { console.error(`[Connector] Error: ${err.message}`); }
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0', profiles: Object.keys(config.profiles), uptime: process.uptime() }));

app.listen(config.port, () => {
  console.log(`[Connector] Printix -> SFTP connector listening on port ${config.port}`);
  console.log(`[Connector] Profiles: ${Object.keys(config.profiles).join(', ')}`);
});
