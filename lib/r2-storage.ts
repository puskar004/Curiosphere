import crypto from "crypto";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

export function getR2Config(): R2Config | null {
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = (process.env.R2_BUCKET_NAME || "curiosphere-recordings").trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeKeyPath(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeRfc3986(seg))
    .join("/");
}

export function buildRecordingKey(opts: {
  classCode: string;
  title: string;
  ext?: string;
}): string {
  const safeCode = (opts.classCode || "CLASS")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  const safeTitle = (opts.title || "live-class")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "live-class";
  const ext = (opts.ext || "webm").replace(/[^a-z0-9]/gi, "").toLowerCase() || "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `recordings/${safeCode}/${stamp}_${safeTitle}.${ext}`;
}

/**
 * Generates an AWS Signature V4 presigned PUT URL for Cloudflare R2.
 * Allows direct browser -> R2 uploads (supports large lecture videos with zero Vercel size limits).
 */
export function createR2PresignedPutUrl(opts: {
  key: string;
  expiresInSeconds?: number;
}): { uploadUrl: string; publicUrl: string; key: string } {
  const cfg = getR2Config();
  if (!cfg) {
    throw new Error(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL."
    );
  }

  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";
  const expires = Math.max(60, Math.min(opts.expiresInSeconds ?? 3600, 86400));

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const encodedKey = encodeKeyPath(opts.key);
  const canonicalUri = `/${encodeRfc3986(cfg.bucket)}/${encodedKey}`;

  const queryParams: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${cfg.accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(expires)],
    ["X-Amz-SignedHeaders", "host"],
  ];

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");

  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  const publicUrl = `${cfg.publicUrl}/${encodedKey}`;

  return {
    uploadUrl,
    publicUrl,
    key: opts.key,
  };
}
