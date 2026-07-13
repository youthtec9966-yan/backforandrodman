import { createCipheriv, pbkdf2Sync, randomBytes } from "crypto";

export type AppServiceSecrets = {
  dashscopeApiKey: string;
  llmApiKey: string;
  asrApiKey: string;
  ttsApiKey: string;
};

export type EncryptedAppServiceSecrets = {
  algorithm: "aes-256-gcm";
  kdf: "pbkdf2-sha256";
  iterations: number;
  salt: string;
  iv: string;
  authTag: string;
  cipherText: string;
  keyVersion: "deviceCode+activationCode:v1";
};

const PBKDF2_ITERATIONS = 120_000;

export function encryptAppServiceSecrets(
  deviceCode: string,
  activationCode: string,
  secrets: AppServiceSecrets,
): EncryptedAppServiceSecrets {
  const normalizedDeviceCode = deviceCode.trim();
  const normalizedActivationCode = activationCode.trim();
  if (!normalizedDeviceCode) {
    throw new Error("deviceCode 不能为空，无法加密服务密钥");
  }
  if (!normalizedActivationCode) {
    throw new Error("activationCode 不能为空，无法加密服务密钥");
  }

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(
    `${normalizedDeviceCode}:${normalizedActivationCode}`,
    salt,
    PBKDF2_ITERATIONS,
    32,
    "sha256",
  );
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify({
    dashscopeApiKey: secrets.dashscopeApiKey.trim(),
    llmApiKey: secrets.llmApiKey.trim(),
    asrApiKey: secrets.asrApiKey.trim(),
    ttsApiKey: secrets.ttsApiKey.trim(),
  });
  const cipherText = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    kdf: "pbkdf2-sha256",
    iterations: PBKDF2_ITERATIONS,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    cipherText: cipherText.toString("base64"),
    keyVersion: "deviceCode+activationCode:v1",
  };
}
