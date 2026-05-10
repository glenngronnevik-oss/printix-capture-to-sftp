import fs from 'fs';

function readKeyFile(envVar) {
  const filePath = process.env[envVar];
  if (!filePath) return null;
  try { return fs.readFileSync(filePath, 'utf-8'); }
  catch (err) { console.error(`Cannot read key: ${err.message}`); return null; }
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  logStackTraces: process.env.LOG_STACK_TRACES === 'true',
  invalidFileNameCharacters: ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0'],
  profiles: {
    'invoices': {
      secretKeys: (process.env.PROFILE_1_SECRET_KEYS ?? '').split(',').filter(Boolean),
      tokens: (process.env.PROFILE_1_TOKENS ?? '').split(',').filter(Boolean),
      sftp: {
        host: process.env.PROFILE_1_SFTP_HOST ?? 'sftp.example.com',
        port: parseInt(process.env.PROFILE_1_SFTP_PORT ?? '22', 10),
        username: process.env.PROFILE_1_SFTP_USER ?? 'printix',
        password: process.env.PROFILE_1_SFTP_PASSWORD ?? null,
        privateKey: readKeyFile('PROFILE_1_SFTP_KEY_PATH'),
        passphrase: process.env.PROFILE_1_SFTP_KEY_PASSPHRASE ?? null,
        hostFingerprint: process.env.PROFILE_1_SFTP_HOST_FINGERPRINT ?? null,
      },
      remoteDir: process.env.PROFILE_1_SFTP_REMOTE_DIR ?? '/uploads/printix/invoices',
      uploadMetadata: true,
      metadataFormat: 'object',
      indexFieldOption: 'configured',
      indexFields: [
        { id: 'DocumentType', metadata_name: 'DocumentType' },
        { id: 'SenderName', metadata_name: 'SenderName' },
        { id: 'InvoiceNumber', metadata_name: 'InvoiceNumber' },
        { id: 'InvoiceDate', metadata_name: 'InvoiceDate' },
        { id: 'TotalAmount', metadata_name: 'TotalAmount' },
      ],
    },
    'general': {
      secretKeys: (process.env.PROFILE_2_SECRET_KEYS ?? '').split(',').filter(Boolean),
      tokens: (process.env.PROFILE_2_TOKENS ?? '').split(',').filter(Boolean),
      sftp: {
        host: process.env.PROFILE_2_SFTP_HOST ?? process.env.PROFILE_1_SFTP_HOST ?? 'sftp.example.com',
        port: parseInt(process.env.PROFILE_2_SFTP_PORT ?? process.env.PROFILE_1_SFTP_PORT ?? '22', 10),
        username: process.env.PROFILE_2_SFTP_USER ?? process.env.PROFILE_1_SFTP_USER ?? 'printix',
        password: process.env.PROFILE_2_SFTP_PASSWORD ?? null,
        privateKey: readKeyFile('PROFILE_2_SFTP_KEY_PATH') ?? readKeyFile('PROFILE_1_SFTP_KEY_PATH'),
        passphrase: process.env.PROFILE_2_SFTP_KEY_PASSPHRASE ?? null,
        hostFingerprint: process.env.PROFILE_2_SFTP_HOST_FINGERPRINT ?? null,
      },
      remoteDir: process.env.PROFILE_2_SFTP_REMOTE_DIR ?? '/uploads/printix/general/{year}/{month}/{day}',
      uploadMetadata: true,
      metadataFormat: 'object',
      indexFieldOption: 'all',
      indexFields: [],
    },
  },
};
