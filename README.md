# Printix → SFTP Connector

A [Printix Capture Connector API](https://printix.net) destination connector that automatically delivers scanned documents to an SFTP server.

Built with **Node.js + Express**, packaged as a **Docker container**.

---

## Quick start

```bash
git clone https://github.com/glenngronnevik-oss/printix-capture-to-sftp.git
cd printix-capture-to-sftp
cp .env.example .env
# Edit .env with your SFTP credentials and Printix secret keys
docker compose up -d
curl http://localhost:3000/health
```

---

## Connector URL

```
http://{FQDN}:{port}/sftp/{profileId}
```

Example: `http://connector.corp.local:3000/sftp/invoices`

---

## License

MIT
